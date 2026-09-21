import { createAdminClient } from "@/lib/supabase/admin";
import { parseUnits, getAddress, type HttpTransport, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import { ARC_TESTNET } from "@/lib/arc/config";
import { getPublicClient, getWalletClient } from "@/lib/arc/clients";
import { USAGE_STATUS } from "@/lib/usage-status";
import { log } from "@/lib/obs";

const PACTUM_BILLING_ABI = [
  {
    name: "userBalances",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
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

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const MAX_GROUPS_PER_TX = 50;
const MAX_EVENTS_PER_RUN = 500;

type PendingEvent = {
  id: string;
  cost: string | number | null;
  user_address: string | null;
  api_keys_pactum: { project_id: string } | { project_id: string }[] | null;
};

type Group = { user: string; merchant: string; amount: bigint; eventIds: string[] };

export interface SettlementScope {
  /** Only settle events whose API key belongs to these projects. Omit for global (cron). */
  projectIds?: string[];
}

export interface SettlementResult {
  settledGroups: number;
  settledEvents: number;
  txHashes: string[];
  skipped: Array<{ user: string; merchant: string; reason: string }>;
}

type Supabase = ReturnType<typeof createAdminClient>;

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 1 — fetch + ATOMIC CLAIM
 *
 * Events flip pending_settlement → settling via a conditional UPDATE, so two
 * concurrent triggers (cron + manual, or two crons) can never claim the same
 * event. Claimed rows are the authoritative set for this run.
 * ──────────────────────────────────────────────────────────────────────────── */
async function claimPendingEvents(
  supabase: Supabase
): Promise<{ claimed: PendingEvent[]; claimedIdList: string[] }> {
  const { data: pending, error: fetchError } = await supabase
    .from("usage_events_pactum")
    .select("id")
    .eq("status", USAGE_STATUS.PENDING)
    .limit(MAX_EVENTS_PER_RUN);

  if (fetchError) throw new Error(`Failed to fetch pending events: ${fetchError.message}`);
  if (!pending || pending.length === 0) return { claimed: [], claimedIdList: [] };

  const { data: claimedIds, error: claimError } = await supabase
    .from("usage_events_pactum")
    .update({ status: USAGE_STATUS.SETTLING })
    .in("id", (pending as { id: string }[]).map((e) => e.id))
    .eq("status", USAGE_STATUS.PENDING)
    .select("id");

  if (claimError) throw new Error(`Failed to claim pending events: ${claimError.message}`);
  if (!claimedIds || claimedIds.length === 0) {
    return { claimed: [], claimedIdList: [] };
  }
  const claimedIdList = (claimedIds as { id: string }[]).map((e) => e.id);

  const { data: claimed, error: reloadError } = await supabase
    .from("usage_events_pactum")
    .select(
      `
      id, cost, user_address,
      api_keys_pactum (
        project_id
      )
    `
    )
    .in("id", claimedIdList);

  if (reloadError || !claimed || claimed.length === 0) {
    await releaseClaims(supabase, claimedIdList);
    throw new Error(
      `Failed to reload claimed events: ${reloadError?.message ?? "empty result"}`
    );
  }

  return { claimed: claimed as PendingEvent[], claimedIdList };
}

/* ── Release helper — every failure path must hand events back to pending ── */
async function releaseClaims(supabase: Supabase, ids: string[]) {
  if (ids.length === 0) return;
  await supabase
    .from("usage_events_pactum")
    .update({ status: USAGE_STATUS.PENDING })
    .in("id", ids)
    .eq("status", USAGE_STATUS.SETTLING);
}

/* ── Stage 2 — project mapping + aggregation in exact integer units ──────── */
function aggregateGroups(
  claimed: PendingEvent[],
  projectMap: Map<string, string | null>,
  scoped: Set<string> | null
): { groups: Map<string, Group>; releaseIds: string[]; skipped: SettlementResult["skipped"] } {
  const groups = new Map<string, Group>();
  const releaseIds: string[] = [];
  const skipped: SettlementResult["skipped"] = [];

  for (const ev of claimed) {
    const apiKeyData = Array.isArray(ev.api_keys_pactum)
      ? ev.api_keys_pactum[0]
      : ev.api_keys_pactum;
    const projectId = apiKeyData?.project_id;
    if (!projectId) {
      releaseIds.push(ev.id);
      continue;
    }
    if (scoped && (!projectId || !scoped.has(projectId))) {
      releaseIds.push(ev.id);
      continue;
    }

    const merchant = projectMap.get(projectId);
    if (!ev.user_address || !merchant) {
      releaseIds.push(ev.id);
      continue;
    }
    if (!ADDRESS_RE.test(ev.user_address) || !ADDRESS_RE.test(merchant)) {
      skipped.push({ user: ev.user_address, merchant, reason: "invalid address format" });
      releaseIds.push(ev.id);
      continue;
    }

    // Lowercase for grouping so mixed-case variants of one address merge
    const user = ev.user_address.toLowerCase();
    const key = `${user}-${merchant.toLowerCase()}`;
    let group = groups.get(key);
    if (!group) {
      group = { user, merchant, amount: 0n, eventIds: [] };
      groups.set(key, group);
    }
    group.amount += parseUnits(String(ev.cost ?? "0"), ARC_TESTNET.usdcDecimals);
    group.eventIds.push(ev.id);
  }

  return { groups, releaseIds, skipped };
}

/* ── Stage 3 — per-group on-chain balance pre-check ──────────────────────── */
async function preCheckBalances(
  publicClient: PublicClient<HttpTransport, typeof arcTestnet>,
  contractAddress: `0x${string}`,
  groups: Map<string, Group>
): Promise<{ payable: Group[]; skipped: SettlementResult["skipped"]; releaseIds: string[] }> {
  const payable: Group[] = [];
  const skipped: SettlementResult["skipped"] = [];
  const releaseIds: string[] = [];

  for (const group of groups.values()) {
    const checksummedUser = getAddress(group.user);
    const checksummedMerchant = getAddress(group.merchant);
    try {
      const balance = (await publicClient.readContract({
        address: contractAddress,
        abi: PACTUM_BILLING_ABI,
        functionName: "userBalances",
        args: [checksummedUser],
      })) as bigint;

      if (balance < group.amount) {
        skipped.push({
          user: checksummedUser,
          merchant: checksummedMerchant,
          reason: "on-chain balance below pending usage",
        });
        releaseIds.push(...group.eventIds);
        continue;
      }
      payable.push(group);
    } catch (e) {
      log("error", "settlement balance read failed", { user: checksummedUser, error: String(e) });
      skipped.push({
        user: checksummedUser,
        merchant: checksummedMerchant,
        reason: "on-chain balance read failed",
      });
      releaseIds.push(...group.eventIds);
    }
  }

  return { payable, skipped, releaseIds };
}

/* ── Stage 4 — chunked batch transactions + DB finalisation ──────────────── */
async function settleChunks(
  supabase: Supabase,
  walletClient: WalletClient<HttpTransport, typeof arcTestnet, PrivateKeyAccountShape>,
  publicClient: PublicClient<HttpTransport, typeof arcTestnet>,
  contractAddress: `0x${string}`,
  payable: Group[]
): Promise<{ txHashes: string[]; settledEvents: number }> {
  const txHashes: string[] = [];
  let settledEvents = 0;
  // Claimed events not yet settled — released on any failure path so nothing
  // strands in 'settling'.
  const unsettledIds = new Set(payable.flatMap((g) => g.eventIds));

  try {
    for (let i = 0; i < payable.length; i += MAX_GROUPS_PER_TX) {
      const chunk = payable.slice(i, i + MAX_GROUPS_PER_TX);
      const chunkEventIds = chunk.flatMap((g) => g.eventIds);

      let hash: `0x${string}`;
      try {
        hash = await walletClient.writeContract({
          address: contractAddress,
          abi: PACTUM_BILLING_ABI,
          functionName: "batchSettleUsage",
          args: [
            chunk.map((g) => getAddress(g.user)),
            chunk.map((g) => getAddress(g.merchant)),
            chunk.map((g) => g.amount),
          ],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error(`transaction reverted: ${hash}`);
        }
      } catch (txErr) {
        // The tx did not move funds (all-or-nothing) — release the claim.
        // A receipt-timeout ambiguity still releases; reconcile on-chain
        // state against the DB if that is ever observed.
        await releaseClaims(supabase, chunkEventIds);
        chunkEventIds.forEach((id) => unsettledIds.delete(id));
        throw txErr;
      }
      txHashes.push(hash);

      const { error: updateError } = await supabase
        .from("usage_events_pactum")
        .update({ status: USAGE_STATUS.SETTLED, settled_tx_hash: hash })
        .in("id", chunkEventIds)
        .eq("status", USAGE_STATUS.SETTLING);
      if (updateError) {
        // Funds already moved on-chain — releasing these ids would double-pay
        // on the next run. Leave them in 'settling' for manual reconciliation.
        chunkEventIds.forEach((id) => unsettledIds.delete(id));
        throw new Error(
          `ON-CHAIN SETTLED but DB update failed (${hash}): ${updateError.message}. ` +
            `Events left in 'settling' — reconcile manually before re-running settlement.`
        );
      }
      chunkEventIds.forEach((id) => unsettledIds.delete(id));
      settledEvents += chunkEventIds.length;
    }
  } finally {
    await releaseClaims(supabase, Array.from(unsettledIds));
  }

  return { txHashes, settledEvents };
}

// Structural alias so the stage-4 signature reads clearly without importing
// viem's deeply generic wallet-client type at every call site.
type PrivateKeyAccountShape = ReturnType<typeof privateKeyToAccount>;

/**
 * Settle pending usage events on-chain via PactumBilling.batchSettleUsage.
 *
 * Pipeline: claim → aggregate → pre-check → chunked transactions → finalise.
 * Aggregation is in exact integer units, groups with insufficient on-chain
 * user balance are skipped (not settled) so one underfunded user cannot
 * revert the whole batch.
 */
export async function executeSettlement(scope?: SettlementScope): Promise<SettlementResult> {
  const supabase = createAdminClient();
  const skipped: SettlementResult["skipped"] = [];

  const { claimed, claimedIdList } = await claimPendingEvents(supabase);
  if (claimed.length === 0) {
    return { settledGroups: 0, settledEvents: 0, txHashes: [], skipped };
  }

  const scoped = scope?.projectIds ? new Set(scope.projectIds) : null;
  const { data: projects } = await supabase
    .from("projects_pactum")
    .select("id, merchant_wallet_address");
  const projectMap = new Map(
    projects?.map((p) => [p.id, p.merchant_wallet_address]) || []
  );

  const { groups, releaseIds, skipped: aggregateSkipped } = aggregateGroups(
    claimed,
    projectMap,
    scoped
  );
  skipped.push(...aggregateSkipped);

  if (groups.size === 0) {
    await releaseClaims(supabase, releaseIds.length > 0 ? releaseIds : claimedIdList);
    return { settledGroups: 0, settledEvents: 0, txHashes: [], skipped };
  }

  // Wallet config (fail loudly if missing — settlement must not be silent)
  const contractAddress = process.env.PACTUM_CONTRACT_ADDRESS as `0x${string}`;
  const pk = process.env.SERVICE_WALLET_PRIVATE_KEY;
  if (!contractAddress || !pk) {
    await releaseClaims(supabase, claimedIdList);
    throw new Error(
      "Missing PACTUM_CONTRACT_ADDRESS or SERVICE_WALLET_PRIVATE_KEY configuration"
    );
  }

  const publicClient = getPublicClient();
  const walletClient = getWalletClient(privateKeyToAccount(pk as `0x${string}`));

  const { payable, skipped: balanceSkipped, releaseIds: balanceReleaseIds } =
    await preCheckBalances(publicClient, contractAddress, groups);
  skipped.push(...balanceSkipped);

  if (payable.length === 0) {
    await releaseClaims(supabase, releaseIds.length > 0 ? releaseIds : claimedIdList);
    return { settledGroups: 0, settledEvents: 0, txHashes: [], skipped };
  }
  // Release the non-payable claims before any transaction is submitted
  await releaseClaims(supabase, releaseIds);

  const { txHashes, settledEvents } = await settleChunks(
    supabase,
    walletClient,
    publicClient,
    contractAddress,
    payable
  );

  return {
    settledGroups: payable.length,
    settledEvents,
    txHashes,
    skipped,
  };
}
