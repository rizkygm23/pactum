export function AvatarInitial({ seed, size = "sm" }: { seed: string; size?: "sm" | "md" }) {
  const initials = seed
    ? seed.startsWith("0x")
      ? seed.slice(2, 4).toUpperCase()
      : seed.slice(0, 2).toUpperCase()
    : "??";

  const sz = size === "md"
    ? "w-9 h-9 text-sm"
    : "w-7 h-7 text-xs";

  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-[#e7eaf0] border border-[#c9ccd1] font-semibold text-[#030303] shrink-0 select-none uppercase ${sz}`}>
      {initials}
    </span>
  );
}
