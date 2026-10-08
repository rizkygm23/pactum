import { RevealOnView } from "./RevealOnView";

interface LineItem { label: string; qty: string; amount: string; }
interface ReceiptStubProps { reference: string; lines: LineItem[]; total: string; className?: string; }

export function ReceiptStub({ reference, lines, total, className = "" }: ReceiptStubProps) {
  return (
    <RevealOnView className={`border border-[#e7eaf0] bg-white p-5 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#e7eaf0]">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">Reference</div>
          <div className="mt-1 font-mono text-sm text-[#030303] break-all">{reference}</div>
        </div>
        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fffbeb] border border-[#fde68a] text-[#b45309]">
          Specimen
        </span>
      </div>

      {/* Line items */}
      <ul className="mt-4 mb-4 space-y-0">
        {lines.map((line) => (
          <li key={line.label} className="flex items-baseline justify-between gap-3 py-2.5 border-b border-[#e7eaf0] last:border-0">
            <span className="font-mono text-xs text-[#404040] break-all min-w-0">{line.label}</span>
            <span className="flex shrink-0 items-baseline gap-4">
              <span className="font-mono text-xs text-[#676f7b]">{line.qty}</span>
              <span className="font-mono text-xs text-[#030303]">{line.amount}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Total */}
      <div className="flex items-baseline justify-between gap-4 pt-2">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">Due at settlement</span>
        <span className="font-mono text-base font-semibold text-[#030303] whitespace-nowrap">{total}</span>
      </div>
    </RevealOnView>
  );
}
