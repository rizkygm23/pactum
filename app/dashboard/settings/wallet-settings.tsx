"use client";

import { useState } from "react";
import { updateWalletAddress } from "./actions";
import { CopyButton } from "@/components/ui/CopyButton";
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { ARC_TESTNET } from "@/lib/arc/config";

function isValidEvm(addr: string) { return /^0x[a-fA-F0-9]{40}$/.test(addr); }

export function WalletSettings({ initialWallet, projectId }: { initialWallet: string; projectId: string }) {
  const [wallet,  setWallet]  = useState(initialWallet);
  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const hasValue = wallet.trim().length > 0;
  const isValid  = !hasValue || isValidEvm(wallet.trim());
  const isDirty  = wallet !== initialWallet;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (hasValue && !isValid) { setMessage({ text: "Invalid address — must start with 0x and be 42 characters.", type: "error" }); return; }
    setSaving(true); setMessage(null);
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
      <p className="text-sm text-[#676f7b]">
        The Arc Testnet wallet where USDC settlements will be sent. Must be an EVM-compatible address.
      </p>

      <div className="flex gap-2 items-start">
        <div className="relative flex-1 max-w-lg">
          <input
            id="wallet-address" type="text" value={wallet} spellCheck={false} autoComplete="off"
            onChange={(e) => { setWallet(e.target.value); setMessage(null); }}
            placeholder="0x…"
            className={`w-full rounded-lg border px-4 py-3 font-mono text-sm text-[#030303] placeholder-[#939393] outline-none transition-all pr-9 ${
              hasValue && !isValid
                ? "border-[#fecaca] bg-[#fef2f2] focus:border-[#dc2626]"
                : hasValue && isValid
                ? "border-[#bbf7d0] bg-[#f0fdf4] focus:border-[#16a34a]"
                : "border-[#e7eaf0] bg-white focus:border-[#030303] focus:ring-2 focus:ring-black/8"
            }`}
          />
          {hasValue && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {isValid
                ? <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                : <XCircle className="w-4 h-4 text-[#dc2626]" />}
            </span>
          )}
        </div>
        {hasValue && isValid && <CopyButton text={wallet} />}
      </div>

      {/* Explorer link */}
      {initialWallet && isValidEvm(initialWallet) && (
        <a href={`${ARC_TESTNET.explorer}/address/${initialWallet}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#676f7b] hover:text-[#030303] transition-colors">
          <ExternalLink className="w-3 h-3" /> View on Arc explorer
        </a>
      )}

      {/* Feedback */}
      {message && (
        <div className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
          message.type === "success"
            ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]"
            : "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
        }`}>
          {message.type === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      <button type="submit" disabled={saving || !isDirty}
        className="inline-flex items-center gap-2 rounded-full bg-[#030303] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saving ? "Saving…" : "Save wallet"}
      </button>
    </form>
  );
}
