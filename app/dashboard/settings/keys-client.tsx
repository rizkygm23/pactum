"use client";

import { useState, useEffect, useRef } from "react";
import { CopyButton } from "@/components/ui/CopyButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Plus, Key, AlertTriangle, Loader2 } from "lucide-react";

interface ApiKey { id: string; key_prefix: string; name: string | null; status: string; created_at: string; }

export function KeysClient({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys,         setKeys]         = useState<ApiKey[]>(initialKeys);
  const [generating,   setGenerating]   = useState(false);
  const [newKey,       setNewKey]       = useState<string | null>(null);
  const [countdown,    setCountdown]    = useState(60);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!newKey) return;
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); setNewKey(null); return 60; }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [newKey]);

  async function generateKey() {
    setGenerating(true); setNewKey(null);
    try {
      const res  = await fetch("/api/v1/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Generated Key" }) });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setKeys((prev) => [{ id: data.id, key_prefix: data.key_prefix, name: data.name, status: data.status, created_at: data.created_at }, ...prev]);
      }
    } catch (err) { console.error("Failed to generate key", err); }
    finally { setGenerating(false); }
  }

  async function revokeKey(id: string) {
    try {
      const res = await fetch(`/api/v1/keys/${id}`, { method: "DELETE" });
      if (res.ok) { setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: "revoked" } : k))); setRevokeConfirm(null); }
    } catch (err) { console.error("Failed to revoke key", err); }
  }

  const btnXs = "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-[#676f7b]">Keys used to authenticate SDK and API requests.</p>
        <button onClick={generateKey} disabled={generating}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#030303] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-50">
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {generating ? "Generating…" : "New Key"}
        </button>
      </div>

      {/* New key reveal */}
      {newKey && (
        <div className="mb-5 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-[#b45309]">
              Save this key now — it won&apos;t be shown again.
              <span className="ml-2 font-normal opacity-70">({countdown}s)</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#fde68a] rounded-lg p-3">
            <code className="font-mono text-xs sm:text-sm text-[#030303] min-w-0 flex-1 break-all select-all">{newKey}</code>
            <CopyButton text={newKey} className="shrink-0" />
          </div>
        </div>
      )}

      {keys.length === 0 ? (
        <div className="text-center py-12 border-t border-[#e7eaf0]">
          <Key className="w-8 h-8 text-[#c9ccd1] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#676f7b]">No API keys yet.</p>
          <p className="text-xs text-[#939393] mt-1">Generate your first key above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id}
              className={`rounded-xl border p-4 transition-colors ${k.status === "active" ? "border-[#e7eaf0] bg-white" : "border-[#e7eaf0] bg-[#f9fafb] opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Key className="w-4 h-4 text-[#939393] shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#030303] truncate">{k.name || "Unnamed key"}</p>
                    <p className="font-mono text-xs text-[#676f7b] mt-0.5">{k.key_prefix}••••••••••••••••</p>
                  </div>
                </div>
                <StatusBadge status={k.status} />
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#e7eaf0]">
                <span className="text-xs text-[#939393]">
                  Created {new Date(k.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                {k.status === "active" && (
                  revokeConfirm === k.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#b91c1c]">Confirm revoke?</span>
                      <button onClick={() => revokeKey(k.id)}
                        className={`${btnXs} border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fecaca]/40`}>
                        Yes, revoke
                      </button>
                      <button onClick={() => setRevokeConfirm(null)}
                        className={`${btnXs} border-[#e7eaf0] bg-white text-[#404040] hover:bg-[#f9fafb]`}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setRevokeConfirm(k.id)}
                      className={`${btnXs} border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fecaca]/40`}>
                      Revoke
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
