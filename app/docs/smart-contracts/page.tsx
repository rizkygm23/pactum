"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Network, Info } from "lucide-react";
import { explorerTxUrl } from "@/lib/arc/config";

const PACTUM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PACTUM_CONTRACT_ADDRESS || "0x84b739c9B1484EB4fc8C095f7a1dC396669EAeE3";

export default function SmartContractsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
          Smart Contracts
        </h1>
        <p className="text-base text-slate-400 max-w-2xl">
          Architectural details of the Pactum state channel and the Arc Testnet deployment.
        </p>
      </div>

      <div className="space-y-12">
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-100 border-l-2 border-slate-500 pl-3">
            Arc Testnet Network
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Pactum is currently deployed on the <strong>Arc Testnet</strong> blockchain—a network explicitly designed to utilize native USDC as its gas token, providing predictable and stable transaction costs.
          </p>
          
          <div className="bg-slate-900 p-5 rounded-md border border-slate-800 mt-4">
            <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2 text-sm">
              <Network className="w-4 h-4 text-slate-400" />
              PactumBilling Contract Address
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <code className="bg-[#0D1117] px-3 py-1.5 rounded-md border border-slate-800 text-slate-300 font-mono text-sm break-all">
                {PACTUM_CONTRACT_ADDRESS}
              </code>
              <a 
                href={explorerTxUrl(PACTUM_CONTRACT_ADDRESS).replace("/tx/", "/address/")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors font-medium"
              >
                View in Explorer <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-100 border-l-2 border-slate-500 pl-3">
            Batch Settlement Mechanism
          </h2>
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p>
              The <code>PactumBilling</code> smart contract functions as the definitive ledger for the <strong>State Channel</strong> architecture.
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-slate-400">
              <li>
                <strong>User Deposit:</strong> End-users deposit USDC into the smart contract liquidity pool via the <code>deposit()</code> function.
              </li>
              <li>
                <strong>Off-chain Usage:</strong> As users interact with AI endpoints, high-frequency state transitions occur entirely off-chain within the relational database.
              </li>
              <li>
                <strong>Cron Settlement:</strong> The Pactum orchestrator periodically invokes the on-chain <code>batchSettleUsage()</code> function. This atomically deducts from <code>userBalances</code> and credits the respective <code>merchantBalances</code>, clearing pending liabilities.
              </li>
            </ol>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-md flex items-start gap-3 mt-4">
            <Info className="w-5 h-5 text-slate-400 shrink-0" />
            <p className="text-sm text-slate-300">
              Gas overhead for the <code>batchSettleUsage()</code> execution is fully subsidized by the Pactum Operator. AI Providers receive 100% of their net revenue with zero gas deductions.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-100 border-l-2 border-slate-500 pl-3">
            Fund Withdrawal
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            To optimize gas efficiency, settled revenues are not automatically pushed to provider wallets. Instead, they accumulate within the contract and reflect as <strong>Ready to Withdraw</strong> on your Dashboard.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Providers must explicitly invoke the <code>withdrawMerchant()</code> function (via the "Withdraw All" interface) using their authenticated MetaMask wallet. This initiates an on-chain transfer, moving physical USDC from the smart contract liquidity pool directly to the provider's wallet.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-slate-800 flex justify-start">
        <Link 
          href="/docs/integration" 
          className="inline-flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-md text-sm font-medium transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Integration & SIWE
        </Link>
      </div>
    </div>
  );
}
