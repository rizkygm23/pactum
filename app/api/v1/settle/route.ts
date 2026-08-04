import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleInvoice, batchSettle, type SettlementTarget } from "@/lib/arc/settlement";
import { getSessionCookie } from "@/lib/auth";

/**
 * POST /api/v1/settle — Trigger settlement for finalized invoices.
 *
 * Settles all finalized invoices for the user's project, transferring
 * USDC on Arc Testnet from the service wallet to the merchant wallet.
 *
 * Body (optional): {
 *   invoice_ids?: string[]  // Specific invoices to settle. Default: all finalized.
 * }
 */
export async function POST(request: Request) {
  const userId = await getSessionCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  // Fetch finalized invoices
  const admin = createAdminClient();
  
  // Verify ownership of project
  const { data: project } = await admin
    .from("projects_pactum")
    .select("id, merchant_wallet_address")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!project) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  if (!project.merchant_wallet_address) {
    return NextResponse.json(
      { error: "Merchant wallet address not set. Update it in Settings." },
      { status: 400 }
    );
  }

  let query = admin
    .from("invoices_pactum")
    .select("*")
    .eq("project_id", project.id)
    .eq("status", "finalized");

  if (body.invoice_ids && body.invoice_ids.length > 0) {
    query = query.in("id", body.invoice_ids);
  }

  const { data: invoices, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!invoices || invoices.length === 0) {
    return NextResponse.json(
      { error: "No finalized invoices to settle" },
      { status: 400 }
    );
  }

  // Mark as settling
  const invoiceIds = invoices.map((inv) => inv.id);
  await admin
    .from("invoices_pactum")
    .update({ status: "settling" })
    .in("id", invoiceIds);

  try {
    // Build settlement targets
    const targets: SettlementTarget[] = invoices.map((inv) => ({
      merchantWallet: project.merchant_wallet_address as `0x${string}`,
      amount: String(inv.total_amount),
      invoiceId: inv.id,
    }));

    // Execute settlement (single or batch)
    const result = await batchSettle(targets);

    // Update invoices to settled + create transaction records
    await admin
      .from("invoices_pactum")
      .update({ status: "settled" })
      .in("id", invoiceIds);

    // Create transaction records for each invoice
    const txRecords = invoices.map((inv) => ({
      invoice_id: inv.id,
      tx_hash: result.txHash,
      chain: "arc-testnet",
      amount: inv.total_amount,
      currency: "USDC",
      status: "confirmed" as const,
      settled_at: result.settledAt.toISOString(),
    }));

    await admin.from("transactions_pactum").insert(txRecords);

    return NextResponse.json({
      settled: true,
      invoice_count: invoices.length,
      total_amount: result.amount,
      tx_hash: result.txHash,
      explorer_url: result.explorerUrl,
      settled_at: result.settledAt.toISOString(),
    });
  } catch (err) {
    // Revert to finalized on failure
    await admin
      .from("invoices_pactum")
      .update({ status: "failed" })
      .in("id", invoiceIds);

    const message = err instanceof Error ? err.message : "Settlement failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
