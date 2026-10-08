export function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color =
    clamped >= 90 ? "bg-red-500"
    : clamped >= 70 ? "bg-amber-500"
    : "bg-[#16a34a]";

  return (
    <div className="h-2 w-full rounded-full bg-[#e7eaf0] overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
