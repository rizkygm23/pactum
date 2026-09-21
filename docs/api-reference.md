# API Reference

Complete REST API documentation for the Pactum platform.

---

## Authentication

The API uses two authentication methods depending on the context:

| Method | Header | Used By | Endpoints |
|---|---|---|---|
| **Session Cookie** | `pactum_session` (HTTP-only, HMAC-signed) | Dashboard UI | Keys, Policies, Invoices, Settlement (manual), Usage summary |
| **API Key** | `X-API-Key: pactum_<hex>` | Third-party apps | `/usage/track`, `/wallet/balance` |
| **Bearer Token** | `Authorization: Bearer <CRON_SECRET>` | Settlement cron | `/settlement/cron` |
| **Wallet Signature** | `x-pactum-address` + `x-pactum-timestamp` + `x-pactum-signature` | End-user wallets | `/wallet/balance` |

---

## Usage Tracking

### `POST /api/v1/usage/track`

Records a single usage event. This is the primary SDK endpoint called by third-party applications.

**Auth:** `X-API-Key` header

**Request Body:**

```json
{
  "model": "gpt-4",
  "prompt_tokens": 150,
  "completion_tokens": 75,
  "prompt_price_per_token": 0.000005,
  "completion_price_per_token": 0.000015,
  "user_address": "0x1234...abcd",
  "idempotency_key": "req-abc-123",
  "metadata": {
    "app": "my-ai-app",
    "session_id": "sess-456"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | `string` | Yes | Model or endpoint identifier |
| `prompt_tokens` | `number` | No | Number of input tokens |
| `completion_tokens` | `number` | No | Number of output tokens |
| `prompt_price_per_token` | `number` | No | Price per input token (USDC) |
| `completion_price_per_token` | `number` | No | Price per output token (USDC) |
| `user_address` | `string` | Yes | End-user wallet address (0x...) |
| `idempotency_key` | `string` | Yes | Unique key to prevent duplicate charges |
| `metadata` | `object` | No | Arbitrary key-value data for tracking |

**Response (200):**

```json
{
  "recorded": true,
  "deduplicated": false,
  "event_id": "uuid-of-event",
  "cost": 0.001875
}
```

**Response (200 — Deduplicated):**

```json
{
  "recorded": true,
  "deduplicated": true,
  "event_id": "uuid-of-existing-event",
  "cost": 0.001875
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Missing required fields or invalid `user_address` format |
| `401` | Missing or invalid API key |
| `402` | Insufficient funds in user's State Channel balance |
| `403` | API key has been revoked |
| `429` | Policy limit exceeded — daily or monthly spend limit reached |
| `500` | Database or on-chain read error |
| `503` | Billing misconfigured — `PACTUM_CONTRACT_ADDRESS` missing on the server (fail-closed) |

> [!NOTE]
> Cost is calculated as: `(prompt_tokens × prompt_price_per_token) + (completion_tokens × completion_price_per_token)`

---

### `GET /api/v1/usage/summary`

Returns the current user's spend for the current UTC day and month, plus the active policy limits and remaining budget.

**Auth:** Session cookie

**Response (200):**

```json
{
  "daily_spend": 0.0125,
  "monthly_spend": 0.34,
  "daily_limit": 100,
  "monthly_limit": 3000,
  "remaining_daily": 99.9875,
  "remaining_monthly": 2999.66,
  "total_events_today": 7
}
```

---

## API Keys

### `GET /api/v1/keys`

List all API keys for the authenticated user's project.

**Auth:** Session cookie

**Response (200):**

```json
{
  "keys": [
    {
      "id": "uuid",
      "key_prefix": "pactum_a1b2c3d4",
      "name": "Production",
      "status": "active",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### `POST /api/v1/keys`

Generate a new API key.

**Auth:** Session cookie

**Request Body:**

```json
{
  "name": "Production Key"
}
```

**Response (201):**

```json
{
  "key": "pactum_a1b2c3d4e5f6...",
  "id": "uuid",
  "key_prefix": "pactum_a1b2c3d4",
  "name": "Production Key",
  "status": "active",
  "created_at": "2026-01-01T00:00:00Z"
}
```

> [!CAUTION]
> The `key` field contains the full API key and is **only returned once**. Store it securely.

---

## Policies

### `GET /api/v1/policies`

Get the active spend policy for the user's project.

**Auth:** Session cookie

**Response (200):**

```json
{
  "policy": {
    "id": "uuid",
    "project_id": "uuid",
    "spend_limit_daily": 100.0,
    "spend_limit_monthly": 3000.0,
    "allowlist": [],
    "status": "active"
  }
}
```

---

### `PUT /api/v1/policies`

Create or update the spend policy.

**Auth:** Session cookie

**Request Body:**

```json
{
  "spend_limit_daily": 50.0,
  "spend_limit_monthly": 1500.0,
  "allowlist": ["gpt-4", "claude-3"]
}
```

**Response (200):**

```json
{
  "policy": { ... }
}
```

---

## Invoices

### `GET /api/v1/invoices`

List invoices for the user's project. Optionally filter by status.

**Auth:** Session cookie

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `status` | `string` | Filter by invoice status: `draft`, `finalized`, `settling`, `settled`, `failed` |

**Response (200):**

```json
{
  "invoices": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "period_start": "2026-01-01T00:00:00Z",
      "period_end": "2026-01-01T23:59:59Z",
      "total_amount": 12.345678,
      "status": "draft",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### `POST /api/v1/invoices`

Generate a new invoice by aggregating usage events within a time period.

**Auth:** Session cookie

**Request Body:**

```json
{
  "period": "daily"
}
```

| Field | Type | Description |
|---|---|---|
| `period` | `string` | `"daily"` (default) or `"monthly"` |
| `period_start` | `string` | ISO date — overrides `period` |
| `period_end` | `string` | ISO date — overrides `period` |

**Response (201):**

```json
{
  "invoice": {
    "id": "uuid",
    "project_id": "uuid",
    "period_start": "2026-01-01T00:00:00Z",
    "period_end": "2026-01-01T23:59:59Z",
    "total_amount": 12.345678,
    "status": "draft",
    "usage_events": [ ... ]
  }
}
```

---

## Settlement

### `POST /api/v1/settlement/cron`

Triggers a global batch settlement of all pending usage events. Aggregates costs per (user, merchant) pair in exact integer units, skips groups whose on-chain user balance is insufficient (reported in `skipped` instead of reverting the whole batch), and executes `batchSettleUsage` on the PactumBilling smart contract in chunks of at most 50 groups. Each settled event records its `settled_tx_hash`.

**Auth:** `Authorization: Bearer <operator_token>`

**Response (200):**

```json
{
  "message": "Settlement successful",
  "settledGroups": 5,
  "settledEvents": 42,
  "txHashes": ["0xabc...def"],
  "skipped": [
    { "user": "0x...", "merchant": "0x...", "reason": "on-chain balance below pending usage" }
  ]
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | Invalid or missing operator token |
| `500` | Contract call failed or missing configuration |

---

### `POST /api/v1/settlement/manual`

Same settlement engine as the cron endpoint, but **scoped to the logged-in user's own projects** — a dashboard user can only settle events belonging to their API keys, never other users'.

**Auth:** Session cookie

**Response (200):** same shape as `/api/v1/settlement/cron`.

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | Not logged in |
| `404` | User has no project |
| `500` | Contract call failed |

---

## Wallet Balance

### `GET /api/v1/wallet/balance`

Returns the total pending off-chain usage for a given address — used by
wallet UIs to display the available balance, and by integrators for
pre-flight checks. **Authenticated access only** (the numeric amount is not
served to anonymous callers).

**Auth — one of:**

| Who | How | Scope |
|---|---|---|
| Third-party app | `X-API-Key` header | Pending usage of the address **scoped to that key's own project** |
| End-user wallet | `x-pactum-address` + `x-pactum-timestamp` + `x-pactum-signature` — a `personal_sign` of `Pactum: verify wallet ownership\nAddress: <address>\nTimestamp: <ms>` (±10 min) | Full pending usage for that address |
| Dashboard session | `pactum_session` cookie | Scoped to the logged-in user's projects |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `address` | `string` | Yes | User wallet address, `0x` + 40 hex |

**Response (200):**

```json
{
  "pendingUsage": 0.004325
}
```

**Response (401):** missing/invalid credentials for all three paths.

> [!NOTE]
> Available balance = `On-Chain Balance (userBalances) − pendingUsage`.
> Read the on-chain half from the contract directly — see
> [Contract Integration](./smart-contract.md).

---

## Receipts

### `GET /api/v1/receipts/:id`

Retrieve the settlement receipt for a specific invoice, including the on-chain transaction hash.

**Auth:** Session cookie

**Response (200):**

```json
{
  "receipt": {
    "invoice_id": "uuid",
    "tx_hash": "0xabc...def",
    "chain": "arc-testnet",
    "amount": 12.345678,
    "currency": "USDC",
    "status": "confirmed",
    "settled_at": "2026-01-01T12:00:00Z"
  }
}
```
