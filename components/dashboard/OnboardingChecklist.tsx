"use client";

import { useState } from "react";
import Link from "next/link";
import { X, CheckCircle2, Circle } from "lucide-react";

interface Props { hasWallet: boolean; hasKeys: boolean; }
const STORAGE_KEY = "pactum_onboarding_dismissed";

function shouldShow(hasWallet: boolean, hasKeys: boolean) {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(STORAGE_KEY) && (!hasWallet || !hasKeys);
}

export function OnboardingChecklist({ hasWallet, hasKeys }: Props) {
  const [visible, setVisible] = useState(() => shouldShow(hasWallet, hasKeys));

  function dismiss() { localStorage.setItem(STORAGE_KEY, "1"); setVisible(false); }
  if (!visible) return null;

  const steps = [
    { done: hasWallet, label: "Set your settlement wallet",   href: "/dashboard/settings", cta: "Settings" },
    { done: hasKeys,   label: "Create your first API key",    href: "/dashboard/settings", cta: "Settings" },
    { done: false,     label: "Make your first tracked call", href: "/docs/integration-guide", cta: "Guide" },
  ];
  const done = steps.filter((s) => s.done).length;
  const pct  = (done / steps.length) * 100;

  return (
    <div className="mb-6 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-[#030303]">Get started with Pactum</p>
          <p className="text-xs text-[#676f7b] mt-0.5">{done} of {steps.length} steps complete</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss"
          className="rounded-md p-1 text-[#939393] hover:text-[#030303] hover:bg-[#bfdbfe]/40 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-[#bfdbfe] mb-4 overflow-hidden">
        <div className="h-full rounded-full bg-[#2563eb] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-2.5">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3">
            {step.done
              ? <CheckCircle2 className="w-4 h-4 text-[#2563eb] shrink-0" />
              : <Circle className="w-4 h-4 text-[#bfdbfe] shrink-0" />}
            <span className={`text-sm flex-1 ${step.done ? "line-through text-[#939393]" : "text-[#030303]"}`}>
              {step.label}
            </span>
            {!step.done && (
              <Link href={step.href}
                className="shrink-0 rounded-lg border border-[#bfdbfe] bg-white px-2.5 py-1 text-xs font-medium text-[#2563eb] hover:bg-[#bfdbfe]/20 transition-colors">
                {step.cta} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
