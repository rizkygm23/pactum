type Status = "settled" | "pending" | "failed" | "active" | "revoked" | string;

const MAP: Record<string, { bg: string; border: string; text: string; label?: string }> = {
  settled: { bg: "bg-[#f0fdf4]", border: "border-[#bbf7d0]", text: "text-[#15803d]" },
  pending: { bg: "bg-[#fffbeb]", border: "border-[#fde68a]", text: "text-[#b45309]" },
  failed:  { bg: "bg-[#fef2f2]", border: "border-[#fecaca]", text: "text-[#b91c1c]" },
  active:  { bg: "bg-[#f0fdf4]", border: "border-[#bbf7d0]", text: "text-[#15803d]" },
  revoked: { bg: "bg-[#fef2f2]", border: "border-[#fecaca]", text: "text-[#b91c1c]" },
  default: { bg: "bg-[#f9fafb]", border: "border-[#e7eaf0]", text: "text-[#676f7b]" },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = MAP[status] ?? MAP.default;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.bg} ${s.border} ${s.text}`}>
      {status}
    </span>
  );
}
