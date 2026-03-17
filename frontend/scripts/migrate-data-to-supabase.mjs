/**
 * Data Migration Script: Old PostgreSQL → Supabase (Robust Version)
 * 
 * This script exports data from the old PostgreSQL database and imports it into Supabase.
 * It handles case-sensitivity issues and specific table naming discrepancies.
 */

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local file manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.warn('Warning: .env.local not found');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    // Handle both commented and uncommented lines for convenience during transition
    if (line) {
      if (line.startsWith('#')) {
        line = line.substring(1).trim();
      }
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) process.env[key] = value;
      }
    }
  });
}

loadEnv();

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wtnnvlibowwffgtjzoou.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bm52bGlib3d3ZmZndGp6b291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODM2MzgsImV4cCI6MjA4ODk1OTYzOH0.XxR1BNfFpVhId1nOSMfmvxvcVPi5SBE3JQG-BZJIvwU';

console.log('Using Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

const oldDb = new pg.Client({
  host: 'localhost',
  port: 5432,
  database: 'sippro_db',
  user: 'sippro',
  password: 'sippro_dev_2024'
});

// Table mapping - old table name to new table name
// Fixed "AppSettings" -> "app_settings"
const tableMapping = {
  'Users': 'users',
  'SidebarMenus': 'sidebar_menus',
  'app_settings': 'app_settings',
  'Rkaps': 'rkaps',
  'ProduksiTabs': 'produksi_tabs',
  'Produksis': 'produksis',
  'MasterItems': 'master_items',
  'ProductMaterials': 'product_materials',
  'Materials': 'materials',
  'Perusahaans': 'perusahaans',
  'BahanBakus': 'bahan_bakus',
  'BalanceStoks': 'balance_stoks',
  'BalanceStokDetails': 'balance_stok_details',
  'Analisas': 'analisas',
  'AktivitasHarians': 'aktivitas_harians',
  'LogbookLokasis': 'logbook_lokasis',
  'LogbookPics': 'logbook_pics',
  'Maintenances': 'maintenances',
};

// Field mapping - PascalCase/Mixed to snake_case
const fieldMapping = {
  'id': 'id',
  'email': 'email',
  'fullname': 'full_name',
  'noinduk': 'no_induk',
  'role': 'role',
  'isverified': 'is_verified',
  'createdat': 'created_at',
  'updatedat': 'updated_at',
  'passwordhash': 'password_hash',
  'refreshtoken': 'refresh_token',
  'refreshtokenexpirytime': 'refresh_token_expiry_time',
  'productslug': 'product_slug',
  'produksitabid': 'produksi_tab_id',
  'tanggal': 'tanggal',
  'bs': 'bs',
  'pg': 'pg',
  'kumulatif': 'kumulatif',
  'stokakhir': 'stok_akhir',
  'coa': 'coa',
  'keterangan': 'keterangan',
  'ps': 'ps',
  'batchkode': 'batch_kode',
  'psbatchkode': 'ps_batch_kode',
  'coabatchkode': 'coa_batch_kode',
  'parentid': 'parent_id',
  'isactive': 'is_active',
  'label': 'label',
  'icon': 'icon',
  'href': 'href',
  'order': 'order',
  'roleaccess': 'role_access',
  'nama': 'nama',
  'kode': 'kode',
  'satuandefault': 'satuan_default',
  'scopeproductslug': 'scope_product_slug',
  'jenis': 'jenis',
  'masteritemid': 'master_item_id',
  'tipe': 'tipe',
  'perusahaanid': 'perusahaan_id',
  'namabahan': 'nama_bahan',
  'kuantum': 'kuantum',
  'dokumen': 'dokumen',
  'satuan': 'satuan',
  'equipment': 'equipment',
  'area': 'area',
  'kegiatan': 'kegiatan',
  'dokumentasi': 'dokumentasi',
  'pic': 'pic',
  'lokasi': 'lokasi',
  'deskripsi': 'deskripsi',
  'target': 'target',
  'bulan': 'bulan',
  'tahun': 'tahun',
  'nobapc': 'no_bapc',
  'lembaga': 'lembaga',
  'hasilanalisa': 'hasil_analisa',
  'tanggalsampling': 'tanggal_sampling',
  'tanggalanalisa': 'tanggal_analisa',
  'key': 'key',
  'value': 'value',
  'updated_at': 'updated_at'
};

// Convert fields using case-insensitive mapping
function convertFields(row) {
  const converted = {};
  for (const [key, value] of Object.entries(row)) {
    const lowerKey = key.toLowerCase();

    // Explicit fix for NamaBahan which might be coming as namabahan
    let targetKey = fieldMapping[lowerKey] || lowerKey;
    if (lowerKey === 'namabahan') targetKey = 'nama_bahan';
    if (lowerKey === 'productslug') targetKey = 'product_slug';
    if (lowerKey === 'masteritemid') targetKey = 'master_item_id';

    const newKey = targetKey;

    // Normalization for product slugs (petrogladiator -> petro-gladiator)
    let finalValue = value;
    if ((newKey === 'product_slug' || newKey === 'scope_product_slug') &&
      (value === 'petrogladiator' || value === 'PetroGladiator')) {
      finalValue = 'petro-gladiator';
    } else if (typeof value === 'string' && /petrogladiator/i.test(value)) {
      finalValue = value.replace(/petrogladiator/gi, 'petro-gladiator');
    }

    converted[newKey] = finalValue;
  }
  return converted;
}

async function migrateTable(oldTableName, newTableName) {
  console.log(`\nMigrating "${oldTableName}" → "${newTableName}"...`);

  try {
    const result = await oldDb.query(`SELECT * FROM "${oldTableName}"`);
    const rows = result.rows;

    if (rows.length === 0) {
      console.log(`  No data to migrate`);
      return 0;
    }

    console.log(`  Found ${rows.length} rows`);

    let successCount = 0;
    let errorCount = 0;

    // Use upsert with a sensible primary key
    // Most tables have 'id', but app_settings has 'key'
    const pk = (newTableName === 'app_settings') ? 'key' : 'id';

    for (const row of rows) {
      try {
        const converted = convertFields(row);

        if (newTableName === 'users' && !converted.id) {
          converted.id = crypto.randomUUID();
        }

        const { error } = await supabase
          .from(newTableName)
          .upsert(converted, { onConflict: pk });

        if (error) {
          console.error(`  Error inserting row (ID: ${converted[pk]}):`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`  Error processing row:`, err.message);
        errorCount++;
      }
    }

    console.log(`  Success: ${successCount}, Errors: ${errorCount}`);
    return successCount;
  } catch (error) {
    console.error(`  Error migrating table "${oldTableName}":`, error.message);
    return 0;
  }
}

async function migrate() {
  console.log('=== Data Migration: Old PostgreSQL → Supabase (Robust) ===\n');

  await oldDb.connect();
  console.log('Connected to local database!\n');

  let totalMigrated = 0;

  for (const [oldName, newName] of Object.entries(tableMapping)) {
    const count = await migrateTable(oldName, newName);
    totalMigrated += count;
  }

  await oldDb.end();

  console.log(`\n=== Migration Complete ===`);
  console.log(`Total records migrated: ${totalMigrated}`);
  console.log(`Note: Slugs 'petrogladiator' were normalized to 'petro-gladiator'.`);
}

migrate().catch(console.error);
