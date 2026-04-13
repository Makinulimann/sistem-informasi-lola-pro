-- Migration: Create rko_targets table (v2 - includes tab_name for per-jenis targets)

CREATE TABLE IF NOT EXISTS public.rko_targets (
    id BIGSERIAL PRIMARY KEY,
    product_slug VARCHAR NOT NULL,
    tab_name    VARCHAR NOT NULL,
    tahun INT NOT NULL,
    bulan INT NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
    target_volume NUMERIC DEFAULT 0,
    target_kemasan NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_slug, tab_name, tahun, bulan)
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_rko_targets_modtime ON public.rko_targets;

CREATE TRIGGER update_rko_targets_modtime
    BEFORE UPDATE ON public.rko_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
