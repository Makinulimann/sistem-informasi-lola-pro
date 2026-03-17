/**
 * Batch Migration Script: Prisma → Supabase
 * 
 * This script automates the migration of API routes from Prisma to Supabase.
 * Run with: node scripts/migrate-prisma-to-supabase.mjs
 * 
 * WARNING: This script handles common patterns. Complex queries ($queryRaw, $executeRaw)
 * and advanced Prisma features require manual migration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

// Supabase table name mapping (PascalCase -> snake_case)
const TABLE_MAP = {
  'users': 'users',
  'sidebarMenus': 'sidebar_menus',
  'app_settings': 'app_settings',
  'rkaps': 'rkaps',
  'produksiTabs': 'produksi_tabs',
  'produksis': 'produksis',
  'productMaterials': 'product_materials',
  'masterItems': 'master_items',
  'maintenances': 'maintenances',
  'bahanBakus': 'bahan_bakus',
  'materials': 'materials',
  'perusahaans': 'perusahaans',
  'balanceStoks': 'balance_stoks',
  'balanceStokDetails': 'balance_stok_details',
  'analisas': 'analisas',
  'aktivitasHarians': 'aktivitas_harians',
  'logbookLokasis': 'logbook_lokasis',
  'logbookPics': 'logbook_pics',
};

// Field mapping (PascalCase -> snake_case)
const FIELD_MAP = {
  'Id': 'id',
  'Email': 'email',
  'FullName': 'full_name',
  'NoInduk': 'no_induk',
  'Role': 'role',
  'IsVerified': 'is_verified',
  'CreatedAt': 'created_at',
  'UpdatedAt': 'updated_at',
  'PasswordHash': 'password_hash',
  'RefreshToken': 'refresh_token',
  'RefreshTokenExpiryTime': 'refresh_token_expiry_time',
  'ProductSlug': 'product_slug',
  'ProduksiTabId': 'produksi_tab_id',
  'Tanggal': 'tanggal',
  'BS': 'bs',
  'PG': 'pg',
  'Kumulatif': 'kumulatif',
  'StokAkhir': 'stok_akhir',
  'COA': 'coa',
  'Keterangan': 'keterangan',
  'PS': 'ps',
  'BatchKode': 'batch_kode',
  'PSBatchKode': 'ps_batch_kode',
  'COABatchKode': 'coa_batch_kode',
  'ParentId': 'parent_id',
  'IsActive': 'is_active',
  'Label': 'label',
  'Icon': 'icon',
  'Href': 'href',
  'Order': 'order',
  'RoleAccess': 'role_access',
  'Nama': 'nama',
  'Kode': 'kode',
  'SatuanDefault': 'satuan_default',
  'ScopeProductSlug': 'scope_product_slug',
  'Jenis': 'jenis',
  'MasterItemId': 'master_item_id',
  'Tipe': 'tipe',
  'PerusahaanId': 'perusahaan_id',
  'NamaBahan': 'nama_bahan',
  'Kuantum': 'kuantum',
  'Dokumen': 'dokumen',
  'Satuan': 'satuan',
  'Equipment': 'equipment',
  'Area': 'area',
  ' Kegiatan': 'kegiatan',
  'Dokumentasi': 'dokumentasi',
  'Pic': 'pic',
  'Lokasi': 'lokasi',
  'Deskripsi': 'deskripsi',
  'Target': 'target',
  'Bulan': 'bulan',
  'Tahun': 'tahun',
  'NoBAPC': 'no_bapc',
  'Lembaga': 'lembaga',
  'HasilAnalisa': 'hasil_analisa',
  'TanggalSampling': 'tanggal_sampling',
  'TanggalAnalisa': 'tanggal_analisa',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let warnings = [];

  // 1. Replace import
  if (content.includes("import prisma from '@/lib/prisma'")) {
    content = content.replace(
      "import prisma from '@/lib/prisma'",
      "import { db } from '@/lib/supabase'"
    );
    modified = true;
  }

  // 2. Replace table names
  for (const [pascal, snake] of Object.entries(TABLE_MAP)) {
    const regex = new RegExp(`prisma\\.${pascal}`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, `db.from('${snake}')`);
      modified = true;
    }
  }

  // 3. Replace common patterns
  // findMany({ where: { field: value } })
  content = content.replace(
    /findMany\(\{\s*where:\s*\{([^}]+)\}\s*\}\)/g,
    (match, whereClause) => {
      // Convert PascalCase fields in where clause
      let converted = whereClause;
      for (const [pascal, snake] of Object.entries(FIELD_MAP)) {
        converted = converted.replace(new RegExp(`\\b${pascal}\\b`, 'g'), snake);
      }
      return `.execute()`;
    }
  );

  // findUnique({ where: { Id: id } }) -> .eq('id', id).single()
  content = content.replace(
    /findUnique\(\{\s*where:\s*\{([^}]+)\}\s*\}\)/g,
    (match, whereClause) => {
      // Extract field name and value
      const idMatch = whereClause.match(/(\w+):\s*(\w+)/);
      if (idMatch) {
        const field = FIELD_MAP[idMatch[1]] || idMatch[1].toLowerCase();
        return `.eq('${field}', ${idMatch[2]}).single()`;
      }
      return match;
    }
  );

  // findFirst({ where: { ... } })
  content = content.replace(
    /findFirst\(\{\s*where:\s*([^}]+)\}\s*\)/g,
    (match, whereClause) => {
      return `.execute()`;
    }
  );

  // Check for $queryRaw or $executeRaw - these need manual migration
  if (content.includes('$queryRaw') || content.includes('$executeRaw')) {
    warnings.push('Contains raw SQL queries ($queryRaw/$executeRaw) - requires manual migration');
  }

  // Check for aggregate/count - requires manual migration
  if (content.includes('aggregate') || content.includes('count(')) {
    warnings.push('Contains aggregate/count queries - requires manual migration');
  }

  // Check for $transaction - requires manual migration
  if (content.includes('$transaction')) {
    warnings.push('Contains transactions - requires manual migration');
  }

  if (modified || warnings.length > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Processed: ${path.relative(__dirname, filePath)}`);
    warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  }
}

function processDirectory(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      processDirectory(fullPath);
    } else if (dirent.isFile() && dirent.name === 'route.ts') {
      processFile(fullPath);
    }
  });
}

console.log('Starting Prisma → Supabase migration...\n');
processDirectory(apiDir);
console.log('\nMigration complete!');
console.log('\n⚠️  WARNING: This script provides basic migration only.');
console.log('⚠️  Complex queries, raw SQL, transactions, and aggregations require manual review.');
console.log('\nNext steps:');
console.log('1. Review each migrated file for correctness');
console.log('2. Update field mappings to match your Supabase schema');
console.log('3. Test each endpoint individually');
