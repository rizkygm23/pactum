import { CheckCircle2 } from "lucide-react";

interface SealBadgeProps { txHash: string; explorerUrl?: string; size?: "sm" | "md" | "lg"; }

export function SealBadge({ txHash, explorerUrl, size = "md" }: SealBadgeProps) {
  const sizeMap = { sm: "w-16 h-16", md: "w-24 h-24", lg: "w-32 h-32" };
  const iconMap = { sm: 16, md: 22, lg: 30 };
  const shortHash = txHash ? `${txHash.slice(0, 6)}…${txHash.slice(-4)}` : "";

  const badge = (
    <div className={`${sizeMap[size]} flex flex-col items-center justify-center rounded-full bg-white border-2 border-[#030303] transition-transform hover:scale-[1.03]`}>
      <CheckCircle2 size={iconMap[size]} className="mb-1 text-[#030303]" strokeWidth={1.5} />
      <span className="font-semibold tracking-widest uppercase text-[#030303]"
        style={{ fontSize: size === "sm" ? "6px" : size === "md" ? "7px" : "8px" }}>
        Settled on Arc
      </span>
      {size !== "sm" && (
        <span className="font-mono text-[#939393] mt-0.5"
          style={{ fontSize: size === "md" ? "8px" : "9px" }}>
          {shortHash}
        </span>
      )}
    </div>
  );

  if (explorerUrl) {
    return (
      <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-block" title={`View on Arc Explorer: ${txHash}`}>
        {badge}
      </a>
    );
  }
  return badge;
}
