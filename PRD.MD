# PRD — Pactum
### Billing SDK + Policy Wallet + Receipts untuk AI SaaS/Devtools di Arc

**Versi:** 0.1 (MVP)
**Tech Stack:** Next.js (App Router) · Supabase (Auth, Postgres, RLS, Realtime) · Tailwind CSS
**Status:** Draft

---

## 1. Ringkasan Eksekutif

Pactum adalah infrastruktur billing untuk software yang dibayar per-usage (per call, per token, per task) dan ingin settle pakai stablecoin (USDC) di jaringan Arc. Pactum menyediakan tiga hal dalam satu SDK/dashboard:

1. **Metering** — track usage per API key secara real-time.
2. **Policy Wallet** — spend limit, allowlist, approval rule per customer/agent.
3. **Settlement + Receipts** — kalkulasi tagihan otomatis, settlement on-chain (USDC di Arc), dan bukti transaksi (receipt) yang bisa diaudit.

Positioning singkat: **"Stripe for agents" versi stablecoin-native**, dimulai dari billing infra dulu, baru nanti berkembang ke escrow, treasury, dan FX (sesuai roadmap Arc yang didorong Circle).

---

## 2. Problem Statement

AI SaaS dan devtools sekarang charge pelanggan (yang seringkali berupa *agent*, bukan manusia) berdasarkan usage — per call, per token, per tool-invocation. Masalahnya:

- Billing card-based lambat, ada fee, dan gagal untuk microtransaction (charge $0,001 gak masuk akal lewat Stripe biasa).
- Gak ada cara native buat kasih *spend limit* ke agent — kalau agent auto-spend, siapa yang jagain budget-nya?
- Rekonsiliasi manual antara usage log dan pembayaran itu ribet dan rawan error.
- Reconciliation & audit trail buat compliance (siapa bayar apa, kapan, berapa) sering nggak ada bukti on-chain yang solid.

Arc (USDC-native gas, finality sub-detik, built-in FX) cocok buat jadi settlement layer-nya, tapi belum ada tooling yang gampang dipakai developer buat connect usage metering ke settlement.

---

## 3. Tujuan (Goals) & Non-Goals

### Goals — MVP
- Developer bisa integrasi Pactum ke API mereka dalam < 15 menit (SDK simple, docs jelas).
- Setiap usage event tercatat akurat dan real-time di dashboard.
- Ada mekanisme spend limit/policy sederhana yang bisa mencegah overspend.
- Settlement ke Arc testnet berjalan otomatis (batch harian atau on-demand) dan menghasilkan receipt yang bisa diverifikasi.
- Dashboard cukup buat demo end-to-end: dari API key → usage → invoice → settlement → receipt.

### Non-Goals — MVP
- Bukan wallet konsumer / retail crypto app.
- Bukan multi-chain (fokus Arc dulu).
- Bukan non-custodial smart contract wallet yang kompleks (session keys dsb) — versi MVP pakai model custodial sederhana dulu.
- Bukan marketplace/escrow (itu masuk roadmap V2).
- Belum handle regulasi/compliance penuh (KYC, dsb) — cukup audit trail dasar.

---

## 4. Target Pengguna (ICP)

| Segmen | Buyer | Pain Utama |
|---|---|---|
| AI SaaS / devtools (coding copilot, model gateway) | Founder / Platform Eng | Usage-based billing ribet, gagal charge micro amount |
| API/data providers | Infra/platform team | Butuh microcharge & settlement cepat |
| Agent platform / browser automation | Product/Infra lead | Butuh spend cap & approval buat agent yang belanja sendiri |

**Primary persona MVP:** developer/founder AI SaaS kecil-menengah yang sudah punya usage-based pricing tapi billingnya masih manual atau pakai Stripe metered billing yang kaku untuk micro-usage.

---

## 5. Solusi & Value Proposition

> "Drop-in SDK buat track usage, kasih spend policy ke tiap customer/agent, dan auto-settle ke USDC di Arc — lengkap dengan receipt yang bisa diaudit."

Value prop dibanding cara manual/Stripe biasa:
- **Micro-friendly**: charge sekecil apapun tetap masuk akal (gas rendah, fee ~US$0,005 di Arc testnet).
- **Programmable guardrail**: spend limit per API key/agent, bukan cuma invoice di akhir bulan.
- **Auditable by default**: setiap settlement punya tx hash on-chain sebagai receipt, bukan cuma catatan database.

---

## 6. Fitur MVP (Prioritized)

### P0 — Wajib ada buat MVP jalan end-to-end
| Fitur | Deskripsi |
|---|---|
| Auth & onboarding | Signup/login via Supabase Auth (email atau OAuth), buat project |
| API key management | Generate/revoke API key per project, key di-hash di DB |
| Usage tracking endpoint | SDK/REST endpoint buat kirim usage event (`POST /usage/track`) |
| Policy wallet dasar | Set spend limit harian/bulanan per API key, block kalau limit kelampaui |
| Dashboard usage | Lihat usage real-time per API key (Supabase Realtime) |
| Invoice generation | Kalkulasi tagihan otomatis dari usage events (periode harian/manual trigger) |
| Settlement ke Arc testnet | Trigger transfer USDC on-chain dari service wallet ke merchant wallet |
| Receipt | Simpan tx hash + detail invoice sebagai bukti settlement, bisa dilihat di dashboard |

### P1 — Nice-to-have, tambah kalau waktu cukup
| Fitur | Deskripsi |
|---|---|
| Webhook | Notifikasi `usage.recorded`, `payment.settled`, `policy.limit_exceeded` |
| Allowlist | Batasi endpoint/tool mana saja yang boleh di-charge |
| Multi-project | 1 akun bisa punya banyak project/API key |

### P2 — Roadmap lanjutan (bukan MVP)
- Session-key / non-custodial smart wallet
- Escrow & milestone settlement
- Multi-currency FX
- Multi-chain support

---

## 7. User Flow (MVP)

```
1. Developer signup → buat project → generate API key
2. Developer set policy: spend_limit_daily = 50 USDC, spend_limit_monthly = 1000 USDC
3. Developer integrasi SDK: setiap request ke API mereka → call Pactum.track(usage)
4. Pactum cek policy real-time:
   - kalau masih di bawah limit → catat usage, lanjut
   - kalau lewat limit → reject / trigger event policy.limit_exceeded
5. Di akhir periode (atau manual trigger) → sistem generate invoice dari akumulasi usage
6. Settlement worker eksekusi transfer USDC di Arc testnet dari service wallet → merchant wallet
7. Receipt (tx hash + breakdown) tersimpan & muncul di dashboard, bisa di-export
```

---

## 8. Arsitektur Teknis

```
┌─────────────────┐      ┌──────────────────────┐      ┌───────────────────┐
│   Next.js App    │      │   Supabase            │      │   Arc Testnet       │
│  (Dashboard + API │◄────►│  - Auth               │      │  - USDC settlement  │
│   Routes/SDK)     │      │  - Postgres + RLS      │      │  - via viem/ethers  │
│                   │      │  - Realtime (dashboard)│      │    dari service      │
└─────────┬─────────┘      └──────────────────────┘      │    wallet            │
          │                                               └─────────▲──────────┘
          │  usage events, policy check                             │
          ▼                                                          │
  ┌────────────────┐          settlement job (cron/manual)          │
  │  API Route:      │────────────────────────────────────────────────┘
  │  /api/v1/usage    │
  │  /api/v1/policies │
  │  /api/v1/settle   │
  └────────────────┘
```

**Catatan desain:**
- Usage tracking tetap **off-chain** (Supabase Postgres) supaya cepat & murah — cocok buat volume tinggi.
- Settlement **on-chain** dilakukan secara **batch** (bukan per-request) supaya gas efisien — sesuai pola `arc-nanopayments`/`workflow-escrow` di Arc Docs.
- MVP pakai **custodial service wallet** (dikontrol backend) buat eksekusi settlement — disederhanakan dulu, non-custodial/session-key masuk versi V1.
- Next.js API Routes berfungsi sebagai backend sekaligus "SDK endpoint" yang dipanggil oleh aplikasi developer.

---

## 9. Skema Data (Supabase)

| Tabel | Kolom Utama |
|---|---|
| `users_pactum` | id, email, company_name, created_at |
| `projects_pactum` | id, user_id, name, merchant_wallet_address, created_at |
| `api_keys_pactum` | id, project_id, key_hash, name, status, created_at |
| `policies_pactum` | id, project_id, spend_limit_daily, spend_limit_monthly, allowlist (jsonb), status |
| `usage_events_pactum` | id, api_key_id, endpoint, quantity, unit_price, cost, metadata (jsonb), created_at |
| `invoices_pactum` | id, project_id, period_start, period_end, total_amount, status |
| `transactions_pactum` | id, invoice_id, tx_hash, chain, amount, currency, status, settled_at |
| `webhooks_pactum` | id, project_id, url, secret, events (jsonb), status |

Semua tabel pakai **Row Level Security (RLS)** di Supabase — user cuma bisa akses data project miliknya sendiri.

---

## 10. API Design (contoh)

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/v1/usage/track` | POST | Catat 1 usage event (auth via API key header) |
| `/api/v1/usage/summary` | GET | Ringkasan usage & sisa limit saat ini |
| `/api/v1/policies` | GET/PUT | Lihat/update spend limit & allowlist |
| `/api/v1/invoices` | GET | List invoice per project |
| `/api/v1/settle` | POST | Trigger settlement (bisa manual atau via cron job) |
| `/api/v1/receipts/:id` | GET | Detail receipt (tx hash, breakdown biaya) |

Idempotency key wajib di `usage/track` supaya request yang di-retry gak double-charge.

---

## 11. Non-Functional Requirements

- **Security**: API key disimpan sebagai hash (bukan plaintext), webhook signing pakai HMAC, RLS aktif di semua tabel sensitif.
- **Latency**: endpoint `usage/track` target < 200ms (usage check policy harus cepat karena dipanggil sering).
- **Auditability**: setiap transaksi settlement harus punya tx hash yang bisa diverifikasi di Arc explorer.
- **Idempotency**: usage event dan settlement job harus aman di-retry tanpa duplikasi.

---

## 12. Success Metrics (MVP demo/portfolio level)

- Jumlah API key aktif yang berhasil integrasi SDK.
- Jumlah usage event tercatat per hari.
- Success rate settlement (invoice yang berhasil settle on-chain / total invoice).
- Waktu rata-rata dari usage tercatat → settlement selesai.

---

## 13. Roadmap

| Fase | Fokus |
|---|---|
| **MVP (4–6 minggu)** | Fitur P0 di atas, jalan di Arc testnet, demo end-to-end |
| **V1** | Non-custodial policy wallet (session key), webhook lengkap, mainnet-ready |
| **V2** | Escrow/milestone settlement, multi-currency FX, agent marketplace integration |

---

## 14. Risiko & Asumsi

- Arc masih **pre-TGE** — mainnet timeline dan tokenomics belum final, jadi MVP harus tetap fungsional walau cuma di testnet.
- Model custodial wallet di MVP punya risiko keamanan (single point of failure) — perlu disclaimer jelas kalau ini versi demo/portfolio, bukan production-grade custody.
- Kompetisi dari Stripe/Metronome yang mungkin nambahin stablecoin rail sendiri.
- Asumsi: target user (AI SaaS kecil-menengah) mau eksperimen settlement crypto meski produk utama mereka fiat-based — ini asumsi yang perlu divalidasi lewat user interview singkat kalau project dilanjut serius.

---

## 15. Out of Scope (MVP)

- Wallet konsumer/retail
- Multi-chain support
- Escrow & marketplace
- Full regulatory compliance (KYC/AML)
- Non-custodial smart contract wallet

---

## 16. Brand Guidelines & Moodboard

### 16.1 Konsep Dasar

"Pactum" (Latin: **perjanjian/kesepakatan yang mengikat**) jadi dasar arah desainnya: bukan tampilan "crypto app" yang neon/playful, dan bukan juga tampilan "AI SaaS generik" (cream + serif hangat, atau dark mode + aksen neon tunggal). Arahnya adalah **notarial ledger** — kesan dokumen resmi, buku besar (ledger), dan meterai/segel yang mengesahkan sebuah transaksi. Ini nyambung langsung ke fungsi produk: setiap settlement itu literally sebuah "pact" yang disahkan on-chain.

**Kepribadian brand:** presisi, berwibawa, tenang, bisa dipercaya, sedikit formal — kayak notaris digital, bukan startup fintech yang riang.

### 16.2 Palet Warna

| Nama | Hex | Peran |
|---|---|---|
| **Ink Navy** | `#0E1526` | Background utama (dark mode default) |
| **Graphite Surface** | `#1B2333` | Card, panel, table row |
| **Brass Seal** | `#C9A227` | Aksen utama — CTA, highlight, elemen "seal/stamp" |
| **Ledger Teal** | `#3FA796` | Status positif — settled, success, verified |
| **Parchment** | `#EDE8DC` | Teks di atas dark surface, background alternatif (light mode) |
| **Rust Alert** | `#C2542C` | Warning/error — limit exceeded, failed settlement |

Prinsip pemakaian: **Ink Navy + Graphite** dominan sebagai kanvas (±70%), **Brass Seal** dipakai hemat untuk elemen yang benar-benar penting (CTA, badge "Settled"), **Ledger Teal** dan **Rust Alert** murni fungsional buat status — jangan dipakai dekoratif.

### 16.3 Tipografi

| Peran | Font | Kegunaan |
|---|---|---|
| **Display / Wordmark** | Fraunces (serif, ada karakter "editorial/legal document") | Logo "Pactum", judul besar, angka hero di dashboard |
| **Body / UI** | Inter | Semua teks UI, label, deskripsi, navigasi |
| **Data / Ledger** | IBM Plex Mono | Angka, tx hash, API key, jumlah USDC — apa pun yang harus terasa presisi dan "tercatat" |

Alasan pemisahan ini: data finansial/on-chain (tx hash, amount) **harus** pakai monospace supaya terasa seperti entri buku besar yang tepat, bukan teks UI biasa.

### 16.4 Layout & Motif

- **Ledger row**: daftar (usage log, transaction history) ditampilkan sebagai baris-baris dengan hairline divider tipis (bukan card besar bergap lebar) — meniru tampilan buku besar/rekening koran.
- **Receipt stub**: komponen invoice/receipt didesain seperti struk resmi — ada garis putus-putus di bagian bawah, nomor referensi di kiri atas, total di kanan bawah dengan font mono.
- **Seal badge (signature element)**: elemen visual yang jadi "penanda khas" Pactum — badge bundar warna Brass Seal, muncul setiap kali transaksi berhasil settle on-chain, isinya checkmark + teks "SETTLED ON ARC" + tx hash singkat di bawahnya pakai mono font. Ini elemen yang paling diingat orang dari produk ini.
- Border-radius kecil dan konsisten (bukan 0 tajam ala broadsheet, bukan juga bulat penuh ala consumer app) — kira-kira 6–8px, biar tetap terasa "dokumen resmi" tapi modern.

### 16.5 Voice & Tone (copy)

- Tulis seperti ledger/notaris: deklaratif, angka pasti, tanpa basa-basi promosi.
- Pakai istilah yang jelas dan aktif: **"Settled"**, **"Recorded"**, **"Authorized"**, **"Limit reached"** — bukan istilah teknis internal seperti "webhook config" atau jargon marketing seperti "supercharge your billing".
- Pesan error/empty state langsung ke inti masalah + langkah berikutnya, tanpa nada minta maaf berlebihan. Contoh: *"Spend limit tercapai untuk hari ini. Naikkan limit di Policy Settings untuk lanjut."*

### 16.6 Yang Dihindari

- Palet cream + serif hangat dengan aksen terracotta (kesan default AI-generated).
- Dark mode dengan satu aksen neon tunggal ala crypto-bro (acid green/violet gradient).
- Layout broadsheet dengan kolom rapat dan hairline berlebihan tanpa fungsi.
- Ikon/imagery generik blockchain (rantai, koin melayang, grafik candlestick) — ganti dengan motif ledger/segel yang lebih relevan ke konsep "pact".