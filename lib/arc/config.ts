/**
 * DESIGN token & chain configuration for Pactum on Arc.
 *
 * Two networks, one codebase — the active network is selected by env:
 *   ARC_NETWORK (server) / NEXT_PUBLIC_ARC_NETWORK (client) = "testnet" | "mainnet"
 *
 * IMPORTANT: USDC on Arc has dual views (native 18-decimal + ERC-20 6-decimal).
 * Always use the 6-decimal ERC-20 view for balances, transfers, and display.
 * Never sum native and ERC-20 views — they represent the same balance.
 *
 * Mainnet params per docs.arc.io: chain 5042, rpc.mainnet.arc.io,
 * explorer.arc.io, USDC ERC-20 at 0x3600…0000 on BOTH networks, EVM target
 * Osaka. There is no mainnet faucet — the operator wallet must hold real
 * USDC for gas.
 */

export type ArcNetwork = "testnet" | "mainnet";

export interface ArcChainConfig {
  network: ArcNetwork;
  chainId: number;
  rpc: string;
  explorer: string;
  /** Mainnet has no faucet; gas and float must be funded with real USDC. */
  faucet: string | null;
  usdc: string;
  usdcDecimals: 6;
  cctpDomain: number;
}

export const ARC_TESTNET: ArcChainConfig = {
  network: "testnet",
  chainId: 5042002,
  rpc: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.io",
  explorer: "https://explorer.testnet.arc.io",
  faucet: "https://faucet.circle.com",
  usdc: "0x3600000000000000000000000000000000000000",
  usdcDecimals: 6,
  cctpDomain: 26,
};

export const ARC_MAINNET: ArcChainConfig = {
  network: "mainnet",
  chainId: 5042,
  rpc: process.env.ARC_MAINNET_RPC_URL || "https://rpc.mainnet.arc.io",
  explorer: "https://explorer.arc.io",
  faucet: null,
  // Same precompile address on both networks per docs.arc.io contract-addresses.
  usdc: "0x3600000000000000000000000000000000000000",
  usdcDecimals: 6,
  cctpDomain: 26,
};

/**
 * Active network for this deployment. Server code reads ARC_NETWORK,
 * client bundles read NEXT_PUBLIC_ARC_NETWORK (inlined at build time).
 */
export const ARC_NETWORK: ArcNetwork =
  (process.env.NEXT_PUBLIC_ARC_NETWORK as ArcNetwork | undefined) ??
  (process.env.ARC_NETWORK as ArcNetwork | undefined) ??
  "testnet";

export const ARC_CHAIN: ArcChainConfig =
  ARC_NETWORK === "mainnet" ? ARC_MAINNET : ARC_TESTNET;

/**
 * Minimal ERC-20 ABI for USDC operations.
 * Covers: balanceOf, transfer, approve, allowance, decimals
 */
export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

/**
 * Build explorer URL for a transaction hash.
 */
export function explorerTxUrl(txHash: string): string {
  return `${ARC_CHAIN.explorer}/tx/${txHash}`;
}
