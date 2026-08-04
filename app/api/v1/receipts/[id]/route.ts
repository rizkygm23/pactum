import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionCookie } from "@/lib/auth";
import { explorerTxUrl } from "@/lib/arc/config";

/**
 * GET /api/v1/receipts/[id] — Get receipt (transaction detail) for an invoice.
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

  // Get transaction and verify ownership via project link
  const { data: transaction, error } = await supabase
    .from("transactions_pactum")
    .select(`
      *,
      invoices_pactum!inner (
        id,
        project_id,
        period_start,
        period_end,
        total_amount,
        status,
        created_at,
        projects_pactum!inner (
          user_id
        )
      )
    `)
    .eq("id", id)
    .single();

  // @ts-ignore
  if (error || !transaction || transaction.invoices_pactum?.projects_pactum?.user_id !== userId) {
    return NextResponse.json({ error: "Receipt not found or unauthorized" }, { status: 404 });
  }

  return NextResponse.json({
    receipt: {
      id: transaction.id,
      invoice_id: transaction.invoice_id,
      tx_hash: transaction.tx_hash,
      chain: transaction.chain,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      settled_at: transaction.settled_at,
      explorer_url: transaction.tx_hash
        ? explorerTxUrl(transaction.tx_hash)
        : null,
      invoice: transaction.invoices_pactum,
    },
  });
}
