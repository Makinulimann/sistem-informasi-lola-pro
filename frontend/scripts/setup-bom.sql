-- SIPPro — Setup Bill of Materials (BOM) Table
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor)

DROP TABLE IF EXISTS public.bill_of_materials CASCADE;

CREATE TABLE public.bill_of_materials (
    id SERIAL PRIMARY KEY,
    product_slug VARCHAR(200) NOT NULL,
    produksi_tab_id INTEGER NOT NULL,
    base_quantity NUMERIC NOT NULL DEFAULT 1000,
    material_id INTEGER NOT NULL,
    material_quantity NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disable Row Level Security (RLS) to ensure consistency with other tables (e.g. produksis, bahan_bakus)
-- which are updated via server-side endpoints using the anon/public key.
ALTER TABLE public.bill_of_materials DISABLE ROW LEVEL SECURITY;
