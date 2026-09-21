"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Coins, ArrowRight, ArrowDownLeft, Loader2, Info } from "lucide-react";
import { ARC_TESTNET } from "@/lib/arc/config";
import { useChannelWallet } from "@/components/wallet/useChannelWallet";

export default function WalletPage() {
  const {
    address,
    onChainBalance,
    pendingUsage,
    availableBalance,
    isInitializing,
    status,
    busy,
    connectWallet,
    switchWallet,
    deposit,
    withdraw,
    clearStatus,
  } = useChannelWallet();

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Auto-dismiss the transient status line after a confirmed action
  useEffect(() => {
    if (status === "Deposit confirmed." || status === "Withdrawal confirmed.") {
      const t = setTimeout(clearStatus, 3000);
      return () => clearTimeout(t);
    }
  }, [status, clearStatus]);

  const handleDeposit = async () => {
    if (await deposit(depositAmount)) setDepositAmount("");
  };

  const handleWithdraw = async () => {
    if (await withdraw(withdrawAmount)) setWithdrawAmount("");
  };

  return (
    <div className="flex min-h-dvh flex-col items-center bg-canvas px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        {/* Way back — every page keeps an exit */}
        <div className="mb-6">
          <Link
            href="/"
            className="focus-ring text-xs text-slate transition-colors hover:text-ink"
          >
            ← Back to pactum
          </Link>
        </div>

        <div className="card">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <span className="stage-ordinal">Deposit</span>
            <div className="rule-mark mt-2 max-w-16" />
            <h1 className="display-face mt-5 text-2xl font-normal tracking-[-0.02em] text-ink sm:text-3xl">
              Channel deposit
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-graphite">
              Top up your Pactum balance with USDC. The deposit sits in the
              billing contract and settles every metered call across
              integrated apps.
            </p>
          </div>

          {isInitializing ? (
            <div className="flex w-full justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-ink" />
            </div>
          ) : !address ? (
            <button onClick={connectWallet} className="btn-primary focus-ring no-wrap w-full gap-2">
              <Wallet className="h-4 w-4" />
              Connect wallet
            </button>
          ) : (
            <div className="space-y-6">
              {/* Connected wallet */}
              <div className="flex items-center justify-between gap-4 rounded-md border border-hairline bg-canvas-warm p-3 sm:p-4">
                <div className="min-w-0">
                  <p className="micro-caps mb-1 text-stone">Connected wallet</p>
                  <p className="data-mono text-xs text-ink sm:text-sm">{address}</p>
                </div>
                <button
                  onClick={switchWallet}
                  className="focus-ring shrink-0 text-xs font-semibold text-ink underline-offset-2 hover:underline"
                >
                  Switch
                </button>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="min-w-0 rounded-md border border-hairline bg-canvas-warm p-3 sm:p-4">
                  <p className="micro-caps mb-1.5 flex items-center gap-1 text-stone">
                    On-chain <Info className="h-3 w-3 shrink-0" />
                  </p>
                  <p className="display-face text-xl tabular-nums text-ink sm:text-2xl">
                    {onChainBalance.toFixed(4)}
                  </p>
                  <p className="mt-1 text-xs text-slate">USDC</p>
                </div>
                <div className="min-w-0 rounded-md border border-hairline bg-canvas-warm p-3 sm:p-4">
                  <p className="micro-caps mb-1.5 text-stone">Available</p>
                  <p className="display-face text-xl tabular-nums text-ink sm:text-2xl">
                    {availableBalance.toFixed(4)}
                  </p>
                  <p className="mt-1 text-xs text-slate">USDC</p>
                </div>
              </div>

              {pendingUsage > 0 && (
                <div className="flex items-start gap-3 rounded-md border border-hairline-soft bg-hairline p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink" />
                  <p className="text-xs leading-relaxed text-graphite">
                    <span className="data-mono text-ink">{pendingUsage.toFixed(4)} USDC</span> of
                    usage is still pending settlement on-chain. Your available
                    balance has been adjusted.
                  </p>
                </div>
              )}

              {/* Deposit */}
              <div className="border-t border-hairline pt-2">
                <label
                  htmlFor="deposit-amount"
                  className="micro-caps mb-2 block text-slate"
                >
                  Top up (USDC)
                </label>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Coins className="h-4 w-4 text-stone" />
                    </div>
                    <input
                      id="deposit-amount"
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="input-field focus-ring pl-9"
                    />
                  </div>
                  <button
                    onClick={handleDeposit}
                    disabled={busy !== null || !depositAmount}
                    className="btn-primary focus-ring no-wrap shrink-0 px-5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy === "deposit" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Withdraw — pull unused balance back out of the channel */}
              <div className="border-t border-hairline pt-2">
                <div className="mb-2 flex items-baseline justify-between">
                  <label
                    htmlFor="withdraw-amount"
                    className="micro-caps text-slate"
                  >
                    Withdraw unused
                  </label>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(availableBalance.toFixed(6))}
                    className="focus-ring text-[11px] font-semibold text-ink underline-offset-2 hover:underline"
                  >
                    Max {availableBalance.toFixed(4)}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    id="withdraw-amount"
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="input-field focus-ring"
                  />
                  <button
                    onClick={handleWithdraw}
                    disabled={busy !== null || !withdrawAmount}
                    className="btn-ghost focus-ring no-wrap shrink-0 px-5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy === "withdraw" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate">
                  The full on-chain balance can be withdrawn. Usage that has not
                  settled yet remains owed — later calls may be rejected until it
                  is covered again.
                </p>
              </div>

              {status && (
                <p className="data-mono text-center text-xs text-ink break-words">
                  {status}
                </p>
              )}
            </div>
          )}
        </div>

        <p className="data-mono mt-6 text-center text-xs text-slate">
          Arc Testnet · chain {ARC_TESTNET.chainId} · settlement in USDC
        </p>
      </div>
    </div>
  );
}
