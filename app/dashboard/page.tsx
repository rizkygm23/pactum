import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard } from "@/components/ui/StatCard";
import { explorerTxUrl } from "@/lib/arc/config";
import { getSessionCookie } from "@/lib/auth";
import { USAGE_STATUS } from "@/lib/usage-status";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AvatarInitial } from "@/components/ui/AvatarInitial";
import { EmptyState } from "@/components/ui/EmptyState";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { Activity, Zap, Plus, BookOpen, ExternalLink } from "lucide-react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default async function DashboardOverview() {
  const userId = await getSessionCookie();
  if (!userId) redirect("/login");

  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects_pactum")
    .select("id, name, merchant_wallet_address")
    .eq("user_id", userId)
    .limit(1)
    .single();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [
    { count: activeKeys },
    { count: revokedKeys },
    { data: todayEvents },
    { data: recentTxs },
    { data: allSettled },
  ] = await Promise.all([
    supabase.from("api_keys_pactum").select("id", { count: "exact", head: true })
      .eq("project_id", project?.id ?? "").eq("status", "active"),
    supabase.from("api_keys_pactum").select("id", { count: "exact", head: true })
      .eq("project_id", project?.id ?? "").eq("status", "revoked"),
    supabase.from("usage_events_pactum")
      .select("cost, api_keys_pactum!inner(project_id)")
      .eq("api_keys_pactum.project_id", project?.id ?? "")
      .gte("created_at", todayStart.toISOString()),
    supabase.from("usage_events_pactum")
      .select("id, cost, user_address, created_at, status, endpoint, settled_tx_hash, api_keys_pactum!inner(project_id)")
      .eq("api_keys_pactum.project_id", project?.id ?? "")
      .order("created_at", { ascending: false }).limit(8),
    supabase.from("usage_events_pactum")
      .select("cost, api_keys_pactum!inner(project_id)")
      .eq("api_keys_pactum.project_id", project?.id ?? "")
      .eq("status", USAGE_STATUS.SETTLED),
  ]);

  const todaySpend   = (todayEvents  || []).reduce((s, e) => s + Number(e.cost), 0);
  const totalSettled = (allSettled   || []).reduce((s, e) => s + Number(e.cost), 0);
  const hasWallet    = Boolean(project?.merchant_wallet_address);
  const hasKeys      = (activeKeys ?? 0) > 0;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle={`${project?.name || "Your project"} — real-time billing status`}
      />

      <OnboardingChecklist hasWallet={hasWallet} hasKeys={hasKeys} />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Today's Usage"  value={todaySpend.toFixed(4)} unit="USDC" />
        <StatCard label="Active API Keys" value={activeKeys || 0}
          sub={(revokedKeys ?? 0) > 0 ? `${revokedKeys} revoked` : undefined} />
        <StatCard label="Total Settled"  value={totalSettled.toFixed(2)} unit="USDC" />
        <StatCard label="Events Today"   value={(todayEvents || []).length} />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { href: "/dashboard/payouts",  Icon: Zap,      label: "Settle pending" },
          { href: "/dashboard/settings", Icon: Plus,     label: "New API key" },
          { href: "/docs",               Icon: BookOpen, label: "View docs" },
        ].map(({ href, Icon, label }) => (
          <Link key={href} href={href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e7eaf0] bg-white px-3 py-1.5 text-xs font-medium text-[#404040] hover:bg-[#f9fafb] hover:text-[#030303] transition-colors">
            <Icon className="w-3 h-3" /> {label}
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-[#e7eaf0] bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7eaf0]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#939393]">Recent Activity</h2>
          <Link href="/dashboard/usage"
            className="inline-flex items-center gap-1 rounded-lg border border-[#e7eaf0] px-3 py-1.5 text-xs font-medium text-[#404040] hover:bg-[#f9fafb] transition-colors">
            <Activity className="w-3 h-3" /> View all
          </Link>
        </div>

        {(!recentTxs || recentTxs.length === 0) ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Metered calls appear here once recorded. Integrate and start tracking usage."
            action={<Link href="/docs" className="text-xs font-semibold text-[#030303] underline underline-offset-2">Integration Guide →</Link>}
          />
        ) : (
          <div className="divide-y divide-[#e7eaf0]">
            {recentTxs.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 sm:gap-4 hover:bg-[#f9fafb] transition-colors">
                <AvatarInitial seed={tx.user_address || "??"} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-[#030303] truncate max-w-[180px]">
                      {tx.user_address || "Unknown"}
                    </span>
                    {tx.endpoint && (
                      <span className="hidden sm:inline font-mono text-[10px] text-[#939393] truncate">
                        · {tx.endpoint}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#676f7b] mt-0.5">{timeAgo(tx.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-mono text-sm font-medium text-[#030303]">
                    {Number(tx.cost).toFixed(6)}{" "}
                    <span className="text-xs text-[#939393]">USDC</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={tx.status} />
                    {tx.settled_tx_hash && (
                      <a href={explorerTxUrl(tx.settled_tx_hash)} target="_blank" rel="noopener noreferrer"
                        className="text-[#939393] hover:text-[#030303] transition-colors" title="View on explorer">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
