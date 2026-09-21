# Pactum — Ringkasan Overhaul Besar

**Periode:** September 2026 · **Status akhir:** produksi-testnet siap demo, seluruh verifikasi hijau

Overhaul ini mencakup lima gelombang kerja besar yang saling menyusul: hardening keamanan, unifikasi settlement + kontrak v2, perbaikan kedua aplikasi demo, UI redesign total, dan clean-code refactor dengan test suite.

---

## 1. Ringkasan Eksekutif

Pactum dimulai sebagai prototipe hackathon yang berfungsi tetapi punya celah serius: session bisa dipalsukan, dua jalur settlement yang tidak rekonsiliasi (risiko dibayar dua kali), policy limit tidak pernah di-enforce, IDOR di halaman invoice, dan dependensi dengan RCE kritis. Di akhir overhaul:

- **Kontrak PactumBilling v2.0.0 ter-deploy live** di Arc Testnet dan kedua aplikasi tersinkron.
- **Seluruh temuan kritis/high** dari security review ditambal dan diverifikasi dengan PoC hidup.
- **UI berpindah total** ke sistem editorial monokrom terang (DESIGN-runwayml.md).
- **Test suite otomatis + CI** dibangun dari nol (sebelumnya nol test).
- **Dokumentasi ditulis ulang** integration-first.

**Angka penting:** 86+ file berubah · 35/35 unit test · 0 npm vulnerabilities · 0 lint error · kontrak v2 live di `0x4bab39e99d9bca6897d8b844f84fbe6b06d28509`.

---

## 2. Keamanan (Sebelum → Sesudah)

| Area | Sebelum | Sesudah |
|---|---|---|
| Session | Cookie berisi UUID mentah — siapa pun bisa impersonate | HMAC-SHA256 token (`userId.expiry.signature`) + `SESSION_SECRET`; forged cookie terbukti ditolak (307) |
| Next.js | 16.2.12 / 16.3.0 — **RCE kritis GHSA-p293** | 16.3.5 di kedua app, `npm audit` = **0 vulnerabilities** |
| Settlement | Dua jalur tak rekonsiliasi (kontrak vs service-wallet) → bisa dibayar dua kali | **Satu jalur**: jalur service-wallet dihapus; engine dengan claim-lock atomik (`pending → settling`), pre-check saldo per grup, chunking 50 grup/500 event |
| Policy limit | Hanya display, tak pernah memblok | **429 `policy_limit_exceeded`** di metering — terbukti live |
| Balance check | Fail-open (config hilang = diam-diam gratis) | **Fail-closed** (503) |
| `/wallet/balance` | Terbuka anonim, bocorkan pending usage siapa pun | 3 jalur auth: API key (scoped project), **signature kepemilikan wallet**, session |
| IDOR | Halaman invoice bocor lintas user | Inner-join ownership; receipts terbukti 401/404 |
| Rate limit | Tidak ada | 5/menit di login+register (terbukti 429 di percobaan ke-6), map terbatas 10k |
| Cron auth | String compare biasa | `timingSafeEqual` + 503 bila secret belum diset |
| Lainnya | API key asli di git history (revoke di DB lama = tindakan owner), API key hardcoded di test script, `@ts-ignore` liar | Dibersihkan; validasi ketat di metering (400 untuk token negatif/fraksional, metadata >8KB, dst.) |

Laporan lengkap: `SECURITY_REPORT.md` (termasuk remediation log).

---

## 3. Smart Contract v2

**`PactumBilling v2.0.0`** — live di Arc Testnet:
`0x4bab39e99d9bca6897d8b844f84fbe6b06d28509` (tx deploy `0x94869bc…`)

Upgrade dari v1:

- **13 custom errors** (typed, hemat gas) menggantikan `require` string
- **Reentrancy guard** di semua entry point + CEI konsisten
- **`setPaused(bool)`** — deposits & settlements bisa dibekukan; **withdrawal selalu terbuka** (escape hatch user)
- **Two-step operator hand-off** (`proposeOperator` → `acceptOperator`) — tak ada lagi single-tx lockout
- **Platform fee on-chain** — `feeBps` default 0, hard-cap 20%, akumulasi ke `accruedFees` → `withdrawFees()`
- **`depositFor(user, amount)`** — aplikasi bisa mendanai saldo user-nya langsung
- **`sweepSurplus()`** — hanya bisa menyapu nilai nyasar di atas invarian `totalOwed`; dana user secara matematis tak terjangkau
- Guard zero-address/zero-amount di semua fungsi uang

**Studi Arc MCP** menjadi dasar desain: hanya interface ERC-20 USDC 6-decimals, tidak pernah menyapu native balance (native = ERC-20 di Arc), semua transfer dicek return value-nya (blocklist Circle), tanpa `PREVRANDAO`.

**Bukti E2E on-chain:** deposit 10 → `withdrawUser` 2 → saldo tepat 8 · chat demo ter-bill 0.00254 USDC · settlement cron menghasilkan tx `0x5927de…` dengan event `settled` + `settled_tx_hash`.

**Wind-down v1:** kontrak lama `0x84b739…` masih berdiri — sisa saldo user/merchant bisa ditarik kapan saja via `withdrawUser`/`withdrawMerchant`.

---

## 4. Fitur & Perbaikan Aplikasi

### Fitur baru
- **User withdrawal** di `/wallet`: tarik saldo tak terpakai langsung ke wallet (tanpa approve), tombol **Max available**, peringatan atas pending usage
- **Auto network switch**: wallet otomatis diminta pindah ke Arc Testnet saat halaman dibuka / deposit / withdraw — termasuk **auto add-network** bila Arc belum ada di wallet (EIP-3085), plus listener `chainChanged`/`accountsChanged`
- **`/api/health`**: probe DB + chain (baca `VERSION()` kontrak), 503 saat degraded
- **Pre-flight + policy** terdokumentasi untuk integrator

### Perbaikan bug berlapis (Aura demo & infra)
- `next.config` demo: `turbopack.root` salah posisi (diabaikan Next 16.3) → app demo ikut compile `proxy.ts` induk → error `adapterFn`
- Cache dev Turbopack korup akibat hard-kill proses → `adapterFn is not a function` + 404 palsu (fixed: cache dibersihkan)
- Chat demo 500 tiga lapis: `PACTUM_API_URL` tanpa `/api/v1`, mismatch env `SUPABASE_URL`, dan relay LLM membuang channel `DeepSeek-V4-Pro` → kini `LLM_MODEL` env dengan default `auto`
- `scripts/deploy.js` berisi sintaks TypeScript di file `.js` (tak pernah bisa jalan) + `dotenv` bukan dependency → `scripts/lib/env.js`
- Rename tabel demo `conversations_aura/messages_aura` → `_pactum` + seluruh enum ke `*_pactum` (aman untuk DB Supabase bersama)

### Database
- **Migrasi 006** `settled_tx_hash` (receipt per event) · **Migrasi 007** index jalur panas + **unique `key_hash`**
- Seluruh tabel & enum berakhiran `_pactum` — aman hidup berdampingan dengan project lain di satu akun Supabase

---

## 5. UI Redesign (DESIGN-runwayml.md)

Pivot total dari tema gelap "notarial ledger" ke **editorial monokrom terang**:

- Kanvas putih + tinta `#030303`, lima tingkat netral, hairline divider, **tanpa accent, tanpa shadow, tanpa gradient**
- Satu keluarga huruf (Inter, tracking rapat di display), eyebrow uppercase, micro-caps
- Black pill untuk semua CTA, input *bottom-rule*, status chip berbasis border/copy (bukan warna)
- Landing: hero di `scrim` gelap dengan kartu receipt putih menabrak → band putih → strip CTA gelap → footer hitam
- Semua halaman (landing, auth, dashboard, wallet, docs, 404, loading/error) + seluruh komponen ikut sistem; verifikasi visual langsung via browser

---

## 6. Infrastruktur, Testing & DX

- **Vitest**: 35 unit test — exact money math (anti float-drift), session HMAC, rate limit, API key, UTC windows
- **GitHub Actions CI**: lint → test → compile kontrak → build (dengan placeholder env aman)
- **`lib/obs.ts`**: structured JSON logging + request-id; seluruh logging server terstruktur
- **`lib/money.ts`**: validasi ketat + cost math exact-integer (basis 12-dec → floor 6-dec) di jalur uang
- **Cleanup**: 6 dependency mati dihapus (`@circle-fin/*`, `hardhat`, OZ, `@supabase/ssr`), package dinamai `pactum`, dead exports dibersihkan
- **Typed Supabase**: `types/database.ts` untuk 10 tabel — seluruh query ter-typed; langsung membuahkan perbaikan bug null-safety nyata (`settled_at`)

---

## 7. Dokumentasi (integration-first)

`docs/` kini ditulis untuk **integrator**, bukan menjelaskan internal:

- `integration-guide.md` — panduan lengkap: metering, idempotency, tabel error 400–503 + langkah per error, pre-flight balance, policy, settlement, deposit/withdraw, contoh Express end-to-end
- `api-reference.md` — 4 metode auth (session, API key, bearer, wallet signature)
- `smart-contract.md` — v2: fungsi, fee model, snippet deposit/withdraw/depositFor, catatan Arc
- `README.md` — quick start + struktur + perintah dev/test
- Dokumen internal (architecture, settlement, setup, deployment, database, self-hosting) dihapus sesuai arah; sidebar `/docs` sinkron

---

## 8. Status Operasional Saat Ini

| Item | Nilai |
|---|---|
| Kontrak v2 | `0x4bab39e99d9bca6897d8b844f84fbe6b06d28509` (Arc Testnet, live, `paused=false`, fee 0) |
| Kontrak v1 | `0x84b739…` (wind-down: withdraw saja) |
| Env server | `.env.local` — alamat v2, `SESSION_SECRET`, `CRON_SECRET`, kunci operator |
| Env demo | `test_integration/.env` — alamat v2 + API key valid di DB baru |
| Supabase | Migrasi 001–004, 006, 007 sudah dijalankan di akun DB baru |
| Test | 35/35 vitest · build ✓ · tsc ✓ · lint 0 error |
| Stash | `WIP: Seismic multi-chain + poster` masih tersimpan (tidak di-pop/drop) |

---

## 9. Yang Tersisa (Roadmap)

1. **Revoke API key lama** (`pactum_fb3facc…`) di project Supabase *lama* yang menyangga deployment Vercel produksi
2. **Custodial operator** — tetap keputusan produk: non-custodial penuh butuh tiket bertanda tangan per user (roadmap), sementara mitigasi v2 sudah ada (pause, escape hatch, fee cap, two-step hand-off)
3. Fee platform: aktifkan via `setFee` bila model bisnis membutuhkan (default 0)
4. Test integrasi E2E otomatis (saat ini unit + smoke manual)
5. Multisig/timelock untuk operator bila naik ke dana nyata

---

## 10. Perintah Penting

```bash
npm run dev        # jalankan app (port 3000)
npm test           # vitest (35 test)
npm run build      # build produksi
npm run compile    # compile kontrak → artifacts-contract/
node scripts/deploy.js   # deploy kontrak baru
npm run lint       # eslint
curl localhost:3000/api/health   # health probe
```
