"use client";

import Link from "next/link";
import { ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";

export default function IntegrationPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
          Integration & SIWE
        </h1>
        <p className="text-base text-slate-400 max-w-2xl">
          API documentation for tracking usage metrics and implementing mandatory wallet authentication.
        </p>
      </div>

      <div className="space-y-12">
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-100 border-l-2 border-slate-500 pl-3">
            SIWE Authentication (EIP-4361)
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Pactum mandates that AI providers cryptographically verify the wallet address of the end-user initiating the API request. This mitigates identity spoofing and unauthorized billing.
          </p>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-md flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-200">Provider Obligation</p>
              <p className="text-sm text-slate-400">
                Never bill a user's wallet without verifying their <code>personal_sign</code> payload server-side. Failure to enforce this protocol leaves your application vulnerable to exploit claims, potentially resulting in frozen settlement funds.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">
            Recommended authentication flow:
            <br />1. The client requests a SIWE message from your backend.
            <br />2. The user signs the message via their Web3 wallet (e.g., MetaMask).
            <br />3. Your backend verifies the signature using <code className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700">ethers.verifyMessage</code>.
            <br />4. Your backend issues a standard session token (e.g., JWT) bound to the verified wallet address.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-100 border-l-2 border-slate-500 pl-3">
            API Reference: Usage Tracking
          </h2>
          <p className="text-sm text-slate-300">
            Once authenticated, invoke this endpoint from your backend environment for every billable user action (e.g., chat completion).
          </p>

          <div className="bg-[#0D1117] rounded-md overflow-hidden border border-slate-800">
            <div className="bg-[#161B22] px-4 py-2 border-b border-slate-800 flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">POST</span>
              <code className="text-sm text-slate-300 font-mono">/api/v1/usage/track</code>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-sm text-slate-300 font-mono leading-relaxed">
{`// Request Headers
Authorization: Bearer <PACTUM_API_KEY>
Content-Type: application/json

// Request Body
{
  "user_address": "0x123...",    // Verified SIWE address
  "endpoint": "chat-completion", // Feature identifier
  "cost": 0.0001                 // Cost denominated in USDC
}`}
              </pre>
            </div>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">
            A successful response (200 OK) indicates the virtual balance has been deducted, and the corresponding value is securely added to your <strong>Pending Payout</strong> ledger.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link 
          href="/docs/quickstart" 
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-md text-sm font-medium transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Quickstart
        </Link>
        <Link 
          href="/docs/smart-contracts" 
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-white text-slate-900 px-4 py-2 rounded-md text-sm font-medium transition-all"
        >
          Smart Contracts <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
