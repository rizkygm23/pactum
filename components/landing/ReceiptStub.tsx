import { RevealOnView } from "./RevealOnView";

interface LineItem {
  label: string;
  qty: string;
  amount: string;
}

interface ReceiptStubProps {
  reference: string;
  lines: LineItem[];
  total: string;
  className?: string;
}

/**
 * A receipt, not a product screenshot. Marked SPECIMEN because the
 * figures are illustrative — no invented customer, no invented volume.
 * Tear line comes from `.receipt-stub`.
 */
export function ReceiptStub({
  reference,
  lines,
  total,
  className = "",
}: ReceiptStubProps) {
  return (
    <RevealOnView
      className={`border border-border bg-graphite/60 p-5 sm:p-6 ${className}`}
    >
      <div className="receipt-stub">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="data-mono text-[0.6875rem] uppercase tracking-[0.12em] text-foreground-dim">
              Reference
            </div>
            <div className="data-mono mt-1 text-sm text-parchment break-all">
              {reference}
            </div>
          </div>
          <span className="status-pending no-wrap shrink-0">Specimen</span>
        </div>
      </div>

      <ul className="mb-5">
        {lines.map((line) => (
          <li
            key={line.label}
            className="ledger-tick ledger-row flex items-baseline justify-between gap-3"
          >
            <span className="data-mono min-w-0 text-xs text-parchment-dim break-all">
              {line.label}
            </span>
            <span className="flex shrink-0 items-baseline gap-4">
              <span className="data-mono text-xs text-foreground-dim">
                {line.qty}
              </span>
              <span className="data-mono text-xs text-parchment">
                {line.amount}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between gap-4">
        <span className="data-mono text-[0.6875rem] uppercase tracking-[0.12em] text-foreground-dim">
          Due at settlement
        </span>
        <span className="data-mono text-base font-semibold text-brass no-wrap">
          {total}
        </span>
      </div>
    </RevealOnView>
  );
}
