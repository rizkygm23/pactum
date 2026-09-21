"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in server logs with the digest for correlation.
    console.error("dashboard error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="stage-ordinal">Something broke</span>
      <div className="rule-mark mt-2 max-w-16" />
      <h1 className="display-face mt-5 text-2xl font-semibold text-ink">
        We couldn&apos;t load this page.
      </h1>
      <p className="text-slate text-sm leading-relaxed max-w-md mt-3">
        The request failed while talking to the database or the chain. Your
        balances and records are unaffected — this was a read failure.
      </p>
      {error.digest && (
        <p className="data-mono text-xs text-slate mt-3">
          Ref: {error.digest}
        </p>
      )}
      <button onClick={reset} className="btn-primary focus-ring no-wrap mt-6">
        Try again
      </button>
    </div>
  );
}
