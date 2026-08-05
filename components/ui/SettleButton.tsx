"use client";

import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
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
        alert(data.error || "Failed to perform settlement");
      } else {
        alert(`Success! TX: ${data.hash.slice(0, 10)}...`);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert("A network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSettle}
      disabled={disabled || loading}
      className="mt-3 shrink-0 no-wrap flex items-center gap-2 btn-primary text-xs px-4 py-2"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
      {loading ? "Settling..." : "Settle Now"}
    </button>
  );
}
