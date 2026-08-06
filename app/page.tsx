import Link from "next/link";
import { getSessionCookie } from "@/lib/auth";
import { ARC_TESTNET } from "@/lib/arc/config";
import { SealBadge } from "@/components/ui/SealBadge";
import { LandingNav } from "@/components/landing/LandingNav";
import { ReceiptStub } from "@/components/landing/ReceiptStub";
import { RevealOnView } from "@/components/landing/RevealOnView";

export const metadata = {
  title: "Pactum — Metered billing, settled in USDC on Arc",
  description:
    "Meter every API call off-chain, settle in batches on Arc, and hand your customer a receipt with a transaction hash on it.",
};

/** Illustrative only — labelled SPECIMEN in the UI. No customer implied. */
const SPECIMEN_LINES = [
  { label: "gpt-4o · prompt", qty: "128,400 tok", amount: "0.642000" },
  { label: "gpt-4o · completion", qty: "31,900 tok", amount: "0.478500" },
  { label: "embeddings · prompt", qty: "902,000 tok", amount: "0.090200" },
];

const NETWORK_FACTS: { term: string; value: string; note?: string }[] = [
  {
    term: "Network",
    value: "Arc Testnet",
    note: `chain ID ${ARC_TESTNET.chainId}`,
  },
  {
    term: "Settlement asset",
    value: "USDC",
    note: `ERC-20 view, ${ARC_TESTNET.usdcDecimals} decimals — ${ARC_TESTNET.usdc}`,
  },
  {
    term: "Batching",
    value: "Multicall3From",
    note: "many settlements in one transaction, msg.sender preserved per call",
  },
  {
    term: "Explorer",
    value: ARC_TESTNET.explorer.replace("https://", ""),
    note: "every settlement resolves to a public transaction",
  },
  {
    term: "CCTP domain",
    value: String(ARC_TESTNET.cctpDomain),
    note: "for bridging USDC in and out of Arc",
  },
  {
    term: "Testnet funds",
    value: ARC_TESTNET.faucet.replace("https://", ""),
    note: "Circle faucet — no mainnet value at stake",
  },
];

export default async function LandingPage() {
  const userId = await getSessionCookie();
  const signedIn = Boolean(userId);

  return (
    <div className="min-h-screen bg-ink-navy">
      <LandingNav signedIn={signedIn} />

      <main>
        {/* ── Masthead · full-bleed dark field ──────────────────── */}
        <RevealOnView as="section" className="relative border-b border-border">
          <div className="grid grid-cols-1 lg:grid-cols-[2.5rem_minmax(0,38rem)_minmax(0,1fr)] gap-0">
            {/* Empty rail on mobile, stage ordinal on desktop */}
            <div className="hidden lg:block" />

            {/* Headline + CTAs */}
            <div className="px-5 pt-16 pb-12 sm:px-8 sm:pt-20 sm:pb-16 lg:px-0 lg:pt-24 lg:pb-20">
              <h1 className="display-face text-[2.75rem] leading-[0.95] font-semibold text-parchment sm:text-[3.5rem]">
                Bill per token.
                <br />
                Settle in USDC.
              </h1>

              <p className="mt-7 text-base leading-relaxed text-parchment-dim sm:text-lg sm:mt-8">
                Pactum meters every call your API serves, holds the charge
                against an on-chain balance, then settles the batch on Arc.
                What your customer receives at the end is not an invoice PDF —
                it is a transaction hash they can verify without asking you.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="btn-primary focus-ring no-wrap inline-block"
                >
                  Get an API key
                </Link>
                <a
                  href="https://aura-ai.rizzgm.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring no-wrap inline-block px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-sm font-medium transition-colors border border-slate-700 text-sm"
                >
                  Try Live Demo
                </a>
                <Link
                  href="/docs"
                  className="focus-ring no-wrap text-sm font-medium text-parchment border-b border-border-strong pb-0.5 transition-colors hover:border-brass hover:text-brass ml-2"
                >
                  Read Documentation
                </Link>
              </div>

              <p className="data-mono mt-9 text-xs text-foreground-dim">
                Arc Testnet · chain {ARC_TESTNET.chainId}
              </p>
            </div>

            {/* Receipt stub — spans right on desktop, stacks on mobile */}
            <div className="px-5 pb-12 sm:px-8 sm:pb-16 lg:px-8 lg:py-24 lg:flex lg:items-start">
              <div className="lg:sticky lg:top-8 lg:max-w-md">
                <ReceiptStub
                  reference="usage_period · 2026-07"
                  lines={SPECIMEN_LINES}
                  total="1.210700 USDC"
                />
              </div>
            </div>
          </div>
        </RevealOnView>

        {/* ── Stage 1.0 · Fund ───────────────────────────────────── */}
        <RevealOnView as="section" className="relative border-b border-border">
          <div className="grid grid-cols-1 lg:grid-cols-[2.5rem_minmax(0,38rem)_minmax(0,1fr)] gap-0">
            {/* Stage ordinal in left margin on desktop */}
            <div className="hidden lg:flex lg:items-start lg:pt-20">
              <div className="sticky top-8 -rotate-90 origin-top-left whitespace-nowrap">
                <span className="stage-ordinal">1.0 — Fund</span>
              </div>
            </div>

            {/* Mobile ordinal */}
            <div className="px-5 pt-12 sm:px-8 sm:pt-16 lg:hidden">
              <span className="stage-ordinal">1.0 — Fund</span>
              <div className="rule-sweep mt-2" />
            </div>

            {/* Content column */}
            <div className="px-5 pt-5 pb-12 sm:px-8 sm:pt-8 sm:pb-16 lg:px-0 lg:pt-20 lg:pb-20">
              <h2 className="display-face text-3xl sm:text-4xl font-semibold text-parchment mb-7">
                The balance exists before the first call
              </h2>

              <p className="text-base leading-relaxed text-parchment-dim mb-10">
                Your customer deposits USDC into the billing contract. That
                deposit is their channel balance, and it is the only thing
                standing between them and a rejected call. No card on file, no
                credit decision, no invoice you have to chase thirty days later.
              </p>

              <ul className="border-t border-border max-w-2xl">
                <li className="ledger-tick ledger-row flex items-baseline justify-between gap-4">
                  <span className="text-sm text-parchment">Deposit</span>
                  <span className="data-mono text-xs text-foreground-dim">
                    USDC → PactumBilling
                  </span>
                </li>
                <li className="ledger-tick ledger-row flex items-baseline justify-between gap-4">
                  <span className="text-sm text-parchment">Balance read</span>
                  <span className="data-mono text-xs text-foreground-dim">
                    userBalances(address)
                  </span>
                </li>
                <li className="ledger-tick ledger-row flex items-baseline justify-between gap-4">
                  <span className="text-sm text-parchment">Withdrawable</span>
                  <span className="data-mono text-xs text-foreground-dim">
                    unspent, at any time
                  </span>
                </li>
              </ul>
            </div>

            {/* Empty right column */}
            <div className="hidden lg:block" />
          </div>
        </RevealOnView>

        {/* ── Stage 2.0 · Meter · wide asymmetric layout ─────────── */}
        <RevealOnView as="section" className="relative border-b border-border bg-graphite/20">
          <div className="grid grid-cols-1 lg:grid-cols-[2.5rem_minmax(0,28rem)_minmax(0,1fr)] xl:grid-cols-[2.5rem_minmax(0,32rem)_minmax(0,1fr)] gap-0">
            {/* Stage ordinal in left margin */}
            <div className="hidden lg:flex lg:items-start lg:pt-20">
              <div className="sticky top-8 -rotate-90 origin-top-left whitespace-nowrap">
                <span className="stage-ordinal">2.0 — Meter</span>
              </div>
            </div>

            {/* Mobile ordinal */}
            <div className="px-5 pt-12 sm:px-8 sm:pt-16 lg:hidden">
              <span className="stage-ordinal">2.0 — Meter</span>
              <div className="rule-sweep mt-2" />
            </div>

            {/* Left text column — narrower */}
            <div className="px-5 pt-5 pb-12 sm:px-8 sm:pt-8 sm:pb-16 lg:px-0 lg:pt-20 lg:pb-20">
              <h2 className="display-face text-3xl sm:text-4xl font-semibold text-parchment mb-7">
                Every call is recorded once
              </h2>

              <p className="text-base leading-relaxed text-parchment-dim mb-6">
                One request per billable event. Pactum prices the tokens, checks
                the total against the channel balance minus everything still
                pending, and records it. Send the same{" "}
                <span className="data-mono text-parchment">idempotency_key</span>{" "}
                twice — from a retry, a queue redelivery, a nervous client — and
                the second one comes back{" "}
                <span className="data-mono text-parchment">deduplicated</span>,
                not double-charged.
              </p>

              <p className="text-base leading-relaxed text-parchment-dim">
                When the balance will not cover the call, the answer is{" "}
                <span className="data-mono text-rust">402</span>. Your service
                decides what to do with that; Pactum simply refuses to record a
                charge that cannot be settled.
              </p>
            </div>

            {/* Right code column — extends to edge, full bleed */}
            <div className="px-5 pb-12 sm:px-8 sm:pb-16 lg:px-0 lg:py-20 lg:pr-8 xl:pr-12">
              <div className="code-frame lg:sticky lg:top-8">
                <div className="code-frame__label">POST /api/v1/usage/track</div>
                <pre className="code-frame__body">
                  <code>{`X-API-Key: pk_live_…

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

        {/* ── Stage 3.0 · Seal · visual climax ───────────────────── */}
        <RevealOnView as="section" className="relative border-b border-border">
          <div className="grid grid-cols-1 lg:grid-cols-[2.5rem_minmax(0,1fr)_18rem] xl:grid-cols-[2.5rem_minmax(0,1fr)_22rem] gap-0">
            {/* Stage ordinal in left margin */}
            <div className="hidden lg:flex lg:items-start lg:pt-20">
              <div className="sticky top-8 -rotate-90 origin-top-left whitespace-nowrap">
                <span className="stage-ordinal">3.0 — Seal</span>
              </div>
            </div>

            {/* Mobile ordinal */}
            <div className="px-5 pt-12 sm:px-8 sm:pt-16 lg:hidden">
              <span className="stage-ordinal">3.0 — Seal</span>
              <div className="rule-sweep mt-2" />
            </div>

            {/* Main text — spans wide on desktop */}
            <div className="px-5 pt-5 pb-12 sm:px-8 sm:pt-8 sm:pb-16 lg:px-0 lg:pt-20 lg:pb-20 lg:pr-16">
              <h2 className="display-face text-3xl sm:text-4xl font-semibold text-parchment mb-7 max-w-3xl">
                Settlement leaves a mark
              </h2>

              <div className="max-w-2xl">
                <p className="text-base leading-relaxed text-parchment-dim mb-6">
                  Pending usage settles in batches. Many charges are folded into
                  a single transaction through Multicall3From, which keeps each
                  caller&rsquo;s identity intact rather than collapsing them into
                  one anonymous transfer. The batch lands, the pending rows
                  become settled rows, and the receipt gains the one field that
                  makes it checkable by someone who does not trust you.
                </p>

                <p className="text-base leading-relaxed text-parchment-dim">
                  Arc settles in USDC and charges gas in USDC, so the cost of
                  sealing a batch is denominated in the same unit as the batch
                  itself.
                </p>
              </div>
            </div>

            {/* Seal badge — pinned right */}
            <div className="px-5 pb-12 sm:px-8 sm:pb-16 lg:px-0 lg:py-20 lg:pr-8 xl:pr-12 flex items-start justify-center lg:justify-end">
              <div className="lg:sticky lg:top-8 flex flex-col items-center gap-5">
                <div className="seal-strike">
                  <SealBadge
                    txHash="0x9f2c4a7e6b1d8305f4ac9e2b71d0c6a8e3f5b9d1"
                    size="lg"
                  />
                </div>
                <p className="data-mono text-xs leading-relaxed text-foreground-dim text-center">
                  Specimen seal.
                  <br />
                  Real ones link to
                  <br />
                  {ARC_TESTNET.explorer.replace("https://", "")}.
                </p>
              </div>
            </div>
          </div>
        </RevealOnView>

        {/* ── Network facts · dense tabular grid ─────────────────── */}
        <RevealOnView as="section" className="relative border-b border-border bg-ink-navy">
          <div className="grid grid-cols-1 lg:grid-cols-[2.5rem_minmax(0,1fr)] gap-0">
            <div className="hidden lg:flex lg:items-start lg:pt-16">
              <div className="sticky top-8 -rotate-90 origin-top-left whitespace-nowrap">
                <span className="stage-ordinal">Network</span>
              </div>
            </div>

            <div className="px-5 pt-12 pb-12 sm:px-8 sm:pt-16 sm:pb-16 lg:px-0 lg:pt-16 lg:pb-16 lg:pr-8">
              <div className="lg:hidden mb-6">
                <span className="stage-ordinal">Network</span>
                <div className="rule-sweep mt-2 max-w-32" />
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                {NETWORK_FACTS.map((fact) => (
                  <div key={fact.term} className="spec-row border-b-0 py-4">
                    <dt className="text-xs text-foreground-dim mb-1">
                      {fact.term}
                    </dt>
                    <dd>
                      <span className="data-mono text-sm text-parchment block break-all">
                        {fact.value}
                      </span>
                      {fact.note && (
                        <span className="block text-xs leading-relaxed text-foreground-dim mt-1.5 break-all">
                          {fact.note}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </RevealOnView>

        {/* ── Ft5 · statement footer · full-bleed dark field ──────── */}
        <RevealOnView as="section" className="border-t border-border bg-graphite/40">
          <div className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32 xl:px-20">
            <div className="max-w-5xl">
              <p className="display-face text-3xl leading-[1.15] font-semibold text-parchment sm:text-4xl lg:text-5xl">
                A bill your customer can verify without asking you.
              </p>

              <div className="rule-sweep mt-10 max-w-40" />

              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link
                  href="/signup"
                  className="btn-primary focus-ring no-wrap inline-block"
                >
                  Get an API key
                </Link>
                <a
                  href="https://aura-ai.rizzgm.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring no-wrap text-sm text-parchment-dim transition-colors hover:text-brass"
                >
                  Try Live Demo
                </a>
                <Link
                  href="/docs"
                  className="focus-ring no-wrap text-sm text-parchment-dim transition-colors hover:text-brass"
                >
                  Read Documentation
                </Link>
                <Link
                  href="/login"
                  className="focus-ring no-wrap text-sm text-parchment-dim transition-colors hover:text-brass"
                >
                  Sign in
                </Link>
                <a
                  href={ARC_TESTNET.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring no-wrap text-sm text-parchment-dim transition-colors hover:text-brass"
                >
                  Arc explorer
                </a>
              </div>
            </div>
          </div>
        </RevealOnView>

        <footer className="border-t border-border">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8 lg:px-12 xl:px-20">
            <span className="display-face text-sm font-semibold text-parchment no-wrap">
              Pactum
            </span>
            <span className="data-mono text-xs text-foreground-dim">
              Arc Testnet · settlement in USDC
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
