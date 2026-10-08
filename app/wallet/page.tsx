"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Coins, ArrowDownLeft, Loader2, Info, RotateCw } from "lucide-react";
import { ARC_TESTNET } from "@/lib/arc/config";
import { useChannelWallet } from "@/components/wallet/useChannelWallet";

const PRESETS = [10, 25, 50, 100];
type Tab = "deposit" | "withdraw";

function StepIndicator({ status, tab }: { status: string; tab: Tab }) {
  if (!status) return null;
  const depositSteps  = [{ key: "Approv", label: "Approve USDC" }, { key: "Deposit",  label: "Deposit"  }, { key: "confirmed", label: "Confirmed" }];
  const withdrawSteps = [{ key: "Withdraw", label: "Withdraw" }, { key: "confirmed", label: "Confirmed" }];
  const steps = tab === "deposit" ? depositSteps : withdrawSteps;

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      {steps.map((s, i) => {
        const isActive = status.toLowerCase().includes(s.key.toLowerCase());
        const isDone   = status.toLowerCase().includes("confirmed") && i < steps.length - 1;
        return (
          <div key={s.key} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full transition-all ${
              isActive ? "bg-[#030303] text-white"
              : isDone  ? "bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d]"
              : "bg-[#f9fafb] border border-[#e7eaf0] text-[#939393]"
            }`}>
              {isDone ? "✓ " : `${i + 1}. `}{s.label}
            </div>
            {i < steps.length - 1 && <span className="text-[#939393] text-xs">→</span>}
          </div>
        );
      })}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-[#e7eaf0] bg-white px-4 py-3 text-[15px] text-[#030303] placeholder-[#939393] outline-none transition-all focus:border-[#030303] focus:ring-2 focus:ring-black/8";

export default function WalletPage() {
  const { address, onChainBalance, pendingUsage, availableBalance, isInitializing, status, busy, connectWallet, switchWallet, deposit, withdraw, clearStatus } = useChannelWallet();
  const [tab,            setTab]           = useState<Tab>("deposit");
  const [depositAmount,  setDepositAmount]  = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  useEffect(() => {
    if (status === "Deposit confirmed." || status === "Withdrawal confirmed.") {
      const t = setTimeout(clearStatus, 3000);
      return () => clearTimeout(t);
    }
  }, [status, clearStatus]);

  const handleDeposit  = async () => { if (await deposit(depositAmount))  setDepositAmount("");  };
  const handleWithdraw = async () => { if (await withdraw(withdrawAmount)) setWithdrawAmount(""); };

  return (
    <div className="flex min-h-dvh flex-col items-center bg-[#f9fafb] px-4 py-10 sm:py-16">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <Link href="/" className="text-xs text-[#676f7b] hover:text-[#030303] transition-colors">← Back to pactum</Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#030303] sm:text-3xl">Channel Wallet</h1>
          <p className="mt-1.5 text-sm text-[#676f7b]">Deposit USDC to fund API usage. Withdraw unused balance at any time.</p>
        </div>

        {isInitializing ? (
          <div className="rounded-xl border border-[#e7eaf0] bg-white flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#939393]" />
          </div>
        ) : !address ? (
          <div className="rounded-xl border border-[#e7eaf0] bg-white text-center py-12 px-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Wallet className="w-10 h-10 text-[#c9ccd1] mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-sm font-medium text-[#030303] mb-4">Connect your wallet to continue</p>
            <button onClick={connectWallet}
              className="inline-flex items-center gap-2 rounded-full bg-[#030303] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors mx-auto">
              <Wallet className="h-4 w-4" /> Connect wallet
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected wallet strip */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#e7eaf0] bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-[#939393] mb-0.5">Connected wallet</p>
                <p className="font-mono text-xs text-[#030303] truncate">{address}</p>
              </div>
              <button onClick={switchWallet}
                className="shrink-0 rounded-lg border border-[#e7eaf0] px-3 py-1.5 text-xs font-medium text-[#404040] hover:bg-[#f9fafb] transition-colors">
                Switch
              </button>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "On-chain",  value: onChainBalance,   note: "Deposited" },
                { label: "Pending",   value: pendingUsage,     note: "Unsettled" },
                { label: "Available", value: availableBalance, note: "Usable" },
              ].map(({ label, value, note }) => (
                <div key={label} className="rounded-xl border border-[#e7eaf0] bg-white p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">{label}</p>
                  <p className="text-lg font-semibold tabular-nums text-[#030303] mt-1">{value.toFixed(4)}</p>
                  <p className="text-[10px] text-[#939393] mt-0.5">{note}</p>
                </div>
              ))}
            </div>

            {pendingUsage > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#b45309]">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  <span className="font-mono font-medium">{pendingUsage.toFixed(4)} USDC</span> is pending settlement. Your available balance reflects this.
                </p>
              </div>
            )}

            {/* Action card */}
            <div className="rounded-xl border border-[#e7eaf0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {/* Tabs */}
              <div className="flex border-b border-[#e7eaf0] mb-5 -mx-5 px-5">
                {(["deposit", "withdraw"] as Tab[]).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)}
                    className={`pb-3 mr-6 text-sm font-semibold capitalize transition-all ${
                      tab === t
                        ? "border-b-2 border-[#030303] text-[#030303] -mb-px"
                        : "text-[#939393] hover:text-[#676f7b]"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>

              {tab === "deposit" && (
                <div className="space-y-4">
                  <p className="text-sm text-[#676f7b]">Top up your Pactum balance. Funds are held in the billing contract until settled.</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button key={p} type="button" onClick={() => setDepositAmount(String(p))}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                          depositAmount === String(p)
                            ? "bg-[#030303] border-[#030303] text-white"
                            : "border-[#e7eaf0] bg-white text-[#404040] hover:bg-[#f9fafb]"
                        }`}>
                        {p} USDC
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 min-w-0">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Coins className="h-4 w-4 text-[#939393]" />
                      </div>
                      <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00" className={`${inputCls} pl-9`} min="0" step="0.01" />
                    </div>
                    <button onClick={handleDeposit} disabled={busy !== null || !depositAmount}
                      className="inline-flex items-center gap-2 rounded-full bg-[#030303] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0">
                      {busy === "deposit" && <Loader2 className="h-4 w-4 animate-spin" />}
                      {busy === "deposit" ? "Depositing…" : `Deposit${depositAmount ? ` ${depositAmount} USDC` : ""}`}
                    </button>
                  </div>
                </div>
              )}

              {tab === "withdraw" && (
                <div className="space-y-4">
                  <p className="text-sm text-[#676f7b]">Withdraw unused balance back to your wallet. Unsettled usage remains owed.</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">Available to withdraw</span>
                    <button type="button" onClick={() => setWithdrawAmount(availableBalance.toFixed(6))}
                      className="text-xs font-semibold text-[#030303] underline-offset-2 hover:underline">
                      Max {availableBalance.toFixed(4)} USDC
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00" className={`${inputCls} flex-1`} min="0" step="0.000001" />
                    <button onClick={handleWithdraw} disabled={busy !== null || !withdrawAmount}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#e7eaf0] bg-white px-4 py-2.5 text-sm font-semibold text-[#030303] hover:bg-[#f9fafb] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0">
                      {busy === "withdraw" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownLeft className="h-4 w-4" />}
                      {busy === "withdraw" ? "Withdrawing…" : "Withdraw"}
                    </button>
                  </div>
                </div>
              )}

              {status && (
                <div className="mt-4 pt-4 border-t border-[#e7eaf0]">
                  <StepIndicator status={status} tab={tab} />
                </div>
              )}
            </div>

            <button type="button" onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 text-xs text-[#939393] hover:text-[#030303] transition-colors mx-auto">
              <RotateCw className="w-3 h-3" /> Refresh balances
            </button>
          </div>
        )}

        <p className="font-mono mt-8 text-center text-xs text-[#939393]">
          Arc Testnet · chain {ARC_TESTNET.chainId} · settlement in USDC
        </p>
      </div>
    </div>
  );
}
