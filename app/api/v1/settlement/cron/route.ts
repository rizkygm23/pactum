import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import { ARC_TESTNET } from "@/lib/arc/config";

const PACTUM_BILLING_ABI = [
  {
    name: "batchSettleUsage",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "users", type: "address[]" },
      { name: "merchants", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    outputs: [],
  },
] as const;

export async function POST(request: Request) {
  // Simple auth for cron (can be improved with a secret token)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Fetch pending events
  const { data: events, error: fetchError } = await supabase
    .from("usage_events_pactum")
    .select(`
      id, cost, user_address,
      api_keys_pactum (
        project_id
      )
    `)
    .eq("status", "pending_settlement");

  if (fetchError || !events || events.length === 0) {
    return NextResponse.json({ message: "No pending settlements." });
  }

  // 2. Fetch all projects to map project_id to merchant_wallet_address
  const { data: projects } = await supabase.from("projects_pactum").select("id, merchant_wallet_address");
  const projectMap = new Map(projects?.map(p => [p.id, p.merchant_wallet_address]) || []);

  // 3. Aggregate costs per (user, merchant)
  const settlements = new Map<string, { user: string; merchant: string; amount: number; eventIds: string[] }>();

  for (const ev of events) {
    const user = ev.user_address;
    const apiKeyData: any = Array.isArray(ev.api_keys_pactum) ? ev.api_keys_pactum[0] : ev.api_keys_pactum;
    const projectId = apiKeyData?.project_id;
    const merchant = projectMap.get(projectId);

    if (!user || !merchant) continue; // Skip invalid records

    const key = `${user}-${merchant}`;
    if (!settlements.has(key)) {
      settlements.set(key, { user, merchant, amount: 0, eventIds: [] });
    }
    const entry = settlements.get(key)!;
    entry.amount += Number(ev.cost);
    entry.eventIds.push(ev.id);
  }

  if (settlements.size === 0) {
    return NextResponse.json({ message: "No valid settlements to process." });
  }

  // 4. Prepare Contract call
  const users: `0x${string}`[] = [];
  const merchants: `0x${string}`[] = [];
  const amounts: bigint[] = [];
  const allEventIds: string[] = [];

  for (const s of settlements.values()) {
    users.push(s.user as `0x${string}`);
    merchants.push(s.merchant as `0x${string}`);
    amounts.push(parseUnits(s.amount.toFixed(6), ARC_TESTNET.usdcDecimals));
    allEventIds.push(...s.eventIds);
  }

  const contractAddress = process.env.PACTUM_CONTRACT_ADDRESS as `0x${string}`;
  const pk = process.env.SERVICE_WALLET_PRIVATE_KEY;

  if (!contractAddress || !pk) {
    return NextResponse.json({ error: "Missing contract or PK config" }, { status: 500 });
  }

  try {
    const account = privateKeyToAccount(pk as `0x${string}`);
    const publicClient = createPublicClient({ chain: arcTestnet, transport: http(ARC_TESTNET.rpc) });
    const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http(ARC_TESTNET.rpc) });

    // 5. Execute batch transaction
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PACTUM_BILLING_ABI,
      functionName: "batchSettleUsage",
      args: [users, merchants, amounts],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error(`Batch settle failed: ${hash}`);
    }

    // 6. Update DB status to 'settled'
    await supabase
      .from("usage_events_pactum")
      .update({ status: "settled" })
      .in("id", allEventIds);

    return NextResponse.json({
      message: "Settlement successful",
      hash,
      processedEvents: allEventIds.length,
      batches: settlements.size
    });

  } catch (e: any) {
    console.error("Batch settle error:", e);
    return NextResponse.json({ error: "Settlement transaction failed", details: e.message }, { status: 500 });
  }
}
