# Deployment

Deployment guide for the Pactum platform on Vercel.

---

## Prerequisites

- A [Vercel](https://vercel.com) account
- The repository pushed to GitHub
- A configured Database project with all migrations applied
- A deployed PactumBilling smart contract on Arc Testnet

---

## Vercel Deployment

### 1. Import Project

1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Select **Import Git Repository** and choose the `pactum` repository.
3. Keep the default Root Directory (`./`).
4. Framework Preset should auto-detect **Web Application**.
5. Click **Deploy**.

### 2. Configure Environment Variables

Add the following environment variables in **Vercel → Project → Settings → Environment Variables**:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Database project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Database public (anon) key |
| `PACTUM_CONTRACT_ADDRESS` | Yes | PactumBilling contract address |
| `NEXT_PUBLIC_PACTUM_CONTRACT_ADDRESS` | Yes | Same contract address (client-side) |
| `ARC_TESTNET_RPC_URL` | No | Arc Testnet RPC (defaults to public RPC) |

> [!CAUTION]
> Ensure that your internal production secrets (such as Database Service Keys and Operator Wallet Keys) are set as **Sensitive** environment variables in Vercel (hidden after save).

### 3. Redeploy

After setting environment variables, trigger a redeployment:
- Vercel → Project → Deployments → **Redeploy** (latest deployment)

---

## Automated Settlement (Cron Job)

To run settlement automatically, create a `vercel.json` file in the project root:

```json
{
  "crons": [
    {
      "path": "/api/v1/settlement/cron",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This runs the settlement endpoint daily at midnight UTC.

> [!NOTE]
> Vercel Cron Jobs automatically include the `CRON_SECRET` as the authorization header when configured. Alternatively, the settlement cron endpoint validates `Authorization: Bearer <CRON_SECRET>`.

### Custom Schedules

| Schedule | Cron Expression |
|---|---|
| Every hour | `0 * * * *` |
| Every 6 hours | `0 */6 * * *` |
| Daily at midnight UTC | `0 0 * * *` |
| Weekly (Sunday midnight) | `0 0 * * 0` |

---

## Build Configuration

The project uses the following build settings (auto-detected by Vercel):

| Setting | Value |
|---|---|
| Framework | Web Application |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | 18.x |

### TypeScript Configuration

The `tsconfig.json` excludes `test_integration/` and `node_modules/` to prevent build errors from the separate Aura AI demo project:

```json
{
  "exclude": ["node_modules", "test_integration"]
}
```

---

## Post-Deployment Verification

After deployment, verify the following:

1. **Dashboard loads** — Visit your Vercel domain and check that the login page renders.
2. **API responds** — Test the usage tracking endpoint:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/v1/usage/track \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your_api_key" \
     -d '{"model":"test","user_address":"0x...","idempotency_key":"deploy-test-1"}'
   ```
3. **Database connection** — Login and check that the dashboard loads usage data from Database.
4. **Settlement** — Manually trigger a settlement and verify the on-chain transaction on [Arc Explorer](https://testnet.arcscan.app).

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Build fails with TypeScript errors | `test_integration/` included in build | Ensure `tsconfig.json` excludes `test_integration` |
| 500 errors on API routes | Missing environment variables | Check all required env vars are set in Vercel |
| Settlement fails | Missing operator configuration | Ensure operator keys and `PACTUM_CONTRACT_ADDRESS` are set in Vercel |
| Dashboard shows no data | Missing database configuration | Ensure internal database service keys are properly configured |
| CORS errors from external apps | Default Web Application CORS policy | Add appropriate CORS headers if needed |
