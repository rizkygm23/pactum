import { createAdminClient } from "@/lib/supabase/admin";
import { getUtcDayRange, getUtcMonthRange } from "@/lib/time";

interface GenerateInvoiceParams {
  projectId: string;
  periodStart: Date | string;
  periodEnd: Date | string;
}

interface InvoiceWithBreakdown {
  id: string;
  project_id: string;
  period_start: string;
  period_end: string;
  total_amount: string;
  status: string;
  created_at: string;
  usage_events?: Array<{
    id: string;
    endpoint: string | null;
    quantity: string | number | null;
    unit_price: string | number | null;
    cost: string | number | null;
    created_at: string;
  }>;
}

/**
 * Generate an invoice by aggregating usage events for a project within a period.
 *
 * Flow:
 * 1. Fetch all API keys for the project
 * 2. Sum usage_events.cost for those keys within the period
 * 3. Create invoice record with total_amount
 */
export async function generateInvoice(
  params: GenerateInvoiceParams
): Promise<InvoiceWithBreakdown> {
  const supabase = createAdminClient();

  // Get all API key IDs for this project
  const { data: keys, error: keysError } = await supabase
    .from("api_keys_pactum")
    .select("id")
    .eq("project_id", params.projectId);

  if (keysError) throw new Error(`Failed to fetch API keys: ${keysError.message}`);
  if (!keys || keys.length === 0) {
    throw new Error("No API keys found for this project");
  }

  const keyIds = keys.map((k) => k.id);

  // Aggregate usage events for the period
  const { data: usageEvents, error: usageError } = await supabase
    .from("usage_events_pactum")
    .select("id, endpoint, quantity, unit_price, cost, created_at")
    .in("api_key_id", keyIds)
    .gte("created_at", new Date(params.periodStart).toISOString())
    .lte("created_at", new Date(params.periodEnd).toISOString())
    .order("created_at", { ascending: true });

  if (usageError) throw new Error(`Failed to fetch usage: ${usageError.message}`);

  // Calculate total
  const totalAmount = (usageEvents || []).reduce(
    (sum, event) => sum + Number(event.cost),
    0
  );

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices_pactum")
    .insert({
      project_id: params.projectId,
      period_start: new Date(params.periodStart).toISOString(),
      period_end: new Date(params.periodEnd).toISOString(),
      total_amount: totalAmount,
      status: "draft",
    })
    .select()
    .single();

  if (invoiceError) throw new Error(`Failed to create invoice: ${invoiceError.message}`);

  return {
    ...invoice,
    usage_events: usageEvents || [],
  };
}

/**
 * Finalize an invoice — lock it so no more usage can be attributed.
 * Only draft invoices can be finalized.
 */
export async function finalizeInvoice(invoiceId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: invoice, error: fetchError } = await supabase
    .from("invoices_pactum")
    .select("status")
    .eq("id", invoiceId)
    .single();

  if (fetchError) throw new Error(`Invoice not found: ${fetchError.message}`);
  if (invoice.status !== "draft") {
    throw new Error(`Cannot finalize invoice with status: ${invoice.status}`);
  }

  const { error: updateError } = await supabase
    .from("invoices_pactum")
    .update({ status: "finalized" })
    .eq("id", invoiceId);

  if (updateError) throw new Error(`Failed to finalize: ${updateError.message}`);
}

export { getUtcDayRange as getTodayRange, getUtcMonthRange as getMonthRange };
