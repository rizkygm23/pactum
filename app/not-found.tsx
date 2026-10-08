import Link from "next/link";

export const metadata = { title: "Page not found — Pactum" };

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">404 — Not found</p>
        <div className="mt-2 h-px w-12 bg-[#e7eaf0] mx-auto" />
        <h1 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-[#030303]">
          This page was never settled.
        </h1>
        <p className="text-[#676f7b] text-sm leading-relaxed mt-4">
          The record you are looking for does not exist, was withdrawn, or never made it into the ledger.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="rounded-full bg-[#030303] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors">
            Back to home
          </Link>
          <Link href="/docs" className="text-sm text-[#404040] border-b border-[#c9ccd1] pb-0.5 hover:border-[#030303] hover:text-[#030303] transition-colors">
            Read documentation
          </Link>
        </div>
      </div>
    </div>
  );
}
