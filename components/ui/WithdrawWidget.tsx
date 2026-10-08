"use client";

import { useState, useEffect } from "react";
import { createWalletClient, custom, createPublicClient, http, formatUnits } from "viem";
import { arcTestnet } from "viem/chains";
import { Wallet, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { ensureArcChain } from "@/lib/arc/chain-switch";

const PACTUM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PACTUM_CONTRACT_ADDRESS as `0x${string}`;
const PACTUM_ABI = [
  { name: "merchantBalances", type: "function", stateMutability: "view",        inputs: [{ name: "merchant", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "withdrawMerchant", type: "function", stateMutability: "nonpayable",  inputs: [{ name: "amount",   type: "uint256" }], outputs: [] },
] as const;

export function WithdrawWidget({ expectedMerchantAddress }: { expectedMerchantAddress: string | null }) {
  const [address,             setAddress]             = useState<string | null>(null);
  const [withdrawableBalance, setWithdrawableBalance] = useState<number>(0);
  const [loading,             setLoading]             = useState(false);
  const [status,              setStatus]              = useState("");
  const [isInitializing,      setIsInitializing]      = useState(true);

  const fetchBalance = async (acc: string) => {
    try {
      const publicClient = createPublicClient({ chain: arcTestnet, transport: custom(window.ethereum!) });
      const balanceWei = await publicClient.readContract({ address: PACTUM_CONTRACT_ADDRESS, abi: PACTUM_ABI, functionName: "merchantBalances", args: [acc as `0x${string}`] }) as bigint;
      setWithdrawableBalance(Number(formatUnits(balanceWei, 6)));
    } catch (e) { console.error("Error fetching merchant balance:", e); }
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) { await ensureArcChain(window.ethereum!); setAddress(accounts[0]); fetchBalance(accounts[0]); }
        } catch (e) { console.error("Auto-connect failed:", e); }
      }
      setIsInitializing(false);
    };
    checkConnection();
  }, []);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) { toast.error("Please install MetaMask."); return; }
    try {
      await ensureArcChain(window.ethereum!);
      const walletClient = createWalletClient({ chain: arcTestnet, transport: custom(window.ethereum) });
      const [account] = await walletClient.requestAddresses();
      setAddress(account); fetchBalance(account);
    } catch (e) { console.error(e); toast.error("Failed to connect wallet."); }
  };

  const switchWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length > 0) { setAddress(accounts[0]); fetchBalance(accounts[0]); }
    } catch (e) { console.error("Switch wallet failed:", e); }
  };

  const handleWithdraw = async () => {
    if (!address) return;
    if (expectedMerchantAddress && address.toLowerCase() !== expectedMerchantAddress.toLowerCase()) {
      toast.error(`Wallet mismatch!\nConnected: ${address}\nRegistered: ${expectedMerchantAddress}`); return;
    }
    if (withdrawableBalance <= 0) { toast.error("No balance available to withdraw."); return; }
    try { await ensureArcChain(window.ethereum!); } catch { toast.error("Arc Testnet must be selected."); return; }
    setLoading(true); setStatus("Requesting withdrawal approval…");
    try {
      const publicClient = createPublicClient({ chain: arcTestnet, transport: custom(window.ethereum!) });
      const walletClient = createWalletClient({ chain: arcTestnet, transport: custom(window.ethereum!) });
      const balanceWei   = await publicClient.readContract({ address: PACTUM_CONTRACT_ADDRESS, abi: PACTUM_ABI, functionName: "merchantBalances", args: [address as `0x${string}`] }) as bigint;
      const withdrawHash = await walletClient.writeContract({ account: address as `0x${string}`, address: PACTUM_CONTRACT_ADDRESS, abi: PACTUM_ABI, functionName: "withdrawMerchant", args: [balanceWei] });
      setStatus("Waiting for confirmation…");
      await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
      setStatus("Withdrawal successful!"); await fetchBalance(address); setTimeout(() => setStatus(""), 5000);
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "shortMessage" in e ? String((e as { shortMessage: unknown }).shortMessage) : String(e);
      setStatus(`Failed: ${message}`);
    } finally { setLoading(false); }
  };

  if (!expectedMerchantAddress) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-[#030303] mb-1">Withdraw to Wallet</h3>
        <p className="text-xs text-[#676f7b]">Set a settlement wallet in Settings first.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#030303] mb-3">
        <Wallet className="w-4 h-4 shrink-0" /> Withdraw to Wallet
      </h3>
      <p className="text-xs text-[#676f7b] mb-4">Move revenue from the contract to your wallet via an on-chain transaction.</p>

      {isInitializing ? (
        <div className="flex items-center gap-2 text-xs text-[#676f7b] py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking wallet…
        </div>
      ) : !address ? (
        <button onClick={connectWallet}
          className="inline-flex items-center gap-2 rounded-lg border border-[#e7eaf0] bg-[#f9fafb] px-4 py-2 text-sm font-medium text-[#030303] hover:bg-[#e7eaf0] transition-colors">
          <Wallet className="w-4 h-4" /> Connect Wallet
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#e7eaf0] bg-[#f9fafb] px-3 py-1.5">
            <div className={`w-2 h-2 rounded-full shrink-0 ${address.toLowerCase() === expectedMerchantAddress.toLowerCase() ? "bg-green-500" : "bg-red-500"}`} />
            <span className="font-mono text-xs text-[#676f7b] flex-1">{address.slice(0, 6)}…{address.slice(-4)}</span>
            <button onClick={switchWallet} className="text-xs font-medium text-[#030303] underline underline-offset-2 hover:opacity-70">Switch</button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-[#939393] mb-0.5">Ready to Withdraw</p>
              <p className="font-mono text-xl font-semibold text-[#030303]">{withdrawableBalance.toFixed(6)} <span className="text-sm font-normal text-[#676f7b]">USDC</span></p>
            </div>
            <button onClick={handleWithdraw} disabled={loading || withdrawableBalance <= 0}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                withdrawableBalance <= 0 || address.toLowerCase() !== expectedMerchantAddress.toLowerCase()
                  ? "bg-[#f9fafb] border border-[#e7eaf0] text-[#939393] cursor-not-allowed"
                  : "bg-[#030303] text-white hover:bg-[#1a1a1a]"
              }`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? "Withdrawing…" : "Withdraw All"}
            </button>
          </div>

          {status && (
            <p className={`text-xs ${status.includes("successful") ? "text-[#15803d]" : status.includes("Failed") ? "text-[#b91c1c]" : "text-[#676f7b]"}`}>
              {status.includes("successful") && <CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />}
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
