# PHASE 2 — Migrasi ke VPS + Supabase Self-host
## Next.js 15 di Hostinger KVM 2 + Supabase Self-host (Docker)
**Sistem Informasi KPP (SIPPro)**

> Dokumen ini dijalankan SETELAH Phase 1 sudah stabil di production.
> Estimasi waktu pengerjaan: 1-2 hari kerja untuk IT person
> yang familiar dengan Linux dasar.

---

## OVERVIEW ARSITEKTUR TARGET

```
Internet
    │
    ▼
[Cloudflare DNS / Registrar DNS]
    │ (A record ke IP VPS)
    ▼
[Hostinger KVM 2 VPS — Ubuntu 22.04]
    │
    ├── [Caddy / Nginx] ← Reverse Proxy + SSL otomatis
    │       │
    │       ├── yourdomain.com → Next.js App (port 3000)
    │       └── supabase.yourdomain.com (opsional, untuk Studio)
    │
    ├── [PM2] ← Process Manager Next.js
    │       └── next start (port 3000)
    │
    └── [Docker Compose] ← Supabase Self-host Stack
            ├── PostgreSQL (port 5432)
            ├── GoTrue / Auth (port 9999)
            ├── PostgREST (port 3000 internal)
            ├── Realtime (port 4000)
            ├── Storage API (port 5000)
            ├── Kong API Gateway (port 8000)
            └── Supabase Studio (port 3001)
```

---

## PRA-SYARAT SEBELUM MEMULAI

Pastikan hal berikut tersedia:

- [ ] Akses SSH ke VPS Hostinger KVM 2
- [ ] Domain sudah aktif (dari Phase 1)
- [ ] Backup database Supabase Cloud (export dari Phase 1)
- [ ] Kode Next.js sudah di GitHub (dari Phase 1)
- [ ] Terminal/SSH client (Windows: PuTTY atau Windows Terminal + OpenSSH)

---

## LANGKAH 1 — SETUP AWAL VPS HOSTINGER

### 1.1 Akses VPS via SSH

```bash
# Dari terminal lokal kamu:
ssh root@[IP_VPS_HOSTINGER]

# Jika pakai password (akan ditanya setelah ini)
# Jika pakai SSH key (direkomendasikan):
ssh -i ~/.ssh/id_rsa root@[IP_VPS_HOSTINGER]
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Buat User Non-Root (Keamanan Dasar)

```bash
# Buat user baru (ganti 'sippro' dengan nama yang kamu mau)
adduser sippro

# Berikan sudo access
usermod -aG sudo sippro

# Copy SSH key ke user baru (supaya bisa login tanpa password)
rsync --archive --chown=sippro:sippro ~/.ssh /home/sippro

# Test login sebagai user baru di terminal lain sebelum logout dari root
# ssh sippro@[IP_VPS]
```

### 1.4 Konfigurasi Firewall Dasar (UFW)

```bash
# Aktifkan UFW
ufw allow OpenSSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable

# Cek status
ufw status
```

> Port lain (3000, 5432, 8000, dll) TIDAK perlu dibuka ke publik —
> semua traffic akan masuk lewat Caddy/Nginx (port 80/443).
> Supabase services hanya diakses internal (lokal di VPS).

### 1.5 Install Dependensi Dasar

```bash
# Install tools yang dibutuhkan
apt install -y curl git wget unzip build-essential

# Install Node.js 20 LTS (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verifikasi
node -v   # harus v20.x.x
npm -v    # harus v10.x.x

# Install PM2 (process manager untuk Next.js)
npm install -g pm2

# Install Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# Tambahkan user ke docker group
usermod -aG docker sippro

# Verifikasi Docker
docker --version
docker compose version
```

---

## LANGKAH 2 — SETUP SUPABASE SELF-HOST

### 2.1 Clone Repository Supabase

```bash
# Login sebagai user sippro
su - sippro

# Buat direktori kerja
mkdir -p ~/apps && cd ~/apps

# Clone repo Supabase self-hosted
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
```

### 2.2 Konfigurasi Environment Supabase

```bash
# Salin template config
cp .env.example .env

# Edit file konfigurasi — ini bagian PALING PENTING
nano .env
```

Ubah nilai-nilai berikut di file `.env`:

```env
############
# SECRETS — WAJIB DIGANTI, JANGAN PAKAI DEFAULT
############

# Generate dengan: openssl rand -hex 32
POSTGRES_PASSWORD=ganti_dengan_password_postgres_kuat_anda

# Generate dengan: openssl rand -base64 32
JWT_SECRET=ganti_dengan_jwt_secret_minimal_32_karakter

# Generate dengan: npx @supabase/supabase-js@latest gen-keys
# Atau via: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
ANON_KEY=eyJ...  # paste hasil generate
SERVICE_ROLE_KEY=eyJ...  # paste hasil generate

# Dashboard password — untuk login ke Supabase Studio
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=ganti_password_dashboard_kuat

############
# KONFIGURASI SITE
############

# Ganti dengan domain/IP VPS kamu
API_EXTERNAL_URL=https://api.yourdomain.com
# Atau jika tidak pakai subdomain khusus:
# API_EXTERNAL_URL=http://[IP_VPS]:8000

SITE_URL=https://yourdomain.com

# Tambahkan domain production ke redirect URLs
ADDITIONAL_REDIRECT_URLS=https://yourdomain.com/**

############
# EMAIL (untuk fitur auth email — opsional jika tidak pakai email login)
############

# Jika tidak pakai email auth, set ke false
ENABLE_EMAIL_AUTOCONFIRM=true
# Jika pakai SMTP:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@email.com
# SMTP_PASS=your_app_password
```

### 2.3 Generate API Keys untuk Supabase Self-host

Ini langkah yang sering dilewati dan menyebabkan error. JWT untuk Supabase self-host harus digenerate dengan payload yang spesifik:

```bash
# Install tool generate key (di VPS atau lokal)
npm install -g jsonwebtoken

# Buat script generate-keys.js
cat > /tmp/generate-keys.js << 'EOF'
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.argv[2]
if (!JWT_SECRET) {
  console.error('Usage: node generate-keys.js <your-jwt-secret>')
  process.exit(1)
}

const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 tahun
}

const servicePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60)
}

console.log('ANON_KEY=' + jwt.sign(anonPayload, JWT_SECRET, { algorithm: 'HS256' }))
console.log('SERVICE_ROLE_KEY=' + jwt.sign(servicePayload, JWT_SECRET, { algorithm: 'HS256' }))
EOF

# Generate keys dengan JWT_SECRET yang kamu set di .env
node /tmp/generate-keys.js "jwt_secret_kamu_yang_sudah_diganti"

# Copy output ANON_KEY dan SERVICE_ROLE_KEY ke file .env
```

### 2.4 Jalankan Supabase Stack

```bash
cd ~/apps/supabase/docker

# Pull semua image dulu (bisa makan waktu 5-10 menit, ~2GB)
docker compose pull

# Jalankan di background
docker compose up -d

# Cek status semua container
docker compose ps

# Output yang diharapkan — semua status 'Up' atau 'healthy':
# NAME                    STATUS
# supabase-kong           Up
# supabase-auth           Up (healthy)
# supabase-rest           Up
# supabase-realtime       Up (healthy)
# supabase-storage        Up (healthy)
# supabase-db             Up (healthy)
# supabase-studio         Up
```

### 2.5 Verifikasi Supabase Berjalan

```bash
# Test PostgreSQL langsung
docker exec -it supabase-db psql -U postgres -c "SELECT version();"

# Test API via Kong (dari dalam VPS)
curl http://localhost:8000/rest/v1/ \
  -H "apikey: [ANON_KEY_KAMU]" \
  -H "Authorization: Bearer [ANON_KEY_KAMU]"
# Harus return JSON, bukan error

# Cek log jika ada container yang tidak sehat
docker compose logs supabase-auth --tail=50
docker compose logs supabase-db --tail=50
```

---

## LANGKAH 3 — MIGRATE DATABASE DARI SUPABASE CLOUD

### 3.1 Export Data dari Supabase Cloud (Phase 1)

**Di mesin lokal kamu** (bukan VPS), jalankan:

```bash
# Install pg_dump jika belum ada
# Mac: brew install postgresql
# Windows: https://www.postgresql.org/download/windows/

# Export dari Supabase Cloud (ambil connection string dari Dashboard)
# Supabase Dashboard → Settings → Database → Connection String → URI
pg_dump \
  "postgresql://postgres:[DB_PASSWORD]@db.[REF].supabase.co:5432/postgres" \
  --schema=public \
  --no-owner \
  --no-acl \
  -f backup_sippro_$(date +%Y%m%d).sql

# Verifikasi file backup ada dan tidak kosong
ls -lh backup_sippro_*.sql
```

### 3.2 Transfer Backup ke VPS

```bash
# Dari mesin lokal, kirim file backup ke VPS
scp backup_sippro_*.sql sippro@[IP_VPS]:~/

# Verifikasi sudah terkirim
ssh sippro@[IP_VPS] "ls -lh ~/backup_sippro_*.sql"
```

### 3.3 Import ke Supabase Self-host

```bash
# Di VPS — masuk ke dalam container PostgreSQL dan import
docker exec -i supabase-db psql \
  -U postgres \
  -d postgres \
  < ~/backup_sippro_[TANGGAL].sql

# Verifikasi tabel berhasil diimport
docker exec -it supabase-db psql -U postgres -d postgres \
  -c "\dt public.*"

# Harus tampil semua tabel yang ada di schema kamu
```

### 3.4 Reset Auth Data (jika ada)

Jika kamu menggunakan auth Supabase Cloud untuk user management, data user perlu dimigrasikan atau dibuat ulang:

```bash
# Cek apakah ada data di auth.users
docker exec -it supabase-db psql -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM auth.users;"

# Jika pakai JWT custom (seperti di SI kamu — bcrypt + JWT manual),
# tidak ada yang perlu dilakukan untuk auth migration —
# user data ada di tabel public kamu, bukan auth.users Supabase
```

---

## LANGKAH 4 — DEPLOY NEXT.JS DI VPS

### 4.1 Clone Repository ke VPS

```bash
# Di VPS, sebagai user sippro
cd ~/apps

# Clone dari GitHub
git clone https://github.com/[USERNAME]/[REPO_SIPPRO].git sippro-app
cd sippro-app
```

### 4.2 Setup Environment Variables untuk Production VPS

```bash
# Buat file .env.production.local di VPS
nano .env.production.local
```

```env
# Supabase Self-host — koneksi ke localhost (karena 1 VPS)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
# Atau jika expose via subdomain:
# NEXT_PUBLIC_SUPABASE_URL=https://api.yourdomain.com

NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY_YANG_DIGENERATE_LANGKAH_2.3]

# JWT Secret — HARUS SAMA dengan yang diset di Supabase .env
JWT_SECRET=[JWT_SECRET_SUPABASE_KAMU]

NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

> ⚠️ NEXT_PUBLIC_SUPABASE_URL berubah dari `https://[ref].supabase.co`
> menjadi URL VPS kamu sendiri. Ini berarti kamu perlu update kode
> atau pastikan environment variable ini diambil secara dynamic.

### 4.3 Install Dependencies & Build

```bash
# Install dependencies
npm ci --production=false  # install semua deps termasuk devDeps untuk build

# Build Next.js untuk production
npm run build

# Jika build berhasil, output terakhir:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
```

### 4.4 Setup PM2 untuk Menjalankan Next.js

```bash
# Buat konfigurasi PM2
cat > ~/apps/sippro-app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'sippro',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/sippro/apps/sippro-app',
      instances: 1,           // untuk VPS 2 core, 1 instance sudah cukup
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Auto-restart jika crash
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',  // restart jika RAM > 1GB
      // Logging
      error_file: '/home/sippro/logs/sippro-error.log',
      out_file: '/home/sippro/logs/sippro-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
EOF

# Buat direktori log
mkdir -p ~/logs

# Jalankan dengan PM2
pm2 start ecosystem.config.js

# Setup PM2 auto-start saat VPS reboot
pm2 startup systemd -u sippro --hp /home/sippro
# Jalankan command yang muncul dari output di atas (biasanya mulai dengan sudo env PATH=...)
pm2 save

# Cek status
pm2 status
pm2 logs sippro --lines 20
```

---

## LANGKAH 5 — SETUP CADDY SEBAGAI REVERSE PROXY

Caddy dipilih karena **SSL otomatis** (Let's Encrypt) tanpa konfigurasi manual.

### 5.1 Install Caddy

```bash
# Jalankan sebagai root atau sudo
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### 5.2 Konfigurasi Caddy (Caddyfile)

```bash
sudo nano /etc/caddy/Caddyfile
```

Isi dengan konfigurasi berikut:

```caddyfile
# Main app — Next.js
yourdomain.com {
    reverse_proxy localhost:3000

    # Tambahan header keamanan
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    # Kompresi untuk performa lebih baik
    encode gzip

    # Logging
    log {
        output file /var/log/caddy/access.log
        format json
    }
}

# Supabase API Gateway — opsional, untuk akses API dari luar
# Aktifkan jika NEXT_PUBLIC_SUPABASE_URL menggunakan subdomain ini
# api.yourdomain.com {
#     reverse_proxy localhost:8000
# }

# Supabase Studio — opsional, batasi akses jika perlu
# studio.yourdomain.com {
#     reverse_proxy localhost:3001
#     # Tambah basic auth jika perlu:
#     # basicauth {
#     #     admin $2a$14$...  # bcrypt hash password
#     # }
# }
```

```bash
# Validasi konfigurasi Caddy
sudo caddy validate --config /etc/caddy/Caddyfile

# Restart Caddy untuk apply konfigurasi
sudo systemctl reload caddy

# Cek status
sudo systemctl status caddy

# Cek log jika ada masalah
sudo journalctl -u caddy --since "5 minutes ago"
```

### 5.3 Konfigurasi DNS — Arahkan Domain ke VPS

Di panel DNS registrar domain kamu:

```
Type  : A
Name  : @  (atau yourdomain.com)
Value : [IP_VPS_HOSTINGER]
TTL   : 300 (atau default)

Type  : A  
Name  : www
Value : [IP_VPS_HOSTINGER]
```

Caddy akan **otomatis** mengurus SSL certificate begitu DNS propagasi selesai.

---

## LANGKAH 6 — SETUP BACKUP OTOMATIS

Ini KRITIS karena tidak ada managed backup di self-host.

### 6.1 Script Backup Database Harian

```bash
# Buat direktori backup
mkdir -p ~/backups/database

# Buat script backup
cat > ~/scripts/backup-db.sh << 'EOF'
#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/backups/database"
BACKUP_FILE="$BACKUP_DIR/sippro_db_$DATE.sql.gz"
RETENTION_DAYS=7  # simpan backup 7 hari terakhir

echo "[$DATE] Mulai backup database..."

# Dump database dari container PostgreSQL
docker exec supabase-db pg_dump \
  -U postgres \
  -d postgres \
  --schema=public \
  --no-owner \
  | gzip > "$BACKUP_FILE"

echo "[$DATE] Backup selesai: $BACKUP_FILE ($(du -sh $BACKUP_FILE | cut -f1))"

# Hapus backup lebih lama dari RETENTION_DAYS hari
find "$BACKUP_DIR" -name "sippro_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$DATE] Backup lama sudah dibersihkan (retain $RETENTION_DAYS hari)"
EOF

mkdir -p ~/scripts
chmod +x ~/scripts/backup-db.sh

# Test backup berjalan
~/scripts/backup-db.sh

# Cek file backup ada
ls -lh ~/backups/database/
```

### 6.2 Jadwalkan Backup via Cron

```bash
# Edit crontab
crontab -e

# Tambahkan baris berikut (backup setiap hari jam 02.00 WIB = 19.00 UTC)
0 19 * * * /home/sippro/scripts/backup-db.sh >> /home/sippro/logs/backup.log 2>&1

# Cek crontab tersimpan
crontab -l
```

### 6.3 Backup Off-site ke Backblaze B2 (Opsional tapi Sangat Direkomendasikan)

Backup di VPS yang sama tidak aman (kalau VPS bermasalah, backup ikut hilang):

```bash
# Install rclone untuk sinkronisasi ke cloud storage
curl https://rclone.org/install.sh | sudo bash

# Konfigurasi rclone dengan Backblaze B2 (free tier: 10GB gratis)
rclone config
# Ikuti wizard: pilih 'b2', masukkan Account ID dan Application Key dari Backblaze

# Tambahkan ke script backup:
# rclone copy ~/backups/database/ b2:nama-bucket-kamu/sippro-backup/
# rclone delete --min-age 30d b2:nama-bucket-kamu/sippro-backup/
```

---

## LANGKAH 7 — SETUP CI/CD (AUTO DEPLOY DARI GITHUB)

Agar tidak perlu SSH manual setiap kali ada update kode:

### 7.1 Setup GitHub Actions untuk Auto Deploy

Buat file `.github/workflows/deploy.yml` di repository kamu:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]  # deploy otomatis setiap push ke main

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd ~/apps/sippro-app
            
            # Pull kode terbaru
            git pull origin main
            
            # Install dependencies baru (jika ada perubahan package.json)
            npm ci --production=false
            
            # Build ulang
            npm run build
            
            # Restart app dengan zero-downtime (PM2)
            pm2 reload sippro
            
            echo "Deploy selesai: $(date)"
```

### 7.2 Setup GitHub Secrets

Di GitHub Repository → **Settings** → **Secrets and variables** → **Actions**:

| Secret Name | Value |
|-------------|-------|
| `VPS_HOST` | IP VPS Hostinger kamu |
| `VPS_USER` | `sippro` |
| `VPS_SSH_KEY` | Private key SSH (isi dengan `cat ~/.ssh/id_rsa`) |

### 7.3 Generate SSH Key untuk GitHub Actions

```bash
# Di VPS, generate SSH key khusus untuk GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-sippro" -f ~/.ssh/github_actions -N ""

# Tambahkan public key ke authorized_keys VPS
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Copy private key untuk disimpan di GitHub Secrets
cat ~/.ssh/github_actions
# Salin seluruh output (dari -----BEGIN... hingga -----END...) ke GitHub Secret VPS_SSH_KEY
```

---

## LANGKAH 8 — MONITORING VPS

### 8.1 Pantau Resource Penggunaan

```bash
# CPU, RAM, disk — snapshot sesaat
htop        # interaktif (install: apt install htop)
free -h     # RAM usage
df -h       # Disk usage

# Pantau container Supabase
docker stats --no-stream  # snapshot usage semua container
```

### 8.2 Setup Monitoring Otomatis (Netdata — Gratis)

```bash
# Install Netdata untuk monitoring real-time
bash <(curl -Ss https://my-netdata.io/kickstart.sh) --non-interactive

# Akses dashboard (hanya dari lokal VPS atau via SSH tunnel)
# http://localhost:19999
# atau via SSH tunnel: ssh -L 19999:localhost:19999 sippro@[IP_VPS]
```

### 8.3 Alert Disk Space (Cron)

```bash
# Tambahkan ke crontab — alert via email/log jika disk > 80%
cat > ~/scripts/check-disk.sh << 'EOF'
#!/bin/bash
THRESHOLD=80
USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "⚠️ ALERT: Disk usage VPS sudah $USAGE% (threshold $THRESHOLD%)" | \
    tee -a /home/sippro/logs/alerts.log
fi
EOF
chmod +x ~/scripts/check-disk.sh

# Tambah ke crontab (cek setiap jam)
# 0 * * * * /home/sippro/scripts/check-disk.sh
```

---

## LANGKAH 9 — PROSEDUR UPDATE SUPABASE SELF-HOST

Supabase merilis update rutin. Cara update yang aman:

```bash
cd ~/apps/supabase

# Backup database dulu sebelum update!
~/scripts/backup-db.sh

# Pull versi terbaru
git pull

# Update images
cd docker
docker compose pull

# Restart dengan versi baru (downtime ~30 detik)
docker compose down
docker compose up -d

# Verifikasi semua container healthy
docker compose ps
```

> Lakukan update ini maksimal 1x sebulan,
> dan selalu di jam sepi (malam hari / weekend).

---

## CHECKLIST MIGRASI PHASE 2

```
PERSIAPAN
□ Backup database dari Supabase Cloud sudah diambil
□ File backup berhasil di-restore secara lokal (test)
□ Semua env variable sudah dicatat

VPS SETUP
□ SSH berhasil masuk ke VPS
□ User non-root (sippro) sudah dibuat
□ Firewall (UFW) sudah aktif, port 80/443/22 saja yang terbuka
□ Node.js 20, PM2, Docker sudah terinstall

SUPABASE SELF-HOST
□ Supabase docker sudah di-clone
□ File .env sudah dikonfigurasi (POSTGRES_PASSWORD, JWT_SECRET, API keys)
□ API keys (ANON_KEY, SERVICE_ROLE_KEY) sudah digenerate ulang
□ docker compose up berjalan, semua container status Up/healthy
□ Test koneksi PostgreSQL berhasil (via docker exec)
□ Data dari backup berhasil diimport

NEXT.JS DEPLOY
□ Repository sudah di-clone ke VPS
□ .env.production.local sudah dikonfigurasi dengan URL Supabase self-host
□ npm run build berhasil
□ PM2 sudah jalan (pm2 status: online)
□ PM2 auto-start sudah disetup (pm2 startup + pm2 save)

CADDY REVERSE PROXY
□ Caddy terinstall
□ Caddyfile sudah dikonfigurasi
□ DNS sudah diarahkan ke IP VPS
□ SSL otomatis aktif (https berjalan)
□ Akses via browser ke yourdomain.com berhasil

BACKUP
□ Script backup-db.sh sudah dibuat dan ditest
□ Cron backup harian sudah aktif
□ (Opsional) Off-site backup ke Backblaze B2 sudah dikonfigurasi

CI/CD
□ GitHub Actions workflow sudah dibuat
□ GitHub Secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY) sudah diset
□ Test deploy otomatis: push ke main → berhasil deploy ke VPS

POST-MIGRATE
□ Semua fitur ditest end-to-end di domain production
□ Supabase Cloud project di-pause (untuk hemat resource free tier)
□ Uptime monitoring (UptimeRobot) diupdate ke domain yang sama
□ Tim user sudah diinformasikan (tidak ada perubahan URL karena domain sama)
```

---

## TROUBLESHOOTING UMUM

### Container Supabase tidak mau start
```bash
# Cek log detail
docker compose logs [nama-service] --tail=100

# Paling sering: salah konfigurasi .env (JWT tidak valid, password salah)
# Solusi: periksa ulang .env, terutama bagian SECRETS
```

### Next.js tidak bisa koneksi ke Supabase self-host
```bash
# Test dari dalam VPS
curl http://localhost:8000/rest/v1/ \
  -H "apikey: [ANON_KEY]"

# Jika berhasil tapi Next.js error:
# → cek NEXT_PUBLIC_SUPABASE_URL di .env.production.local
# → pastikan tidak ada trailing slash
# → restart PM2: pm2 restart sippro
```

### SSL tidak aktif setelah DNS propagasi
```bash
# Cek log Caddy
sudo journalctl -u caddy -n 50

# Pastikan port 80 dan 443 bisa diakses dari luar (cek UFW)
sudo ufw status

# Caddy butuh port 80 untuk ACME challenge (verifikasi domain untuk SSL)
# Jika pakai Cloudflare proxy, matikan dulu (set ke DNS only) saat pertama kali
```

### VPS kehabisan RAM
```bash
# Cek penggunaan RAM
free -h
docker stats --no-stream

# Quick fix: tambah swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

*Dokumen ini mencakup seluruh langkah migrasi dari Vercel + Supabase Cloud*
*ke Hostinger KVM 2 + Supabase Self-host.*
*Simpan dokumen ini dan checklist sebagai referensi kerja.*
