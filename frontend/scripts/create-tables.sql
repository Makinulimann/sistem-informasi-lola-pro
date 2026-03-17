-- Create all tables for SIPP application
-- Run this in Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    no_induk VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    refresh_token TEXT,
    refresh_token_expiry_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sidebar Menus table
CREATE TABLE IF NOT EXISTS sidebar_menus (
    id SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    href VARCHAR(200),
    parent_id INTEGER,
    "order" INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    role_access VARCHAR(50) NOT NULL DEFAULT 'All',
    FOREIGN KEY (parent_id) REFERENCES sidebar_menus(id) ON DELETE NO ACTION
);

-- App Settings table
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(256) PRIMARY KEY,
    value VARCHAR(2048),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RKAP table
CREATE TABLE IF NOT EXISTS rkaps (
    id SERIAL PRIMARY KEY,
    product_slug VARCHAR(200) NOT NULL,
    bulan INTEGER NOT NULL,
    tahun INTEGER NOT NULL,
    target FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Produksi Tabs table
CREATE TABLE IF NOT EXISTS produksi_tabs (
    id SERIAL PRIMARY KEY,
    product_slug VARCHAR(200) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1
);

-- Produksi table
CREATE TABLE IF NOT EXISTS produksis (
    id SERIAL PRIMARY KEY,
    product_slug VARCHAR(200) NOT NULL,
    produksi_tab_id INTEGER NOT NULL,
    tanggal TIMESTAMPTZ NOT NULL,
    bs FLOAT NOT NULL DEFAULT 0,
    pg FLOAT NOT NULL DEFAULT 0,
    kumulatif FLOAT NOT NULL DEFAULT 0,
    stok_akhir FLOAT NOT NULL DEFAULT 0,
    coa FLOAT NOT NULL DEFAULT 0,
    keterangan VARCHAR(500),
    ps FLOAT NOT NULL DEFAULT 0,
    batch_kode VARCHAR(50) DEFAULT '',
    ps_batch_kode VARCHAR(50) DEFAULT '',
    coa_batch_kode VARCHAR(50) DEFAULT '',
    FOREIGN KEY (produksi_tab_id) REFERENCES produksi_tabs(id) ON DELETE CASCADE
);

-- Master Items table
CREATE TABLE IF NOT EXISTS master_items (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    kode VARCHAR(50),
    satuan_default VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    scope_product_slug VARCHAR(200)
);

-- Product Materials table
CREATE TABLE IF NOT EXISTS product_materials (
    id SERIAL PRIMARY KEY,
    product_slug VARCHAR(200) NOT NULL,
    master_item_id INTEGER NOT NULL,
    jenis VARCHAR(20) NOT NULL,
    FOREIGN KEY (master_item_id) REFERENCES master_items(id) ON DELETE CASCADE
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    product_slug VARCHAR(200) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Perusahaans table
CREATE TABLE IF NOT EXISTS perusahaans (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(200) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bahan Baku table
CREATE TABLE IF NOT EXISTS bahan_bakus (
    id SERIAL PRIMARY KEY,
    tipe VARCHAR(10) NOT NULL,
    product_slug VARCHAR(200) NOT NULL,
    perusahaan_id INTEGER,
    tanggal TIMESTAMPTZ NOT NULL,
    jenis VARCHAR(50) NOT NULL,
    nama_bahan VARCHAR(100) NOT NULL,
    kuantum FLOAT NOT NULL DEFAULT 0,
    dokumen VARCHAR(100),
    keterangan VARCHAR(500),
    satuan VARCHAR(20) DEFAULT '',
    FOREIGN KEY (perusahaan_id) REFERENCES perusahaans(id) ON DELETE NO ACTION
);

-- Balance Stoks table
CREATE TABLE IF NOT EXISTS balance_stoks (
    id SERIAL PRIMARY KEY,
    product_slug VARCHAR(200) NOT NULL,
    perusahaan_id INTEGER,
    tanggal TIMESTAMPTZ NOT NULL,
    produksi FLOAT NOT NULL DEFAULT 0,
    FOREIGN KEY (perusahaan_id) REFERENCES perusahaans(id) ON DELETE NO ACTION
);

-- Balance Stok Details table
CREATE TABLE IF NOT EXISTS balance_stok_details (
    id SERIAL PRIMARY KEY,
    balance_stok_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    "out" FLOAT NOT NULL DEFAULT 0,
    "in" FLOAT NOT NULL DEFAULT 0,
    stok_akhir FLOAT NOT NULL DEFAULT 0,
    FOREIGN KEY (balance_stok_id) REFERENCES balance_stoks(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

-- Analisas table
CREATE TABLE IF NOT EXISTS analisas (
    id SERIAL PRIMARY KEY,
    product_slug VARCHAR(200) NOT NULL,
    bulan INTEGER NOT NULL,
    tahun INTEGER NOT NULL,
    tanggal_sampling TIMESTAMPTZ NOT NULL,
    no_bapc VARCHAR(100),
    kuantum FLOAT NOT NULL DEFAULT 0,
    lembaga VARCHAR(100),
    hasil_analisa VARCHAR(50),
    tanggal_analisa TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aktivitas Harians table
CREATE TABLE IF NOT EXISTS aktivitas_harians (
    id SERIAL PRIMARY KEY,
    tanggal TIMESTAMPTZ NOT NULL,
    pic VARCHAR(100),
    lokasi VARCHAR(200),
    deskripsi VARCHAR(2000),
    dokumentasi VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Logbook Lokasis table
CREATE TABLE IF NOT EXISTS logbook_lokasis (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(200) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Logbook Pics table
CREATE TABLE IF NOT EXISTS logbook_pics (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Maintenances table
CREATE TABLE IF NOT EXISTS maintenances (
    id SERIAL PRIMARY KEY,
    tanggal TIMESTAMPTZ NOT NULL,
    equipment VARCHAR(200) NOT NULL,
    area VARCHAR(200) NOT NULL,
    kegiatan VARCHAR(2000) NOT NULL,
    keterangan VARCHAR(2000),
    dokumentasi VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (optional - can be disabled for development)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sidebar_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rkaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE produksi_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE produksis ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE perusahaans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bahan_bakus ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_stoks ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_stok_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE analisas ENABLE ROW LEVEL SECURITY;
ALTER TABLE aktivitas_harians ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbook_lokasis ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbook_pics ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (for development - in production, configure proper policies)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for sidebar_menus" ON sidebar_menus FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for rkaps" ON rkaps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for produksi_tabs" ON produksi_tabs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for produksis" ON produksis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for master_items" ON master_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for product_materials" ON product_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for materials" ON materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for perusahaans" ON perusahaans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for bahan_bakus" ON bahan_bakus FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for balance_stoks" ON balance_stoks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for balance_stok_details" ON balance_stok_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for analisas" ON analisas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for aktivitas_harians" ON aktivitas_harians FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for logbook_lokasis" ON logbook_lokasis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for logbook_pics" ON logbook_pics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for maintenances" ON maintenances FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
