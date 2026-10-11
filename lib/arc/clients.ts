import { createPublicClient, createWalletClient, http, type HttpTransport, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { arc, arcTestnet, type Chain } from "viem/chains";
import { ARC_CHAIN, ARC_NETWORK } from "./config";

/**
 * Shared viem clients — one http transport per process instead of a fresh
 * client per request. Wallet clients are per-key by nature and cheap to
 * build; only the account is derived.
 */

export const ARC_VIEM_CHAIN: Chain = ARC_NETWORK === "mainnet" ? arc : arcTestnet;

type ActiveChain = typeof ARC_VIEM_CHAIN;

let cachedPublic: PublicClient<HttpTransport, ActiveChain> | null = null;

export function getPublicClient(): PublicClient<HttpTransport, ActiveChain> {
  if (!cachedPublic) {
    cachedPublic = createPublicClient({
      chain: ARC_VIEM_CHAIN,
      transport: http(ARC_CHAIN.rpc),
    });
  }
  return cachedPublic;
}

export function getAccount(privateKey: `0x${string}`): PrivateKeyAccount {
  return privateKeyToAccount(privateKey);
}

export function getWalletClient(account: PrivateKeyAccount): WalletClient<HttpTransport, ActiveChain, PrivateKeyAccount> {
  return createWalletClient({
    account,
    chain: ARC_VIEM_CHAIN,
    transport: http(ARC_CHAIN.rpc),
  });
}
