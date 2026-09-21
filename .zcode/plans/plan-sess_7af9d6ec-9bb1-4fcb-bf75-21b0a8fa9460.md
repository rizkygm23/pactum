# Rencana: Menjadikan Pactum Lebih Proper

**Asumsi** (karena pertanyaan tidak terjawab, saya pakai rekomendasi): perbaikan menyeluruh 4 fase; jalur settlement **kontrak/event-based** (deposit user → batchSettleUsage → withdraw merchant) sebagai satu-satunya jalur; target **testnet/demo polish** (tanpa multisig/audit formal).

**Catatan Next.js 16**: sesuai AGENTS.md, sebelum menyentuh auth/session/middleware, baca dulu panduan relevan di `node_modules/next/dist/docs/` (cookies async, proxy middleware) untuk menghindari API yang sudah berubah.

---

## Fase 0 — Verifikasi & sinkronisasi config Arc
1. Cek kehidupan RPC: bandingkan `https://rpc.testnet.arc.network` (dipakai kode) vs `https://rpc.testnet.arc.io` (docs resmi) — curl `eth_chainId` ke keduanya. Sama halnya explorer: `testnet.arcscan.app` vs `explorer.testnet.arc.io`.
2. Perbarui sumber kebenaran di `lib/arc/config.ts` (rpc, explorer, faucet) lalu **hapus hardcoded duplikat**: `scripts/deploy.js`, `scripts/deposit.js`, `scripts/check-bal.js`, `app/wallet/page.tsx`, hardcode explorer di `app/dashboard/payouts/[id]/page.tsx:146` — semua import dari `lib/arc/config.ts`.
3. Rapikan `.env.example`: hapus blok SEISMIC (tidak ada kodenya), hapus `NEXT_PUBLIC_ARC_TESTNET_RPC_URL` yang tak terpakai, tambah `SESSION_SECRET` (baru, untuk Fase 1), perbaiki URL RPC/explorer.

## Fase 1 — Keamanan & auth
1. **Session HMAC-signed** (`lib/auth.ts` + `proxy.ts`): cookie berisi `userId.exp.signature` (HMAC-SHA256 via Web Crypto agar jalan di Node dan Edge/proxy). `getSessionCookie()` diverifikasi signature + expiry, return userId atau undefined. Tambah env `SESSION_SECRET`. Cookie lama otomatis invalid (user login ulang) — dijelaskan di summary. Tidak ada perubahan di tiap route (nama fungsi dipertahankan).
2. **Fail-closed balance check** (`app/api/v1/usage/track/route.ts`): jika `PACTUM_CONTRACT_ADDRESS` tidak diset → error 503 "billing misconfigured" (bukan skip diam-diam). Validasi format `user_address` (`^0x[0-9a-fA-F]{40}$`).
3. **Fix IDOR** `app/dashboard/payouts/[id]/page.tsx`: join invoice → project → cek `user_id`, jika bukan milik user → `notFound()`.
4. **Scope `settlement/manual`** (`app/api/v1/settlement/manual/route.ts`): core cron diekstrak ke `lib/settlement/execute.ts(scope?)`; route manual me-resolve project milik user (ownership) dan settle hanya event project itu; route cron (Bearer CRON_SECRET) tetap global.
5. **Rate limiting login/register**: `lib/rate-limit.ts` sederhana (fixed-window in-memory, 5 percobaan/menit per IP) — cukup untuk demo.
6. **Hapus API key hardcoded** di `test-api.js` → baca dari env.

## Fase 2 — Unifikasi settlement (satu jalur: kontrak)
1. **Hapus jalur service-wallet**: route `app/api/v1/settle/route.ts` dan fungsi `settleInvoice`/`batchSettle` di `lib/arc/settlement.ts` (UI dashboard tidak memakainya — `SettleButton` sudah pakai jalur kontrak). Invoice tetap ada sebagai pelaporan (generate/finalize), bukan pembayaran.
2. **Hardening cron settlement** (`lib/settlement/execute.ts`):
   - **Integer math**: agregasi pakai `parseUnits(String(ev.cost), 6)` + penjumlahan bigint (bukan `Number()` + `toFixed`); sama juga untuk hitung `pendingUsage` di `usage/track`.
   - **Normalisasi alamat**: grouping lowercase, argumen kontrak pakai `getAddress()` (checksum) — menghilangkan mismatch `ilike` vs exact-match.
   - **Batch tolerance**: pre-read `userBalances` per grup; grup yang saldonya kurang **di-skip** (dilaporkan, tidak ditandai settled) alih-alih me-revert seluruh batch.
   - **Chunking**: maks ±50 grup per transaksi.
3. **Receipt on-chain per event**: migrasi `supabase/migrations/006_settled_tx_hash.sql` — tambah kolom `settled_tx_hash text` di `usage_events_pactum`; cron mengisi `status='settled', settled_tx_hash=hash`. Payouts page menampilkan link explorer per event settled (memperkuat janji "notarial ledger").

## Fase 3 — Policy enforcement (janji P0 PRD)
1. `lib/policy.ts`: ambil policy aktif project + hitung spend hari ini/bulan ini (agregasi cost event, UTC window — helper di-share dengan `usage/summary`).
2. `usage/track`: setelah balance check, jika policy aktif dan (spend + cost) > limit harian/bulanan → **429** `policy_limit_exceeded` + detail remaining. 
3. Update `test-api.js` (expect 429 kini nyata) dan `docs/api-reference.md` (dokumentasikan 429).

## Fase 4 — Cleanup, hygiene, docs
1. **Dead code**: hapus `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `lib/supabase/client.ts` + import tak terpakainya di login/signup, `components/ui/GenerateInvoiceButton.tsx` (tak ter-mount). Fix ternary mati `lib/invoices.ts:78`.
2. **Math bug halaman usage**: hitung spend harian/bulanan via query agregat server (bukan jumlah 100 event terakhir).
3. **test_integration**: hardcode RPC/contract di `test_integration/app/api/chat/route.ts` → env dengan fallback.
4. **Docs**: perbaiki link `database.md` hilang (buat ringkasan schema), update `settlement.md` (satu jalur kontrak), `architecture.md` (session HMAC), `api-reference.md` (tambah `settlement/manual` & `usage/summary`, tandai `/api/v1/settle` dihapus), `setup.md` (env `SESSION_SECRET`).

## Verifikasi akhir
- `npm run build` + `npm run lint` bersih.
- Smoke test end-to-end di dev: register → login → buat API key → `usage/track` (termasuk kasus 402 & 429) → manual settle (event ke-settle, tx hash tercatat) → withdrawMerchant via wallet page.

## Di luar scope (sengaja)
Multisig/pause di kontrak, webhook, test suite otomatis penuh, audit keamanan formal, perubahan model custodial operator.