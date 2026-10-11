# Pactum on Arc: per-token billing for AI APIs, settled in USDC

> Draft Ecosystem Showcase post — follows forum_guildelines.md.
> Before posting: add 1-3 screenshots of the "it works" moment and upload a
> 30-120s screen recording to YouTube/Vimeo, then embed with the film icon.

---

**TL;DR**

- **What it is** — Pactum is metered billing for AI services: your users prepay USDC into an on-chain channel, you meter every API call, and usage settles in batches on Arc with a tx-hash receipt.
- **Who it's for** — AI/API developers who want per-token/per-call pricing without cards, invoices, or chasing payments.
- **What you can do today** — create an API key, meter calls from your backend against the live testnet deployment, and try the billed-per-token chat demo end to end.

---

## What it does

Pactum records every billable call your API serves against an end user's prepaid USDC balance held in a smart contract (PactumBilling) on Arc. If the balance can't cover the call, metering refuses with `402` before you spend model tokens. Pending usage settles to your payout wallet in on-chain batches, and every settled row carries its transaction hash — a receipt your customer can verify without trusting you.

## Quickstart

1. Sign up at [pactum.rizzgm.xyz](https://pactum.rizzgm.xyz) → Settings → set your payout wallet → generate an API key (`pactum_…`, shown once).
2. Meter a served call from your backend:

```bash
curl -X POST https://pactum.rizzgm.xyz/api/v1/usage/track \
  -H "X-API-Key: pactum_..." -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "prompt_tokens": 1280,
    "completion_tokens": 320,
    "prompt_price_per_token": 0.000005,
    "completion_price_per_token": 0.000015,
    "user_address": "0x…",
    "idempotency_key": "req_01H…"
  }'
```

3. Expected responses: `200 { "recorded": true, "cost": 0.0112 }` · replay with the same `idempotency_key` → `"deduplicated": true` (never double-charged) · `402` when the user's channel balance can't cover it · `429` when a daily/monthly spend policy caps the charge.

Users fund their balance (and withdraw unused funds) at the wallet page: approve USDC → `deposit()` → `userBalances` is the channel balance. Full walkthrough: **[Integration Guide](https://pactum.rizzgm.xyz/docs/integration-guide)**.

## Integration notes

- **One endpoint does the work** — `POST /api/v1/usage/track` with an `X-API-Key` header; token counts and per-token prices are yours, cost is computed in exact 6-decimal integer math.
- **Idempotency built in** — same `idempotency_key` on retries/queue redeliveries returns the original event, not a second charge.
- **Pre-flight checks** — read `userBalances(address)` directly from the contract (plain viem/ethers call) or `GET /api/v1/wallet/balance` (API-key or wallet-signature auth) to refuse work before burning tokens.
- **Receipts are on-chain** — settlement batches call `batchSettleUsage` on PactumBilling; each settled event stores its `settled_tx_hash` with an explorer link.
- **Any stack** — plain REST from Node/Python/Go; contract calls via viem/ethers; example Express integration in the docs.
- **Live health probe** — `GET /api/health` reports database + chain (contract `VERSION()`) status, so you can monitor the deployment you build against.

## Security / limits

- **Testnet, experimental-but-working** — deployed on Arc Testnet (chain 5042002); no mainnet value at stake.
- **Custodial operator model (be aware)** — the settlement operator is a trusted role; the v2 contract mitigates with pausable settlement, a two-step operator hand-off, an on-chain fee cap (default 0 bps), and user withdrawals that **always stay open**, even while paused.
- **Fail-closed metering** — if the contract isn't configured server-side, metering returns `503` instead of recording unbilled usage.
- **Exact money math** — validation rejects negative/fractional tokens and oversized payloads; costs are computed in integer units, never floats.
- **Not audited** — solo project, no third-party audit yet; contract is short (~300 lines, self-contained) and open source.

## Links

- Website / dashboard: https://pactum.rizzgm.xyz
- Docs (integration-first): https://pactum.rizzgm.xyz/docs
- GitHub: https://github.com/rizkygm23/pactum
- Live demo (chat billed per token, Grok-powered): https://aura-ai.rizzgm.xyz
- Contract on explorer: https://explorer.testnet.arc.io/address/0x4bab39e99d9bca6897d8b844f84fbe6b06d28509

## Media

Screenshots ready in `media/` (HTML sources in `media/html/` — re-render anytime):

- [x] `media/dashboard.png` — overview with settled rows + on-chain tx-hash links (real batch `0xdaf606d7…`)
- [x] `media/wallet.png` — deposit + withdraw flow with real balances (7.98 USDC on-chain)
- [x] `media/chat.png` — demo chat with "Pactum Billed" stamps (real conversation)
- [ ] 30-120s screen recording (upload to YouTube/Vimeo, embed with film icon): signup → API key → curl meter → 402 → settle → receipt

## Who it's for

- **Builders** — one curl against `/usage/track` after your model responds is the whole integration; first win is a metered, deduplicated event in under 15 minutes.
- **Founders/PMs** — usage-based pricing for AI features without card rails; policy caps (429) give you spend guardrails per project.
- **Infra/tooling** — stateless Next.js app + Supabase + a single operator wallet; `/api/health` and structured logs are ready for uptime checks.
- **Community/educators** — the chat demo is the easiest path: connect MetaMask, deposit testnet USDC from the Circle faucet, and watch every reply get billed and settled.
- **End users** — try the demo with faucet funds; unused deposit is withdrawable at any time, even if the platform pauses.

---

**Two questions for you:**

1. What stack is your AI service on (Node/Python/Go, streaming or not) — would a typed SDK or webhook for settled receipts make metering easier for you?
2. For agent workloads specifically: would per-task (rather than per-token) pricing with hard session budgets be more useful than daily/monthly caps?

*Building in the open — feedback on the custodial-operator trade-off (vs. per-user signed tickets) is especially welcome.*
