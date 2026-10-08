interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  trend?: { direction: "up" | "down"; label: string };
}

export function StatCard({ label, value, unit, sub, trend }: StatCardProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-[#e7eaf0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">{label}</span>
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-2xl font-semibold tracking-[-0.02em] text-[#030303] sm:text-3xl">{value}</span>
        {unit && <span className="font-mono text-sm text-[#939393]">{unit}</span>}
      </div>
      {trend && (
        <span className={`text-xs font-medium ${trend.direction === "up" ? "text-[#16a34a]" : "text-[#dc2626]"}`}>
          {trend.direction === "up" ? "↑" : "↓"} {trend.label}
        </span>
      )}
      {sub && !trend && <span className="text-[11px] text-[#939393]">{sub}</span>}
    </div>
  );
}
