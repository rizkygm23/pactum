import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  encodeFunctionData,
} from "viem";
import { arcTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  ARC_TESTNET,
  ERC20_ABI,
  MULTICALL3_FROM_ABI,
  explorerTxUrl,
} from "./config";

export interface SettlementResult {
  txHash: string;
  amount: string;
  explorerUrl: string;
  settledAt: Date;
}

export interface SettlementTarget {
  merchantWallet: `0x${string}`;
  amount: string; // Human-readable USDC amount, e.g. "10.50"
  invoiceId: string;
}

/**
 * Get the service wallet account from env.
 * IMPORTANT: Private key must NEVER be logged, committed, or exposed.
 */
function getServiceAccount() {
  const key = process.env.SERVICE_WALLET_PRIVATE_KEY;
  if (!key) {
    throw new Error("SERVICE_WALLET_PRIVATE_KEY is not set");
  }
  return privateKeyToAccount(key as `0x${string}`);
}

/**
 * Create viem clients for Arc Testnet.
 */
function getClients() {
  const account = getServiceAccount();

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(ARC_TESTNET.rpc),
  });

  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(ARC_TESTNET.rpc),
  });

  return { publicClient, walletClient, account };
}

/**
 * Check the USDC balance of the service wallet.
 * Returns human-readable amount (e.g. "150.50").
 */
export async function getServiceWalletBalance(): Promise<string> {
  const { publicClient, account } = getClients();

  const balance = await publicClient.readContract({
    address: ARC_TESTNET.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  return formatUnits(balance, ARC_TESTNET.usdcDecimals);
}

/**
 * Get the service wallet address (for display / funding).
 */
export function getServiceWalletAddress(): string {
  return getServiceAccount().address;
}

/**
 * Settle a single invoice — transfer USDC to merchant wallet.
 *
 * Flow:
 * 1. Validate amount and destination
 * 2. Check sufficient balance
 * 3. Execute ERC-20 transfer
 * 4. Wait for receipt (sub-second finality on Arc)
 */
export async function settleInvoice(
  target: SettlementTarget
): Promise<SettlementResult> {
  const { publicClient, walletClient, account } = getClients();
  const amountWei = parseUnits(target.amount, ARC_TESTNET.usdcDecimals);

  // Verify balance
  const balance = await publicClient.readContract({
    address: ARC_TESTNET.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  if (balance < amountWei) {
    const available = formatUnits(balance, ARC_TESTNET.usdcDecimals);
    throw new Error(
      `Insufficient balance: need ${target.amount} USDC, have ${available} USDC`
    );
  }

  // Execute transfer
  const hash = await walletClient.writeContract({
    address: ARC_TESTNET.usdc,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [target.merchantWallet, amountWei],
  });

  // Wait for confirmation (Arc has deterministic finality — 1 block is final)
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    throw new Error(`Settlement transaction reverted: ${hash}`);
  }

  return {
    txHash: hash,
    amount: target.amount,
    explorerUrl: explorerTxUrl(hash),
    settledAt: new Date(),
  };
}

/**
 * Batch settle multiple invoices in a single transaction.
 * Uses Arc's Multicall3From contract to send multiple USDC transfers
 * while preserving msg.sender.
 *
 * Gas savings: N transfers in 1 tx instead of N separate txs.
 */
export async function batchSettle(
  targets: SettlementTarget[]
): Promise<SettlementResult> {
  if (targets.length === 0) {
    throw new Error("No targets to settle");
  }

  // Single target → use direct transfer (simpler, cheaper)
  if (targets.length === 1) {
    return settleInvoice(targets[0]);
  }

  const { publicClient, walletClient, account } = getClients();

  // Calculate total needed
  let totalWei = 0n;
  for (const t of targets) {
    totalWei += parseUnits(t.amount, ARC_TESTNET.usdcDecimals);
  }

  // Verify balance
  const balance = await publicClient.readContract({
    address: ARC_TESTNET.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  if (balance < totalWei) {
    const available = formatUnits(balance, ARC_TESTNET.usdcDecimals);
    const needed = formatUnits(totalWei, ARC_TESTNET.usdcDecimals);
    throw new Error(
      `Insufficient balance for batch: need ${needed} USDC, have ${available} USDC`
    );
  }

  // Encode each transfer as a Multicall3 call
  const calls = targets.map((t) => ({
    target: ARC_TESTNET.usdc as `0x${string}`,
    allowFailure: false,
    callData: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [
        t.merchantWallet,
        parseUnits(t.amount, ARC_TESTNET.usdcDecimals),
      ],
    }),
  }));

  // Simulate first
  await publicClient.simulateContract({
    account: account,
    address: ARC_TESTNET.multicall3From,
    abi: MULTICALL3_FROM_ABI,
    functionName: "aggregate3",
    args: [calls],
  });

  // Execute batch
  const hash = await walletClient.writeContract({
    address: ARC_TESTNET.multicall3From,
    abi: MULTICALL3_FROM_ABI,
    functionName: "aggregate3",
    args: [calls],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    throw new Error(`Batch settlement transaction reverted: ${hash}`);
  }

  return {
    txHash: hash,
    amount: formatUnits(totalWei, ARC_TESTNET.usdcDecimals),
    explorerUrl: explorerTxUrl(hash),
    settledAt: new Date(),
  };
}
