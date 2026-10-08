import { createAdminClient } from "@/lib/supabase/admin";
import { SealBadge } from "@/components/ui/SealBadge";
import { getSessionCookie } from "@/lib/auth";
import { explorerTxUrl } from "@/lib/arc/config";
import { notFound, redirect } from "next/navigation";
import { CopyButton } from "@/components/ui/CopyButton";

const STATUS_BADGE: Record<string, string> = {
  draft:     "bg-[#fffbeb] border-[#fde68a] text-[#b45309]",
  finalized: "bg-[#fffbeb] border-[#fde68a] text-[#b45309]",
  settling:  "bg-[#fffbeb] border-[#fde68a] text-[#b45309]",
  settled:   "bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]",
  failed:    "bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]",
};

export default async function InvoiceDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const userId = await getSessionCookie();
  if (!userId) redirect("/login");

  const supabase = createAdminClient();
  const { data: invoice } = await supabase
    .from("invoices_pactum").select("*, projects_pactum!inner(id, user_id)")
    .eq("id", id).eq("projects_pactum.user_id", userId).single();
  if (!invoice) return notFound();

  const [{ data: tx }, { data: keys }] = await Promise.all([
    supabase.from("transactions_pactum").select("*").eq("invoice_id", id).single(),
    supabase.from("api_keys_pactum").select("id, key_prefix").eq("project_id", invoice.project_id),
  ]);

  const keyIds = (keys || []).map((k) => k.id);
  const keyMap = Object.fromEntries((keys || []).map((k) => [k.id, k.key_prefix]));

  const { data: events } = await supabase
    .from("usage_events_pactum").select("*")
    .in("api_key_id", keyIds.length > 0 ? keyIds : ["none"])
    .gte("created_at", invoice.period_start).lte("created_at", invoice.period_end)
    .order("created_at", { ascending: true });

  const isSettled = invoice.status === "settled" && tx?.status === "confirmed";
  const badgeCls  = STATUS_BADGE[invoice.status] ?? STATUS_BADGE.draft;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#030303]">
            Invoice {id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-[#676f7b] mt-1">
            Period: {new Date(invoice.period_start).toLocaleDateString()} — {new Date(invoice.period_end).toLocaleDateString()}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeCls}`}>
          {invoice.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage breakdown */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#e7eaf0] bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#e7eaf0]">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#939393]">Usage Breakdown</h2>
            </div>
            <div className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#939393] border-b border-[#e7eaf0] bg-[#f9fafb]">
              <div className="col-span-4">Endpoint</div>
              <div className="col-span-3">API Key</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-3 text-right">Cost</div>
            </div>
            {(!events || events.length === 0) ? (
              <div className="text-center py-10">
                <p className="text-sm text-[#676f7b]">No usage recorded in this period.</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto divide-y divide-[#e7eaf0]">
                {events.map((event) => (
                  <div key={event.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-[#f9fafb] transition-colors">
                    <div className="col-span-4 font-mono text-sm text-[#030303] truncate">{event.endpoint}</div>
                    <div className="col-span-3 font-mono text-xs text-[#676f7b]">{keyMap[event.api_key_id] || "—"}</div>
                    <div className="col-span-2 text-right font-mono text-sm text-[#030303]">{Number(event.quantity).toFixed(0)}</div>
                    <div className="col-span-3 text-right font-mono text-sm font-medium text-[#030303]">${Number(event.cost).toFixed(4)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Receipt */}
        <div>
          <div className="rounded-xl border border-[#e7eaf0] bg-white p-5">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[#939393]">Receipt</h3>
                <p className="font-mono text-xs text-[#676f7b] mt-1">Ref: {id.slice(0, 8).toUpperCase()}</p>
              </div>
              {isSettled && tx?.tx_hash && (
                <SealBadge txHash={tx.tx_hash} explorerUrl={explorerTxUrl(tx.tx_hash)} size="md" />
              )}
            </div>

            <div className="space-y-3 border-t border-[#e7eaf0] pt-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-[#676f7b]">Total Amount</span>
                <div className="text-right">
                  <span className="font-mono text-xl font-semibold text-[#030303]">{Number(invoice.total_amount).toFixed(2)}</span>
                  <span className="text-xs text-[#939393] ml-1">USDC</span>
                </div>
              </div>

              {isSettled && tx && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#676f7b]">Settled At</span>
                    <span className="text-sm text-[#030303]">
                      {tx.settled_at ? new Date(tx.settled_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#676f7b]">Network</span>
                    <span className="text-sm text-[#030303] capitalize">{tx.chain.replace("-", " ")}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#e7eaf0]">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-[#939393] mb-1.5">Transaction Hash</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#030303] break-all flex-1">{tx.tx_hash}</span>
                      <CopyButton text={tx.tx_hash} />
                    </div>
                  </div>
                </>
              )}
            </div>

            {!isSettled && (
              <div className="mt-4 pt-4 border-t border-[#e7eaf0]">
                <p className="text-xs text-[#676f7b] mb-3">
                  {invoice.status === "draft" ? "Finalize this invoice to lock it and enable settlement." : "Invoice finalized. Ready for settlement on Arc."}
                </p>
                <div className="rounded-lg border border-[#e7eaf0] bg-[#f9fafb] p-3 text-center text-sm text-[#676f7b]">
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
