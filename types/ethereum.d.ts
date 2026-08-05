/**
 * Minimal EIP-1193 provider typing for the injected browser wallet.
 *
 * `window.ethereum` is used by app/wallet/page.tsx and
 * components/ui/WithdrawWidget.tsx via viem's `custom()` transport.
 * Without this declaration `next build` fails type checking.
 */
interface Eip1193Provider {
  request(args: {
    method: string;
    params?: readonly unknown[] | object;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<any>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(
    event: string,
    listener: (...args: unknown[]) => void
  ): void;
}

interface Window {
  ethereum?: Eip1193Provider;
}
