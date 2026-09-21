# Pactum Documentation

Pactum is a metered-billing API for AI services: you record every billable
call against an end-user's prepaid USDC balance, and settlement lands on-chain
on Arc with a verifiable transaction hash. Your users keep their funds in a
smart contract and only pay for what they consume.

These docs are written for **integrators** — how to wire Pactum into your
application — not for how the platform works internally.

---

## Choose your integration path

| I want to… | Read |
|---|---|
| Charge per call/token for my AI API and get paid in USDC | [Integration Guide](./integration-guide.md) |
| Look up exact request/response shapes for every endpoint | [API Reference](./api-reference.md) |
| Let end-users deposit and withdraw their prepaid balance | [Contract Integration](./smart-contract.md) |

---

## The 60-second version

1. **Sign up** on the dashboard, create an API key, set your payout wallet.
2. **Meter** every served call from your backend:

```bash
curl -X POST https://<pactum-host>/api/v1/usage/track \
  -H "X-API-Key: pactum_..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "prompt_tokens": 1280,
    "completion_tokens": 320,
    "prompt_price_per_token": 0.000005,
    "completion_price_per_token": 0.000015,
    "user_address": "0x…",
    "idempotency_key": "req_01H…"
  }'
# → 200 { "recorded": true, "cost": 0.0112 }
# → 402 when the user's balance cannot cover the call
# → 429 when a spend policy limit is hit
```

3. **Get settled** — pending usage is batched on-chain; every batch produces
   a transaction hash you can hand to your customer as a receipt.

That's the whole loop. The [Integration Guide](./integration-guide.md) fills
in everything around it: retries, idempotency, pre-flight balance checks,
policy limits, and on-chain deposits/withdrawals for your users.
