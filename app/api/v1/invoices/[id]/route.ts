import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionCookie } from "@/lib/auth";
import { finalizeInvoice } from "@/lib/invoices";

/**
 * GET /api/v1/invoices/[id] — Invoice detail with usage breakdown.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getSessionCookie();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: invoice } = await supabase
    .from("invoices_pactum")
    .select("*, projects_pactum!inner(user_id)")
    .eq("id", id)
    .single();

  // @ts-ignore
  if (!invoice || invoice.projects_pactum?.user_id !== userId) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  // Fetch transaction if settled
  const { data: transaction } = await supabase
    .from("transactions_pactum")
    .select("*")
    .eq("invoice_id", id)
    .single();

  // Fetch usage events breakdown
  const admin = createAdminClient();
  const { data: keys } = await admin
    .from("api_keys_pactum")
    .select("id")
    .eq("project_id", invoice.project_id);

  const keyIds = (keys || []).map((k) => k.id);

  const { data: usageEvents } = await admin
    .from("usage_events_pactum")
    .select("id, endpoint, quantity, unit_price, cost, created_at")
    .in("api_key_id", keyIds)
    .gte("created_at", invoice.period_start)
    .lte("created_at", invoice.period_end)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    invoice,
    transaction: transaction || null,
    usage_events: usageEvents || [],
  });
}

/**
 * PUT /api/v1/invoices/[id] — Finalize a draft invoice.
 */
export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getSessionCookie();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Verify ownership since RLS is disabled
  const { data: invoice } = await supabase
    .from("invoices_pactum")
    .select("id, status, projects_pactum!inner(user_id)")
    .eq("id", id)
    .single();

  // @ts-ignore
  if (!invoice || invoice.projects_pactum?.user_id !== userId) {
    return NextResponse.json({ error: "Invoice not found or unauthorized" }, { status: 404 });
  }

  try {
    await finalizeInvoice(id);
    return NextResponse.json({ finalized: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to finalize";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
