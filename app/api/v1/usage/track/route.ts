import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey, isValidKeyFormat } from "@/lib/api-keys";
import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import { ARC_TESTNET } from "@/lib/arc/config";

// Minimal ABI for PactumBilling
const PACTUM_BILLING_ABI = [
  {
    name: "userBalances",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export async function POST(request: Request) {
  // 1. Extract API key
  const apiKey = request.headers.get("x-api-key") || request.headers.get("X-API-Key");

  if (!apiKey) {
    return NextResponse.json({ error: "Missing X-API-Key header" }, { status: 401 });
  }
  if (!isValidKeyFormat(apiKey)) {
    return NextResponse.json({ error: "Invalid API key format" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const keyHash = hashApiKey(apiKey);

  // 2. Lookup key by hash
  const { data: keyRecord, error: keyError } = await supabase
    .from("api_keys_pactum")
    .select("id, project_id, status")
    .eq("key_hash", keyHash)
    .single();

  if (keyError || !keyRecord) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  if (keyRecord.status !== "active") {
    return NextResponse.json({ error: "API key has been revoked" }, { status: 403 });
  }

  // 3. Parse body
  let body: {
    model: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_price_per_token?: number;
    completion_price_per_token?: number;
    user_address: `0x${string}`;
    metadata?: Record<string, unknown>;
    idempotency_key: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.model || !body.idempotency_key || !body.user_address) {
    return NextResponse.json(
      { error: "Missing required fields: model, user_address, idempotency_key" },
      { status: 400 }
    );
  }

  const pTokens = body.prompt_tokens || 0;
  const cTokens = body.completion_tokens || 0;
  const pPrice = body.prompt_price_per_token || 0;
  const cPrice = body.completion_price_per_token || 0;

  const cost = (pTokens * pPrice) + (cTokens * cPrice);
  const totalTokens = pTokens + cTokens;
  
  if (cost < 0) {
    return NextResponse.json({ error: "Invalid negative cost calculation" }, { status: 400 });
  }

  // 4. Check idempotency in DB first
  const { data: existing } = await supabase
    .from("usage_events_pactum")
    .select("id, cost, created_at")
    .eq("idempotency_key", body.idempotency_key)
    .single();

  if (existing) {
    return NextResponse.json({
      recorded: true,
      deduplicated: true,
      event_id: existing.id,
      cost: Number(existing.cost),
    });
  }

  // 5. State Channel Off-Chain Billing: Check On-Chain Balance vs Pending Off-Chain Usage
  const contractAddress = process.env.PACTUM_CONTRACT_ADDRESS as `0x${string}`;
  
  if (contractAddress) {
    try {
      // a. Get On-Chain Balance
      const publicClient = createPublicClient({ chain: arcTestnet, transport: http(ARC_TESTNET.rpc) });
      const onChainBalanceWei = await publicClient.readContract({
        address: contractAddress,
        abi: PACTUM_BILLING_ABI,
        functionName: "userBalances",
        args: [body.user_address],
      }) as bigint;
      const onChainBalance = Number(onChainBalanceWei) / (10 ** ARC_TESTNET.usdcDecimals);

      // b. Get Pending Off-Chain Usage
      const { data: pendingUsageData } = await supabase
        .from("usage_events_pactum")
        .select("cost")
        .eq("user_address", body.user_address)
        .eq("status", "pending_settlement");

      const pendingUsage = (pendingUsageData || []).reduce((sum, e) => sum + Number(e.cost), 0);
      const availableBalance = onChainBalance - pendingUsage;

      if (availableBalance < cost) {
        return NextResponse.json(
          { 
            error: "Insufficient funds in State Channel.", 
            details: `On-chain: ${onChainBalance} USDC, Pending: ${pendingUsage} USDC, Required: ${cost} USDC` 
          },
          { status: 402 }
        );
      }
    } catch (e: any) {
      console.error("State Channel read error:", e);
      return NextResponse.json({ error: "Failed to read on-chain balance." }, { status: 500 });
    }
  } else {
    console.warn("PACTUM_CONTRACT_ADDRESS is missing. Skipping real-time balance check.");
  }

  // Combine token info into metadata
  const updatedMetadata = {
    ...body.metadata,
    prompt_tokens: pTokens,
    completion_tokens: cTokens,
    prompt_price_per_token: pPrice,
    completion_price_per_token: cPrice,
  };

  // 6. Insert usage event into database
  const { data: event, error: insertError } = await supabase
    .from("usage_events_pactum")
    .insert({
      api_key_id: keyRecord.id,
      endpoint: body.model, // We store model in the existing endpoint column to avoid db schema changes
      quantity: totalTokens > 0 ? totalTokens : 1, // Store total tokens in quantity
      unit_price: totalTokens > 0 ? cost / totalTokens : cost, // Avoid division by zero
      cost,
      user_address: body.user_address,
      metadata: updatedMetadata,
      idempotency_key: body.idempotency_key,
      status: "pending_settlement"
    })
    .select("id, cost, created_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raceExisting } = await supabase
        .from("usage_events_pactum")
        .select("id, cost, created_at")
        .eq("idempotency_key", body.idempotency_key)
        .single();
      return NextResponse.json({ recorded: true, deduplicated: true, event_id: raceExisting?.id, cost: Number(raceExisting?.cost) });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    recorded: true,
    deduplicated: false,
    event_id: event.id,
    cost: Number(event.cost),
  });
}
