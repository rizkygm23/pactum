interface DataLabelProps {
  value: string;
  truncate?: boolean;
  mono?: boolean;
}

export function DataLabel({ value, truncate, mono = true }: DataLabelProps) {
  return (
    <span className={`${mono ? "font-mono" : ""} text-xs text-[#030303] ${truncate ? "truncate max-w-[180px]" : ""}`}>
      {value}
    </span>
  );
}
