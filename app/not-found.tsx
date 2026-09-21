import Link from "next/link";

export const metadata = {
  title: "Page not found — Pactum",
};

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <span className="stage-ordinal">404 — Not found</span>
        <div className="rule-mark mt-2 max-w-16 mx-auto" />
        <h1 className="display-face mt-6 text-3xl sm:text-4xl font-semibold text-ink">
          This page was never settled.
        </h1>
        <p className="text-slate text-sm leading-relaxed mt-4">
          The record you are looking for does not exist, was withdrawn, or
          never made it into the ledger.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="btn-primary focus-ring no-wrap inline-block">
            Back to home
          </Link>
          <Link
            href="/docs"
            className="focus-ring no-wrap text-sm text-graphite border-b border-hairline-soft pb-0.5 transition-colors hover:border-ink hover:text-ink"
          >
            Read documentation
          </Link>
        </div>
      </div>
    </div>
  );
}
