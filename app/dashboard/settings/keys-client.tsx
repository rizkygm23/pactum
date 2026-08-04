"use client";

import { useState } from "react";
import { DataLabel } from "@/components/ui/DataLabel";

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  status: string;
  created_at: string;
}

export function KeysClient({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function generateKey() {
    setGenerating(true);
    setNewKey(null);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Generated Key" }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key); // The full key
        // Prepend the new key record to the list
        setKeys((prev) => [
          {
            id: data.id,
            key_prefix: data.key_prefix,
            name: data.name,
            status: data.status,
            created_at: data.created_at,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error("Failed to generate key", err);
    } finally {
      setGenerating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Are you sure you want to revoke this key? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/v1/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((prev) =>
          prev.map((k) => (k.id === id ? { ...k, status: "revoked" } : k))
        );
      }
    } catch (err) {
      console.error("Failed to revoke key", err);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-foreground-dim">
          Keys used to authenticate SDK and API requests.
        </p>
        <button
          onClick={generateKey}
          disabled={generating}
          className="btn-primary"
        >
          {generating ? "Generating…" : "Generate New Key"}
        </button>
      </div>

      {newKey && (
        <div className="mb-6 p-4 bg-brass/10 border border-brass/30 rounded-md">
          <p className="text-sm text-brass font-medium mb-2">
            Save your new API key! It will not be shown again.
          </p>
          <div className="flex items-center gap-2 bg-ink-navy p-3 rounded border border-border-strong">
            <code className="data-mono text-parchment flex-1 select-all">
              {newKey}
            </code>
          </div>
        </div>
      )}

      {keys.length === 0 ? (
        <div className="text-center py-8 border-t border-border-strong">
          <p className="text-foreground-dim text-sm">No API keys found.</p>
        </div>
      ) : (
        <div className="border-t border-border-strong">
          <div className="grid grid-cols-12 gap-4 py-3 text-[10px] text-foreground-dim uppercase tracking-wider border-b border-border">
            <div className="col-span-3">Name</div>
            <div className="col-span-4">Key Prefix</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          
          <div className="space-y-0">
            {keys.map((k) => (
              <div key={k.id} className="ledger-row grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3 text-sm text-parchment font-medium truncate">
                  {k.name}
                </div>
                <div className="col-span-4">
                  <DataLabel value={k.key_prefix + "..."} />
                </div>
                <div className="col-span-2 text-xs text-foreground-dim">
                  {new Date(k.created_at).toLocaleDateString()}
                </div>
                <div className="col-span-2">
                  <span className={k.status === "active" ? "text-teal" : "text-rust"}>
                    {k.status.charAt(0).toUpperCase() + k.status.slice(1)}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  {k.status === "active" && (
                    <button
                      onClick={() => revokeKey(k.id)}
                      className="text-xs text-rust hover:text-rust-dim transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
