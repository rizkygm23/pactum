"use client";

import { useState, useEffect } from "react";
import { createWalletClient, custom, createPublicClient, http, formatUnits } from "viem";
import { arcTestnet } from "viem/chains";
import { Wallet, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

const PACTUM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PACTUM_CONTRACT_ADDRESS as `0x${string}`;

const PACTUM_ABI = [
  {
    name: "merchantBalances",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "merchant", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "withdrawMerchant",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  }
] as const;

export function WithdrawWidget({ expectedMerchantAddress }: { expectedMerchantAddress: string | null }) {
  const [address, setAddress] = useState<string | null>(null);
  const [withdrawableBalance, setWithdrawableBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  // Auto-connect on mount if already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
            fetchBalance(accounts[0]);
          }
        } catch (e) {
          console.error("Auto-connect failed:", e);
        }
      }
      setIsInitializing(false);
    };
    checkConnection();
  }, []);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask to continue.");
      return;
    }
    
    try {
      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom(window.ethereum)
      });
      const [account] = await walletClient.requestAddresses();
      setAddress(account);
      fetchBalance(account);
    } catch (e) {
      console.error(e);
      alert("Failed to connect to wallet.");
    }
  };

  const fetchBalance = async (acc: string) => {
    try {
      const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: custom(window.ethereum!)
      });

      const balanceWei = await publicClient.readContract({
        address: PACTUM_CONTRACT_ADDRESS,
        abi: PACTUM_ABI,
        functionName: "merchantBalances",
        args: [acc as `0x${string}`],
      }) as bigint;
      
      setWithdrawableBalance(Number(formatUnits(balanceWei, 6)));
    } catch (e) {
      console.error("Error fetching merchant balance:", e);
    }
  };

  const handleWithdraw = async () => {
    if (!address) return;
    
    if (expectedMerchantAddress && address.toLowerCase() !== expectedMerchantAddress.toLowerCase()) {
      alert(`Wallet mismatch!\n\nConnected wallet: ${address}\nRegistered wallet in Settings: ${expectedMerchantAddress}`);
      return;
    }

    if (withdrawableBalance <= 0) {
      alert("No balance available to withdraw.");
      return;
    }

    setLoading(true);
    setStatus("Requesting withdrawal approval...");
    
    try {
      const publicClient = createPublicClient({ chain: arcTestnet, transport: custom(window.ethereum!) });
      const walletClient = createWalletClient({ chain: arcTestnet, transport: custom(window.ethereum!) });
      
      // Read exact balance in Wei to avoid floating point precision issues
      const balanceWei = await publicClient.readContract({
        address: PACTUM_CONTRACT_ADDRESS,
        abi: PACTUM_ABI,
        functionName: "merchantBalances",
        args: [address as `0x${string}`],
      }) as bigint;

      const withdrawHash = await walletClient.writeContract({
        account: address as `0x${string}`,
        address: PACTUM_CONTRACT_ADDRESS,
        abi: PACTUM_ABI,
        functionName: "withdrawMerchant",
        args: [balanceWei], // Withdraw all
      });

      setStatus("Waiting for blockchain confirmation...");
      await publicClient.waitForTransactionReceipt({ hash: withdrawHash });

      setStatus("Withdrawal Successful! Check your wallet.");
      await fetchBalance(address);
      
      setTimeout(() => setStatus(""), 5000);
    } catch (e: any) {
      console.error("Withdraw Error:", e);
      setStatus(`Failed: ${e.shortMessage || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!expectedMerchantAddress) {
    return (
      <div className="bg-ink-navy p-4 sm:p-6 rounded-xl border border-border flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-parchment">Withdraw to Wallet</h3>
          <p className="text-xs text-foreground-dim mt-1">You have not registered a Settlement Wallet in Settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ink-navy p-4 sm:p-6 rounded-xl border border-border mt-6 relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brass/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 relative z-10">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-parchment flex items-center gap-2">
            <Wallet className="w-5 h-5 text-brass shrink-0" />
            Withdraw to Wallet
          </h3>
          <p className="text-sm text-foreground-dim mt-1 max-w-md">
            Move your revenue from the smart contract directly to your MetaMask wallet via an on-chain transaction.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[200px] md:items-end">
          {isInitializing ? (
             <div className="flex items-center gap-2 text-foreground-dim text-sm py-2.5">
               <Loader2 className="w-4 h-4 animate-spin" /> Checking wallet...
             </div>
          ) : !address ? (
            <button
              onClick={connectWallet}
              className="bg-slate-800 hover:bg-slate-700 text-parchment text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 border border-slate-700 w-full md:w-auto justify-center"
            >
              <Wallet className="w-4 h-4 text-slate-400" /> Connect Wallet
            </button>
          ) : (
            <div className="flex flex-col md:items-end w-full">
              <div className="flex items-center gap-2 mb-2 bg-slate-900/50 px-3 py-1.5 rounded-md border border-border">
                <div className={`w-2 h-2 rounded-full ${address.toLowerCase() === expectedMerchantAddress.toLowerCase() ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs font-mono text-foreground-dim no-wrap">{address.slice(0, 6)}...{address.slice(-4)}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full justify-between md:justify-end">
                <div className="min-w-0 text-left md:text-right">
                  <p className="text-xs text-foreground-dim mb-0.5 no-wrap">Ready to Withdraw</p>
                  <p className="text-lg sm:text-xl font-bold text-parchment break-all">{withdrawableBalance.toFixed(6)} <span className="text-sm text-foreground-dim font-normal">USDC</span></p>
                </div>
                
                <button
                  onClick={handleWithdraw}
                  disabled={loading || withdrawableBalance <= 0 || address.toLowerCase() !== expectedMerchantAddress.toLowerCase()}
                  className="shrink-0 no-wrap btn-primary text-sm px-5 sm:px-6 py-2.5 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>Withdraw All <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
              
              {status && (
                <p className={`text-xs mt-3 max-w-full break-words md:max-w-xs md:text-right ${status.includes('Gagal') || status.includes('Failed') ? 'text-rust' : 'text-teal'}`}>
                  {status}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
