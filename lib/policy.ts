import { createAdminClient } from "@/lib/supabase/admin";
import { getUtcDayRange, getUtcMonthRange, type SpendWindow } from "@/lib/time";

export { getUtcDayRange, getUtcMonthRange } from "@/lib/time";

export interface PolicyEvaluation {
  policy: {
    spend_limit_daily: string | number | null;
    spend_limit_monthly: string | number | null;
  } | null;
  dailySpend: number;
  monthlySpend: number;
}

async function sumSpend(
  supabase: ReturnType<typeof createAdminClient>,
  keyIds: string[],
  window: SpendWindow
): Promise<number> {
  const { data } = await supabase
    .from("usage_events_pactum")
    .select("cost")
    .in("api_key_id", keyIds)
    .gte("created_at", window.start)
    .lte("created_at", window.end);
  return (data || []).reduce((sum, e) => sum + Number(e.cost), 0);
}

/**
 * Evaluate the active spend policy for a project: the policy row plus the
 * project's total spend for the current UTC day and month (across all of its
 * API keys). Shared by /usage/track (enforcement) and /usage/summary (display).
 */
export async function evaluatePolicy(projectId: string): Promise<PolicyEvaluation> {
  const supabase = createAdminClient();

  const [{ data: policy }, { data: keys }] = await Promise.all([
    supabase
      .from("policies_pactum")
      .select("spend_limit_daily, spend_limit_monthly")
      .eq("project_id", projectId)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("api_keys_pactum").select("id").eq("project_id", projectId),
  ]);

  const keyIds = (keys || []).map((k) => k.id);
  if (keyIds.length === 0) {
    return { policy: policy || null, dailySpend: 0, monthlySpend: 0 };
  }

  const [dailySpend, monthlySpend] = await Promise.all([
    sumSpend(supabase, keyIds, getUtcDayRange()),
    sumSpend(supabase, keyIds, getUtcMonthRange()),
  ]);

  return { policy: policy || null, dailySpend, monthlySpend };
}
