"use client";
import { useEffect } from "react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("dashboard error:", error.digest ?? error.message); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">Something broke</p>
      <div className="mt-2 h-px w-12 bg-[#e7eaf0]" />
      <h1 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-[#030303]">We couldn&apos;t load this page.</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#676f7b] max-w-md">
        The request failed while talking to the database or the chain. Your balances and records are unaffected — this was a read failure.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-[#939393] mt-3">Ref: {error.digest}</p>
      )}
      <button onClick={reset}
        className="mt-6 rounded-full bg-[#030303] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors">
        Try again
      </button>
    </div>
  );
}
