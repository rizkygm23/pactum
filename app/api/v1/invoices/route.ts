import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionCookie } from "@/lib/auth";
import { generateInvoice, getTodayRange, getMonthRange } from "@/lib/invoices";

/**
 * GET /api/v1/invoices — List invoices for the user's project.
 */
export async function GET(request: Request) {
  const userId = await getSessionCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects_pactum")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!project) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("invoices_pactum")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: invoices, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoices });
}

/**
 * POST /api/v1/invoices — Generate a new invoice.
 *
 * Body: {
 *   period?: "daily" | "monthly",   // default "daily"
 *   period_start?: string,           // ISO date — overrides period
 *   period_end?: string              // ISO date — overrides period
 * }
 */
export async function POST(request: Request) {
  const userId = await getSessionCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects_pactum")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!project) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  let periodStart: Date;
  let periodEnd: Date;

  if (body.period_start && body.period_end) {
    periodStart = new Date(body.period_start);
    periodEnd = new Date(body.period_end);
  } else if (body.period === "monthly") {
    const range = getMonthRange();
    periodStart = range.start;
    periodEnd = range.end;
  } else {
    const range = getTodayRange();
    periodStart = range.start;
    periodEnd = range.end;
  }

  try {
    const invoice = await generateInvoice({
      projectId: project.id,
      periodStart,
      periodEnd,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
