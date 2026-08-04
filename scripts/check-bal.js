import { createPublicClient, http, parseUnits, formatUnits } from "viem";
import { arcTestnet } from "viem/chains";

const RPC_URL = "https://rpc.testnet.arc.network";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const USER = "0x3813cB42a4376e4FaCB4b7F0fA3492CC0A5F727a";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  }
];

async function main() {
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(RPC_URL) });
  
  const nativeBal = await publicClient.getBalance({ address: USER });
  console.log("Native USDC (Gas):", Number(nativeBal) / 1e18);

  const erc20Bal = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [USER]
  });
  console.log("ERC20 USDC:", Number(erc20Bal) / 1e6);
}

main().catch(console.error);
