import { getSessionCookie } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export default async function UsagePage() {
  const userId = await getSessionCookie();

  if (!userId) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  // Get project and keys
  const { data: project } = await supabase
    .from("projects_pactum")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  const [
    { data: keys },
    { data: policy }
  ] = await Promise.all([
    supabase
      .from("api_keys_pactum")
      .select("id, key_prefix")
      .eq("project_id", project?.id ?? ""),
    supabase
      .from("policies_pactum")
      .select("spend_limit_daily, spend_limit_monthly")
      .eq("project_id", project?.id ?? "")
      .eq("status", "active")
      .single()
  ]);

  const keyIds = (keys || []).map((k) => k.id);
  const keyMap = Object.fromEntries((keys || []).map((k) => [k.id, k.key_prefix]));

  // Get recent usage events
  const { data: events } = await supabase
    .from("usage_events_pactum")
    .select("*")
    .in("api_key_id", keyIds.length > 0 ? keyIds : ["none"])
    .order("created_at", { ascending: false })
    .limit(100);

  // Calculate today's and monthly spend
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const todaySpend = (events || [])
    .filter((e) => new Date(e.created_at) >= todayStart)
    .reduce((sum, e) => sum + Number(e.cost), 0);

  const monthSpend = (events || [])
    .filter((e) => new Date(e.created_at) >= monthStart)
    .reduce((sum, e) => sum + Number(e.cost), 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1
          className="text-xl sm:text-2xl font-semibold text-parchment"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Usage Log
        </h1>
        <p className="text-sm text-foreground-dim mt-1">
          Real-time record of all metered API calls
        </p>
      </div>

      {/* Spend summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="card">
          <span className="text-[10px] text-foreground-dim uppercase tracking-wider">Daily Spend</span>
          <div className="mt-1">
            <span className="data-mono text-lg text-parchment">{todaySpend.toFixed(4)}</span>
            {policy && (
              <span className="text-xs text-foreground-dim ml-1">
                / {Number(policy.spend_limit_daily).toFixed(2)}
              </span>
            )}
          </div>
          {policy && (
            <div className="mt-2 h-1.5 bg-ink-navy rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (todaySpend / Number(policy.spend_limit_daily)) * 100)}%`,
                  background: todaySpend / Number(policy.spend_limit_daily) > 0.9
                    ? "var(--color-rust)"
                    : "var(--color-teal)",
                }}
              />
            </div>
          )}
        </div>

        <div className="card">
          <span className="text-[10px] text-foreground-dim uppercase tracking-wider">Monthly Spend</span>
          <div className="mt-1">
            <span className="data-mono text-lg text-parchment">{monthSpend.toFixed(4)}</span>
            {policy && (
              <span className="text-xs text-foreground-dim ml-1">
                / {Number(policy.spend_limit_monthly).toFixed(2)}
              </span>
            )}
          </div>
          {policy && (
            <div className="mt-2 h-1.5 bg-ink-navy rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (monthSpend / Number(policy.spend_limit_monthly)) * 100)}%`,
                  background: monthSpend / Number(policy.spend_limit_monthly) > 0.9
                    ? "var(--color-rust)"
                    : "var(--color-teal)",
                }}
              />
            </div>
          )}
        </div>

        <div className="card">
          <span className="text-[10px] text-foreground-dim uppercase tracking-wider">Events Today</span>
          <div className="mt-1">
            <span className="data-mono text-lg text-parchment">
              {(events || []).filter((e) => new Date(e.created_at) >= todayStart).length}
            </span>
          </div>
        </div>

        <div className="card">
          <span className="text-[10px] text-foreground-dim uppercase tracking-wider">Active Keys</span>
          <div className="mt-1">
            <span className="data-mono text-lg text-parchment">{keyIds.length}</span>
          </div>
        </div>
      </div>

      {/* Usage events ledger */}
      <div className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 className="text-sm font-medium text-parchment uppercase tracking-wider">
            Event Log
          </h2>
          <span className="text-xs text-foreground-dim">
            Showing last 100 events
          </span>
        </div>

        {(!events || events.length === 0) ? (
          <div className="text-center py-12">
            <p className="text-foreground-dim text-sm">
              No usage events recorded yet. Integrate the SDK and start tracking.
            </p>
            <code className="mt-4 inline-block max-w-full overflow-x-auto text-left text-xs data-mono text-brass/70 bg-ink-navy px-4 py-2 rounded-md">
              curl -X POST /api/v1/usage/track -H &quot;X-API-Key: pactum_...&quot;
            </code>
          </div>
        ) : (
          /*
            The ledger keeps its six columns and scrolls sideways below
            `md`. Squashing six numeric columns into 320px makes every
            figure unreadable, so the row width is held and the whole
            table pans instead.
          */
          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
            <div className="min-w-[44rem] md:min-w-0">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-2 py-2 text-[10px] text-foreground-dim uppercase tracking-wider border-b border-border-strong">
                <div className="col-span-2">Time</div>
                <div className="col-span-3">Endpoint</div>
                <div className="col-span-2">API Key</div>
                <div className="col-span-1 text-right">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Cost</div>
              </div>

              {events.map((event) => (
                <div
                  key={event.id}
                  className="ledger-row grid grid-cols-12 gap-2 px-2 items-center"
                >
                  <div className="col-span-2 text-xs text-foreground-dim">
                    {new Date(event.created_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                  <div className="col-span-3 min-w-0 text-sm text-parchment data-mono truncate">
                    {event.endpoint}
                  </div>
                  <div className="col-span-2 min-w-0 text-xs text-foreground-dim data-mono truncate">
                    {keyMap[event.api_key_id] || "—"}
                  </div>
                  <div className="col-span-1 text-right text-sm data-mono text-parchment">
                    {Number(event.quantity).toFixed(0)}
                  </div>
                  <div className="col-span-2 text-right text-sm data-mono text-foreground-dim">
                    ${Number(event.unit_price).toFixed(4)}
                  </div>
                  <div className="col-span-2 text-right text-sm data-mono text-parchment font-medium">
                    ${Number(event.cost).toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
