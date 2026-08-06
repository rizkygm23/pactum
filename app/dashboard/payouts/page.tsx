import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DataLabel } from "@/components/ui/DataLabel";
import { SettleButton } from "@/components/ui/SettleButton";
import { WithdrawWidget } from "@/components/ui/WithdrawWidget";

export default async function PayoutsPage() {
  const userId = await getSessionCookie();

  if (!userId) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  // Get project
  const { data: project } = await supabase
    .from("projects_pactum")
    .select("id, merchant_wallet_address")
    .eq("user_id", userId)
    .limit(1)
    .single();

  // Get Pending Payouts (Unsettled usage)
  const { data: pendingEvents } = await supabase
    .from("usage_events_pactum")
    .select("cost, api_keys_pactum!inner(project_id)")
    .eq("api_keys_pactum.project_id", project?.id ?? "")
    .eq("status", "pending_settlement");

  const totalPending = (pendingEvents || []).reduce((sum, e) => sum + Number(e.cost), 0);

  // Get Settled Payouts (History)
  const { data: settledEvents } = await supabase
    .from("usage_events_pactum")
    .select("id, cost, user_address, created_at, endpoint, api_keys_pactum!inner(project_id)")
    .eq("api_keys_pactum.project_id", project?.id ?? "")
    .eq("status", "settled")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 sm:mb-8 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0">
          <h1
            className="text-xl sm:text-2xl font-semibold text-parchment"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Payouts
          </h1>
          <p className="text-sm text-foreground-dim mt-1">
            Settlement history from the Smart Contract to your wallet.
          </p>
        </div>
        <div className="bg-graphite px-4 py-3 rounded-lg border border-border flex flex-col items-start gap-1 lg:items-end lg:shrink-0">
          <span className="text-xs text-foreground-dim uppercase tracking-wider">Pending Payout</span>
          <div className="flex items-baseline gap-2">
             <span className="data-mono text-lg sm:text-xl text-rust font-semibold">{totalPending.toFixed(6)}</span>
             <span className="text-sm text-foreground-dim">USDC</span>
          </div>
          <SettleButton disabled={totalPending <= 0} />
        </div>
      </div>

      <WithdrawWidget expectedMerchantAddress={project?.merchant_wallet_address || null} />

      <div className="mt-8 sm:mt-10 overflow-hidden bg-ink-navy border border-border rounded-xl">
        {(!settledEvents || settledEvents.length === 0) ? (
          <div className="text-center py-12 px-4">
            <p className="text-foreground-dim text-sm">
              No settlement history yet.
            </p>
          </div>
        ) : (
          /* Four columns held at a readable width; the table pans below `md`. */
          <div className="overflow-x-auto">
            <div className="min-w-[40rem] md:min-w-0">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[10px] text-foreground-dim uppercase tracking-wider border-b border-border-strong bg-graphite/50">
                <div className="col-span-3">User Address</div>
                <div className="col-span-3">Model</div>
                <div className="col-span-3 text-right">Amount (USDC)</div>
                <div className="col-span-3 text-right">Date</div>
              </div>

              <div className="divide-y divide-border">
                {settledEvents.map((event) => (
                  <div
                    key={event.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="col-span-3 min-w-0 text-sm text-parchment">
                      <DataLabel value={event.user_address || "Unknown"} truncate />
                    </div>
                    <div className="col-span-3 min-w-0 text-sm text-parchment font-mono truncate">
                      {event.endpoint || "Unknown"}
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="data-mono text-parchment font-medium">
                        {Number(event.cost).toFixed(6)}
                      </span>
                    </div>
                    <div className="col-span-3 text-right text-xs text-foreground-dim">
                      {new Date(event.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
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
