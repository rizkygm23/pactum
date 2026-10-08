import Link from "next/link";
import { getSessionCookie } from "@/lib/auth";
import { ARC_TESTNET } from "@/lib/arc/config";
import { SealBadge } from "@/components/ui/SealBadge";
import { LandingNav } from "@/components/landing/LandingNav";
import { ReceiptStub } from "@/components/landing/ReceiptStub";
import { RevealOnView } from "@/components/landing/RevealOnView";

export const metadata = {
  title: "Pactum — Metered billing, settled in USDC on Arc",
  description: "Meter every API call off-chain, settle in batches on Arc, and hand your customer a receipt with a transaction hash on it.",
};

const SPECIMEN_LINES = [
  { label: "gpt-4o · prompt",      qty: "128,400 tok", amount: "0.642000" },
  { label: "gpt-4o · completion",  qty: "31,900 tok",  amount: "0.478500" },
  { label: "embeddings · prompt",  qty: "902,000 tok", amount: "0.090200" },
];

const NETWORK_FACTS = [
  { term: "Network",          value: "Arc Testnet",            note: `chain ID ${ARC_TESTNET.chainId}` },
  { term: "Settlement asset", value: "USDC",                   note: `ERC-20, ${ARC_TESTNET.usdcDecimals} decimals — ${ARC_TESTNET.usdc}` },
  { term: "Batching",         value: "Multicall3From",         note: "many settlements in one tx, msg.sender preserved" },
  { term: "Explorer",         value: ARC_TESTNET.explorer.replace("https://", ""), note: "every settlement resolves to a public tx" },
  { term: "CCTP domain",      value: String(ARC_TESTNET.cctpDomain), note: "for bridging USDC in and out of Arc" },
  { term: "Testnet funds",    value: ARC_TESTNET.faucet.replace("https://", ""),   note: "Circle faucet — no mainnet value at stake" },
];

const SOCIAL_PROOF = [
  { icon: "●", label: "Arc Testnet live" },
  { icon: "⬡", label: "USDC settlement" },
  { icon: "✓", label: "Verifiable on-chain receipts" },
  { icon: "⚡", label: "Sub-ms metering" },
  { icon: "🔒", label: "SHA-256 key hashing" },
];

export default async function LandingPage() {
  const userId   = await getSessionCookie();
  const signedIn = Boolean(userId);

  return (
    <div className="min-h-screen bg-white">
      <LandingNav signedIn={signedIn} />

      <main>
        {/* ── Hero ── */}
        <section className="bg-[#0f1117]">
          <div className="grid grid-cols-1 lg:grid-cols-[2.5rem_minmax(0,38rem)_minmax(0,1fr)]">
            <div className="hidden lg:block" />

            {/* Headline */}
            <div className="px-5 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-20 lg:px-0 lg:pb-20 lg:pt-24">
              {/* Live badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                <span className="text-xs font-medium text-white/70">Arc Testnet live</span>
              </div>

              <h1 className="text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-[3.25rem]">
                Bill per token.
                <br />
                Settle in USDC.
              </h1>

              <p className="mt-7 max-w-[38rem] text-base leading-relaxed text-white/60 sm:text-lg">
                Pactum meters every call your API serves, holds the charge
                against an on-chain balance, then settles the batch on Arc.
                What your customer receives is not an invoice PDF —
                it is a transaction hash they can verify without asking you.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-4">
                <Link href="/signup"
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#030303] hover:bg-white/90 transition-colors shadow-sm">
                  Get an API key
                </Link>
                <a href="https://aura-ai.rizzgm.xyz" target="_blank" rel="noopener noreferrer"
                  className="text-sm font-semibold text-white underline-offset-4 hover:underline transition-all">
                  Try Live Demo
                </a>
                <Link href="/docs"
                  className="text-sm font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline transition-all">
                  Read Documentation
                </Link>
              </div>

              <p className="font-mono mt-10 text-xs text-white/30">
                Arc Testnet · chain {ARC_TESTNET.chainId}
              </p>
            </div>

            {/* Receipt */}
            <div className="px-5 pb-12 sm:px-8 sm:pb-16 lg:flex lg:items-start lg:px-8 lg:py-24">
              <div className="lg:sticky lg:top-8 lg:max-w-md">
                <ReceiptStub reference="usage_period · 2026-07" lines={SPECIMEN_LINES} total="1.210700 USDC" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Social proof strip ── */}
        <div className="border-b border-[#e7eaf0] bg-white">
          <div className="max-w-[1400px] mx-auto px-5 py-4 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              {SOCIAL_PROOF.map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-[#676f7b] whitespace-nowrap">
                  <span className="text-[#939393]">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stage 1.0 Fund ── */}
        <RevealOnView as="section" className="border-b border-[#e7eaf0] bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-[2.5rem_minmax(0,38rem)_minmax(0,1fr)]">
            <div className="hidden lg:flex lg:items-start lg:pt-20">
              <div className="sticky top-8 -rotate-90 origin-top-left whitespace-nowrap">
                <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#939393]">1.0 — Fund</span>
              </div>
            </div>

            <div className="px-5 pt-12 pb-2 sm:px-8 sm:pt-16 lg:hidden">
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#939393]">1.0 — Fund</span>
              <div className="mt-2 h-px w-12 bg-[#e7eaf0]" />
            </div>

            <div className="px-5 pb-12 pt-5 sm:px-8 sm:pb-16 sm:pt-8 lg:px-0 lg:pb-20 lg:pt-20">
              <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[#030303] sm:text-4xl">
                The balance exists before the first call
              </h2>
              <p className="mt-7 max-w-2xl text-base leading-relaxed text-[#404040]">
                Your customer deposits USDC into the billing contract. That deposit is their channel balance,
                and it is the only thing standing between them and a rejected call. No card on file, no credit decision,
                no invoice you have to chase thirty days later.
              </p>
              <ul className="mt-10 max-w-2xl border-t border-[#e7eaf0]">
                {[
                  ["Deposit",     "USDC → PactumBilling"],
                  ["Balance read","userBalances(address)"],
                  ["Withdrawable","unspent, at any time"],
                ].map(([label, value]) => (
                  <li key={label} className="flex items-baseline justify-between gap-4 py-3.5 border-b border-[#e7eaf0]">
                    <span className="text-sm text-[#030303]">{label}</span>
                    <span className="font-mono text-xs text-[#676f7b]">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden lg:block" />
          </div>
        </RevealOnView>

        {/* ── Stage 2.0 Meter ── */}
        <RevealOnView as="section" className="border-b border-[#e7eaf0] bg-[#f9fafb]">
          <div className="grid grid-cols-1 lg:grid-cols-[2.5rem_minmax(0,28rem)_minmax(0,1fr)] xl:grid-cols-[2.5rem_minmax(0,32rem)_minmax(0,1fr)]">
            <div className="hidden lg:flex lg:items-start lg:pt-20">
              <div className="sticky top-8 -rotate-90 origin-top-left whitespace-nowrap">
                <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#939393]">2.0 — Meter</span>
              </div>
            </div>
            <div className="px-5 pt-12 pb-2 sm:px-8 sm:pt-16 lg:hidden">
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#939393]">2.0 — Meter</span>
              <div className="mt-2 h-px w-12 bg-[#e7eaf0]" />
            </div>
            <div className="px-5 pb-12 pt-5 sm:px-8 sm:pb-16 sm:pt-8 lg:px-0 lg:pb-20 lg:pt-20">
              <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[#030303] sm:text-4xl">
                Every call is recorded once
              </h2>
              <p className="mt-7 text-base leading-relaxed text-[#404040]">
                One request per billable event. Pactum prices the tokens, checks the total against the channel balance
                minus everything still pending, and records it. Send the same{" "}
                <code className="font-mono text-[#030303] text-sm bg-[#f0f0f0] px-1.5 py-0.5 rounded">idempotency_key</code>{" "}
                twice — from a retry, a queue redelivery — and the second one comes back{" "}
                <code className="font-mono text-[#030303] text-sm bg-[#f0f0f0] px-1.5 py-0.5 rounded">deduplicated</code>, not double-charged.
              </p>
              <p className="mt-6 text-base leading-relaxed text-[#404040]">
                When the balance will not cover the call, the answer is{" "}
                <code className="font-mono font-semibold text-[#030303] text-sm bg-[#f0f0f0] px-1.5 py-0.5 rounded">402</code>.
                Your service decides what to do; Pactum simply refuses to record a charge that cannot be settled.
              </p>
            </div>
            <div className="px-5 pb-12 sm:px-8 sm:pb-16 lg:py-20 lg:pl-0 lg:pr-8 xl:pr-12">
              <div className="lg:sticky lg:top-8 rounded-xl border border-[#e7eaf0] bg-white overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 border-b border-[#e7eaf0] bg-[#f9fafb] flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#e7eaf0]" />
                  <span className="font-mono text-xs text-[#676f7b]">POST /api/v1/usage/track</span>
                </div>
                <pre className="p-5 text-xs leading-relaxed text-[#030303] font-mono overflow-x-auto whitespace-pre-wrap">
                  <code>{`X-API-Key: pactum_…

{
  "model": "gpt-4o",
  "prompt_tokens": 1280,
  "completion_tokens": 320,
  "prompt_price_per_token": "0.0000050",
  "completion_price_per_token": "0.0000150",
  "user_address": "0x…",
  "idempotency_key": "req_01H…"
}

→ 200  { "recorded": true,
         "deduplicated": false,
         "cost": "0.011200" }`}</code>
                </pre>
              </div>
            </div>
          </div>
        </RevealOnView>

        {/* ── Stage 3.0 Seal ── */}
        <RevealOnView as="section" className="border-b border-[#e7eaf0] bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-[2.5rem_minmax(0,1fr)_18rem] xl:grid-cols-[2.5rem_minmax(0,1fr)_22rem]">
            <div className="hidden lg:flex lg:items-start lg:pt-20">
              <div className="sticky top-8 -rotate-90 origin-top-left whitespace-nowrap">
                <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#939393]">3.0 — Seal</span>
              </div>
            </div>
            <div className="px-5 pt-12 pb-2 sm:px-8 sm:pt-16 lg:hidden">
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#939393]">3.0 — Seal</span>
              <div className="mt-2 h-px w-12 bg-[#e7eaf0]" />
            </div>
            <div className="px-5 pb-12 pt-5 sm:px-8 sm:pb-16 sm:pt-8 lg:px-0 lg:pb-20 lg:pr-16 lg:pt-20">
              <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.02em] text-[#030303] sm:text-4xl">
                Settlement leaves a mark
              </h2>
              <div className="max-w-2xl">
                <p className="mt-7 text-base leading-relaxed text-[#404040]">
                  Pending usage settles in batches. Many charges fold into a single transaction through Multicall3From,
                  which keeps each caller&rsquo;s identity intact. The batch lands, pending rows become settled rows,
                  and the receipt gains the one field that makes it checkable by someone who does not trust you.
                </p>
                <p className="mt-6 text-base leading-relaxed text-[#404040]">
                  Arc settles in USDC and charges gas in USDC, so the cost of sealing a batch is denominated
                  in the same unit as the batch itself.
                </p>
              </div>
            </div>
            <div className="flex items-start justify-center px-5 pb-12 sm:px-8 sm:pb-16 lg:justify-end lg:px-0 lg:py-20 lg:pr-8 xl:pr-12">
              <div className="flex flex-col items-center gap-5 lg:sticky lg:top-8">
                <SealBadge txHash="0x9f2c4a7e6b1d8305f4ac9e2b71d0c6a8e3f5b9d1" size="lg" />
                <p className="font-mono text-center text-xs leading-relaxed text-[#939393]">
                  Specimen seal.
                  <br />Real ones link to
                  <br />{ARC_TESTNET.explorer.replace("https://", "")}.
                </p>
              </div>
            </div>
          </div>
        </RevealOnView>

        {/* ── Network facts ── */}
        <RevealOnView as="section" className="border-b border-[#e7eaf0] bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-[2.5rem_minmax(0,1fr)]">
            <div className="hidden lg:flex lg:items-start lg:pt-16">
              <div className="sticky top-8 -rotate-90 origin-top-left whitespace-nowrap">
                <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#939393]">Network</span>
              </div>
            </div>
            <div className="px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16 lg:px-0 lg:pb-16 lg:pr-8 lg:pt-16">
              <div className="mb-6 lg:hidden">
                <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#939393]">Network</span>
                <div className="mt-2 h-px w-12 bg-[#e7eaf0]" />
              </div>
              <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {NETWORK_FACTS.map((fact) => (
                  <div key={fact.term} className="py-4 border-b border-[#e7eaf0]">
                    <dt className="text-[10px] font-semibold tracking-widest uppercase text-[#939393]">{fact.term}</dt>
                    <dd>
                      <span className="font-mono block text-sm text-[#030303] break-all mt-1">{fact.value}</span>
                      {fact.note && <span className="mt-1.5 block text-xs leading-relaxed text-[#676f7b] break-all">{fact.note}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </RevealOnView>

        {/* ── Closing CTA ── */}
        <section className="bg-[#0f1117]">
          <div className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32 xl:px-20">
            <div className="max-w-5xl">
              <p className="text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl">
                A bill your customer can verify without asking you.
              </p>
              <div className="mt-10 h-px w-40 bg-white/20" />
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link href="/signup"
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#030303] hover:bg-white/90 transition-colors">
                  Get an API key
                </Link>
                {[
                  { label: "Try Live Demo",       href: "https://aura-ai.rizzgm.xyz", external: true },
                  { label: "Read Documentation",  href: "/docs" },
                  { label: "Sign in",             href: "/login" },
                  { label: "Arc explorer",        href: ARC_TESTNET.explorer, external: true },
                ].map(({ label, href, external }) => (
                  <a key={label} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}
                    className="text-sm font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline transition-all">
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="bg-[#030303] border-t border-white/[0.06]">
          <div className="max-w-[1400px] mx-auto px-5 py-12 sm:px-8 lg:px-12 xl:px-20">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <img src="/pactum-logo.png" alt="Pactum" className="h-5 w-5 object-contain opacity-70" />
                  <span className="text-sm font-semibold text-white">pactum</span>
                </div>
                <p className="text-xs leading-relaxed text-[#939393] max-w-[16rem]">
                  Usage-based billing infrastructure for AI services, settled on-chain with USDC on Arc.
                </p>
              </div>
              {[
                { title: "Product", links: [
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Wallet",    href: "/wallet" },
                  { label: "Docs",      href: "/docs" },
                  { label: "Sign up",   href: "/signup" },
                ]},
                { title: "Resources", links: [
                  { label: "Integration Guide", href: "/docs/integration-guide" },
                  { label: "API Reference",     href: "/docs/api-reference" },
                  { label: "Smart Contract",    href: "/docs/smart-contract" },
                  { label: "Live Demo ↗",       href: "https://aura-ai.rizzgm.xyz", external: true },
                ]},
                { title: "Network", links: [
                  { label: "Arc Explorer ↗",              href: ARC_TESTNET.explorer, external: true },
                  { label: "Circle Faucet ↗",             href: ARC_TESTNET.faucet,   external: true },
                  { label: `Chain ${ARC_TESTNET.chainId}`, href: "#" },
                  { label: `CCTP ${ARC_TESTNET.cctpDomain}`, href: "#" },
                ]},
              ].map(({ title, links }) => (
                <div key={title}>
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-[#939393] mb-3">{title}</p>
                  <ul className="space-y-2">
                    {links.map((l) => (
                      <li key={l.label}>
                        <a href={l.href} target={(l as {external?: boolean}).external ? "_blank" : undefined}
                          rel={(l as {external?: boolean}).external ? "noopener noreferrer" : undefined}
                          className="text-xs text-[#939393] hover:text-white transition-colors">
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs text-[#939393]">© 2026 Pactum · Arc Testnet · Settlement in USDC</span>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#fffbeb] border border-[#fde68a] text-[#b45309]">testnet</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
