# Pactum

**Usage-based billing infrastructure for AI services, settled on-chain with USDC.**

Built with Next.js 16 · Supabase · Solidity 0.8.20 · Arc Testnet (PactumBilling v2)

---

## Overview

Pactum is a billing platform that enables AI SaaS providers to track per-token usage, enforce spend policies, and settle payments on-chain using USDC on Arc Testnet. It combines off-chain metering for performance with on-chain batch settlement for auditability.

### Key Features

- **Usage Metering** — Track API consumption per request with idempotent event recording and exact 6-decimal integer cost math.
- **State Channel Billing** — Prepaid USDC deposits, off-chain metering, atomic batch settlement with per-group balance pre-checks.
- **Spend Policies** — Daily and monthly spend limits per project, enforced at metering time (429).
- **Smart Contract v2** — PactumBilling with pausable settlement, two-step operator hand-off, on-chain fee cap (default 0), reentrancy guards, and a user withdrawal escape hatch that always stays open.
- **Merchant Dashboard** — Real-time usage analytics, payouts with on-chain receipt links, invoice reporting, and wallet management.
- **End-User Wallet** — Deposit, withdraw unused balance, and live available-balance display.
- **API Key Management** — Generate, list, and revoke keys with SHA-256 hashed storage.

---

## Quick Start

```bash
git clone https://github.com/rizkygm23/pactum.git
cd pactum
npm install

# Configure environment (see docs/self-hosting notes in docs/smart-contract.md)
cp .env.example .env.local

# Compile the contract artifact
npm run compile

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Health probe:
[http://localhost:3000/api/health](http://localhost:3000/api/health) — reports
database and on-chain dependency status (503 when degraded).

---

## Development

```bash
npm run dev       # dev server
npm run build     # production build
npm run lint      # eslint
npm test          # vitest unit suite (money math, sessions, rate limits, keys)
npm run compile   # compile PactumBilling → artifacts-contract/
```

CI (GitHub Actions) runs lint + tests + contract compile + build on every push and PR.

---

## Project Structure

```
pactum/
├── app/                    # Next.js App Router
│   ├── api/v1/             # REST API endpoints (usage, keys, policies, invoices,
│   │                       #  settlement, wallet, receipts) + /api/health
│   ├── dashboard/          # Merchant dashboard UI
│   ├── wallet/             # End-user wallet (deposit + withdraw unused)
│   ├── docs/               # Documentation renderer
│   └── login/ & signup/    # Authentication pages
├── contracts/              # PactumBilling.sol (v2)
├── lib/                    # Shared utilities
│   ├── arc/                # Arc Testnet configuration
│   ├── settlement/         # Atomic settlement engine
│   ├── money.ts            # Exact 6-decimal usage pricing & validation
│   ├── policy.ts           # Spend-limit evaluation
│   ├── obs.ts              # Structured logging + request ids
│   ├── session-token.ts    # HMAC-signed sessions
│   ├── supabase/           # Supabase admin client
│   └── api-keys.ts         # Key generation and hashing
├── components/             # React UI components
├── supabase/migrations/    # Database schema migrations
├── tests/                  # Vitest unit suite
└── docs/                   # Integration-first documentation
```

---

## Documentation

Integration-first documentation lives in [`docs/`](./docs/README.md):

| Document | Description |
|---|---|
| [Integration Guide](./docs/integration-guide.md) | Charge per call in your AI API — the full walkthrough |
| [API Reference](./docs/api-reference.md) | Every endpoint, auth method, and error |
| [Smart Contract](./docs/smart-contract.md) | PactumBilling v2 — functions, fee model, deposit/withdraw snippets |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL) with RLS |
| Blockchain | Arc Testnet (USDC-native gas) |
| Smart Contract | Solidity 0.8.20 — PactumBilling v2 (self-contained, no imports) |
| On-chain Client | viem |
| Testing | Vitest |

---

## License

This project is proprietary. All rights reserved.
