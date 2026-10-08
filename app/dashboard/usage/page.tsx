import { getSessionCookie } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUtcDayRange, getUtcMonthRange } from "@/lib/policy";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { UsageFilterTable } from "./UsageFilterTable";
import { Activity } from "lucide-react";
import Link from "next/link";

export default async function UsagePage() {
  const userId = await getSessionCookie();
  if (!userId) redirect("/login");

  const supabase = createAdminClient();
  const { data: project } = await supabase.from("projects_pactum").select("id").eq("user_id", userId).limit(1).single();

  const [{ data: keys }, { data: policy }] = await Promise.all([
    supabase.from("api_keys_pactum").select("id, key_prefix").eq("project_id", project?.id ?? ""),
    supabase.from("policies_pactum").select("spend_limit_daily, spend_limit_monthly")
      .eq("project_id", project?.id ?? "").eq("status", "active").single(),
  ]);

  const keyIds      = (keys || []).map((k) => k.id);
  const keyMap      = Object.fromEntries((keys || []).map((k) => [k.id, k.key_prefix]));
  const keyFilter   = keyIds.length > 0 ? keyIds : ["none"];
  const dayWindow   = getUtcDayRange();
  const monthWindow = getUtcMonthRange();

  const [{ data: events }, { data: dailyCosts }, { count: eventsToday }, { data: monthlyCosts }] = await Promise.all([
    supabase.from("usage_events_pactum").select("*").in("api_key_id", keyFilter).order("created_at", { ascending: false }).limit(200),
    supabase.from("usage_events_pactum").select("cost").in("api_key_id", keyFilter).gte("created_at", dayWindow.start).lte("created_at", dayWindow.end),
    supabase.from("usage_events_pactum").select("id", { count: "exact", head: true }).in("api_key_id", keyFilter).gte("created_at", dayWindow.start).lte("created_at", dayWindow.end),
    supabase.from("usage_events_pactum").select("cost").in("api_key_id", keyFilter).gte("created_at", monthWindow.start).lte("created_at", monthWindow.end),
  ]);

  const todaySpend   = (dailyCosts   || []).reduce((s, e) => s + Number(e.cost), 0);
  const monthSpend   = (monthlyCosts || []).reduce((s, e) => s + Number(e.cost), 0);
  const dailyLimit   = policy ? Number(policy.spend_limit_daily)   : null;
  const monthlyLimit = policy ? Number(policy.spend_limit_monthly) : null;
  const dailyPct     = dailyLimit   ? Math.min(100, (todaySpend / dailyLimit)   * 100) : null;
  const monthlyPct   = monthlyLimit ? Math.min(100, (monthSpend / monthlyLimit) * 100) : null;

  return (
    <div>
      <PageHeader title="Usage Log" subtitle="Real-time record of all metered API calls" />

      {/* Spend summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Daily */}
        <div className="rounded-xl border border-[#e7eaf0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">Daily Spend</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-mono text-xl text-[#030303]">{todaySpend.toFixed(4)}</span>
            {dailyLimit && <span className="text-xs text-[#676f7b]">/ {dailyLimit.toFixed(2)} USDC</span>}
          </div>
          {dailyPct !== null
            ? <div className="mt-2"><ProgressBar pct={dailyPct} /><p className="text-[10px] text-[#939393] mt-1">{dailyPct.toFixed(0)}% of limit</p></div>
            : <p className="mt-2 text-[10px] text-[#939393]">No limit set · <Link href="/dashboard/settings" className="underline">Set limit</Link></p>}
        </div>

        {/* Monthly */}
        <div className="rounded-xl border border-[#e7eaf0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">Monthly Spend</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-mono text-xl text-[#030303]">{monthSpend.toFixed(4)}</span>
            {monthlyLimit && <span className="text-xs text-[#676f7b]">/ {monthlyLimit.toFixed(2)} USDC</span>}
          </div>
          {monthlyPct !== null
            ? <div className="mt-2"><ProgressBar pct={monthlyPct} /><p className="text-[10px] text-[#939393] mt-1">{monthlyPct.toFixed(0)}% of limit</p></div>
            : <p className="mt-2 text-[10px] text-[#939393]">No limit set</p>}
        </div>

        <div className="rounded-xl border border-[#e7eaf0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">Events Today</span>
          <div className="mt-1"><span className="font-mono text-xl text-[#030303]">{eventsToday ?? 0}</span></div>
        </div>

        <div className="rounded-xl border border-[#e7eaf0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">Active Keys</span>
          <div className="mt-1"><span className="font-mono text-xl text-[#030303]">{keyIds.length}</span></div>
        </div>
      </div>

      {(!events || events.length === 0) ? (
        <div className="rounded-xl border border-[#e7eaf0] bg-white overflow-hidden">
          <EmptyState
            icon={Activity}
            title="No usage events yet"
            description="Integrate the SDK and start tracking API calls. They'll appear here in real time."
            action={<Link href="/docs/integration-guide" className="text-xs font-semibold text-[#030303] underline underline-offset-2">Integration Guide →</Link>}
          />
        </div>
      ) : (
        <UsageFilterTable
          events={events.map((e) => ({
            ...e,
            endpoint:   e.endpoint   ?? "",
            quantity:   e.quantity   ?? "0",
            unit_price: e.unit_price ?? "0",
            cost:       e.cost       ?? "0",
            status:     e.status     ?? "pending",
          }))}
          keyMap={keyMap}
        />
      )}
    </div>
  );
}
