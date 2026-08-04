import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const RPC_URL = process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

async function main() {
  const pk = process.env.SERVICE_WALLET_PRIVATE_KEY;
  if (!pk) {
    console.error("❌ ERROR: SERVICE_WALLET_PRIVATE_KEY belum di-set di .env.local");
    console.error("Gunakan private key EVM (awali dengan 0x) yang memiliki saldo USDC di Arc Testnet.");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log(`Deploying from account: ${account.address}`);

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(RPC_URL),
  });

  // Check gas balance (native USDC on Arc)
  const balance = await publicClient.getBalance({ address: account.address });
  if (balance === 0n) {
    console.error("❌ ERROR: Saldo USDC untuk gas fee adalah 0.");
    console.error(`Silakan minta USDC dari faucet ke address: ${account.address}`);
    console.error("Faucet: https://faucet.circle.com (Pilih jaringan Arc Testnet)");
    process.exit(1);
  }

  console.log(`Saldo Gas (USDC): ${Number(balance) / 1e18}`);

  // Read ABI and Bytecode
  const artifactPath = path.resolve("./artifacts-contract/PactumBilling.json");
  if (!fs.existsSync(artifactPath)) {
    console.error("❌ ERROR: Artifact tidak ditemukan. Jalankan 'node compile.js' terlebih dahulu.");
    process.exit(1);
  }

  const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  console.log("Mengirim transaksi deploy...");
  
  const hash = await walletClient.deployContract({
    abi,
    bytecode: `0x${bytecode}`,
    args: [USDC_ADDRESS],
  });

  console.log(`Transaction Hash: ${hash}`);
  console.log("Menunggu konfirmasi...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  console.log("\n✅ DEPLOYMENT BERHASIL!");
  console.log(`Contract Address: ${receipt.contractAddress}`);
  console.log(`Simpan Contract Address ini di .env.local Anda sebagai PACTUM_CONTRACT_ADDRESS=${receipt.contractAddress}`);
}

main().catch(console.error);
