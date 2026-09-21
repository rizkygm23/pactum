import { createPublicClient, createWalletClient, http, type HttpTransport, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import { ARC_TESTNET } from "./config";

/**
 * Shared viem clients — one http transport per process instead of a fresh
 * client per request. Wallet clients are per-key by nature and cheap to
 * build; only the account is derived.
 */

let cachedPublic: PublicClient<HttpTransport, typeof arcTestnet> | null = null;

export function getPublicClient(): PublicClient<HttpTransport, typeof arcTestnet> {
  if (!cachedPublic) {
    cachedPublic = createPublicClient({
      chain: arcTestnet,
      transport: http(ARC_TESTNET.rpc),
    });
  }
  return cachedPublic;
}

export function getAccount(privateKey: `0x${string}`): PrivateKeyAccount {
  return privateKeyToAccount(privateKey);
}

export function getWalletClient(account: PrivateKeyAccount): WalletClient<HttpTransport, typeof arcTestnet, PrivateKeyAccount> {
  return createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(ARC_TESTNET.rpc),
  });
}
