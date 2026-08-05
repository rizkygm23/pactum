"use client";

import { useState, useEffect } from "react";
import { createWalletClient, custom, createPublicClient, http, parseUnits, formatUnits } from "viem";
import { arcTestnet } from "viem/chains";
import { Wallet, Coins, ArrowRight, Loader2, Info } from "lucide-react";

// Pactum Contract config
const PACTUM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PACTUM_CONTRACT_ADDRESS as `0x${string}`;
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  }
] as const;

const PACTUM_ABI = [
  {
    name: "userBalances",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  }
] as const;

export default function WalletPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [onChainBalance, setOnChainBalance] = useState<number>(0);
  const [pendingUsage, setPendingUsage] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
            fetchBalances(accounts[0]);
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
      fetchBalances(account);
    } catch (e) {
      console.error(e);
      alert("Failed to connect to wallet.");
    }
  };

  const fetchBalances = async (userAddress: string) => {
    try {
      const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: http()
      });

      // 1. Fetch on-chain balance from PactumBilling
      const balanceWei = await publicClient.readContract({
        address: PACTUM_CONTRACT_ADDRESS,
        abi: PACTUM_ABI,
        functionName: "userBalances",
        args: [userAddress as `0x${string}`],
      }) as bigint;
      setOnChainBalance(Number(formatUnits(balanceWei, 6))); // USDC has 6 decimals

      // 2. Fetch off-chain pending usage
      const res = await fetch(`/api/v1/wallet/balance?address=${userAddress}`);
      const data = await res.json();
      if (data.pendingUsage !== undefined) {
        setPendingUsage(data.pendingUsage);
      }
    } catch (e) {
      console.error("Error fetching balances:", e);
    }
  };

  const handleDeposit = async () => {
    if (!address || !depositAmount || isNaN(Number(depositAmount))) return;
    
    setLoading(true);
    setStatus("Requesting USDC approval...");
    
    try {
      const publicClient = createPublicClient({ chain: arcTestnet, transport: custom(window.ethereum!) });
      const walletClient = createWalletClient({ chain: arcTestnet, transport: custom(window.ethereum!) });
      
      const amountWei = parseUnits(depositAmount, 6);

      // 1. Approve USDC
      const approveHash = await walletClient.writeContract({
        account: address as `0x${string}`,
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [PACTUM_CONTRACT_ADDRESS, amountWei],
      });
      
      setStatus("Waiting for approval confirmation on blockchain...");
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // 2. Deposit to Pactum
      setStatus("Processing deposit...");
      const depositHash = await walletClient.writeContract({
        account: address as `0x${string}`,
        address: PACTUM_CONTRACT_ADDRESS,
        abi: PACTUM_ABI,
        functionName: "deposit",
        args: [amountWei],
      });

      setStatus("Waiting for deposit confirmation...");
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      setStatus("Deposit successful!");
      setDepositAmount("");
      await fetchBalances(address);
      
      setTimeout(() => setStatus(""), 3000);
    } catch (e: any) {
      console.error("Deposit Error:", e);
      setStatus(`Failed: ${e.shortMessage || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const availableBalance = Math.max(0, onChainBalance - pendingUsage);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center pt-20 px-4 font-sans">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-8">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Wallet className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Universal Wallet</h1>
          <p className="text-neutral-400 max-w-md mx-auto text-sm">
            Deposit USDC to pay for AI services across the Pactum ecosystem. 
            <br/>Gas-free per-token billing via State Channels.
          </p>
        </div>

        {isInitializing ? (
          <div className="w-full flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : !address ? (
          <button
            onClick={connectWallet}
            className="w-full bg-white text-black font-semibold rounded-xl py-3 px-4 hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
          >
            Connect Wallet (MetaMask)
          </button>
        ) : (
          <div className="space-y-6">
            <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800">
              <p className="text-xs text-neutral-500 mb-1">Connected Wallet</p>
              <p className="text-sm font-mono break-all text-neutral-300">
                {address}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-800">
                <p className="text-xs text-neutral-500 mb-1 flex items-center gap-1">
                  On-Chain Balance <Info className="w-3 h-3" />
                </p>
                <p className="text-2xl font-bold text-white">{onChainBalance.toFixed(4)}</p>
                <p className="text-xs text-neutral-500 mt-1">USDC</p>
              </div>
              <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-800">
                <p className="text-xs text-neutral-500 mb-1 flex items-center gap-1">
                  Available Balance
                </p>
                <p className="text-2xl font-bold text-blue-400">{availableBalance.toFixed(4)}</p>
                <p className="text-xs text-neutral-500 mt-1">USDC</p>
              </div>
            </div>

            {pendingUsage > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-200 leading-relaxed">
                  You have pending usage of <strong>{pendingUsage.toFixed(4)} USDC</strong> that has not been settled on-chain. Your available balance has been adjusted.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-neutral-800">
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Top up Balance (USDC)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Coins className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount to deposit (USDC)"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={loading || !depositAmount}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl px-6 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
              
              {status && (
                <p className="text-xs text-center mt-3 text-blue-400 animate-pulse">
                  {status}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
