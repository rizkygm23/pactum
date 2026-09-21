"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from "viem";
import { arcTestnet } from "viem/chains";
import { ARC_TESTNET, ERC20_ABI } from "@/lib/arc/config";
import { ensureArcChain, ARC_CHAIN_PARAMS } from "@/lib/arc/chain-switch";

const PACTUM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PACTUM_CONTRACT_ADDRESS as `0x${string}`;

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
  },
  {
    name: "withdrawUser",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;

const FAILURE_MESSAGE = (e: unknown) =>
  e && typeof e === "object" && "shortMessage" in e
    ? String((e as { shortMessage: unknown }).shortMessage)
    : String(e);

function getInjectedWalletClient() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  return createWalletClient({ chain: arcTestnet, transport: custom(window.ethereum) });
}

/**
 * Every channel-wallet concern in one hook: connect/switch, on-chain balance,
 * pending usage (ownership-signed), deposit, and withdraw of unused funds.
 * The wallet page stays purely presentational.
 */
export function useChannelWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [onChainBalance, setOnChainBalance] = useState(0);
  const [pendingUsage, setPendingUsage] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<"deposit" | "withdraw" | null>(null);

  const fetchBalances = useCallback(async (userAddress: string) => {
    try {
      const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
      const balanceWei = (await publicClient.readContract({
        address: PACTUM_CONTRACT_ADDRESS,
        abi: PACTUM_ABI,
        functionName: "userBalances",
        args: [userAddress as `0x${string}`],
      })) as bigint;
      setOnChainBalance(Number(formatUnits(balanceWei, 6)));

      // Pending usage requires proving wallet ownership (fresh signature —
      // the balance endpoint no longer serves anonymous reads).
      let pending = 0;
      const signer = getInjectedWalletClient();
      if (signer) {
        const timestamp = Date.now().toString();
        const message = `Pactum: verify wallet ownership\nAddress: ${userAddress}\nTimestamp: ${timestamp}`;
        const signature = await signer.signMessage({
          account: userAddress as `0x${string}`,
          message,
        });
        const res = await fetch(`/api/v1/wallet/balance?address=${userAddress}`, {
          headers: {
            "x-pactum-address": userAddress,
            "x-pactum-timestamp": timestamp,
            "x-pactum-signature": signature,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.pendingUsage !== undefined) pending = data.pendingUsage;
        }
      }
      setPendingUsage(pending);
    } catch (e) {
      console.error("Error fetching balances:", e);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkConnection = async () => {
      const signer = getInjectedWalletClient();
      if (signer) {
        try {
          const accounts = await window.ethereum!.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) {
            // Auto-switch to Arc before anything else — a wallet parked on
            // another network is the most common deposit failure.
            await ensureArcChain(window.ethereum!);
            if (!cancelled) {
              setAddress(accounts[0]);
              await fetchBalances(accounts[0]);
            }
          }
        } catch (e) {
          console.error("Auto-connect failed:", e);
        }
      }
      if (!cancelled) setIsInitializing(false);
    };
    checkConnection();

    // Keep the wallet on Arc: if the user flips networks mid-session, ask to
    // come back and refresh balances for whatever chain we ended up on.
    const onChainChanged = (...args: unknown[]) => {
      const chainId = typeof args[0] === "string" ? args[0] : "";
      if (chainId.toLowerCase() !== ARC_CHAIN_PARAMS.chainId.toLowerCase()) {
        void ensureArcChain(window.ethereum!).catch(console.error);
      }
    };
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = Array.isArray(args[0]) ? (args[0] as string[]) : [];
      if (accounts.length === 0) {
        setAddress(null);
      } else if (!cancelled) {
        void fetchBalances(accounts[0]);
      }
    };
    window.ethereum?.on?.("chainChanged", onChainChanged);
    window.ethereum?.on?.("accountsChanged", onAccountsChanged);

    return () => {
      cancelled = true;
      window.ethereum?.removeListener?.("chainChanged", onChainChanged);
      window.ethereum?.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, [fetchBalances]);

  const connectWallet = useCallback(async () => {
    const signer = getInjectedWalletClient();
    if (!signer) {
      setStatus("MetaMask is required to continue.");
      return;
    }
    try {
      await ensureArcChain(window.ethereum!);
      const [account] = await signer.requestAddresses();
      setAddress(account);
      await fetchBalances(account);
    } catch (e) {
      console.error(e);
      setStatus("Failed to connect to wallet.");
    }
  }, [fetchBalances]);

  const switchWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        await fetchBalances(accounts[0]);
      }
    } catch (e) {
      console.error("Switch wallet failed:", e);
    }
  }, [fetchBalances]);

  const deposit = useCallback(
    async (amount: string): Promise<boolean> => {
      const signer = getInjectedWalletClient();
      if (!address || !signer || isNaN(Number(amount))) return false;

      setBusy("deposit");
      setStatus("Requesting USDC approval...");
      try {
        await ensureArcChain(window.ethereum!);
        const amountWei = parseUnits(amount, 6);
        const publicClient = createPublicClient({ chain: arcTestnet, transport: custom(window.ethereum!) });

        const approveHash = await signer.writeContract({
          account: address as `0x${string}`,
          address: ARC_TESTNET.usdc,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [PACTUM_CONTRACT_ADDRESS, amountWei],
        });
        setStatus("Waiting for approval confirmation...");
        await publicClient.waitForTransactionReceipt({ hash: approveHash });

        setStatus("Processing deposit...");
        const depositHash = await signer.writeContract({
          account: address as `0x${string}`,
          address: PACTUM_CONTRACT_ADDRESS,
          abi: PACTUM_ABI,
          functionName: "deposit",
          args: [amountWei],
        });
        setStatus("Waiting for deposit confirmation...");
        await publicClient.waitForTransactionReceipt({ hash: depositHash });

        setStatus("Deposit confirmed.");
        await fetchBalances(address);
        return true;
      } catch (e) {
        console.error("Deposit Error:", e);
        setStatus(`Failed: ${FAILURE_MESSAGE(e)}`);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [address, fetchBalances]
  );

  const withdraw = useCallback(
    async (amount: string): Promise<boolean> => {
      const signer = getInjectedWalletClient();
      if (!address || !signer || isNaN(Number(amount))) return false;

      setBusy("withdraw");
      setStatus("Processing withdrawal...");
      try {
        await ensureArcChain(window.ethereum!);
        const amountWei = parseUnits(amount, 6);
        const publicClient = createPublicClient({ chain: arcTestnet, transport: custom(window.ethereum!) });

        const hash = await signer.writeContract({
          account: address as `0x${string}`,
          address: PACTUM_CONTRACT_ADDRESS,
          abi: PACTUM_ABI,
          functionName: "withdrawUser",
          args: [amountWei],
        });
        setStatus("Waiting for withdrawal confirmation...");
        await publicClient.waitForTransactionReceipt({ hash });

        setStatus("Withdrawal confirmed.");
        await fetchBalances(address);
        return true;
      } catch (e) {
        console.error("Withdraw Error:", e);
        setStatus(`Failed: ${FAILURE_MESSAGE(e)}`);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [address, fetchBalances]
  );

  const availableBalance = useMemo(
    () => Math.max(0, onChainBalance - pendingUsage),
    [onChainBalance, pendingUsage]
  );

  return {
    // state
    address,
    onChainBalance,
    pendingUsage,
    availableBalance,
    isInitializing,
    status,
    busy,
    // actions
    connectWallet,
    switchWallet,
    deposit,
    withdraw,
    clearStatus: () => setStatus(""),
  };
}
