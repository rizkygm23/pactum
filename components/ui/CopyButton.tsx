"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy to clipboard"}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md border border-[#e7eaf0] bg-white text-[#939393] hover:text-[#030303] hover:bg-[#f9fafb] transition-all ${className}`}
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-[#16a34a]" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
