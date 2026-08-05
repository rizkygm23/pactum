import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard } from "@/components/ui/StatCard";
import { DataLabel } from "@/components/ui/DataLabel";
import { SealBadge } from "@/components/ui/SealBadge";
import { explorerTxUrl } from "@/lib/arc/config";
import { getSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardOverview() {
  const userId = await getSessionCookie();

  if (!userId) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  // Get project
  const { data: project } = await supabase
    .from("projects_pactum")
    .select("id, name, merchant_wallet_address")
    .eq("user_id", userId)
    .limit(1)
    .single();

  // Get API keys count
  const { count: activeKeys } = await supabase
    .from("api_keys_pactum")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project?.id ?? "")
    .eq("status", "active");

  // Today's usage
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: todayEvents } = await supabase
    .from("usage_events_pactum")
    .select("cost, api_keys_pactum!inner(project_id)")
    .eq("api_keys_pactum.project_id", project?.id ?? "")
    .gte("created_at", todayStart.toISOString());

  const todaySpend = (todayEvents || []).reduce(
    (sum, e) => sum + Number(e.cost),
    0
  );
  // Recent Settlements
  const { data: recentTxs } = await supabase
    .from("usage_events_pactum")
    .select("id, cost, user_address, created_at, status, api_keys_pactum!inner(project_id)")
    .eq("api_keys_pactum.project_id", project?.id ?? "")
    .eq("status", "settled")
    .order("created_at", { ascending: false })
    .limit(5);

  // Total settled
  const { data: allSettled } = await supabase
    .from("usage_events_pactum")
    .select("cost, api_keys_pactum!inner(project_id)")
    .eq("api_keys_pactum.project_id", project?.id ?? "")
    .eq("status", "settled");

  const totalSettled = (allSettled || []).reduce(
    (sum, event) => sum + Number(event.cost),
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1
          className="text-xl sm:text-2xl font-semibold text-parchment"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Overview
        </h1>
        <p className="text-sm text-foreground-dim mt-1 break-words">
          {project?.name || "Your project"} — real-time billing status
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard
          label="Today's Usage"
          value={todaySpend.toFixed(4)}
          unit="USDC"
        />
        <StatCard
          label="Active API Keys"
          value={activeKeys || 0}
        />
        <StatCard
          label="Total Settled"
          value={totalSettled.toFixed(2)}
          unit="USDC"
        />
        <StatCard
          label="Events Today"
          value={(todayEvents || []).length}
        />
      </div>

      {/* Recent transactions */}
      <div className="card">
        <h2 className="text-sm font-medium text-parchment mb-4 uppercase tracking-wider">
          Recent Settlements
        </h2>

        {(!recentTxs || recentTxs.length === 0) ? (
          <div className="text-center py-12">
            <p className="text-foreground-dim text-sm">
              No settlements yet. Generate an invoice and trigger settlement to see
              transactions here.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {recentTxs.map((tx) => (
              <div
                key={tx.id}
                className="ledger-row flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full border border-border flex items-center justify-center bg-brass/10">
                    <span className="text-brass text-base">✓</span>
                  </div>
                  <div className="min-w-0">
                    <DataLabel
                      value={tx.user_address || "Unknown User"}
                      truncate
                    />
                    <p className="text-xs text-foreground-dim mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1">
                  <div className="no-wrap">
                    <span
                      className="data-mono text-base sm:text-lg text-parchment"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {Number(tx.cost).toFixed(6)}
                    </span>
                    <span className="text-xs text-foreground-dim ml-1">
                      USDC
                    </span>
                  </div>
                  <span className="status-settled no-wrap">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
