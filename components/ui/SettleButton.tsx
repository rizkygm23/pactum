"use client";

import { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function SettleButton({ disabled }: { disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSettle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/settlement/manual", {
        method: "POST",
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Gagal melakukan settlement");
      } else {
        alert(`Settlement sukses! TX Hash: ${data.hash}`);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSettle}
      disabled={disabled || loading}
      className="mt-3 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Settle Now"}
    </button>
  );
}
