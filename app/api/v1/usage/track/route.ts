import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey, isValidKeyFormat } from "@/lib/api-keys";
import { parseUnits, formatUnits } from "viem";
import { ARC_TESTNET } from "@/lib/arc/config";
import { getPublicClient } from "@/lib/arc/clients";
import { evaluatePolicy } from "@/lib/policy";
import { validateUsageEvent } from "@/lib/money";
import { USAGE_STATUS } from "@/lib/usage-status";
import { newRequestId, log } from "@/lib/obs";

const PACTUM_BILLING_ABI = [
  {
    name: "userBalances",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type Supabase = ReturnType<typeof createAdminClient>;

/* ── Helpers ──────────────────────────────────────────────────────────── */

interface AuthedKey {
  id: string;
  projectId: string;
}

/** Resolve + validate the X-API-Key header against the hashed key table. */
async function authenticateKey(
  supabase: Supabase,
  apiKey: string | null
): Promise<{ key: AuthedKey } | { response: NextResponse }> {
  if (!apiKey) {
    return { response: NextResponse.json({ error: "Missing X-API-Key header" }, { status: 401 }) };
  }
  if (!isValidKeyFormat(apiKey)) {
    return { response: NextResponse.json({ error: "Invalid API key format" }, { status: 401 }) };
  }

  const { data: keyRecord, error: keyError } = await supabase
    .from("api_keys_pactum")
    .select("id, project_id, status")
    .eq("key_hash", hashApiKey(apiKey))
    .single();

  if (keyError || !keyRecord) {
    return { response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }
  if (keyRecord.status !== "active") {
    return { response: NextResponse.json({ error: "API key has been revoked" }, { status: 403 }) };
  }
  return { key: { id: keyRecord.id, projectId: keyRecord.project_id } };
}

/**
 * State-channel availability: on-chain deposit minus everything still pending
 * must cover the new charge. Fail-closed when the contract is not configured.
 */
async function assertChannelAvailable(
  supabase: Supabase,
  userAddress: string,
  costString: string
): Promise<NextResponse | null> {
  const contractAddress = process.env.PACTUM_CONTRACT_ADDRESS as `0x${string}` | undefined;
  if (!contractAddress) {
    log("error", "PACTUM_CONTRACT_ADDRESS missing — rejecting usage track (fail-closed)");
    return NextResponse.json(
      { error: "Billing misconfigured: contract address missing on the server." },
      { status: 503 }
    );
  }

  try {
    const publicClient = getPublicClient();
    const onChainBalanceWei = (await publicClient.readContract({
      address: contractAddress,
      abi: PACTUM_BILLING_ABI,
      functionName: "userBalances",
      args: [userAddress as `0x${string}`],
    })) as bigint;

    const { data: pendingUsageData } = await supabase
      .from("usage_events_pactum")
      .select("cost")
      .ilike("user_address", userAddress)
      .eq("status", USAGE_STATUS.PENDING);

    const pendingUnits = (pendingUsageData || []).reduce(
      (sum, e) => sum + parseUnits(String(e.cost ?? "0"), ARC_TESTNET.usdcDecimals),
      0n
    );
    const costUnits = parseUnits(costString, ARC_TESTNET.usdcDecimals);
    const availableUnits = onChainBalanceWei - pendingUnits;

    if (availableUnits < costUnits) {
      return NextResponse.json(
        {
          error: "Insufficient funds in State Channel.",
          details: `On-chain: ${formatUnits(onChainBalanceWei, ARC_TESTNET.usdcDecimals)} USDC, Pending: ${formatUnits(pendingUnits, ARC_TESTNET.usdcDecimals)} USDC, Required: ${formatUnits(costUnits, ARC_TESTNET.usdcDecimals)} USDC`,
        },
        { status: 402 }
      );
    }
    return null;
  } catch (e: unknown) {
    log("error", "state channel read error", { error: String(e) });
    return NextResponse.json({ error: "Failed to read on-chain balance." }, { status: 500 });
  }
}

/** PRD P0 enforcement: a project's daily/monthly spend limit blocks metering. */
async function assertPolicyAllows(
  supabase: Supabase,
  projectId: string,
  cost: number
): Promise<NextResponse | null> {
  const { policy, dailySpend, monthlySpend } = await evaluatePolicy(projectId);
  if (!policy) return null;

  const dailyLimit =
    policy.spend_limit_daily != null ? Number(policy.spend_limit_daily) : null;
  const monthlyLimit =
    policy.spend_limit_monthly != null ? Number(policy.spend_limit_monthly) : null;

  if (dailyLimit !== null && dailySpend + cost > dailyLimit) {
    return NextResponse.json(
      {
        error: "policy_limit_exceeded",
        details: `Daily spend limit of ${dailyLimit} USDC exceeded. Spent today: ${dailySpend} USDC.`,
        remaining_daily: Math.max(0, dailyLimit - dailySpend),
      },
      { status: 429 }
    );
  }
  if (monthlyLimit !== null && monthlySpend + cost > monthlyLimit) {
    return NextResponse.json(
      {
        error: "policy_limit_exceeded",
        details: `Monthly spend limit of ${monthlyLimit} USDC exceeded. Spent this month: ${monthlySpend} USDC.`,
        remaining_monthly: Math.max(0, monthlyLimit - monthlySpend),
      },
      { status: 429 }
    );
  }
  return null;
}

/* ── Route ────────────────────────────────────────────────────────────── */

export async function POST(request: Request) {
  const reqId = newRequestId();
  const startedAt = Date.now();

  // 1. Authenticate the caller by API key
  const supabase = createAdminClient();
  const auth = await authenticateKey(
    supabase,
    request.headers.get("x-api-key") || request.headers.get("X-API-Key")
  );
  if ("response" in auth) return auth.response;
  const key = auth.key;

  // 2. Parse and strictly validate the body — everything that touches the
  // ledger (tokens, prices, address, string sizes) is normalized here.
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateUsageEvent(body as never);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const ev = validated.value;

  // 3. Idempotency — the same key always resolves to the same event
  const { data: existing } = await supabase
    .from("usage_events_pactum")
    .select("id, cost, created_at")
    .eq("idempotency_key", ev.idempotencyKey)
    .single();

  if (existing) {
    return NextResponse.json({
      recorded: true,
      deduplicated: true,
      event_id: existing.id,
      cost: Number(existing.cost),
    });
  }

  // 4. Balance + policy gates
  const channel = await assertChannelAvailable(supabase, ev.userAddress, ev.costString);
  if (channel) return channel;

  const policy = await assertPolicyAllows(supabase, key.projectId, ev.costNumber);
  if (policy) return policy;

  // 5. Record the charge
  const updatedMetadata = {
    ...(typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {}),
    prompt_tokens: ev.promptTokens,
    completion_tokens: ev.completionTokens,
    prompt_price_per_token: ev.promptPrice,
    completion_price_per_token: ev.completionPrice,
  };

  const totalTokens = ev.promptTokens + ev.completionTokens;
  const { data: event, error: insertError } = await supabase
    .from("usage_events_pactum")
    .insert({
      api_key_id: key.id,
      endpoint: ev.model, // stored in the existing endpoint column to avoid a schema change
      quantity: totalTokens > 0 ? totalTokens : 1,
      unit_price: totalTokens > 0 ? ev.costNumber / totalTokens : ev.costNumber,
      cost: ev.costString,
      user_address: ev.userAddress,
      metadata: updatedMetadata,
      idempotency_key: ev.idempotencyKey,
      status: USAGE_STATUS.PENDING,
    })
    .select("id, cost, created_at")
    .single();

  if (insertError) {
    // 23505 = unique violation: a concurrent request with the same
    // idempotency_key won the race — return its event instead of failing.
    if (insertError.code === "23505") {
      const { data: raceExisting } = await supabase
        .from("usage_events_pactum")
        .select("id, cost, created_at")
        .eq("idempotency_key", ev.idempotencyKey)
        .single();
      return NextResponse.json({
        recorded: true,
        deduplicated: true,
        event_id: raceExisting?.id,
        cost: Number(raceExisting?.cost),
      });
    }
    log("error", "usage_track insert failed", { reqId, code: insertError.code });
    return NextResponse.json({ error: "Failed to record usage event" }, { status: 500 });
  }

  log("info", "usage recorded", { reqId, keyId: key.id.slice(0, 8), cost: ev.costString, ms: Date.now() - startedAt });

  return NextResponse.json({
    recorded: true,
    deduplicated: false,
    event_id: event.id,
    cost: Number(event.cost),
  });
}
