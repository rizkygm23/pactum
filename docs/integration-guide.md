# Integration Guide

Everything an AI service provider needs to charge per call with Pactum and
get paid in USDC on Arc. Every step includes the exact requests, responses,
and failure modes.

---

## How billing works from your side

You call one endpoint — `POST /api/v1/usage/track` — after your backend
serves a billable request. Pactum prices the tokens, checks the end-user's
prepaid balance, records the charge, and later settles batches on-chain to
your payout wallet. You never hold user funds and never touch private keys.

```
Your user            Your backend                Pactum                   Arc
   │  request            │                          │                       │
   ├───────────────────► │  serve the AI response   │                       │
   │                     ├─────────────────────────►│ POST /usage/track     │
   │                     │   200 recorded           │  (balance + policy    │
   │ ◄───────────────────┤ ◄────────────────────────┤   checked on-chain)   │
   │  response           │                          ├──────────────────────►│ batch settle → tx hash
   │                     │                          │                       │
```

---

## Step 1 — Get your credentials

1. Sign up on the Pactum dashboard.
2. **Settings → Settlement Wallet**: paste the EVM address that should
   receive your USDC. Settlements are only possible once this is set —
   do it first.
3. **Settings → API Keys → Generate New Key**. The key is shown **once**:

```
pactum_<40 hex characters>
```

Store it in your backend's secret store. It authorizes spending against
your users' balances — treat it like a database credential, not a client
secret. Never ship it in browser code.

---

## Step 2 — Meter every billable call

Call `POST /api/v1/usage/track` **from your backend**, after the AI response
has been produced (or streamed completely), with header `X-API-Key`.

```bash
curl -X POST https://<pactum-host>/api/v1/usage/track \
  -H "X-API-Key: pactum_abc123…" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "prompt_tokens": 1280,
    "completion_tokens": 320,
    "prompt_price_per_token": 0.000005,
    "completion_price_per_token": 0.000015,
    "user_address": "0x3813cB42a4376e4FaCB4b7F0fA3492CC0A5F727a",
    "idempotency_key": "chat-1726656000-a1b2c3d4",
    "metadata": { "conversation_id": "conv_42" }
  }'
```

### Request fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `model` | string | yes | Free-form label; appears in dashboards and receipts |
| `prompt_tokens` | number | no | Defaults to 0 |
| `completion_tokens` | number | no | Defaults to 0 |
| `prompt_price_per_token` | number | no | USDC per token. e.g. `0.000005` = \$5 / 1M tokens |
| `completion_price_per_token` | number | no | USDC per token |
| `user_address` | string | yes | End-user wallet, `0x` + 40 hex. This is the account that pays |
| `idempotency_key` | string | yes | **Uniqueness key** — see below |
| `metadata` | object | no | Arbitrary JSON, returned nowhere but stored for your own audit |

**Cost formula:** `cost = prompt_tokens × prompt_price + completion_tokens × completion_price`.

### Idempotency — how retries work

The `idempotency_key` protects you from double-billing. Send the **same**
key on every retry of the same logical request:

- First call: `200 { "recorded": true, "deduplicated": false, … }`
- Same key again: `200 { "recorded": true, "deduplicated": true, "event_id": "<same id>" }`
 — the charge is **not** counted twice, you get the original event back.

Generate one key per logical request: `req_<request-id>`, or
`chat-<timestamp>-<random>` when you have no request id. Queue redeliveries,
timeout retries, and user refreshes all become safe.

### Success response

```json
{
  "recorded": true,
  "deduplicated": false,
  "event_id": "e54a185d-6031-4fd5-a067-1b7b8668c0cb",
  "cost": 0.0112
}
```

### Every error, and what to do

| Status | Body | Meaning | Your move |
|---|---|---|---|
| `400` | `Invalid user_address format` / missing fields | Malformed request | Fix the payload; do not retry unchanged |
| `401` | `Invalid API key` | Key unknown | Check the header; key must be the full `pactum_…` |
| `402` | `Insufficient funds in State Channel.` + details | User's prepaid balance can't cover this charge | Do not serve (or serve free-of-charge by policy); point the user at the deposit page. Details include on-chain / pending / required amounts |
| `403` | `API key has been revoked` | Key revoked in dashboard | Stop calling; rotate |
| `429` | `policy_limit_exceeded` + `remaining_daily`/`remaining_monthly` | The project's spend policy capped this charge | Reject or degrade gracefully; resets at UTC day/month boundary |
| `500` | `Failed to read on-chain balance.` | Arc RPC hiccup | Safe to retry with the **same** idempotency key |
| `503` | `Billing misconfigured` | Platform-side config problem | Retry later with backoff; do not bill locally |

> [!IMPORTANT]
> On any **network error or 5xx**, retry with the same `idempotency_key` —
> deduplication makes that a no-op if the first attempt actually landed.
> On `402`/`429`, **do not retry** — the rejection is deterministic.

---

## Step 3 — Pre-flight balance check (optional but recommended)

To refuse work *before* burning model tokens, check availability first.
Two options:

**A. Read the chain directly (no API call):**

```js
import { createPublicClient, http } from "viem";
import { arcTestnet } from "viem/chains";

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
const balance = await publicClient.readContract({
  address: process.env.PACTUM_CONTRACT_ADDRESS, // PactumBilling address
  abi: [{ name: "userBalances", type: "function", stateMutability: "view",
          inputs: [{ name: "user", type: "address" }],
          outputs: [{ name: "", type: "uint256" }] }],
  functionName: "userBalances",
  args: [userAddress],
});
const onChainUsdc = Number(balance) / 1e6; // 6-decimal ERC-20 view
```

**B. Ask Pactum how much is pending** (requires your API key):

```bash
curl "https://<pactum-host>/api/v1/wallet/balance?address=0x…" \
  -H "X-API-Key: pactum_abc123…"
# → 200 { "pendingUsage": 0.004325 }
```

`available ≈ onChainUsdc − pendingUsage`. If it is ≤ your expected charge,
return your own `402` before calling the model.

> [!NOTE]
> `/wallet/balance` is authenticated. Your API key sees pending usage for
> addresses whose events belong to **your** project only. End-users can read
> their own number from a browser by signing an ownership message — see
> [API Reference](./api-reference.md).

---

## Step 4 — Spend policies (per-project caps)

Set daily/monthly caps in **Dashboard → Settings → Spend Policy**. Policies
are enforced at metering time: once `spent_today + cost > daily_limit`,
`/usage/track` returns `429 policy_limit_exceeded` until the UTC day rolls
over (monthly likewise).

Use it to cap agent runaways. `0` disables a limit; negative values are
rejected by the API.

---

## Step 5 — Getting paid (settlement)

Pending usage is settled in batches on-chain:

- An operator cron settles periodically; you can also trigger settlement for
  **your own project's events** from **Dashboard → Payouts → Settle Now**.
- Settlement moves USDC from each user's deposit to your payout wallet
  (minus platform fee, currently 0 bps).
- Every batch produces a transaction hash. Settled rows carry their
  `settled_tx_hash` — visible in the dashboard with an explorer link, and in
  the receipt API.

You don't need to do anything to get settled. The Payouts page shows
pending total, settled history with explorer links, and a **Withdraw**
button that pulls settled earnings from the contract to your wallet.

---

## Step 6 — End-user wallet flows (deposit & withdraw)

Your users fund their own balance through the PactumBilling contract. If you
are building your own wallet UI instead of using the hosted one:

**Deposit** (user pays; approve then deposit):

```js
// 1. one-time approval
await usdc.writeContract({
  functionName: "approve",
  args: [PACTUM_BILLING_ADDRESS, parseUnits("10", 6)], // 10 USDC
});
// 2. credit the user's channel balance
await pactumBilling.writeContract({
  account: userAddress,
  functionName: "deposit",
  args: [parseUnits("10", 6)],
});
```

**Withdraw unused balance** (no approval needed — the contract sends USDC
back; always available, even if Pactum is paused):

```js
await pactumBilling.writeContract({
  account: userAddress,
  functionName: "withdrawUser",
  args: [parseUnits("2", 6)], // 2 USDC
});
```

**Deposit on behalf of a user** (application-funded channels):

```js
await pactumBilling.writeContract({
  account: yourWallet, // any wallet with USDC
  functionName: "depositFor",
  args: [userAddress, parseUnits("5", 6)],
});
```

All amounts are **6-decimal raw units**. Always `approve` before `deposit` /
`depositFor`. See [Contract Integration](./smart-contract.md) for the full
function list, fee model, and safety guarantees.

---

## Step 7 — Receipts for your customers

After settlement, fetch a per-usage receipt with the tx hash:

```bash
curl "https://<pactum-host>/api/v1/receipts/<event_id>" \
  -H "Authorization: Bearer <dashboard-session>"
# → { "receipt": { "tx_hash": "0x…", "chain": "arc-testnet",
#                   "amount": 0.0112, "status": "confirmed", … } }
```

The dashboard renders this as a sealed receipt linking to
`https://explorer.testnet.arc.io/tx/<hash>`.

---

## Minimal end-to-end example (Express)

```js
import express from "express";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "viem/chains";

const app = express();
app.use(express.json());

const PACTUM = "https://<pactum-host>/api/v1";
const API_KEY = process.env.PACTUM_API_KEY;
const BILLING = process.env.PACTUM_CONTRACT_ADDRESS;

const client = createPublicClient({ chain: arcTestnet, transport: http() });
const BAL_ABI = [{ name: "userBalances", type: "function", stateMutability: "view",
  inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] }];

app.post("/chat", async (req, res) => {
  const { prompt, userAddress } = req.body;
  const expectedCost = 0.005; // your worst-case estimate for this call

  // 1. Pre-flight: refuse before spending model tokens
  const onChain = Number(await client.readContract({
    address: BILLING, abi: BAL_ABI, functionName: "userBalances", args: [userAddress],
  })) / 1e6;
  const { pendingUsage = 0 } = await fetch(`${PACTUM}/wallet/balance?address=${userAddress}`,
    { headers: { "X-API-Key": API_KEY } }).then(r => r.json());
  if (onChain - pendingUsage < expectedCost) {
    return res.status(402).json({ error: "Deposit USDC to continue." });
  }

  // 2. Serve the AI response (your model call here)
  const answer = await callYourModel(prompt);

  // 3. Meter it — idempotency key makes retries safe
  const track = await fetch(`${PACTUM}/usage/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({
      model: "gpt-4o",
      prompt_tokens: Math.ceil(prompt.length / 4),
      completion_tokens: Math.ceil(answer.length / 4),
      prompt_price_per_token: 0.000005,
      completion_price_per_token: 0.000015,
      user_address: userAddress,
      idempotency_key: `chat-${req.id}`,
    }),
  });

  if (track.status === 402 || track.status === 429) {
    return res.status(402).json({ error: "Balance or policy rejected this call." });
  }
  const { cost } = await track.json();
  res.json({ answer, billed: cost });
});
```

---

## Testing

- Get testnet USDC from the [Circle Faucet](https://faucet.circle.com)
  (select **Arc Testnet**).
- Arc finalizes in under a second — one confirmation is final; no reorg
  waits anywhere in your integration.
- All prices and balances are 6-decimal USDC units.
