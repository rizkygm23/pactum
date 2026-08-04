"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Code, CreditCard, Activity, Box, Lock, Terminal, FileJson, Zap, Key } from "lucide-react";

type TabId = "overview" | "authentication" | "api-reference" | "settlement-payouts" | "customer-flow";

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="min-h-screen bg-ink-navy text-parchment font-sans pb-24">
      {/* Header */}
      <header className="border-b border-border bg-graphite/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-parchment" style={{ fontFamily: "var(--font-display)" }}>
              Pactum Docs
            </h1>
            <span className="px-2 py-0.5 rounded text-xs bg-brass/10 text-brass font-medium border border-brass/20">
              v1.0
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-foreground-dim hover:text-parchment transition-colors">
              Home
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-brass hover:text-brass-glow transition-colors">
              Go to Dashboard &rarr;
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-12">
        
        {/* Sidebar Nav (Tabs) */}
        <div className="hidden md:block md:col-span-3 space-y-6 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 custom-scrollbar">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-dim mb-3">Documentation</h4>
            <ul className="space-y-1.5">
              <li>
                <button 
                  onClick={() => setActiveTab("overview")}
                  className={`text-sm w-full text-left px-3 py-2 rounded-md transition-colors ${activeTab === 'overview' ? 'bg-brass/10 text-brass font-medium' : 'text-foreground-dim hover:text-parchment hover:bg-graphite'}`}
                >
                  Platform Overview
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab("authentication")}
                  className={`text-sm w-full text-left px-3 py-2 rounded-md transition-colors ${activeTab === 'authentication' ? 'bg-brass/10 text-brass font-medium' : 'text-foreground-dim hover:text-parchment hover:bg-graphite'}`}
                >
                  Authentication
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab("api-reference")}
                  className={`text-sm w-full text-left px-3 py-2 rounded-md transition-colors ${activeTab === 'api-reference' ? 'bg-brass/10 text-brass font-medium' : 'text-foreground-dim hover:text-parchment hover:bg-graphite'}`}
                >
                  API Reference & Examples
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab("settlement-payouts")}
                  className={`text-sm w-full text-left px-3 py-2 rounded-md transition-colors ${activeTab === 'settlement-payouts' ? 'bg-brass/10 text-brass font-medium' : 'text-foreground-dim hover:text-parchment hover:bg-graphite'}`}
                >
                  Settlement & Payouts
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab("customer-flow")}
                  className={`text-sm w-full text-left px-3 py-2 rounded-md transition-colors ${activeTab === 'customer-flow' ? 'bg-brass/10 text-brass font-medium' : 'text-foreground-dim hover:text-parchment hover:bg-graphite'}`}
                >
                  End-User Flow
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-9">
          
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section>
                <h2 className="text-4xl font-semibold mb-6" style={{ fontFamily: "var(--font-display)" }}>
                  Platform Overview
                </h2>
                <p className="text-lg text-foreground-dim leading-relaxed mb-8">
                  Pactum is an enterprise-grade, micro-transaction billing engine purpose-built for AI products and SaaS platforms. By leveraging the Arc Testnet, Pactum records nanopayments natively in USDC, offering a scalable ledger that automatically aggregates usage and settles funds directly to your Web3 wallet.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-5 border border-border bg-graphite rounded-xl">
                    <Zap className="w-5 h-5 text-brass mb-3" />
                    <h3 className="font-medium text-parchment mb-1">Sub-cent Tracking</h3>
                    <p className="text-sm text-foreground-dim">Track costs as low as $0.0001 per token generation effortlessly.</p>
                  </div>
                  <div className="p-5 border border-border bg-graphite rounded-xl">
                    <Shield className="w-5 h-5 text-brass mb-3" />
                    <h3 className="font-medium text-parchment mb-1">Auto Enforcement</h3>
                    <p className="text-sm text-foreground-dim">Hard caps on daily and monthly spends to mitigate abuse instantly.</p>
                  </div>
                  <div className="p-5 border border-border bg-graphite rounded-xl">
                    <CreditCard className="w-5 h-5 text-brass mb-3" />
                    <h3 className="font-medium text-parchment mb-1">Instant Settlement</h3>
                    <p className="text-sm text-foreground-dim">Automated payouts via Circle SDK on the Arc Testnet.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-2xl font-medium text-parchment">Core Concepts</h3>
                <p className="text-foreground-dim leading-relaxed">
                  Before diving into the code, understand how Pactum views your business:
                </p>
                <ul className="list-disc list-inside space-y-3 text-foreground-dim">
                  <li><strong>Project:</strong> Represents your business entity. All API keys and usage events are tied to your Project.</li>
                  <li><strong>Usage Events:</strong> A single, granular consumption record (e.g., token usage for an AI model). Stored in fractional USDC.</li>
                  <li><strong>Payouts (Settlements):</strong> A periodic batch settlement of all pending usage events, moving USDC directly from the user to you.</li>
                  <li><strong>Settlement Wallet:</strong> Your EVM address (e.g., MetaMask) on Arc Testnet where funds are deposited.</li>
                </ul>
              </section>
            </div>
          )}

          {/* TAB: AUTHENTICATION */}
          {activeTab === "authentication" && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section>
                <h2 className="text-4xl font-semibold mb-6" style={{ fontFamily: "var(--font-display)" }}>
                  Authentication
                </h2>
                <p className="text-lg text-foreground-dim leading-relaxed mb-8">
                  All requests to the Pactum tracking API require an active API key. You can generate, rotate, and revoke API keys from your Pactum Dashboard.
                </p>

                <div className="bg-graphite border border-border p-6 rounded-xl space-y-4">
                  <h3 className="text-lg font-medium text-parchment flex items-center gap-2">
                    <Key className="w-5 h-5 text-brass" /> HTTP Header Requirement
                  </h3>
                  <p className="text-sm text-foreground-dim">Include your API key in the <code>X-API-Key</code> header for all server-to-server requests.</p>
                  <pre className="p-4 bg-ink-navy rounded-lg border border-border/50 text-sm text-parchment font-mono">
X-API-Key: sk_test_1a2b3c4d5e6f...
                  </pre>
                  <div className="mt-4 p-4 bg-rust/10 border border-rust/20 rounded-lg">
                    <p className="text-sm text-rust flex items-start gap-2 leading-relaxed">
                      <Shield className="w-4 h-4 mt-1 shrink-0" />
                      <span><strong>Security Notice:</strong> Never expose your secret API keys in client-side code (e.g., React, Vue, mobile apps). All calls to Pactum must originate from your secure backend servers to prevent malicious actors from spoofing usage records.</span>
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB: API REFERENCE */}
          {activeTab === "api-reference" && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section>
                <h2 className="text-4xl font-semibold mb-6" style={{ fontFamily: "var(--font-display)" }}>
                  API Reference & Examples
                </h2>
                <p className="text-lg text-foreground-dim leading-relaxed mb-8">
                  The core of Pactum is the Usage Tracking API. Call this endpoint directly before serving your AI inference to securely decrement the user's balance and enforce policies.
                </p>
              </section>

              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-mono text-parchment flex items-center gap-3">
                    <span className="bg-brass text-ink-navy px-2 py-1 rounded text-sm font-bold">POST</span>
                    /api/v1/usage/track
                  </h3>
                </div>

                {/* Request Parameters */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-graphite px-6 py-3 border-b border-border">
                    <h4 className="font-medium text-parchment">Request Body Schema (JSON)</h4>
                  </div>
                  <div className="p-6 bg-ink-navy/50 space-y-4">
                    <div className="grid grid-cols-12 gap-4 border-b border-border/50 pb-4">
                      <div className="col-span-3 font-mono text-sm text-brass">model <span className="text-rust">*</span></div>
                      <div className="col-span-2 text-sm text-foreground-dim">string</div>
                      <div className="col-span-7 text-sm text-parchment">Identifier dari model LLM yang digunakan (contoh: <code>"gpt-4o"</code>).</div>
                    </div>
                    <div className="grid grid-cols-12 gap-4 border-b border-border/50 pb-4">
                      <div className="col-span-3 font-mono text-sm text-brass">prompt_tokens</div>
                      <div className="col-span-2 text-sm text-foreground-dim">number</div>
                      <div className="col-span-7 text-sm text-parchment">Jumlah token input (contoh: <code>120</code>).</div>
                    </div>
                    <div className="grid grid-cols-12 gap-4 border-b border-border/50 pb-4">
                      <div className="col-span-3 font-mono text-sm text-brass">completion_tokens</div>
                      <div className="col-span-2 text-sm text-foreground-dim">number</div>
                      <div className="col-span-7 text-sm text-parchment">Jumlah token output (contoh: <code>45</code>).</div>
                    </div>
                    <div className="grid grid-cols-12 gap-4 border-b border-border/50 pb-4">
                      <div className="col-span-3 font-mono text-sm text-brass">prompt_price_per_token</div>
                      <div className="col-span-2 text-sm text-foreground-dim">number</div>
                      <div className="col-span-7 text-sm text-parchment">Harga 1 token input dalam USDC (contoh: <code>0.000005</code> untuk $5 per 1M tokens).</div>
                    </div>
                    <div className="grid grid-cols-12 gap-4 border-b border-border/50 pb-4">
                      <div className="col-span-3 font-mono text-sm text-brass">completion_price_per_token</div>
                      <div className="col-span-2 text-sm text-foreground-dim">number</div>
                      <div className="col-span-7 text-sm text-parchment">Harga 1 token output dalam USDC (contoh: <code>0.000015</code> untuk $15 per 1M tokens).</div>
                    </div>
                    <div className="grid grid-cols-12 gap-4 border-b border-border/50 pb-4">
                      <div className="col-span-3 font-mono text-sm text-brass">idempotency_key <span className="text-rust">*</span></div>
                      <div className="col-span-2 text-sm text-foreground-dim">string</div>
                      <div className="col-span-7 text-sm text-parchment">
                        String unik (UUID/Request ID) untuk mencegah <em>double-charging</em> jika network error.
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-3 font-mono text-sm text-brass">metadata</div>
                      <div className="col-span-2 text-sm text-foreground-dim">object</div>
                      <div className="col-span-7 text-sm text-parchment">Opsional Key-Value (contoh: <code>{"{ user_id: 'usr_123' }"}</code>).</div>
                    </div>
                  </div>
                </div>

                {/* Response */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-graphite px-6 py-3 border-b border-border">
                    <h4 className="font-medium text-parchment">Successful Response (200 OK)</h4>
                  </div>
                  <pre className="p-6 bg-ink-navy/50 text-sm text-parchment font-mono leading-relaxed">
{`{
  "recorded": true,
  "deduplicated": false, // True if idempotency_key was already seen
  "event_id": "b3f3b9c9-6e3e-4a6c-9a4c-53f7c461e7e7",
  "cost": 0.05
}`}
                  </pre>
                </div>
              </section>

              {/* Code Examples */}
              <section className="space-y-6 pt-6">
                <h3 className="text-2xl font-medium text-parchment mb-4">Integration Examples</h3>
                
                {/* Node.js */}
                <div className="bg-[#0A0D14] border border-border rounded-xl overflow-hidden shadow-lg">
                  <div className="px-4 py-2 bg-graphite border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-foreground-dim" />
                      <span className="text-xs text-foreground-dim font-mono">Node.js (Fetch)</span>
                    </div>
                  </div>
                  <div className="p-5 overflow-x-auto">
                    <pre className="text-[13px] text-parchment/90 font-mono leading-relaxed">
<span className="text-brass">async function</span> <span className="text-teal">trackUsage</span>(userId) {'{'}
  <span className="text-brass">const</span> response = <span className="text-brass">await</span> <span className="text-teal">fetch</span>(<span className="text-parchment">"http://localhost:3000/api/v1/usage/track"</span>, {'{'}
    method: <span className="text-parchment">"POST"</span>,
    headers: {'{'}
      <span className="text-parchment">"Content-Type"</span>: <span className="text-parchment">"application/json"</span>,
      <span className="text-parchment">"X-API-Key"</span>: process.env.PACTUM_API_KEY
    {'}'},
    body: JSON.<span className="text-teal">stringify</span>({'{'}
      model: <span className="text-parchment">"gpt-4o"</span>,
      prompt_tokens: 120,
      completion_tokens: 45,
      prompt_price_per_token: <span className="text-teal">0.000005</span>,
      completion_price_per_token: <span className="text-teal">0.000015</span>,
      idempotency_key: <span className="text-parchment">{"`req-${userId}-${Date.now()}`"}</span>,
      user_address: <span className="text-parchment">"0xUserAddress..."</span>,
      metadata: {'{'} user_id: userId {'}'}
    {'}'})
  {'}'});

  <span className="text-brass">if</span> (!response.ok) {'{'}
    <span className="text-brass">const</span> error = <span className="text-brass">await</span> response.<span className="text-teal">json</span>();
    <span className="text-brass">throw new</span> <span className="text-teal">Error</span>(error.message || <span className="text-parchment">"Failed to track"</span>);
  {'}'}
  <span className="text-brass">return</span> <span className="text-brass">await</span> response.<span className="text-teal">json</span>();
{'}'}
                    </pre>
                  </div>
                </div>

                {/* Python */}
                <div className="bg-[#0A0D14] border border-border rounded-xl overflow-hidden shadow-lg mt-6">
                  <div className="px-4 py-2 bg-graphite border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-foreground-dim" />
                      <span className="text-xs text-foreground-dim font-mono">Python (requests)</span>
                    </div>
                  </div>
                  <div className="p-5 overflow-x-auto">
                    <pre className="text-[13px] text-parchment/90 font-mono leading-relaxed">
<span className="text-brass">import</span> requests
<span className="text-brass">import</span> uuid

<span className="text-brass">def</span> <span className="text-teal">track_usage</span>(user_id, user_address):
    url = <span className="text-parchment">"http://localhost:3000/api/v1/usage/track"</span>
    headers = {'{'}
        <span className="text-parchment">"Content-Type"</span>: <span className="text-parchment">"application/json"</span>,
        <span className="text-parchment">"X-API-Key"</span>: <span className="text-parchment">"sk_test_YOUR_API_KEY"</span>
    {'}'}
    payload = {'{'}
        <span className="text-parchment">"model"</span>: <span className="text-parchment">"gpt-4o"</span>,
        <span className="text-parchment">"prompt_tokens"</span>: <span className="text-teal">120</span>,
        <span className="text-parchment">"completion_tokens"</span>: <span className="text-teal">45</span>,
        <span className="text-parchment">"prompt_price_per_token"</span>: <span className="text-teal">0.000005</span>,
        <span className="text-parchment">"completion_price_per_token"</span>: <span className="text-teal">0.000015</span>,
        <span className="text-parchment">"user_address"</span>: user_address,
        <span className="text-parchment">"idempotency_key"</span>: <span className="text-teal">str</span>(uuid.uuid4()),
        <span className="text-parchment">"metadata"</span>: {'{'} <span className="text-parchment">"user_id"</span>: user_id {'}'}
    {'}'}

    response = requests.post(url, json=payload, headers=headers)
    
    <span className="text-brass">if</span> response.status_code == <span className="text-teal">429</span>:
        <span className="text-brass">raise</span> <span className="text-teal">Exception</span>(<span className="text-parchment">"Policy Limit Exceeded! Billing paused."</span>)
    
    response.raise_for_status()
    <span className="text-brass">return</span> response.json()
                    </pre>
                  </div>
                </div>
              </section>

              {/* Error Codes */}
              <section className="pt-6">
                <h3 className="text-2xl font-medium text-parchment mb-4">Error Codes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-3 font-medium text-foreground-dim text-sm">Status Code</th>
                        <th className="py-3 font-medium text-foreground-dim text-sm">Error Name</th>
                        <th className="py-3 font-medium text-foreground-dim text-sm">Resolution</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-parchment divide-y divide-border/50">
                      <tr>
                        <td className="py-4 font-mono text-rust">400</td>
                        <td className="py-4">Bad Request</td>
                        <td className="py-4 text-foreground-dim leading-relaxed">Missing required fields (e.g., idempotency_key). Ensure your JSON payload matches the schema.</td>
                      </tr>
                      <tr>
                        <td className="py-4 font-mono text-rust">401 / 403</td>
                        <td className="py-4">Unauthorized</td>
                        <td className="py-4 text-foreground-dim leading-relaxed">Invalid or revoked API Key. Check the keys in your Dashboard.</td>
                      </tr>
                      <tr>
                        <td className="py-4 font-mono text-rust">429</td>
                        <td className="py-4">policy.limit_exceeded</td>
                        <td className="py-4 text-foreground-dim leading-relaxed">You have hit the Daily or Monthly spending limit configured in your Policies dashboard. You must increase the limit to continue accepting traffic.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB: SETTLEMENT & PAYOUTS */}
          {activeTab === "settlement-payouts" && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section>
                <h2 className="text-4xl font-semibold mb-6" style={{ fontFamily: "var(--font-display)" }}>
                  Settlement & Payouts
                </h2>
                <p className="text-lg text-foreground-dim leading-relaxed mb-8">
                  Pactum is designed to ensure you get paid securely and instantly via blockchain state channels.
                </p>

                <div className="space-y-6">
                  <div className="p-6 border border-border bg-graphite rounded-xl">
                    <h3 className="text-xl font-medium text-parchment mb-2">Automated Batch Settlements</h3>
                    <p className="text-foreground-dim leading-relaxed text-sm mb-4">
                      All usage records are tracked in USD-pegged values (USDC). 
                      Instead of manual invoices, Pactum uses a highly efficient <strong>Batch Settlement</strong> system.
                    </p>
                    <ol className="list-decimal list-inside space-y-3 text-foreground-dim text-sm pl-2">
                      <li>Pactum aggregates thousands of <code>usage_events</code> securely off-chain.</li>
                      <li>Our settlement cron job executes the <code>batchSettleUsage</code> function on the Smart Contract.</li>
                      <li>Funds are instantly deducted from multiple users and transferred to your configured <strong>Settlement Wallet</strong> on the Arc Testnet in a single transaction.</li>
                      <li>You can view all successful payouts directly in the <strong>Payouts</strong> tab of your Dashboard.</li>
                    </ol>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB: CUSTOMER FLOW */}
          {activeTab === "customer-flow" && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section>
                <h2 className="text-4xl font-semibold mb-6" style={{ fontFamily: "var(--font-display)" }}>
                  End-User Customer Flow
                </h2>
                
                <div className="bg-graphite/40 border border-border p-8 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Box className="w-48 h-48" />
                  </div>

                  <div className="relative z-10 space-y-6">
                    <p className="text-lg text-foreground-dim leading-relaxed">
                      Sistem <strong>State Channel Pactum</strong> mengubah Anda (AI Provider) menjadi bagian dari ekosistem pembayaran universal. Pengguna cukup memiliki satu saldo di <em>Smart Contract Pactum</em>, dan saldo tersebut bisa dipakai di platform Anda!
                    </p>

                    <div className="grid md:grid-cols-1 gap-6 pt-6">
                      <div className="space-y-3 bg-ink-navy p-6 rounded-xl border border-border">
                        <h4 className="font-medium text-parchment text-lg text-brass">1. Pengaturan Wallet Merchant</h4>
                        <p className="text-sm text-foreground-dim leading-relaxed">
                          Sebelum memotong saldo pengguna, pastikan Anda telah mengatur <strong>Settlement Wallet</strong> di menu <Link href="/dashboard/settings" className="text-blue-400 hover:underline">Settings</Link>. Pactum akan mengeksekusi <code>batchSettleUsage</code> dan mentransfer USDC ke dompet ini secara berkala.
                        </p>
                      </div>
                      <div className="space-y-3 bg-ink-navy p-6 rounded-xl border border-border">
                        <h4 className="font-medium text-parchment text-lg text-brass">2. Otentikasi Pengguna (PENTING!)</h4>
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                          <p className="text-sm text-red-200 font-medium mb-2">⚠️ Wajib Implementasi SIWE (EIP-4361)</p>
                          <p className="text-xs text-red-200/80 leading-relaxed">
                            Pactum sepenuhnya mempercayai API Key Anda. Jangan pernah menerima <code>user_address</code> secara mentah dari *frontend*! Anda <strong>wajib</strong> memverifikasi kepemilikan dompet pengguna di *backend* Anda menggunakan mekanisme *Sign-In with Ethereum (SIWE)* sebelum menagihkan biaya ke Pactum untuk mencegah eksploitasi *spoofing* alamat dompet.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 bg-ink-navy p-6 rounded-xl border border-border">
                        <h4 className="font-medium text-parchment text-lg text-brass">3. Memotong Saldo Pengguna (Real-time)</h4>
                        <p className="text-sm text-foreground-dim leading-relaxed mb-2">
                          Setiap kali *End-User* memanggil layanan AI Anda, panggil API <code>/api/v1/usage/track</code> Pactum. Anda <strong>wajib</strong> menyertakan <code>user_address</code> (alamat dompet Web3 pengguna).
                        </p>
                        <pre className="text-xs text-green-400 font-mono bg-black/50 p-3 rounded">
{`{
  "model": "gpt-4o",
  "prompt_tokens": 250,
  "completion_tokens": 100,
  "prompt_price_per_token": 0.000005,
  "completion_price_per_token": 0.000015,
  "user_address": "0xUserWalletAddress...",
  "idempotency_key": "unique-req-123"
}`}
                        </pre>
                        <p className="text-sm text-foreground-dim leading-relaxed mt-2">
                          Sistem kami akan langsung mengecek ketersediaan dana secara *off-chain* tanpa delay. Jika saldo pengguna tidak mencukupi, API akan langsung menolak transaksi (HTTP 402). Instruksikan pengguna Anda untuk melakukan <strong>Deposit</strong> di <Link href="/wallet" className="text-blue-400 hover:underline">Pactum Universal Wallet</Link>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
