# PHASE 1 — Production Deployment
## Next.js 15 + Supabase Free + Domain Baru di Vercel
**Sistem Informasi KPP (SIPPro)**
Stack: Next.js 15 (App Router) · TypeScript · Supabase · Edge Runtime · JWT · bcrypt.js

---

## OVERVIEW ALUR

```
Kode Lokal (dev)
     │
     ▼
[1] Audit & Hardening Kode
     │
     ▼
[2] Konfigurasi Supabase Production
     │
     ▼
[3] Setup Environment Variables
     │
     ▼
[4] Deploy ke Vercel
     │
     ▼
[5] Konfigurasi Domain Custom
     │
     ▼
[6] Post-Deploy Checklist
     │
     ▼
[7] Monitoring & Maintenance Rutin
```

---

## LANGKAH 1 — AUDIT & HARDENING KODE SEBELUM PRODUCTION

### 1.1 Cek .gitignore — KRITIS

Pastikan file-file berikut TIDAK pernah masuk ke Git repository:

```bash
# Jalankan di root project untuk cek apa yang ter-track
git status
git ls-files | grep -E "\.env"
```

File `.gitignore` minimal harus mengandung:

```gitignore
# Environment variables — JANGAN PERNAH COMMIT
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Dependencies
node_modules/
.next/
out/

# Debug
npm-debug.log*
yarn-debug.log*

# Vercel
.vercel
```

> ⚠️ **BAHAYA:** Jika `.env.local` pernah ter-commit sebelumnya,
> secret key & Supabase credentials kamu sudah bocor.
> Cara check: `git log --all --full-history -- .env.local`
> Jika ada hasil, WAJIB rotate semua credentials (Supabase anon key,
> JWT secret, semua service key) sebelum production.

### 1.2 Audit Environment Variables yang Dibutuhkan

Buat file `.env.example` (ini BOLEH di-commit, sebagai dokumentasi):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# JWT Secret — gunakan random string minimal 32 karakter
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# App Config
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### 1.3 Audit Keamanan Kode (Edge Runtime + JWT)

Karena kamu pakai Edge Runtime + JWT custom, cek hal berikut:

**a) Pastikan JWT_SECRET tidak hardcoded:**
```bash
# Cari hardcoded secret di codebase
grep -r "jwt_secret\|JWT_SECRET\|bcrypt\|password" src/ --include="*.ts" -l
```

**b) Pastikan semua API route sudah ada auth middleware:**
```typescript
// Contoh pattern yang BENAR untuk Edge Runtime
export const runtime = 'edge'

export async function GET(request: Request) {
  // Selalu validasi token di awal
  const token = request.headers.get('cookie')
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... logic selanjutnya
}
```

**c) Cek tidak ada console.log yang expose data sensitif:**
```bash
grep -r "console.log" src/ --include="*.ts" --include="*.tsx"
# Hapus atau ganti dengan proper logging sebelum production
```

### 1.4 Audit Supabase Row Level Security (RLS)

Ini KRITIS. Karena kamu pakai Supabase sebagai database, pastikan RLS aktif:

```sql
-- Jalankan di Supabase SQL Editor
-- Cek tabel mana yang belum aktif RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Semua tabel yang `rowsecurity = false` perlu diaktifkan:

```sql
-- Aktifkan RLS per tabel (ganti nama_tabel sesuai schema kamu)
ALTER TABLE nama_tabel ENABLE ROW LEVEL SECURITY;

-- Contoh policy untuk tabel produksi
-- (sesuaikan dengan logika auth kamu yang pakai JWT custom)
CREATE POLICY "authenticated users only"
ON produksi
FOR ALL
USING (auth.role() = 'authenticated');
```

> ℹ️ Karena kamu pakai JWT custom (bukan Supabase Auth bawaan),
> cara implementasi RLS perlu disesuaikan. Jika saat ini
> semua akses DB dilakukan dari server-side Next.js API routes
> menggunakan service_role key, RLS bisa di-bypass dari server —
> yang penting pastikan semua operasi DB HANYA dari server-side,
> tidak ada akses langsung dari client/browser ke Supabase.

### 1.5 Build Test Lokal

```bash
# Pastikan build tidak ada error sebelum deploy
npm run build

# Jika berhasil, output harus seperti:
# ✓ Compiled successfully
# Route (app) ...
# Tidak ada error TypeScript
```

Jika ada error TypeScript atau build error — **selesaikan dulu sebelum lanjut.**

---

## LANGKAH 2 — KONFIGURASI SUPABASE UNTUK PRODUCTION

### 2.1 Setup Project Supabase (jika belum ada project dedicated production)

Opsi A — Pakai project yang sudah ada (simple):
- Tidak perlu buat project baru
- Pastikan data development tidak tercampur dengan production

Opsi B — Buat project Supabase baru khusus production (DIREKOMENDASIKAN):
1. Login ke [supabase.com](https://supabase.com)
2. Klik **New Project**
3. Pilih **Organization** → isi nama project (contoh: `sippro-production`)
4. Pilih region: **Southeast Asia (Singapore)** — paling dekat ke Indonesia
5. Set **Database Password** yang kuat — simpan di password manager
6. Klik **Create new project** — tunggu ~2 menit

### 2.2 Migrate Schema ke Project Production

```bash
# Jika kamu pakai Supabase CLI (direkomendasikan):
npm install -g supabase

# Login
supabase login

# Link ke project production
supabase link --project-ref [PROJECT_REF_ID_PRODUCTION]

# Push schema (migrations)
supabase db push

# Atau jika belum pakai migration, export dari project lama:
# Di Supabase Dashboard → Settings → Database → Backups → Download
# Lalu import via SQL Editor di project baru
```

### 2.3 Ambil Credentials Production

Di Supabase Dashboard → **Settings** → **API**:

```
Project URL    : https://[ref].supabase.co
anon key       : eyJ... (untuk NEXT_PUBLIC_SUPABASE_ANON_KEY)
service_role   : eyJ... (RAHASIA — hanya untuk server-side, JANGAN expose ke client)
```

Di Supabase Dashboard → **Settings** → **Database**:
```
Connection string (jika butuh direct DB connection)
```

### 2.4 Konfigurasi Auth & Redirect URLs

Di Supabase Dashboard → **Authentication** → **URL Configuration**:

```
Site URL          : https://yourdomain.com
Redirect URLs     : https://yourdomain.com/**
                    https://yourdomain.com/auth/callback
```

> Ini penting agar Supabase tidak reject redirect setelah login
> ke domain production kamu.

### 2.5 Aktifkan Point-in-Time Recovery (Free Plan — backup manual)

Free plan tidak ada auto-backup. Setup backup manual:

```sql
-- Buat scheduled export via pg_dump (jalankan dari lokal/CI)
-- atau gunakan Supabase Dashboard → Database → Backups (tersedia di Pro)

-- Untuk free plan, export manual rutin (misal mingguan):
-- Dashboard → Database → Backups → Download backup
```

> ⚠️ PENTING untuk free plan: project akan **di-pause otomatis**
> jika tidak ada aktivitas selama 7 hari berturut-turut.
> Solusi: pastikan minimal 1 user login per minggu,
> atau upgrade ke Pro ($25/bln) jika ini jadi masalah.

---

## LANGKAH 3 — SETUP ENVIRONMENT VARIABLES

### 3.1 Buat file .env.production.local (lokal, tidak di-commit)

```env
NEXT_PUBLIC_SUPABASE_URL=https://[ref-production].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[anon-key-production]
NEXT_PUBLIC_APP_URL=https://yourdomain.com
JWT_SECRET=[generate-random-32-char-hex]
NODE_ENV=production
```

### 3.2 Generate JWT Secret yang kuat

```bash
# Di terminal, generate secret baru untuk production:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output contoh:
# a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

**JANGAN gunakan JWT secret yang sama antara development dan production.**

---

## LANGKAH 4 — DEPLOY KE VERCEL

### 4.1 Push Kode ke GitHub (jika belum)

```bash
# Pastikan semua perubahan di-commit
git add .
git commit -m "chore: prepare for production deployment"
git push origin main
```

### 4.2 Import Project ke Vercel

1. Buka [vercel.com](https://vercel.com) → Login dengan GitHub
2. Klik **Add New** → **Project**
3. Pilih repository GitHub kamu
4. Vercel akan auto-detect **Next.js** — konfigurasi default sudah benar
5. **JANGAN klik Deploy dulu** — lanjut ke 4.3 terlebih dahulu

### 4.3 Set Environment Variables di Vercel

Di halaman konfigurasi project Vercel, klik **Environment Variables**:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[ref].supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production |
| `JWT_SECRET` | `[32-char hex]` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | Production |

> Pilih **Production** saja untuk semua key, bukan Preview/Development.
> Untuk Development, tetap pakai `.env.local` di lokal.

### 4.4 Konfigurasi Build Settings (biasanya default sudah benar)

```
Framework Preset  : Next.js (auto-detected)
Build Command     : npm run build  (atau: next build)
Output Directory  : .next
Install Command   : npm install
Root Directory    : ./  (jika monorepo, sesuaikan)
```

### 4.5 Deploy

Klik **Deploy** → tunggu proses build (~2-5 menit).

**Jika build gagal**, baca error log di Vercel dashboard:
- Error TypeScript → fix di kode lokal, push ulang
- Missing env variable → cek kembali langkah 4.3
- Module not found → pastikan `package.json` sudah update

### 4.6 Test di URL Vercel (sebelum domain custom)

Vercel akan kasih URL sementara: `[project-name].vercel.app`

Test semua alur kritis:
- [ ] Login berhasil
- [ ] Dashboard load data dari Supabase production
- [ ] Input data produksi (tambah data, cek di Supabase dashboard)
- [ ] Upload file/dokumentasi
- [ ] Export Excel berfungsi
- [ ] Logout berfungsi

---

## LANGKAH 5 — KONFIGURASI DOMAIN CUSTOM

### 5.1 Tambahkan Domain di Vercel

1. Vercel Dashboard → Project kamu → **Settings** → **Domains**
2. Klik **Add Domain**
3. Masukkan domain kamu: `yourdomain.com` atau `si.yourdomain.com`
4. Vercel akan tampilkan DNS record yang perlu ditambahkan

### 5.2 Konfigurasi DNS di Registrar Domain Kamu

Tergantung di mana kamu beli domain (IDwebhost, Dewaweb, Niagahoster, dll):

**Jika domain utama (yourdomain.com):**
```
Type  : A
Name  : @
Value : 76.76.21.21  (IP Vercel — cek di instruksi Vercel)

Type  : CNAME
Name  : www
Value : cname.vercel-dns.com
```

**Jika subdomain (si.yourdomain.com):**
```
Type  : CNAME
Name  : si
Value : cname.vercel-dns.com
```

> Propagasi DNS bisa memakan waktu 5 menit hingga 24 jam.
> Cek status propagasi di: https://dnschecker.org

### 5.3 SSL Certificate

Vercel akan **otomatis** issue SSL certificate via Let's Encrypt setelah DNS propagasi selesai. Tidak perlu setup manual. Tunggu hingga status di Vercel dashboard berubah menjadi hijau ✓.

### 5.4 Update Supabase Redirect URL

Setelah domain aktif, kembali ke Supabase Dashboard →
**Authentication** → **URL Configuration** → update:

```
Site URL      : https://yourdomain.com
Redirect URLs : https://yourdomain.com/**
```

### 5.5 Update Environment Variable di Vercel

```
NEXT_PUBLIC_APP_URL = https://yourdomain.com  (ganti dari URL sementara)
```

Setelah update env var, Vercel perlu **redeploy**:
Vercel Dashboard → Deployments → klik titik tiga → **Redeploy**

---

## LANGKAH 6 — POST-DEPLOY CHECKLIST

Lakukan pengecekan menyeluruh setelah domain aktif:

### Fungsionalitas Utama
- [ ] **Login** — masuk dengan akun admin
- [ ] **Dashboard** — semua metrik tampil, grafik load
- [ ] **Bahan Baku** — tambah suplai, cek balance stok terupdate
- [ ] **Input Produksi** — flow 3 step berjalan (Input → Bahan → Konfirmasi)
- [ ] **Proses Sampling** — update status batch
- [ ] **Analisa** — filter periode berfungsi
- [ ] **RKAP/RKO** — data 12 bulan tampil, realisasi terintegrasi
- [ ] **Aktivitas Harian** — tambah aktivitas + upload dokumentasi
- [ ] **Maintenance** — tambah + import Excel
- [ ] **Rencana Pengadaan** — prognosa stok kalkulasi benar
- [ ] **Export Excel** — semua halaman yang ada tombol export berfungsi
- [ ] **Import Excel** — upload, mapping kolom, preview, import berjalan
- [ ] **Logout** — session terhapus, redirect ke login

### Keamanan
- [ ] Akses URL yang butuh auth tanpa login → redirect ke halaman login
- [ ] HTTPS aktif (ada gembok di browser)
- [ ] Tidak ada data sensitif di browser console (F12 → Console)
- [ ] Tidak ada Supabase service_role key yang ter-expose di client

### Performa
- [ ] Halaman dashboard load < 3 detik di koneksi normal
- [ ] Tidak ada error di browser console (F12)

---

## LANGKAH 7 — MONITORING & MAINTENANCE RUTIN (FREE PLAN)

### 7.1 Pantau Supabase Free Plan Limits

| Resource | Free Limit | Cara Monitor |
|----------|------------|--------------|
| Database size | 500 MB | Dashboard → Settings → Usage |
| Bandwidth | 5 GB/bulan | Dashboard → Settings → Usage |
| Auth users | 50.000 | Dashboard → Authentication |
| Project inactivity | Pause setelah 7 hari | Pantau jika ada keluhan user tidak bisa login |

### 7.2 Jadwal Maintenance Rutin

**Mingguan:**
- Backup manual database: Supabase Dashboard → Database → Backups → Download
- Cek Supabase usage stats

**Bulanan:**
- Review Vercel deployment logs (apakah ada error berulang)
- Update dependencies minor: `npm update`
- Cek apakah ada Supabase security advisory

### 7.3 Setup Uptime Monitoring (Gratis)

Daftarkan di [UptimeRobot](https://uptimerobot.com) (free tier):
- Monitor URL: `https://yourdomain.com`
- Interval: setiap 5 menit
- Notifikasi ke email jika down

### 7.4 Kapan Harus Upgrade ke Supabase Pro?

Pertimbangkan upgrade ke Pro ($25/bulan) jika:
- Database mendekati 400 MB (80% dari 500 MB limit)
- Bandwidth mendekati 4 GB/bulan
- Project sering di-pause karena inactivity (ribet restart manual)
- Butuh auto-backup harian (Pro: 7 hari PITR)
- User aktif bertambah signifikan (>10 user yang sering akses)

---

## RINGKASAN CHECKLIST PHASE 1

```
PRE-DEPLOY
□ .gitignore sudah benar, tidak ada .env ter-commit
□ Tidak ada credentials hardcoded di kode
□ JWT_SECRET production sudah digenerate (berbeda dari dev)
□ npm run build lokal berhasil tanpa error

SUPABASE PRODUCTION
□ Project Supabase production dibuat (region Singapore)
□ Schema sudah di-migrate
□ Credentials production sudah disimpan aman
□ Auth redirect URL sudah dikonfigurasi
□ RLS sudah diaudit

VERCEL
□ Repository GitHub sudah up-to-date
□ Environment variables sudah diset di Vercel (Production)
□ Build pertama berhasil
□ Test di URL *.vercel.app berhasil

DOMAIN
□ Domain sudah ditambahkan di Vercel
□ DNS record sudah dikonfigurasi di registrar
□ SSL certificate aktif (hijau ✓ di Vercel)
□ Supabase redirect URL sudah diupdate ke domain baru

POST-DEPLOY
□ Semua fitur utama sudah ditest end-to-end
□ HTTPS aktif, tidak ada warning di browser
□ Uptime monitoring aktif (UptimeRobot)
□ Jadwal backup manual sudah dijadwalkan
```

---

*Selesai Phase 1. Sistem informasi sudah live di production.*
*Lanjut ke Phase 2 (Hostinger VPS + Supabase Self-host) saat siap migrasi.*
