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
    <div className="inline-flex min-w-0 max-w-full flex-col gap-0.5">
      {label && (
        <span className="text-[10px] text-foreground-dim uppercase tracking-wider font-medium">
          {label}
        </span>
      )}
      {copyable ? (
        <button
          type="button"
          className="data-mono focus-ring max-w-full cursor-pointer text-left text-sm text-parchment transition-colors hover:text-brass"
          onClick={handleCopy}
          title={`Click to copy: ${value}`}
        >
          {displayValue}
        </button>
      ) : (
        <span className="data-mono max-w-full text-sm text-parchment">
          {displayValue}
        </span>
      )}
    </div>
  );
}
