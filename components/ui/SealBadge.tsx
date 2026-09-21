import { CheckCircle2 } from "lucide-react";

interface SealBadgeProps {
  txHash: string;
  explorerUrl?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Seal — Pactum's signature mark: a settled transaction rendered as a
 * black-ring stamp on paper. No glow, no colour — the ring and the copy
 * carry the confirmation.
 */
export function SealBadge({ txHash, explorerUrl, size = "md" }: SealBadgeProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const iconSizes = {
    sm: 16,
    md: 22,
    lg: 30,
  };

  const shortHash = txHash ? `${txHash.slice(0, 6)}…${txHash.slice(-4)}` : "";

  const badge = (
    <div
      className={`seal-badge ${sizeClasses[size]} flex flex-col items-center justify-center rounded-full bg-canvas transition-transform hover:scale-[1.03]`}
    >
      <CheckCircle2
        size={iconSizes[size]}
        className="mb-1 text-ink"
        strokeWidth={1.5}
      />
      <span
        className="micro-caps text-ink"
        style={{ fontSize: size === "sm" ? "6px" : size === "md" ? "7px" : "8px" }}
      >
        Settled on Arc
      </span>
      {size !== "sm" && (
        <span
          className="data-mono text-stone mt-0.5"
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
