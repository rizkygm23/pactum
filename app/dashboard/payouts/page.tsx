import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionCookie } from "@/lib/auth";
import { USAGE_STATUS } from "@/lib/usage-status";
import { redirect } from "next/navigation";
import { SettleButton } from "@/components/ui/SettleButton";
import { WithdrawWidget } from "@/components/ui/WithdrawWidget";
import { explorerTxUrl } from "@/lib/arc/config";
import { PageHeader } from "@/components/ui/PageHeader";
import { AvatarInitial } from "@/components/ui/AvatarInitial";
import { CopyButton } from "@/components/ui/CopyButton";
import { ExternalLink, Zap } from "lucide-react";

export default async function PayoutsPage() {
  const userId = await getSessionCookie();
  if (!userId) redirect("/login");

  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects_pactum")
    .select("id, merchant_wallet_address")
    .eq("user_id", userId).limit(1).single();

  const [{ data: pendingEvents }, { data: settledEvents }] = await Promise.all([
    supabase.from("usage_events_pactum")
      .select("cost, api_keys_pactum!inner(project_id)")
      .eq("api_keys_pactum.project_id", project?.id ?? "")
      .eq("status", USAGE_STATUS.PENDING),
    supabase.from("usage_events_pactum")
      .select("id, cost, user_address, created_at, endpoint, settled_tx_hash, api_keys_pactum!inner(project_id)")
      .eq("api_keys_pactum.project_id", project?.id ?? "")
      .eq("status", USAGE_STATUS.SETTLED)
      .order("created_at", { ascending: false }).limit(50),
  ]);

  const totalPending    = (pendingEvents  || []).reduce((s, e) => s + Number(e.cost), 0);
  const totalSettledAmt = (settledEvents  || []).reduce((s, e) => s + Number(e.cost), 0);
  const hasPending      = totalPending > 0;

  return (
    <div>
      <PageHeader title="Payouts" subtitle="Settlement history from the smart contract to your wallet" />

      {/* Pending + Withdraw */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Pending card */}
        <div className={`rounded-xl border p-5 bg-white ${hasPending ? "border-[#fde68a]" : "border-[#e7eaf0]"}`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">Pending Payout</span>
            {hasPending && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d97706] animate-pulse" />
                <span className="text-xs text-[#b45309] font-medium">Ready to settle</span>
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-semibold tracking-[-0.02em] text-[#030303]">{totalPending.toFixed(6)}</span>
            <span className="text-sm text-[#676f7b]">USDC</span>
          </div>
          <p className="text-xs text-[#676f7b] mb-1">
            {(pendingEvents || []).length} event{(pendingEvents || []).length !== 1 ? "s" : ""} waiting
            {!hasPending && " · nothing to settle"}
          </p>
          <SettleButton disabled={!hasPending} />
        </div>

        {/* Withdraw */}
        <div className="rounded-xl border border-[#e7eaf0] bg-white p-5">
          <WithdrawWidget expectedMerchantAddress={project?.merchant_wallet_address || null} />
        </div>
      </div>

      {/* Settlement history */}
      <div className="rounded-xl border border-[#e7eaf0] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e7eaf0]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#939393]">Settlement History</h2>
          {(settledEvents || []).length > 0 && (
            <p className="text-xs text-[#676f7b] mt-0.5">
              {(settledEvents || []).length} settlements · {totalSettledAmt.toFixed(4)} USDC total
            </p>
          )}
        </div>

        {(!settledEvents || settledEvents.length === 0) ? (
          <div className="flex flex-col items-center py-14 text-center px-4">
            <Zap className="w-8 h-8 text-[#c9ccd1] mb-3" strokeWidth={1.5} />
            <p className="text-sm text-[#676f7b]">No settlement history yet.</p>
            <p className="text-xs text-[#939393] mt-1">Trigger a settlement when pending usage builds up.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[42rem]">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#939393] bg-[#f9fafb] border-b border-[#e7eaf0]">
                <div className="col-span-4">User</div>
                <div className="col-span-3">Endpoint</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-3 text-right">Date / TX</div>
              </div>
              <div className="divide-y divide-[#e7eaf0]">
                {settledEvents.map((event) => (
                  <div key={event.id} className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center hover:bg-[#f9fafb] transition-colors">
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <AvatarInitial seed={event.user_address || "??"} size="sm" />
                      <span className="font-mono text-xs text-[#030303] truncate">{event.user_address || "Unknown"}</span>
                    </div>
                    <div className="col-span-3 font-mono text-xs text-[#676f7b] truncate">{event.endpoint || "—"}</div>
                    <div className="col-span-2 text-right font-mono text-sm font-medium text-[#030303]">{Number(event.cost).toFixed(6)}</div>
                    <div className="col-span-3 text-right">
                      <div className="text-xs text-[#676f7b]">
                        {new Date(event.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {event.settled_tx_hash && (
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="font-mono text-[10px] text-[#939393]">
                            {event.settled_tx_hash.slice(0, 6)}…{event.settled_tx_hash.slice(-4)}
                          </span>
                          <CopyButton text={event.settled_tx_hash} className="hidden sm:inline-flex" />
                          <a href={explorerTxUrl(event.settled_tx_hash)} target="_blank" rel="noopener noreferrer"
                            className="text-[#939393] hover:text-[#030303] transition-colors" title="View on Arc explorer">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
