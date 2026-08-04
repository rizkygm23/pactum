"use client";

interface DataLabelProps {
  value: string;
  label?: string;
  copyable?: boolean;
  truncate?: boolean;
}

/**
 * DataLabel — Monospace precision display for tx hashes, API keys, USDC amounts.
 * Evokes ledger/buku besar precision.
 */
export function DataLabel({ value, label, copyable = false, truncate = false }: DataLabelProps) {
  const displayValue = truncate && value.length > 16
    ? `${value.slice(0, 8)}…${value.slice(-6)}`
    : value;

  async function handleCopy() {
    if (copyable) {
      await navigator.clipboard.writeText(value);
    }
  }

  return (
    <div className="inline-flex flex-col gap-0.5">
      {label && (
        <span className="text-[10px] text-foreground-dim uppercase tracking-wider font-medium">
          {label}
        </span>
      )}
      <span
        className={`data-mono text-sm text-parchment ${
          copyable ? "cursor-pointer hover:text-brass transition-colors" : ""
        }`}
        onClick={handleCopy}
        title={copyable ? `Click to copy: ${value}` : undefined}
      >
        {displayValue}
      </span>
    </div>
  );
}
