import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionCookie } from "@/lib/auth";

/**
 * GET /api/v1/usage/summary — Usage summary for the current user's project.
 * Returns: total usage today, this month, remaining limits.
 */
export async function GET() {
  const userId = await getSessionCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get user's project
  const { data: project } = await supabase
    .from("projects_pactum")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!project) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  // Get all API keys for project
  const { data: keys } = await supabase
    .from("api_keys_pactum")
    .select("id")
    .eq("project_id", project.id);

  const keyIds = (keys || []).map((k) => k.id);

  if (keyIds.length === 0) {
    return NextResponse.json({
      daily_spend: 0,
      monthly_spend: 0,
      daily_limit: null,
      monthly_limit: null,
      remaining_daily: null,
      remaining_monthly: null,
      total_events_today: 0,
    });
  }

  // Today's usage
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: dailyEvents } = await supabase
    .from("usage_events_pactum")
    .select("cost")
    .in("api_key_id", keyIds)
    .gte("created_at", todayStart.toISOString());

  const dailySpend = (dailyEvents || []).reduce(
    (sum, e) => sum + Number(e.cost),
    0
  );

  // Monthly usage
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data: monthlyEvents } = await supabase
    .from("usage_events_pactum")
    .select("cost")
    .in("api_key_id", keyIds)
    .gte("created_at", monthStart.toISOString());

  const monthlySpend = (monthlyEvents || []).reduce(
    (sum, e) => sum + Number(e.cost),
    0
  );

  // Get policy
  const { data: policy } = await supabase
    .from("policies_pactum")
    .select("spend_limit_daily, spend_limit_monthly")
    .eq("project_id", project.id)
    .eq("status", "active")
    .single();

  const dailyLimit = policy ? Number(policy.spend_limit_daily) : null;
  const monthlyLimit = policy ? Number(policy.spend_limit_monthly) : null;

  return NextResponse.json({
    daily_spend: dailySpend,
    monthly_spend: monthlySpend,
    daily_limit: dailyLimit,
    monthly_limit: monthlyLimit,
    remaining_daily: dailyLimit !== null ? Math.max(0, dailyLimit - dailySpend) : null,
    remaining_monthly: monthlyLimit !== null ? Math.max(0, monthlyLimit - monthlySpend) : null,
    total_events_today: (dailyEvents || []).length,
  });
}
