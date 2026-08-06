"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { toast } from "react-hot-toast";

export function GenerateInvoiceButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/invoices", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to generate invoice");
      } else {
        toast.success("Invoice generated successfully");
        router.refresh();
      }
    } catch (e) {
      toast.error("Error generating invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button 
      onClick={handleGenerate} 
      disabled={loading}
      className="px-4 py-2 bg-brass text-ink-navy text-sm font-medium rounded hover:bg-brass-glow transition-colors disabled:opacity-50"
    >
      {loading ? "Generating..." : "Generate Invoice (Today)"}
    </button>
  );
}
