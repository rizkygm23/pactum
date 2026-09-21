import { NextResponse } from "next/server";
import { arcTestnet } from "viem/chains";
import { createAdminClient } from "@/lib/supabase/admin";
import { ARC_TESTNET } from "@/lib/arc/config";
import { getPublicClient } from "@/lib/arc/clients";

export const dynamic = "force-dynamic";

type Check = { status: "up" | "down"; latencyMs?: number; detail?: string };

const VERSION_ABI = [
  {
    name: "VERSION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

/**
 * GET /api/health — liveness + readiness in one probe.
 * 200 = every dependency answered; 503 = at least one dependency is down.
 * Unauthenticated by design (reports no sensitive data), safe for uptime checks.
 */
export async function GET() {
  const checks: Record<string, Check> = {};
  let healthy = true;

  // Database (read path used by every metered call)
  const dbStart = Date.now();
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("usage_events_pactum")
      .select("id", { count: "exact", head: true });
    if (error) {
      checks.database = { status: "down", latencyMs: Date.now() - dbStart, detail: error.message };
      healthy = false;
    } else {
      checks.database = { status: "up", latencyMs: Date.now() - dbStart };
    }
  } catch (e) {
    checks.database = { status: "down", latencyMs: Date.now() - dbStart, detail: String(e) };
    healthy = false;
  }

  // On-chain: RPC reachable + our contract answers (correct address & ABI)
  const chainStart = Date.now();
  try {
    const contract = process.env.PACTUM_CONTRACT_ADDRESS as `0x${string}` | undefined;
    if (!contract) throw new Error("PACTUM_CONTRACT_ADDRESS is not configured");

    const client = getPublicClient();
    const version = await client.readContract({
      address: contract,
      abi: VERSION_ABI,
      functionName: "VERSION",
    });
    checks.chain = {
      status: "up",
      latencyMs: Date.now() - chainStart,
      detail: `PactumBilling v${version}`,
    };
  } catch (e) {
    checks.chain = { status: "down", latencyMs: Date.now() - chainStart, detail: String(e) };
    healthy = false;
  }

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
