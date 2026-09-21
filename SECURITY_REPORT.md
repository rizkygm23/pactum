# Pactum — Security Analysis & Bug Bounty Report

**Target:** `C:\Users\HP\codingan\pactum` (main Next.js app, `test_integration/` demo app, `PactumBilling.sol` on Arc testnet)
**Date:** 2026-09-19
**Methodology:** 6-phase bounty workflow (scope → recon → analyze → verify/PoC → report). All findings verified against the current working tree (post-hardening state) with live PoCs against a local dev instance, static review of all API routes, git-history secret mining, and `npm audit` on both apps.
**Scope note:** Authorized audit of the owner's own codebase. Test evidence produced on local dev servers only; no production traffic, no third-party targets.

---

## 0. Executive Summary

The core application logic is in **materially better shape than a typical hackathon MVP**: sessions are HMAC-signed, billing is fail-closed, spend policies are enforced, ownership checks exist on all read APIs, and the settlement engine aggregates in exact integer units with per-group balance pre-checks. Verified defenses are listed in §3.

However, the engagement surfaced **2 Critical, 1 High, 2 Medium, 5 Low, 4 Info** findings. The two that deserve same-week attention:

1. **C-01 — Unauthenticated RCE in the Next.js runtime itself** (GHSA-p293-qw3h-jr36, windows-hosted servers + AVIF image-optimization RCE). Both apps run vulnerable versions. Fix = version bump.
2. **C-02 — Custodial operator key can move 100% of user deposits** by design (no multisig/pause/timelock). Acceptable for testnet demo; a documented trust assumption is mandatory before any real funds.

| ID | Severity | Finding | Component |
|---|---|---|---|
| C-01 | 🔴 Critical | Next.js unauthenticated RCE (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4) | next 16.2.12 / 16.3.0 |
| C-02 | 🔴 Critical | Custodial operator can drain all user deposits (no multisig/pause) | PactumBilling.sol |
| H-01 | 🟠 High | Double-settlement race — concurrent triggers pay merchants twice | lib/settlement/execute.ts |
| M-01 | 🟡 Medium | Unauthenticated pending-usage disclosure | GET /api/v1/wallet/balance |
| M-02 | 🟡 Medium | Vulnerable dependency set (js-yaml, nanoid, tmp, postcss, sharp) | both apps |
| L-01 | 🟢 Low | Live API key committed in git history (dead on new DB, likely alive on old Supabase project) | commit ebcf70d |
| L-02 | 🟢 Low | Policy limits accept negative/zero values → self-DoS 429 | PUT /api/v1/policies |
| L-03 | 🟢 Low | No email format validation on register; weak password floor | /api/auth/register |
| L-04 | 🟢 Low | Demo app: random per-process JWT_SECRET fallback; in-memory nonce store | test_integration |
| L-05 | 🟢 Low | Contract: zero-address/zero-amount settlement → permanent fund lock | PactumBilling.sol |
| I-01..04 | 🔵 Info | Non-constant-time cron secret compare; unbounded in-memory rate-limit map; unbounded pending-event fetch; skipped-settlement UX | misc |

---

## 1. Scope & Attack Surface

**Trust boundaries / actors:**
- **Merchant** (dashboard): bcrypt + HMAC-signed `pactum_session` cookie → session-cookie-authenticated REST APIs.
- **End user** (depositor): MetaMask → USDC deposit into PactumBilling; consumption via third-party apps (demo: SIWE → JWT).
- **Third-party app** (SDK): `X-API-Key` (SHA-256 hashed at rest) → `/api/v1/usage/track`.
- **Operator** (platform): `SERVICE_WALLET_PRIVATE_KEY` → `batchSettleUsage`; `CRON_SECRET` → settlement cron.
- **Public:** landing, docs, wallet page, `/api/v1/wallet/balance` (no auth).

**Auth matrix (verified line-by-line):** every `/api/v1/*` dashboard route requires a valid session; cron requires `Bearer CRON_SECRET`; `usage/track` requires a valid, active API key; only `auth/*`, `wallet/balance`, and public pages are unauthenticated. No dangerous sinks (`dangerouslySetInnerHTML`, `eval`, `child_process`) anywhere in first-party code. All DB access is parameterized PostgREST (no raw SQL surface).

---

## 2. Findings

### C-01 — Next.js Unauthenticated RCE (dependency, both apps)

**Summary** Both apps run Next.js versions inside the advisory range for two unauthenticated RCE advisories: **GHSA-p293-qw3h-jr36** (RCE on Windows-hosted servers) and **GHSA-2xp9-vwfh-vxw4** (RCE in Image Optimization API when AVIF files are used). Main app: `next 16.2.12`. Demo: `next 16.3.0`. Both `< 16.3.3`.

**Severity** 🔴 Critical — CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H (9.8). Unauthenticated remote code execution on the host running `next` — this is the platform that also holds `SERVICE_WALLET_PRIVATE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in env.

**Environment reality check (honest scoring):** the Windows-hosted RCE path applies directly to the **dev machines** (Windows, `next dev` running) and any Windows deployment. Production runs on Vercel (Linux) where the windows-specific path does not apply, but the AVIF image-optimization RCE and the inherited `sharp`/libvips + `postcss` advisories are not host-specific.

**Steps to Reproduce**
1. `npm audit --omit=dev` in repo root and in `test_integration/` → both list `[CRITICAL] next … GHSA-p293-qw3h-jr36`.
2. `npm ls next` → 16.2.12 (root), 16.3.0 (demo); advisory range `>=16.0.0 <16.3.3`.

**Impact** RCE on the app host = full compromise: private keys in `.env.local` (operator wallet, Supabase service role = full DB read/write), source code, and the ability to modify the served app. Chain to C-02: RCE → steal `SERVICE_WALLET_PRIVATE_KEY` → drain all user deposits on-chain.

**Remediation** Upgrade `next` to **≥ 16.3.5** in both apps (fix already available), then `npm audit fix` for the remaining advisory set (see M-02). Re-run `npm run build` + smoke test after upgrade (Next 16 minor upgrades have had breaking config changes — verify `turbopack.root` keys still valid).

---

### C-02 — Custodial operator can drain all user deposits (design)

**Summary** `PactumBilling.batchSettleUsage(users[], merchants[], amounts[])` is `onlyOperator` with no upper bound, no per-user allowance, no pause, no timelock, no multisig. Whoever holds `SERVICE_WALLET_PRIVATE_KEY` can move **any amount from any user balance to any address**, including self, in one transaction.

**Severity** 🔴 Critical (trust assumption / centralization; Immunefi-style "loss of funds, no constraints" if the key is compromised or the operator turns malicious). Not a code bug — the code is clean (CEI, balance checks, events) — it is a design decision that must be surfaced.

**Reproduction (narrative, not executed — would move testnet funds)**
1. `pk = SERVICE_WALLET_PRIVATE_KEY`; build `batchSettleUsage([user],[attacker],[entire userBalances[user]])` from any EOA holding the key.
2. Tx succeeds: user balance → attacker. No second signature, no delay, no off-switch. `setOperator` even allows permanent hand-off of this power.

**Impact** Single point of total fund loss; also makes the platform a regulated-custody-like target. Chained with C-01 (env-key theft), full drain without any on-chain trace of wrongdoing.

**Remediation (choose per roadmap stage)**
- Demo/testnet: document explicitly in README/PRD ("operator is fully trusted custodian").
- Production: (a) per-user signed usage tickets so settlements require the *user's* signature (true state channel), or (b) operator cap per epoch, (c) multisig + timelock on settlement + `setOperator`, (d) pausable settlement + on-chain per-user withdrawal escape hatch (`withdrawUser` already exists — good).

---

### H-01 — Double-settlement race: concurrent triggers pay a merchant twice from the same usage events

**Summary** `executeSettlement()` (lib/settlement/execute.ts) is a multi-step non-atomic pipeline: fetch `pending_settlement` events → aggregate → pre-check balances → submit `batchSettleUsage` → mark events `settled`. Nothing *claims* the events. Two concurrent executions (cron + dashboard "Settle Now", or two cron instances) read the **same** event set; both pre-checks pass; both transactions land; the merchant is credited **2×** and the user's deposit is debited 2× — while the DB update is idempotent, so no error ever surfaces.

**Severity** 🟠 High — CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:N/I:H/A:N (6.5). Constraint: requires concurrent trigger; effect is direct integrity loss of user funds (Immunefi rubric: "loss of funds with constraints" = High).

**Steps to Reproduce**
1. Seed: one user with ≥ 2× owed balance on-chain; ≥ 1 pending event; merchant wallet set.
2. Fire `POST /api/v1/settlement/cron` (Bearer CRON_SECRET) and `POST /api/v1/settlement/manual` (session) **in the same instant** (e.g. `curl ... & curl ... &`).
3. Both pipelines fetch identical pending events before either DB update lands.
4. Observe: two `UsageSettled` events on-chain for the same underlying usage; merchant balance credited twice.

**Impact** Silent overpayment funded by user deposits; accounting divergence between DB and chain discovered only on audit. Repeatable by any logged-in merchant (their own project's events) or by the cron schedule racing a manual click.

**Remediation** (pick one)
- **Atomic claim before build:** `UPDATE usage_events_pactum SET status='settling' WHERE id IN (...) AND status='pending_settlement' RETURNING id` — only proceed with claimed ids; revert to `pending` on tx failure. Status column is text; add `settling` to the lifecycle.
- Or Postgres advisory lock keyed on `(user,merchant)` group, or `SELECT … FOR UPDATE` via RPC.
- Belt: on-chain idempotency is impossible in current contract, so DB claim is the only gate — make it the first step, before any chain read.

---

### M-01 — Unauthenticated pending-usage disclosure

**Summary** `GET /api/v1/wallet/balance?address=<any>` requires no auth and returns the address's aggregate off-chain pending usage. Verified live:

```
GET /api/v1/wallet/balance?address=0x3813...727a
HTTP 200 {"pendingUsage":0}
```

**Severity** 🟡 Medium — CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N (5.3).

**Impact** Anyone can profile arbitrary wallet addresses: how much they're currently spending across Pactum-integrated apps, which addresses are active high-value consumers (useful for phishing targeting, business intelligence of partner apps' customer bases).

**Remediation** Require the caller to prove control of the address (session/JWT), or return only a boolean `hasAvailableFunds` for the pre-flight use-case instead of the numeric amount.

### M-02 — Vulnerable dependency set (both apps)

`npm audit --omit=dev` beyond C-01:
- `js-yaml` ≥4.0.0 <4.3.2 (GHSA-2883-xcg3-v3hh, CPU DoS) — main
- `nanoid` <3.3.18 (GHSA-2v37-7h3g-55p8, infinite loop) — both
- `tmp` ≤0.2.3 (GHSA-52f5-9888-hmc6 symlink dir write; GHSA-ph9p-34f9-6g65 path traversal) — main
- `postcss` <8.5.10 (XSS via unescaped `</style>`; arbitrary file read via sourceMappingURL) — via next, main
- `sharp` <0.35.x (inherited libvips/libheif CVE-2026-33327/33328/35590/35591, GHSA-g89c-p67h-r497) — both, via next

**Remediation** Root: `npm install next@16.3.5` + `npm audit fix`; demo: `npm audit fix`. Re-run build + E2E smoke (chat flow) after upgrade.

---

### L-01 — Live-format API key in public git history

`git log -S "pactum_fb3facc2"` → committed in `ebcf70d` (test-api.js). Verified **dead on the new DB** (track probe → HTTP 401), but the old Supabase project backing the production deployment likely still honors it → anyone mining the public repo can bill usage into the old environment. **Remediation:** revoke that key on the old project; prefer env-loaded keys everywhere (already done in working tree); consider BFG/history rewrite before any public bounty program.

### L-02 — Policy limits unvalidated

`PUT /api/v1/policies` accepts `spend_limit_daily: 0` or negative → every `usage/track` call returns 429 immediately (limit ≥ spend+cost always true) — instant self-DoS of the project, persisted silently. **Remediation:** clamp to ≥ 0.000001 and validate on write.

### L-03 — Weak registration validation

Register accepts any non-empty string as email (no format check) and passwords ≥ 6 chars. Combined with no CAPTCHA, enables junk-account pollution of the shared-DB era. **Remediation:** format validation + password guidance; rate limit already in place (verified).

### L-04 — Demo auth hygiene

`JWT_SECRET` falls back to `crypto.randomBytes(32)` per process → every restart invalidates all SIWE sessions (availability annoyance, silent); SIWE nonce store is in-memory (lost on restart). **Remediation:** require JWT_SECRET; move nonce to DB/TTL cache if multiple instances ever run.

### L-05 — Contract input validation

`batchSettleUsage` accepts `amounts[i] == 0` (wasted gas) and merchant `address(0)` → `merchantBalances[address(0)]` credits are unreachable via `withdrawMerchant` (msg.sender-based) = **permanent fund lock** on operator mistake. **Remediation:** `require(a > 0)` and `require(m != address(0))`; consider returning per-item success to reduce all-or-nothing risk further.

### Informational

- **I-01** Cron auth uses `!==` string compare (non-constant-time). Use `crypto.timingSafeEqual` on digests.
- **I-02** In-memory fixed-window limiter: per-instance state (serverless-safe but resets), unbounded `Map` growth keyed by client IP (XFF is spoofable behind proxies) → add max-entries eviction.
- **I-03** `executeSettlement` fetches **all** pending events unbounded (memory pressure at scale) — add `.limit()` + loop.
- **I-04** Settled-but-skipped groups appear only in the API response; dashboard toast says success regardless — surface `skipped[]` in UI.

---

## 3. Verified Defenses (attack simulations that FAILED)

| # | Attack simulated | Result |
|---|---|---|
| V-01 | Forged session cookie (raw user UUID, no HMAC) → `/dashboard` | ✅ 307 → /login — forgery impossible without `SESSION_SECRET` |
| V-02 | Brute-force login (6 rapid attempts) | ✅ HTTP 429 on 6th attempt, fixed-window limiter active |
| V-03 | Unauthenticated access to receipt/invoice APIs | ✅ 401 |
| V-04 | Settlement cron without/with wrong `CRON_SECRET` | ✅ 401 both |
| V-05 | Leaked git-history API key against new DB | ✅ 401 (dead) |
| V-06 | Metering with missing `PACTUM_CONTRACT_ADDRESS` | ✅ 503 fail-closed (no silent free usage) |
| V-07 | Spend beyond policy limit | ✅ 429 `policy_limit_exceeded` |
| V-08 | Cross-user settlement trigger | ✅ scoped to caller's own projects |
| V-09 | SQL injection surface | ✅ none (parameterized PostgREST; no raw SQL) |
| V-10 | XSS sinks (`dangerouslySetInnerHTML`/`eval`) | ✅ none in first-party code; react-markdown defaults are raw-HTML-off |
| V-11 | Secret hygiene | ✅ `.env*` gitignored and never committed; no 64-hex private keys anywhere in `git rev-list --all` |

---

## 4. Priority Remediation Roadmap

1. **Today:** upgrade `next` ≥ 16.3.5 both apps + `npm audit fix` (kills C-01, M-02, most of the critical surface).
2. **This week:** revoke the leaked key on the old Supabase project (L-01); add settlement claim-lock (H-01); gate `wallet/balance` (M-01).
3. **Before any real funds:** operator trust decision for C-02 (multisig/timelock/user-signed tickets) + document custodial model; contract zero-address guards (L-05).
4. **Hygiene:** policy clamping (L-02), registration validation (L-03), demo JWT_SECRET required (L-04), informational items.

## 5. Appendix — Environment

- Tests executed 2026-09-19 against local `next dev` (main app, port 3000); all writes avoided where possible (key-validity probe used an unfunded address → 402 path before any DB write).
- Supabase probes performed read-only with the service key from local `.env` (table existence checks).
- No testnet transactions were submitted during this engagement (C-02/H-01 documented narratively to avoid moving funds); on-demand Foundry/anvil fork PoCs can be added on request.

---

## 6. Remediation Log — 2026-09-19 (same-day fixes applied)

| ID | Status | Fix applied |
|---|---|---|
| C-01 | ✅ **FIXED** | `next` upgraded to **16.3.5** in both apps; `npm audit fix` run — `npm audit` now reports **0 vulnerabilities** in both (solc 0.8.37, tmp, js-yaml, nanoid, postcss, sharp all resolved). Build verified on both apps. |
| C-02 | 📋 DOCUMENTED | Design trust assumption (custodial operator). Requires product decision (multisig/user-signed tickets) before real funds — see §2 C-02 remediation options. |
| H-01 | ✅ **FIXED** | Atomic claim-lock in `executeSettlement`: events flip `pending_settlement → settling` via conditional `UPDATE … WHERE status='pending_settlement'`; every failure path releases claims back to pending; on-chain-success-but-DB-failure deliberately leaves rows in `settling` (no double-pay); fetch bounded to 500 events/run. |
| M-01 | ✅ **FIXED** | `GET /wallet/balance` now requires `X-API-Key` (scoped to the key's own project), a fresh wallet-ownership signature (`personal_sign`, 10-min TTL), or a dashboard session — verified: anonymous → 401; signature → 200; API key → 200. Demo chat and wallet page updated to match. |
| M-02 | ✅ **FIXED** | Resolved with the C-01 upgrade + `npm audit fix` (0 remaining). |
| L-01 | ⚠️ PARTIAL | Old key dead on the new DB (verified 401). **Owner action required:** revoke it on the old Supabase project backing the production deployment; consider history rewrite before any public program. |
| L-02 | ✅ **FIXED** | `PUT /policies` rejects negative/NaN limits (400). |
| L-03 | ✅ **FIXED** | Register validates email format (400 on invalid). |
| L-04 | ✅ **MITIGATED** | Demo logs a loud warning when `JWT_SECRET` is unset (it is set in `.env`). |
| L-05 | ✅ **FIXED (source)** | `batchSettleUsage` rejects zero amounts and zero merchant address; constructor rejects zero USDC. Artifact recompiled — **redeploy required** for the guards to take effect on-chain (operator decision, new address). |
| I-01 | ✅ **FIXED** | Cron secret compared via `crypto.timingSafeEqual` on SHA-256 digests; missing `CRON_SECRET` → 503. |
| I-02 | ✅ **FIXED** | Rate-limit map bounded (10k buckets, 10% oldest-entry eviction). |
| I-03 | ✅ **FIXED** | Settlement fetch bounded (`.limit(500)` per run; remainder processed next run). |
| I-04 | ✅ **FIXED** | Settle toast surfaces skipped-event count. |

**Post-fix verification (all live-tested):** anonymous balance read → 401; signature/API-key paths → 200; forged cookie → 307; wrong cron secret → 401; invalid email → 400; full demo chat E2E on Next 16.3.5 → 200 (`billedAmount: 0.007395`); `npm run build` clean on both apps.
