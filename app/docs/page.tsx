"use client";

import Link from "next/link";
import { ArrowRight, Zap, ShieldCheck, Wallet } from "lucide-react";

export default function DocsOverview() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
          Overview
        </h1>
        <p className="text-base text-slate-400 max-w-2xl">
          Pactum is a <strong>Universal State Channel</strong> network that enables AI providers to receive instant micro-payments without incurring blockchain gas overhead.
        </p>
      </div>

      <div className="space-y-6 text-slate-300 leading-relaxed">
        <p>
          The current AI ecosystem is hindered by rigid subscription models and high credit card processing overhead. Conversely, executing on-chain crypto transactions for sub-cent API calls ($0.001 per request) is unfeasible due to unpredictable and expensive gas fees.
        </p>
        <p>
          Pactum solves this by leveraging a <strong>State Channel</strong> architecture deployed on the <strong>Arc Testnet</strong> blockchain. Thousands of micro-transactions are accumulated <em>off-chain</em>, and later finalized <em>on-chain</em> through batch settlement, significantly reducing cost and latency.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 my-8">
        <div className="min-w-0 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-lg">
          <div className="w-8 h-8 rounded flex items-center justify-center mb-4 bg-slate-800">
            <Zap className="w-4 h-4 text-slate-300" />
          </div>
          <h3 className="font-medium text-slate-100 mb-2">Zero-Gas Execution</h3>
          <p className="text-sm text-slate-400">Users avoid paying gas fees per request. Balances are incrementally deducted via off-chain ledgers.</p>
        </div>
        <div className="min-w-0 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-lg">
          <div className="w-8 h-8 rounded flex items-center justify-center mb-4 bg-slate-800">
            <Wallet className="w-4 h-4 text-slate-300" />
          </div>
          <h3 className="font-medium text-slate-100 mb-2">Batch Settlement</h3>
          <p className="text-sm text-slate-400">Pending usage events are batched and settled on-chain periodically to minimize network overhead.</p>
        </div>
        <div className="min-w-0 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-lg sm:col-span-2 md:col-span-1">
          <div className="w-8 h-8 rounded flex items-center justify-center mb-4 bg-slate-800">
            <ShieldCheck className="w-4 h-4 text-slate-300" />
          </div>
          <h3 className="font-medium text-slate-100 mb-2">SIWE Security</h3>
          <p className="text-sm text-slate-400">Strict enforcement of Sign-In With Ethereum (EIP-4361) ensures cryptographic proof of wallet ownership.</p>
        </div>
      </div>

      <div className="mt-12 bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-lg relative overflow-hidden">
        <h2 className="text-base sm:text-lg font-medium text-slate-100 mb-2">Ready to start?</h2>
        <p className="text-slate-400 mb-6 max-w-lg text-sm">
          Follow the Quickstart guide to register your AI service, obtain your API Key, and explore the architecture.
        </p>
        <Link 
          href="/docs/quickstart" 
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-white text-slate-900 px-4 py-2 rounded-md text-sm font-medium transition-all"
        >
          Go to Quickstart <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
