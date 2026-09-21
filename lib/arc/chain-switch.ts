import { ARC_TESTNET } from "./config";

/**
 * Arc Testnet parameters for wallet_addEthereumChain.
 * Native currency is USDC with 18 decimals on Arc (native view).
 */
export const ARC_CHAIN_PARAMS = {
  chainId: "0x4CEF52", // 5042002
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: [ARC_TESTNET.rpc],
  blockExplorerUrls: [ARC_TESTNET.explorer],
};

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

/**
 * Ask the injected wallet to switch to Arc Testnet, adding the network first
 * when the wallet has never seen it (EIP-3085). Safe to call before every
 * wallet interaction — it is a no-op when already on Arc.
 */
export async function ensureArcChain(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_CHAIN_PARAMS.chainId }],
    });
  } catch (e) {
    const code = (e as { code?: number }).code;
    // 4902 = chain not added yet; 4001 = user rejected (rethrow for UX copy)
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [ARC_CHAIN_PARAMS],
      });
    } else {
      throw e;
    }
  }
}
