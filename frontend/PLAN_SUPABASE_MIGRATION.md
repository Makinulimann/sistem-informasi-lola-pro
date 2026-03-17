# Plan Migrasi Penuh ke Supabase untuk Cloudflare Edge

## Masalah Saat Ini

| Komponen | Masalah |
|----------|---------|
| **Prisma + Neon** | Menggunakan TCP sockets (tidak support Edge) |
| **bcryptjs** | Menggunakan Node.js `crypto` module |
| **jose** | Menggunakan Node.js APIs |

## Solusi: Full Supabase Migration

### Step 1: Setup Supabase

1. **Buat Project Supabase**
   - Daftar di supabase.com
   - Buat new project
   - Catat URL dan ANON KEY

2. **Setup Environment Variables**
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Migrasi Database Schema**
   - Export schema dari Prisma
   - Import ke Supabase (via SQL Editor)

---

### Step 2: Convert Authentication (bcryptjs → Supabase Auth)

**File:** `src/lib/auth.ts` (ubah ke Supabase Auth)

```typescript
// Ganti bcrypt dengan Supabase Auth
import { supabase } from './supabase';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}
```

---

### Step 3: Convert API Routes (49 files)

Pattern lama (Prisma):
```typescript
import prisma from '@/lib/prisma';
const user = await prisma.users.findUnique({ where: { Email: email } });
const passwordValid = await bcrypt.compare(password, user.PasswordHash);
```

Pattern baru (Supabase):
```typescript
import { db } from '@/lib/supabase';
const { data: user } = await db.from('users').eq('email', email).single();
// Password verification via Supabase Auth
```

**File dengan masalah:**
- `src/app/api/auth/login/route.ts` - Ganti bcrypt.compare dengan Supabase Auth
- Semua route lain - Ganti prisma.query dengan db.from()

---

### Step 4: Handle Edge-Runtime Routes

**File:** `src/app/api/auth/login/route.ts`

```typescript
export const runtime = 'edge';  // Sekarang bisa!
```

---

## Ringkasan Perubahan per File

| File | Perubahan |
|------|-----------|
| `src/lib/prisma.ts` | Hapus (tidak perlu lagi) |
| `src/lib/auth.ts` | Ganti ke Supabase Auth |
| `src/lib/supabase.ts` | Sudah ada ✅ |
| `src/app/api/auth/login/route.ts` | Ganti bcrypt + prisma → Supabase Auth |
| `src/app/api/*/route.ts` (48 files) | Ganti prisma → db.from() |

---

## Estimasi Effort

| Task | Waktu |
|------|-------|
| Setup Supabase | 30 menit |
| Convert auth (1 file) | 1 jam |
| Convert API routes (49 files) | 8-16 jam |
| Testing | 4 jam |
| **Total** | **~14-22 jam** |

---

## Alternative: Hybrid Approach (Lebih Cepat)

Jika migrasi penuh terlalu lama, bisa pakai pendekatan hybrid:

1. **Auth routes** → Node.js (karena Supabase Auth sudah handle ini)
2. **API routes** → Supabase REST
3. **Static pages** → Edge

Ini memberi:
- ~70% Edge coverage
- Auth handled by Supabase
- Database via REST API
