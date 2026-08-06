# Pactum

**Usage-based billing infrastructure for AI services, settled on-chain with USDC.**

Built with Next.js · Supabase · Solidity · Arc Testnet

---

## Overview

Pactum is a billing platform that enables AI SaaS providers to track per-token usage, enforce spend policies, and settle payments on-chain using USDC on Arc Testnet. It combines off-chain metering for performance with on-chain batch settlement for auditability.

### Key Features

- **Usage Metering** — Track API consumption per request with idempotent event recording.
- **State Channel Billing** — Off-chain usage tracking with periodic on-chain batch settlement.
- **Spend Policies** — Configurable daily and monthly spend limits per project.
- **Smart Contract Settlement** — Automated USDC transfers via the PactumBilling contract on Arc Testnet.
- **Merchant Dashboard** — Real-time usage analytics, invoice generation, payout tracking, and wallet management.
- **API Key Management** — Generate, list, and revoke API keys with SHA-256 hashed storage.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/rizkygm23/pactum.git
cd pactum

# Install dependencies
npm install

# Configure environment (see docs/setup.md for details)
cp .env.example .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

---

## Project Structure

```
pactum/
├── app/                    # Next.js App Router
│   ├── api/v1/             # REST API endpoints
│   │   ├── usage/track/    # Usage event recording
│   │   ├── keys/           # API key management
│   │   ├── policies/       # Spend policy configuration
│   │   ├── invoices/       # Invoice generation
│   │   ├── settlement/     # On-chain settlement (cron)
│   │   ├── wallet/         # Wallet balance queries
│   │   └── receipts/       # Settlement receipt lookup
│   ├── dashboard/          # Merchant dashboard UI
│   ├── wallet/             # End-user wallet (deposit USDC)
│   └── login/ & signup/    # Authentication pages
├── contracts/              # Solidity smart contracts
├── lib/                    # Shared utilities
│   ├── arc/                # Arc Testnet configuration
│   ├── supabase/           # Supabase client setup
│   ├── api-keys.ts         # Key generation and hashing
│   ├── auth.ts             # Session management
│   └── invoices.ts         # Invoice generation logic
├── components/             # React UI components
├── supabase/migrations/    # Database schema migrations
└── docs/                   # Project documentation
```

---

## Documentation

See the [`docs/`](./docs/README.md) directory for detailed documentation:

| Document | Description |
|---|---|
| [Architecture](./docs/architecture.md) | System design, data flow, and component relationships |
| [Setup](./docs/setup.md) | Local development environment setup |
| [Database](./docs/database.md) | Schema reference and migration guide |
| [API Reference](./docs/api-reference.md) | REST API endpoints and usage examples |
| [Smart Contract](./docs/smart-contract.md) | PactumBilling contract reference |
| [Settlement](./docs/settlement.md) | Off-chain to on-chain settlement flow |
| [Integration Guide](./docs/integration-guide.md) | Third-party developer integration guide |
| [Deployment](./docs/deployment.md) | Vercel deployment and configuration |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL) with RLS |
| Blockchain | Arc Testnet (USDC-native gas) |
| Smart Contract | Solidity 0.8.20 (PactumBilling) |
| On-chain Client | viem |

---

## License

This project is proprietary. All rights reserved.
