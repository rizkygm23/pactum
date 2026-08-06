# Setup

Local development setup guide for the Pactum platform.

---

## Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18 | Runtime |
| npm | ≥ 9 | Package manager |
| MetaMask | Latest | Wallet interaction (for testing settlement/deposit) |
| Supabase account | — | Database hosting |
| Arc Testnet USDC | — | Obtained from [Circle Faucet](https://faucet.circle.com) |

---

## 1. Clone and Install

```bash
git clone https://github.com/rizkygm23/pactum.git
cd pactum
npm install
```

---

## 2. Configure Environment

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Fill in the following variables:

| Variable | Description | How to Obtain |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Supabase Dashboard → Settings → API |
| `PACTUM_CONTRACT_ADDRESS` | Deployed PactumBilling contract address | From contract deployment output |
| `NEXT_PUBLIC_PACTUM_CONTRACT_ADDRESS` | Same as above, exposed to client | Same as `PACTUM_CONTRACT_ADDRESS` |
| `SERVICE_WALLET_PRIVATE_KEY` | Private key of the platform operator wallet | The wallet that deployed the contract |
| `CRON_SECRET` | Secret token for settlement cron auth | Any secure random string |
| `ARC_TESTNET_RPC_URL` | Arc Testnet RPC endpoint (optional) | Defaults to `https://rpc.testnet.arc.network` |

> [!CAUTION]
> Never commit `.env.local` to version control. The `.gitignore` already excludes it.

---

## 3. Set Up the Database

Run the SQL migration files **in order** in the Supabase SQL Editor (Dashboard → SQL Editor):

1. `supabase/migrations/001_initial_schema.sql` — Core tables and initial RLS
2. `supabase/migrations/002_custom_auth.sql` — Custom auth migration (decouples from Supabase Auth)
3. `supabase/migrations/003_state_channel.sql` — Adds status and address columns for state channel billing
4. `supabase/migrations/004_enable_rls.sql` — Re-enables RLS on all tables

> [!IMPORTANT]
> Migrations must be executed in numerical order. Each migration depends on the previous one.

---

## 4. Deploy the Smart Contract (Optional)

If you need to deploy a fresh instance of the PactumBilling contract:

1. Configure `hardhat.config.cjs` with your Arc Testnet RPC and deployer private key.
2. Compile the contract:
   ```bash
   node compile.js
   ```
3. Deploy using Hardhat or your preferred deployment tool.
4. Update `PACTUM_CONTRACT_ADDRESS` and `NEXT_PUBLIC_PACTUM_CONTRACT_ADDRESS` in `.env.local` with the deployed address.

If a contract is already deployed on Arc Testnet, use the existing address.

---

## 5. Run the Development Server

```bash
npm run dev
```

The application starts at [http://localhost:3000](http://localhost:3000).

---

## 6. Verify the Setup

1. **Signup**: Navigate to `/signup` and create an account.
2. **Dashboard**: After login, you should see the dashboard at `/dashboard`.
3. **API Key**: Go to Settings and generate an API key.
4. **Test Usage Tracking**: Send a test request:
   ```bash
   curl -X POST http://localhost:3000/api/v1/usage/track \
     -H "Content-Type: application/json" \
     -H "X-API-Key: YOUR_API_KEY" \
     -d '{
       "model": "test-model",
       "prompt_tokens": 100,
       "completion_tokens": 50,
       "prompt_price_per_token": 0.000005,
       "completion_price_per_token": 0.000015,
       "user_address": "0xYOUR_TEST_ADDRESS",
       "idempotency_key": "test-001"
     }'
   ```
5. **Dashboard Update**: The usage event should appear in the dashboard immediately.

---

## Common Issues

| Issue | Solution |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` not set | Backend operations will fail. Ensure the service role key is set in `.env.local`. |
| Contract address missing | Settlement and balance checks will be skipped. Set `PACTUM_CONTRACT_ADDRESS`. |
| MetaMask not on Arc Testnet | Add Arc Testnet to MetaMask: Chain ID `5042002`, RPC `https://rpc.testnet.arc.network`. |
| No test USDC | Visit [Circle Faucet](https://faucet.circle.com) to get Arc Testnet USDC. |
