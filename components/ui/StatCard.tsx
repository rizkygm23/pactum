interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
}

/**
 * StatCard — flat editorial stat: micro-caps label, display-size figure,
 * hairline-bordered card. No shadow, no fill.
 */
export function StatCard({ label, value, unit }: StatCardProps) {
  return (
    <div className="card flex min-w-0 flex-col gap-2">
      <span className="micro-caps text-slate">{label}</span>
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
        <span className="display-face text-2xl font-normal tracking-[-0.02em] text-ink sm:text-3xl">
          {value}
        </span>
        {unit && (
          <span className="data-mono text-sm text-stone">{unit}</span>
        )}
      </div>
    </div>
  );
}
