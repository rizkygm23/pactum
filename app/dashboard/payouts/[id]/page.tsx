import { createAdminClient } from "@/lib/supabase/admin";
import { SealBadge } from "@/components/ui/SealBadge";
import { DataLabel } from "@/components/ui/DataLabel";
import { getSessionCookie } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

export default async function InvoiceDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  const userId = await getSessionCookie();
  if (!userId) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  // Get invoice
  const { data: invoice } = await supabase
    .from("invoices_pactum")
    .select("*")
    .eq("id", id)
    .single();

  if (!invoice) return notFound();

  const [
    { data: tx },
    { data: keys }
  ] = await Promise.all([
    supabase
      .from("transactions_pactum")
      .select("*")
      .eq("invoice_id", id)
      .single(),
    supabase
      .from("api_keys_pactum")
      .select("id, key_prefix")
      .eq("project_id", invoice.project_id)
  ]);

  const keyIds = (keys || []).map((k) => k.id);
  const keyMap = Object.fromEntries((keys || []).map((k) => [k.id, k.key_prefix]));

  const { data: events } = await supabase
    .from("usage_events_pactum")
    .select("*")
    .in("api_key_id", keyIds.length > 0 ? keyIds : ["none"])
    .gte("created_at", invoice.period_start)
    .lte("created_at", invoice.period_end)
    .order("created_at", { ascending: true });

  const statusLabel: Record<string, string> = {
    draft: "Draft",
    finalized: "Finalized",
    settling: "Settling…",
    settled: "Settled",
    failed: "Failed",
  };

  const statusClass: Record<string, string> = {
    draft: "status-pending",
    finalized: "status-pending",
    settling: "status-pending",
    settled: "status-settled",
    failed: "status-failed",
  };

  const isSettled = invoice.status === "settled" && tx?.status === "confirmed";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-semibold text-parchment"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Invoice {id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-foreground-dim mt-1">
            Period: {new Date(invoice.period_start).toLocaleDateString()} — {new Date(invoice.period_end).toLocaleDateString()}
          </p>
        </div>
        <div className={statusClass[invoice.status] || "status-pending"}>
          {statusLabel[invoice.status] || invoice.status}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Usage Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-sm font-medium text-parchment uppercase tracking-wider mb-4">
              Usage Breakdown
            </h2>

            <div className="grid grid-cols-12 gap-2 px-2 py-2 text-[10px] text-foreground-dim uppercase tracking-wider border-b border-border-strong">
              <div className="col-span-4">Endpoint</div>
              <div className="col-span-3">API Key</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-3 text-right">Cost</div>
            </div>

            {(!events || events.length === 0) ? (
              <div className="text-center py-8">
                <p className="text-foreground-dim text-sm">No usage recorded in this period.</p>
              </div>
            ) : (
              <div className="space-y-0 max-h-[500px] overflow-y-auto pr-2">
                {events.map((event) => (
                  <div key={event.id} className="ledger-row grid grid-cols-12 gap-2 px-2 items-center">
                    <div className="col-span-4 text-sm text-parchment data-mono truncate">
                      {event.endpoint}
                    </div>
                    <div className="col-span-3 text-xs text-foreground-dim data-mono">
                      {keyMap[event.api_key_id] || "—"}
                    </div>
                    <div className="col-span-2 text-right text-sm data-mono text-parchment">
                      {Number(event.quantity).toFixed(0)}
                    </div>
                    <div className="col-span-3 text-right text-sm data-mono text-parchment font-medium">
                      ${Number(event.cost).toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Receipt Stub & Actions */}
        <div className="space-y-6">
          <div className="card bg-ink-navy border-border-strong relative overflow-hidden">
            <div className="receipt-stub">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-sm font-medium text-parchment uppercase tracking-wider">
                    Receipt
                  </h3>
                  <p className="text-xs text-foreground-dim mt-1">
                    Ref: {id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                {isSettled && tx?.tx_hash && (
                  <SealBadge txHash={tx.tx_hash} explorerUrl={`https://testnet.arcscan.app/tx/${tx.tx_hash}`} size="lg" />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-foreground-dim">Total Amount</span>
                  <div className="text-right">
                    <span className="data-mono text-xl text-parchment font-medium">
                      {Number(invoice.total_amount).toFixed(2)}
                    </span>
                    <span className="text-xs text-foreground-dim ml-1">USDC</span>
                  </div>
                </div>
                
                {isSettled && tx && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground-dim">Settled At</span>
                      <span className="text-sm text-parchment">
                        {new Date(tx.settled_at).toLocaleDateString()} {new Date(tx.settled_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground-dim">Network</span>
                      <span className="text-sm text-parchment capitalize">
                        {tx.chain.replace("-", " ")}
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border-strong">
                      <DataLabel label="Transaction Hash" value={tx.tx_hash} copyable />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isSettled && (
              <div className="pt-4 space-y-3">
                {invoice.status === "draft" && (
                  <p className="text-xs text-foreground-dim mb-3">
                    Finalize this invoice to lock it and enable settlement.
                  </p>
                )}
                {invoice.status === "finalized" && (
                  <p className="text-xs text-foreground-dim mb-3">
                    Invoice finalized. Ready for settlement on Arc.
                  </p>
                )}
                {/* 
                  Note: The actual Finalize/Settle buttons would ideally be client components
                  that hit the API routes, but for the MVP UI we'll just show the state.
                  A full implementation would have an interactive button here.
                */}
                <div className="p-3 bg-graphite rounded-md border border-border text-center text-sm text-parchment">
                  API automation ready
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
