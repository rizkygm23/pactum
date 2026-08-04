/**
 * Arc Testnet configuration constants.
 *
 * IMPORTANT: USDC on Arc has dual views (native 18-decimal + ERC-20 6-decimal).
 * Always use 6-decimal ERC-20 view for balances, transfers, and display.
 * Never sum native and ERC-20 views — they represent the same balance.
 */
export const ARC_TESTNET = {
  chainId: 5042002,
  rpc: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network",
  wsRpc: "wss://rpc.testnet.arc.network",
  explorer: "https://testnet.arcscan.app",
  faucet: "https://faucet.circle.com",

  usdc: "0x3600000000000000000000000000000000000000" as const,
  usdcDecimals: 6,

  // Multicall3From — batches multiple calls preserving msg.sender
  multicall3From: "0x522fAf9A91c41c443c66765030741e4AaCe147D0" as const,

  // CCTP domain for bridging
  cctpDomain: 26,
} as const;

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
    outputs: [{ name: "", type: "uint256" }],
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
 * Multicall3From ABI — for batch settlements
 */
export const MULTICALL3_FROM_ABI = [
  {
    name: "aggregate3",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "tuple[]",
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
      },
    ],
  },
] as const;

/**
 * Build explorer URL for a transaction hash.
 */
export function explorerTxUrl(txHash: string): string {
  return `${ARC_TESTNET.explorer}/tx/${txHash}`;
}

/**
 * Build explorer URL for an address.
 */
export function explorerAddressUrl(address: string): string {
  return `${ARC_TESTNET.explorer}/address/${address}`;
}
