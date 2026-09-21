import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey, isValidKeyFormat } from "@/lib/api-keys";
import { getSessionCookie } from "@/lib/auth";
import { verifyMessage } from "viem";
import { USAGE_STATUS } from "@/lib/usage-status";
import { log } from "@/lib/obs";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000;

function ownershipMessage(address: string, timestamp: string): string {
  return `Pactum: verify wallet ownership\nAddress: ${address}\nTimestamp: ${timestamp}`;
}

async function verifyOwnershipSignature(
  address: string,
  timestamp: string,
  signature: string
): Promise<boolean> {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SIGNATURE_MAX_AGE_MS) {
    return false;
  }
  if (!ADDRESS_RE.test(address)) return false;
  try {
    return await verifyMessage({
      address: address as `0x${string}`,
      message: ownershipMessage(address, timestamp),
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

/**
 * GET /api/v1/wallet/balance?address=0x...
 *
 * Authenticated access only (M-01 fix):
 * - `X-API-Key`  → pending usage of the address scoped to the key's own project
 * - `x-pactum-address/timestamp/signature` → wallet-ownership proof (fresh
 *   personal_sign of ownershipMessage) → full pending usage for that address
 * - session cookie → scoped to the logged-in user's projects
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get("address");

  if (!userAddress || !ADDRESS_RE.test(userAddress)) {
    return NextResponse.json({ error: "Missing or invalid address" }, { status: 400 });
  }

  const supabase = createAdminClient();
  // null = address-wide scope (signature path); string[] = api_key_id filter
  let scopeKeyIds: string[] | null = null;

  const apiKey = request.headers.get("x-api-key");
  const sigAddress = request.headers.get("x-pactum-address");
  const sigTimestamp = request.headers.get("x-pactum-timestamp");
  const sigValue = request.headers.get("x-pactum-signature");
  const userId = await getSessionCookie();

  if (apiKey && isValidKeyFormat(apiKey)) {
    // Merchant path: only events metered under the key's own project.
    const { data: keyRecord } = await supabase
      .from("api_keys_pactum")
      .select("id, project_id, status")
      .eq("key_hash", hashApiKey(apiKey))
      .single();

    if (!keyRecord || keyRecord.status !== "active") {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { data: keys } = await supabase
      .from("api_keys_pactum")
      .select("id")
      .eq("project_id", keyRecord.project_id);
    scopeKeyIds = (keys || []).map((k) => k.id);
    if (scopeKeyIds.length === 0) scopeKeyIds = ["none"];
  } else if (sigAddress && sigTimestamp && sigValue) {
    // End-user path: prove control of the address with a fresh signature.
    if (
      sigAddress.toLowerCase() !== userAddress.toLowerCase() ||
      !(await verifyOwnershipSignature(userAddress, sigTimestamp, sigValue))
    ) {
      return NextResponse.json({ error: "Invalid ownership signature" }, { status: 401 });
    }
  } else if (userId) {
    // Dashboard session: scoped to the logged-in user's projects.
    const { data: projects } = await supabase
      .from("projects_pactum")
      .select("id")
      .eq("user_id", userId);

    const projectIds = (projects || []).map((p) => p.id);
    if (projectIds.length === 0) {
      scopeKeyIds = ["none"];
    } else {
      const { data: keys } = await supabase
        .from("api_keys_pactum")
        .select("id")
        .in("project_id", projectIds);
      scopeKeyIds = (keys || []).map((k) => k.id);
      if (scopeKeyIds.length === 0) scopeKeyIds = ["none"];
    }
  } else {
    return NextResponse.json(
      { error: "Unauthorized — provide X-API-Key, a valid session, or an ownership signature." },
      { status: 401 }
    );
  }

  let query = supabase
    .from("usage_events_pactum")
    .select("cost")
    .ilike("user_address", userAddress)
    .in("status", [USAGE_STATUS.PENDING, USAGE_STATUS.SETTLING]);
  if (scopeKeyIds) {
    query = query.in("api_key_id", scopeKeyIds);
  }

  const { data: pendingUsageData, error } = await query;

  if (error) {
    log("error", "pending usage fetch failed", { error: String(error) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const pendingUsage = (pendingUsageData || []).reduce((sum, e) => sum + Number(e.cost), 0);

  return NextResponse.json({ pendingUsage });
}
