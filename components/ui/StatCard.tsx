interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

/**
 * StatCard — Hero stat display with Fraunces numerals.
 * Used on the dashboard overview for key metrics.
 */
export function StatCard({ label, value, unit, trend, trendValue }: StatCardProps) {
  const trendColors = {
    up: "text-teal",
    down: "text-rust",
    neutral: "text-foreground-dim",
  };

  return (
    <div className="card flex flex-col gap-2">
      <span className="text-xs font-medium text-foreground-dim uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-3xl font-semibold text-parchment tabular-nums"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm text-foreground-dim data-mono">{unit}</span>
        )}
      </div>
      {trend && trendValue && (
        <span className={`text-xs ${trendColors[trend]}`}>{trendValue}</span>
      )}
    </div>
  );
}
