import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionCookie } from "@/lib/auth";

/**
 * GET /api/v1/policies — Get active policy for the user's project.
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
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: policy, error } = await supabase
    .from("policies_pactum")
    .select("*")
    .eq("project_id", project.id)
    .eq("status", "active")
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ policy: policy || null });
}

/**
 * PUT /api/v1/policies — Update policy for the user's project.
 */
export async function PUT(request: Request) {
  const userId = await getSessionCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await request.json().catch(() => ({}));
  
  const { data: project } = await supabase
    .from("projects_pactum")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check if policy exists
  const { data: existing } = await supabase
    .from("policies_pactum")
    .select("id")
    .eq("project_id", project.id)
    .eq("status", "active")
    .single();

  // Validate limits — a negative or NaN limit would block every metered call
  const daily = Number(body.spend_limit_daily ?? 100);
  const monthly = Number(body.spend_limit_monthly ?? 3000);
  if (!Number.isFinite(daily) || daily < 0 || !Number.isFinite(monthly) || monthly < 0) {
    return NextResponse.json(
      { error: "spend_limit_daily and spend_limit_monthly must be non-negative numbers" },
      { status: 400 }
    );
  }

  const policyData = {
    project_id: project.id,
    spend_limit_daily: daily,
    spend_limit_monthly: monthly,
    allowlist: body.allowlist ?? [],
    status: "active" as const,
    updated_at: new Date().toISOString(),
  };

  let result;

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from("policies_pactum")
      .update(policyData)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from("policies_pactum")
      .insert([policyData])
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  return NextResponse.json({ policy: result });
}
