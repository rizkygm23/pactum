"use client";

import Link from "next/link";
import { ArrowRight, ArrowLeft, Info, AlertTriangle } from "lucide-react";

export default function QuickstartPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
          Quickstart
        </h1>
        <p className="text-base text-slate-400 max-w-2xl">
          Step-by-step guide to registering your AI service and acquiring an API Key.
        </p>
      </div>

      <div className="space-y-12">
        {/* Step 1 */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-medium text-slate-200 shrink-0 text-sm border border-slate-700">1</div>
            <h2 className="text-lg font-medium text-slate-100">Project Registration</h2>
          </div>
          <div className="pl-11 space-y-4 text-slate-300">
            <p className="text-sm">
              Navigate to the <strong>Dashboard Settings</strong>. You must configure two primary variables:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-400">
              <li><strong>Project Name:</strong> The identifier for your AI service (e.g., <em>Aura AI</em>).</li>
              <li><strong>Settlement Wallet:</strong> Your Web3 wallet address (e.g., MetaMask) where protocol revenues will be deposited.</li>
            </ul>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-md flex items-start gap-3">
              <Info className="w-5 h-5 text-slate-400 shrink-0" />
              <p className="text-sm text-slate-300">
                Ensure your Settlement Wallet is configured for the <strong>Arc Testnet</strong>, as Pactum currently operates exclusively on this network.
              </p>
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-medium text-slate-200 shrink-0 text-sm border border-slate-700">2</div>
            <h2 className="text-lg font-medium text-slate-100">Generate API Key</h2>
          </div>
          <div className="pl-11 space-y-4 text-slate-300">
            <p className="text-sm">
              Upon successful project configuration, the system provisions an active <strong>API Key</strong> automatically.
            </p>
            <p className="text-sm text-slate-400">
              This API Key must be securely stored. It is required in the <code>Authorization</code> header when communicating with the Pactum API (e.g., tracking usage metrics).
            </p>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-md flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">Security Warning</p>
                <p className="text-sm text-slate-400">
                  Never expose your API Key in client-side applications (React, Vue, browsers). API requests must originate strictly from your secure backend environment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3 */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-medium text-slate-200 shrink-0 text-sm border border-slate-700">3</div>
            <h2 className="text-lg font-medium text-slate-100">Configure Spending Limits (Optional)</h2>
          </div>
          <div className="pl-11 space-y-4 text-slate-300">
            <p className="text-sm">
              You can define daily or monthly spending limits for your end-users via the <strong>Settings</strong> interface. This mitigates the risk of unexpected billing spikes and malicious usage.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link 
          href="/docs" 
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-md text-sm font-medium transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Overview
        </Link>
        <Link 
          href="/docs/integration" 
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-white text-slate-900 px-4 py-2 rounded-md text-sm font-medium transition-all"
        >
          Integration & SIWE <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
