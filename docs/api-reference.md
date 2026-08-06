# API Reference

Complete REST API documentation for the Pactum platform.

---

## Authentication

The API uses two authentication methods depending on the context:

| Method | Header | Used By | Endpoints |
|---|---|---|---|
| **Session Cookie** | `pactum_session` (HTTP-only cookie) | Dashboard UI | Keys, Policies, Invoices, Settings |
| **API Key** | `X-API-Key: pactum_<hex>` | Third-party apps | `/usage/track` |
| **Bearer Token** | `Authorization: Bearer <secret>` | Settlement cron | `/settlement/cron` |

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
| `400` | Missing required fields |
| `401` | Missing or invalid API key |
| `402` | Insufficient funds in user's State Channel balance |
| `403` | API key has been revoked |
| `500` | Database or on-chain read error |

> [!NOTE]
> Cost is calculated as: `(prompt_tokens × prompt_price_per_token) + (completion_tokens × completion_price_per_token)`

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

Triggers a batch settlement of all pending usage events. Aggregates costs per (user, merchant) pair and executes a single `batchSettleUsage` call on the PactumBilling smart contract.

**Auth:** `Authorization: Bearer <CRON_SECRET>`

**Response (200):**

```json
{
  "message": "Settlement successful",
  "hash": "0xabc...def",
  "processedEvents": 42,
  "batches": 5
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | Invalid or missing `CRON_SECRET` |
| `500` | Contract call failed or missing configuration |

---

## Wallet Balance

### `GET /api/v1/wallet/balance`

Returns the total pending off-chain usage for a given user address. Used by the wallet UI to display the available balance.

**Auth:** None (public endpoint)

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `address` | `string` | Yes | User wallet address |

**Response (200):**

```json
{
  "pendingUsage": 0.004325
}
```

> [!NOTE]
> Available balance is calculated client-side as: `On-Chain Balance − pendingUsage`.

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
