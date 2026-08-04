import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const RPC_URL = "https://rpc.testnet.arc.network";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const CONTRACT_ADDRESS = process.env.PACTUM_CONTRACT_ADDRESS;

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  }
];

const PACTUM_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  }
];

async function main() {
  const pk = process.env.SERVICE_WALLET_PRIVATE_KEY;
  if (!pk || !CONTRACT_ADDRESS) throw new Error("Missing PK or Contract Address");

  let formattedPk = pk;
  if (!formattedPk.startsWith('0x')) formattedPk = '0x' + formattedPk;
  
  const account = privateKeyToAccount(formattedPk);
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http(RPC_URL) });

  const amount = parseUnits("100", 6); // Deposit 100 USDC

  console.log(`Meng-approve ${CONTRACT_ADDRESS} untuk menarik 100 USDC dari ${account.address}...`);
  const approveHash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [CONTRACT_ADDRESS, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log("✅ Approve berhasil!");

  console.log("Melakukan Deposit ke Smart Contract Pactum...");
  const depositHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: PACTUM_ABI,
    functionName: "deposit",
    args: [amount],
  });
  await publicClient.waitForTransactionReceipt({ hash: depositHash });
  console.log("✅ Deposit berhasil! Saldo user di Smart Contract telah bertambah.");
}

main().catch(console.error);
