-- SIPPro — Add image_url, jenis, and satuan columns to sidebar_menus
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor) or local postgres

ALTER TABLE public.sidebar_menus ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.sidebar_menus ADD COLUMN IF NOT EXISTS jenis TEXT;
ALTER TABLE public.sidebar_menus ADD COLUMN IF NOT EXISTS satuan TEXT;
