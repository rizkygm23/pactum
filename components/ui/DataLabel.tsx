"use client";

interface DataLabelProps {
  value: string;
  label?: string;
  copyable?: boolean;
  truncate?: boolean;
}

/**
 * DataLabel — monospace precision display for tx hashes, API keys, amounts.
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
        <span className="micro-caps text-stone">
          {label}
        </span>
      )}
      {copyable ? (
        <button
          type="button"
          className="data-mono focus-ring max-w-full cursor-pointer text-left text-sm text-ink underline-offset-2 hover:underline"
          onClick={handleCopy}
          title={`Click to copy: ${value}`}
        >
          {displayValue}
        </button>
      ) : (
        <span className="data-mono max-w-full text-sm text-ink">
          {displayValue}
        </span>
      )}
    </div>
  );
}
