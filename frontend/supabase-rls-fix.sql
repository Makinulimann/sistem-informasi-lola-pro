-- ============================================================
-- SIPPro — Supabase RLS (Row Level Security) Fix Script
-- ============================================================
-- Jalankan script ini di Supabase SQL Editor (Dashboard > SQL Editor)
-- Script ini mengaktifkan RLS dan membuat policy dasar untuk 5 tabel
-- yang saat ini masih terbuka tanpa perlindungan.
--
-- PENTING: Semua API route SIPPro menggunakan `anon key` melalui 
-- REST API. Tanpa RLS, siapa saja dengan anon key bisa membaca/menulis 
-- data langsung ke tabel tanpa melalui API route yang terproteksi.
-- ============================================================

-- ┌─────────────────────────────────────────────┐
-- │ 0. ADD PHOTO_URL COLUMN TO USERS TABLE       │
-- └─────────────────────────────────────────────┘

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ┌─────────────────────────────────────────────┐
-- │ 1. ENABLE RLS ON ALL 5 TABLES               │
-- └─────────────────────────────────────────────┘

ALTER TABLE public.rko_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;


-- ┌─────────────────────────────────────────────┐
-- │ 2. CREATE RLS POLICIES                       │
-- │    Strategi: Hanya authenticated users yang  │
-- │    bisa SELECT/INSERT/UPDATE/DELETE.          │
-- │    Anon users diblokir sepenuhnya.            │
-- └─────────────────────────────────────────────┘

-- ── rko_targets ──────────────────────────────
CREATE POLICY "Authenticated users can read rko_targets"
  ON public.rko_targets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert rko_targets"
  ON public.rko_targets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update rko_targets"
  ON public.rko_targets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rko_targets"
  ON public.rko_targets FOR DELETE
  TO authenticated
  USING (true);

-- ── products ─────────────────────────────────
CREATE POLICY "Authenticated users can read products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (true);

-- ── bill_of_materials ────────────────────────
CREATE POLICY "Authenticated users can read bill_of_materials"
  ON public.bill_of_materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert bill_of_materials"
  ON public.bill_of_materials FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bill_of_materials"
  ON public.bill_of_materials FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete bill_of_materials"
  ON public.bill_of_materials FOR DELETE
  TO authenticated
  USING (true);

-- ── raw_materials ────────────────────────────
CREATE POLICY "Authenticated users can read raw_materials"
  ON public.raw_materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert raw_materials"
  ON public.raw_materials FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update raw_materials"
  ON public.raw_materials FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete raw_materials"
  ON public.raw_materials FOR DELETE
  TO authenticated
  USING (true);

-- ── production_plans ─────────────────────────
CREATE POLICY "Authenticated users can read production_plans"
  ON public.production_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert production_plans"
  ON public.production_plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update production_plans"
  ON public.production_plans FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete production_plans"
  ON public.production_plans FOR DELETE
  TO authenticated
  USING (true);

-- ┌─────────────────────────────────────────────┐
-- │ 3. VERIFIKASI                                │
-- └─────────────────────────────────────────────┘

-- Jalankan query berikut untuk memastikan RLS aktif:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('rko_targets', 'products', 'bill_of_materials', 'raw_materials', 'production_plans');

-- Expected output: rowsecurity = true untuk semua 5 tabel
