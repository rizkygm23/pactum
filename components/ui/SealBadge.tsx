import { CheckCircle2 } from "lucide-react";

interface SealBadgeProps {
  txHash: string;
  explorerUrl?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Seal Badge — Pactum's signature visual element.
 * Appears when a transaction is settled on Arc.
 * Brass-gold circular badge with checkmark + tx hash.
 */
export function SealBadge({ txHash, explorerUrl, size = "md" }: SealBadgeProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const shortHash = txHash ? `${txHash.slice(0, 6)}…${txHash.slice(-4)}` : "";

  const badge = (
    <div
      className={`seal-badge ${sizeClasses[size]} rounded-full border-2 border-brass flex flex-col items-center justify-center bg-brass/10 transition-transform hover:scale-105`}
    >
      <CheckCircle2
        size={iconSizes[size]}
        className="text-brass mb-1"
        strokeWidth={2}
      />
      <span
        className="text-brass font-semibold uppercase tracking-widest"
        style={{ fontSize: size === "sm" ? "6px" : size === "md" ? "7px" : "8px" }}
      >
        Settled on Arc
      </span>
      {size !== "sm" && (
        <span
          className="data-mono text-foreground-dim mt-0.5"
          style={{ fontSize: size === "md" ? "8px" : "9px" }}
        >
          {shortHash}
        </span>
      )}
    </div>
  );

  if (explorerUrl) {
    return (
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
        title={`View on Arc Explorer: ${txHash}`}
      >
        {badge}
      </a>
    );
  }

  return badge;
}
