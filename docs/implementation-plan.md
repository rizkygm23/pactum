Sudah paham seluruh project secara menyeluruh. Buat plan komprehensif sekarang. Baik, ini plan lengkap yang bisa langsung di-build:

---

# PLAN: Pactum UI/UX Overhaul

## Prinsip Desain

Sistem desain yang ada (monochrome editorial, Inter, IBM Plex Mono, pill buttons, hairline borders) sudah bagus dan dipertahankan. Improvisasi berfokus pada:

1. **Hierarki visual** — beda antara penting dan pendukung lebih tegas
2. **Status komunikasi** — warna masuk secara terkontrol hanya untuk status (green/amber/red), bukan branding
3. **Kepadatan informasi** — dashboard lebih padat tapi tetap readable
4. **Micro-interaction** — loading states, hover, transitions yang konsisten
5. **Flow onboarding** — user baru langsung tahu harus ngapain

---

## Bagian 1 — Global CSS & Token (`app/globals.css`)

**Tambah:**
- `.badge-green` / `.badge-amber` / `.badge-red` — status badge berwarna subtle (background tinted, border tinted, teks gelap)
- `.card-elevated` — card dengan `box-shadow: 0 1px 3px rgba(0,0,0,0.06)` untuk komponen yang perlu naik dari canvas
- `.input-box` — varian input dengan full border box (bukan hanya bottom) untuk form login/signup
- `.progress-bar` wrapper + `.progress-fill` dengan CSS custom property `--pct`
- `.skeleton` — animated loading placeholder (opacity pulse) untuk empty states
- `.avatar-initial` — lingkaran 32px dengan inisial huruf, background `hairline`, text `ink`
- Variabel warna baru: `--color-green-subtle: #f0faf5`, `--color-green: #16a34a`, `--color-amber: #d97706`, `--color-red: #dc2626`

---

## Bagian 2 — Landing Page (`app/page.tsx` + komponen landing)

### 2.1 LandingNav (`components/landing/LandingNav.tsx`)
- Tambah tombol **"Get started"** (btn-inverse hitam kecil) di sebelah kanan, di samping "Sign in"
- Tambah subtle `border-b border-hairline` saat scroll (sticky scroll event via `useScrolled` hook kecil)
- Tambah link "Docs" di tengah nav untuk desktop

### 2.2 Hero Section
- **Eyebrow:** tambah live badge `● Arc Testnet` dengan animasi pulse titik hijau kecil
- **Headline:** pertahankan, tapi tambah subtle **animated counter** pada angka USDC di ReceiptStub (count-up dari 0 saat pertama reveal)
- **CTA area:** susun ulang — "Get an API key" (primary pill), "Try Live Demo" (ghost pill), "Read Docs" (text link) — lebih visual hierarchy-nya
- **ReceiptStub:** tambah mock `tx_hash` di bawah total dengan link ke Arc explorer, tambah timestamp

### 2.3 Stage Sections (1.0 Fund, 2.0 Meter, 3.0 Seal)
- Setiap stage tambah **numbered circle** besar di kiri (01 / 02 / 03) menggantikan rotated label yang kurang accessible
- Tambah **connector line vertikal** antar section saat desktop
- Stage 2.0 Meter: code frame sudah bagus, tambah **tab switcher** (Track / Summary / Policies) untuk show 3 endpoint berbeda
- Stage 3.0 Seal: SealBadge sudah ada, tambah animasi "stamp" lebih dramatis — scale + opacity

### 2.4 Network Facts
- Ubah dari dl/dd biasa menjadi **grid card kecil** 3-kolom, setiap fact dalam kotak dengan border hairline

### 2.5 Social Proof Strip (BARU)
- Tambah strip tipis di bawah hero: `"Built on Arc · Settled in USDC · Verified on-chain"` dengan icon separator
- Alternatif: stat counter — "N settlements processed · $X USDC settled" (bisa hardcode specimen)

### 2.6 Closing CTA Band
- Sudah ada di bg-scrim, perbaiki: tambah dua kolom — kiri headline besar, kanan dua card "Start as merchant" dan "Deposit as user" dengan panah →

### 2.7 Footer
- Perluas dari 1 baris menjadi **4-kolom footer**:
  - Kol 1: Brand + tagline
  - Kol 2: Product (Dashboard, Wallet, Docs)
  - Kol 3: Resources (Integration Guide, API Reference, Smart Contract)
  - Kol 4: Network (Arc Explorer, Faucet, CCTP Domain)
- Border-top hairline, background `footer` (#030303), semua teks `on-primary/60`

---

## Bagian 3 — Auth Pages

### 3.1 Login (`app/login/page.tsx` + `login-form.tsx`)
- **Layout:** Split-screen 50/50 di lg+
  - Kiri: panel gelap (`bg-scrim`) dengan logo besar, quote "A bill your customer can verify without asking you.", dan 3 bullet point fitur utama
  - Kanan: form putih dengan padding besar
- **Input:** Ganti `input-field` (bottom-only border) ke `input-box` (full border, border-radius 6px, padding 12px 14px)
- **Password field:** Tambah toggle show/hide (ikon Eye/EyeOff dari lucide)
- **Error state:** Ganti dari kotak border-ink menjadi banner merah subtle (`.badge-red` style, dengan ikon AlertCircle)
- **Loading state:** Button menampilkan spinner + disable, bukan hanya teks ganti
- **Social proof:** Di bawah form, tambah `"Secured with HMAC sessions · No wallet needed to sign up"`

### 3.2 Signup (`app/signup/page.tsx` + `signup-form.tsx`)
- Layout sama seperti login (split-screen), panel kiri berbeda konten: "Start billing your users in minutes"
- Tambah **password strength indicator** (4 bar, lebar tumbuh dari red → amber → green)
- Tambah **terms acknowledgment checkbox** sebelum submit
- Company name field dengan placeholder lebih descriptive: "e.g. Acme AI Labs"
- Redirect setelah signup ke `/dashboard` tapi tambah query `?onboarding=1` untuk trigger onboarding banner

---

## Bagian 4 — Dashboard Shell (`components/dashboard/DashboardShell.tsx`)

### 4.1 Sidebar Desktop
- Setiap nav item tambah **ikon SVG** (lucide-react):
  - Overview → `LayoutDashboard`
  - Usage → `Activity`
  - Payouts → `Wallet`
  - Settings → `Settings2`
  - Documentation → `BookOpen`
- **Active state:** Ganti `bg-hairline` menjadi pill `bg-ink text-on-primary` — lebih tegas
- **Hover state:** `bg-hairline` tetap, tapi tambah `translate-x-0.5` subtle
- Brand area: logo + nama + badge `TESTNET` kecil amber di sebelah nama
- User area bawah: tambah **avatar circle** dengan inisial dari email (misal "R" dari "rizky@..."), email di bawahnya di-truncate, Sign out sebagai text link

### 4.2 Mobile Header
- Ganti ikon ☰ dengan Lucide `Menu` icon
- Tambah breadcrumb halaman aktif di tengah header mobile
- Tambah notifikasi dot merah kecil di ikon menu jika ada pending payout > 0 (opsional, bisa skip)

### 4.3 Main Content Area
- Tambah **page header strip** konsisten: setiap halaman punya `<PageHeader title="..." subtitle="..." action={...} />` komponen baru
- Padding konsisten: `px-4 py-6 sm:px-6 sm:py-8 lg:px-8`

---

## Bagian 5 — Overview Dashboard (`app/dashboard/page.tsx`)

### 5.1 Stat Cards
- Buat `StatCard` versi baru yang terima prop `trend?: { value: number; label: string }`:
  - Jika `trend.value > 0`: tampilkan `↑ +12%` dalam warna green subtle
  - Jika `trend.value < 0`: tampilkan `↓ -3%` dalam warna red subtle
- Card "Today's Usage" tampilkan progress mini bar terhadap daily limit (jika ada policy)
- Card "Active API Keys" tampilkan sub-label "X revoked" jika ada revoked keys

### 5.2 Onboarding Banner (BARU)
- Jika user baru (merchant_wallet_address kosong ATAU active keys = 0), tampilkan **checklist banner** di atas stat cards:
  ```
  ┌─────────────────────────────────────────────────────────┐
  │ Get started with Pactum                         3 steps │
  │ ☐ Set your settlement wallet         → Settings         │
  │ ☐ Create your first API key          → Settings         │
  │ ☐ Make your first tracked call       → Integration Guide│
  └─────────────────────────────────────────────────────────┘
  ```
- Tambah tombol dismiss (×) yang simpan state ke localStorage

### 5.3 Recent Settlements
- Avatar circle untuk setiap user address (inisial dari 2 char pertama setelah `0x`)
- Tambah kolom `endpoint` di sebelah address
- Timestamp berformat relative: "2 hours ago", "3 days ago" (pakai fungsi `timeAgo` kecil)
- Jika ada tx hash, tambahkan link ↗ ke Arc explorer langsung di row

### 5.4 Quick Actions Bar (BARU)
- Di bawah stat cards, tambah baris icon-button kecil:
  - "Settle pending" (Zap icon) → trigger settle
  - "New API key" (Plus icon) → link ke Settings
  - "View docs" (BookOpen icon) → link ke Docs

---

## Bagian 6 — Usage Page (`app/dashboard/usage/page.tsx`)

### 6.1 Spend Summary Cards
- Progress bar lebih tebal (h-2 bukan h-1.5), dengan rounded-full
- **Warna progress bar dinamis** berdasarkan persentase:
  - 0–70%: `--color-green` (#16a34a)
  - 70–90%: `--color-amber` (#d97706)
  - 90–100%: `--color-red` (#dc2626)
- Tambah label persentase di kanan bar: "47%"
- Jika tidak ada policy, tampilkan "No limit set — [Set limit →]" link

### 6.2 Event Log Table
- **Header sticky** saat scroll dalam card
- **Status badge** di setiap row menggunakan `.badge-green` (settled) / `.badge-amber` (pending) / `.badge-red` (failed)
- Tambah kolom **Status** (gantikan atau tambah di kolom terakhir)
- **Baris highlighted** jika status = failed (row background `#fff1f0` subtle)
- Tambah **filter bar** di atas tabel:
  - Dropdown filter by API Key (semua key dari keyMap)
  - Dropdown filter by Status (All / Pending / Settled / Failed)
  - Filter ini client-side saja (filter array events yang sudah di-fetch)
- Empty state: tambah ilustrasi kecil (code snippet CLI) + link ke integration guide

### 6.3 Export Button (BARU)
- Tombol "Export CSV" kecil (ghost, ukuran xs) di sebelah "Event Log" header
- Fungsi: ambil `events` array, convert ke CSV, trigger download via blob URL

---

## Bagian 7 — Payouts Page (`app/dashboard/payouts/page.tsx`)

### 7.1 Pending Payout Panel
- Ubah dari kotak kecil pojok kanan atas menjadi **card penuh lebar** di bagian atas:
  ```
  ┌──────────────────────────────────────────────────────────────┐
  │ Pending Payout                                               │
  │ 0.000000 USDC          [⚡ Settle Now]  [ℹ How it works]    │
  │ 0 events waiting · Last settled: never                      │
  └──────────────────────────────────────────────────────────────┘
  ```
- Jika `totalPending > 0`: card berubah border menjadi `border-amber-200`, ada subtle pulsing dot
- Jika `totalPending == 0`: card lebih muted, CTA di-disable

### 7.2 WithdrawWidget
- Bungkus dalam card yang sama tingginya dengan panel pending
- Tampilkan dua card sejajar (pending | withdraw) di desktop, stack di mobile

### 7.3 Settlement History Table
- Tambah **summary row** di atas tabel: "X settlements · $Y.YY total"
- Kolom tx hash: tampilkan truncated (0x1234...5678) dengan copy button (ikon Copy) + link explorer
- Tambah **search/filter** berdasarkan user address (input teks, filter client-side)
- Pagination: jika > 20 baris, tampilkan "Show 20 more" button (load lebih dari state lokal)

---

## Bagian 8 — Settings Page (`app/dashboard/settings/page.tsx`)

### 8.1 Settlement Wallet Card
- Input wallet address: ubah dari `input-field` (bottom border) ke `input-box` (full border)
- Tambah tombol **Copy** di sebelah kanan input (ikon Copy, copy ke clipboard)
- Tambah indikator validasi real-time: saat user mengetik, tampilkan ✓ (valid EVM) atau ✗ (invalid)
- Tambah `<a>` link ke Arc explorer jika wallet sudah diset: "View on explorer ↗"
- Badge network kecil: `Arc Testnet` di header card

### 8.2 API Keys Card
- Setiap key jadi **card individual** bukan row tabel:
  ```
  ┌──────────────────────────────────────────────────────────┐
  │ [●] Generated Key                        [Active ✓]      │
  │ pactum_abc123...                    Created Oct 8, 2026  │
  │                                            [Revoke ↗]    │
  └──────────────────────────────────────────────────────────┘
  ```
- Active badge: `.badge-green`, Revoked badge: `.badge-red`
- Revoke button: merah subtle, confirm dengan inline "Confirm revoke?" + Ya/Tidak (tidak pakai `confirm()` native)
- New Key reveal box: lebih prominent, dengan countdown "Visible for 60s", copy button, dan auto-hide

### 8.3 Spend Policy Card (BARU — jika belum ada di UI)
- Cek apakah ada halaman/UI untuk set spend policy. Jika belum:
  - Tambah section "Spend Limits" di Settings
  - Form: Daily limit (USDC) + Monthly limit (USDC)
  - POST ke `/api/v1/policies`
  - Tampilkan policy aktif saat ini

---

## Bagian 9 — Wallet Page (`app/wallet/page.tsx`)

### 9.1 Layout
- Lebarkan dari `max-w-md` ke `max-w-lg`
- Split card menjadi **2 panel**:
  - Panel atas: balance display (on-chain | available | pending)
  - Panel bawah: action tabs — "Deposit" / "Withdraw"

### 9.2 Balance Display
- Tiga metric dalam satu baris dengan divider vertikal
- Angka besar, label micro-caps di bawah
- Tambah tombol "Refresh" (ikon RotateCw, spin saat loading) di pojok kanan

### 9.3 Action Tabs
- Ganti tampilan deposit/withdraw dari stacked menjadi **tab switcher**
- Active tab: underline hitam tebal
- Setiap tab punya input amount + preset buttons: [10] [25] [50] [100]
- Button submit lebih besar dan informatif: "Deposit 25 USDC" (nilai terupdate realtime)

### 9.4 Transaction Status
- Ganti string `status` yang di-render raw menjadi **step indicator**:
  ```
  ① Approving USDC → ② Depositing → ③ Confirmed ✓
  ```
- Setiap step punya loading spinner atau checkmark

---

## Bagian 10 — Komponen Baru (Shared)

| Komponen | File | Deskripsi |
|---|---|---|
| `PageHeader` | `components/ui/PageHeader.tsx` | Header konsisten tiap halaman dashboard: title, subtitle, optional action button |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | Wrapper untuk badge status dengan warna (green/amber/red/gray), menggantikan inline class scattered |
| `CopyButton` | `components/ui/CopyButton.tsx` | Tombol copy ke clipboard dengan feedback "Copied!" 2 detik |
| `AvatarInitial` | `components/ui/AvatarInitial.tsx` | Lingkaran avatar dengan 1-2 inisial huruf dari string arbitrary |
| `ProgressBar` | `components/ui/ProgressBar.tsx` | Progress bar dengan warna dinamis berdasarkan persentase |
| `EmptyState` | `components/ui/EmptyState.tsx` | Empty state reusable: ikon, judul, deskripsi, optional CTA |
| `TabSwitcher` | `components/ui/TabSwitcher.tsx` | Tab horizontal dengan underline indicator, accessible |
| `OnboardingChecklist` | `components/dashboard/OnboardingChecklist.tsx` | Banner 3-step checklist untuk user baru, dismissable |

---

## Urutan Build (prioritas)

1. **globals.css** — token warna + utility class baru (fondasi semua komponen)
2. **Komponen shared baru** — PageHeader, StatusBadge, CopyButton, AvatarInitial, ProgressBar, EmptyState, TabSwitcher
3. **DashboardShell** — sidebar dengan ikon + active state baru + user avatar
4. **Overview page** — onboarding banner + stat cards trend + activity feed improved
5. **Usage page** — filter bar + status badges + export CSV
6. **Payouts page** — pending panel baru + history table improved
7. **Settings page** — wallet card + API key cards individual + policy section
8. **Auth pages** — split-screen login/signup + password toggle + strength indicator
9. **Wallet page** — layout baru + tabs + step indicator
10. **Landing page** — nav update + footer 4-kolom + social proof strip + stage sections

---

## Yang Tidak Diubah

- Semua logic API (`app/api/`) — tidak ada perubahan backend
- Database queries di halaman dashboard — tidak diubah, hanya UI layer
- Supabase migrations — tidak diubah
- Smart contract — tidak diubah
- Sistem font (Inter + IBM Plex Mono) — dipertahankan
- Warna dasar (canvas white, ink black, hairline gray) — dipertahankan, hanya ditambah status colors

---

**Switch ke Build mode dan approve plan ini untuk mulai eksekusi.** Semua perubahan di atas murni UI layer — tidak ada breaking change di backend, contract, atau database.
