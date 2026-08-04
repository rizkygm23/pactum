"use client";

import { useState } from "react";
import { updateWalletAddress } from "./actions";

export function WalletSettings({ initialWallet, projectId }: { initialWallet: string, projectId: string }) {
  const [wallet, setWallet] = useState(initialWallet);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Basic ETH address validation
    if (wallet && !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setMessage({ text: "Invalid wallet address format. Must be an EVM address (0x...).", type: "error" });
      setSaving(false);
      return;
    }

    try {
      await updateWalletAddress(projectId, wallet || "");
      setMessage({ text: "Wallet address saved successfully.", type: "success" });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Failed to update", type: "error" });
    }
    
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <p className="text-sm text-foreground-dim mb-4">
        This is the Arc Testnet wallet where your USDC settlements will be sent. 
        It must be an EVM-compatible address.
      </p>

      <div className="max-w-md">
        <label htmlFor="wallet-address" className="sr-only">Wallet Address</label>
        <input
          id="wallet-address"
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          className="input-field data-mono"
          placeholder="0x..."
        />
      </div>

      {message && (
        <div className={`text-sm px-3 py-2 rounded-md inline-block ${
          message.type === "success" 
            ? "text-teal bg-teal/10 border border-teal/20" 
            : "text-rust bg-rust/10 border border-rust/20"
        }`}>
          {message.text}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary disabled:opacity-50 mt-2"
        >
          {saving ? "Saving…" : "Save Wallet"}
        </button>
      </div>
    </form>
  );
}
