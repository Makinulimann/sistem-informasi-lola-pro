/**
 * Batch Migration: Convert all API routes from Prisma to Supabase
 * Run: node scripts/batch-migrate-to-supabase.mjs
 * 
 * WARNING: This is an automated migration. Manual review is REQUIRED after.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

// Table name mapping (snake_case for Supabase)
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

// Field mapping (PascalCase to snake_case)
const FIELD_MAP = {
  'Id': 'id', 'Email': 'email', 'FullName': 'full_name', 'NoInduk': 'no_induk',
  'Role': 'role', 'IsVerified': 'is_verified', 'CreatedAt': 'created_at', 
  'UpdatedAt': 'updated_at', 'PasswordHash': 'password_hash', 'RefreshToken': 'refresh_token',
  'ProductSlug': 'product_slug', 'ProduksiTabId': 'produksi_tab_id', 'Tanggal': 'tanggal',
  'BS': 'bs', 'PG': 'pg', 'Kumulatif': 'kumulatif', 'StokAkhir': 'stok_akhir',
  'COA': 'coa', 'Keterangan': 'keterangan', 'PS': 'ps', 'BatchKode': 'batch_kode',
  'ParentId': 'parent_id', 'IsActive': 'is_active', 'Label': 'label', 'Href': 'href',
  'Order': 'order', 'Nama': 'nama', 'Jenis': 'jenis', 'MasterItemId': 'master_item_id',
  'Tipe': 'tipe', 'PerusahaanId': 'perusahaan_id', 'NamaBahan': 'nama_bahan',
  'Kuantum': 'kuantum', 'Dokumen': 'dokumen', 'Satuan': 'satuan', 'Equipment': 'equipment',
  'Area': 'area', 'Pic': 'pic', 'Lokasi': 'lokasi', 'Deskripsi': 'deskripsi',
  'Target': 'target', 'Bulan': 'bulan', 'Tahun': 'tahun', 'NoBAPC': 'no_bapc',
  'Lembaga': 'lembaga', 'HasilAnalisa': 'hasil_analisa',
};

function convertPrismaToSupabase(content) {
  let modified = false;
  let issues = [];

  // 1. Replace Prisma import with Supabase
  if (content.includes("import prisma from '@/lib/prisma'")) {
    content = content.replace(
      "import prisma from '@/lib/prisma'",
      "import { db } from '@/lib/supabase'"
    );
    modified = true;
  }

  // 2. Replace table references
  for (const [pascal, snake] of Object.entries(TABLE_MAP)) {
    const regex = new RegExp(`prisma\\.${pascal}`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, `db.from('${snake}')`);
      modified = true;
    }
  }

  // 3. Convert findMany({ where: {...} })
  content = content.replace(
    /findMany\(\{\s*where:\s*\{([\s\S]*?)\}(?:,\s*select:\s*\{([\s\S]*?)\})?\s*\}(?:,\s*orderBy:\s*\{([\s\S]*?)\})?\)/g,
    (match, where, select, orderBy) => {
      // For now, just return .execute()
      // Manual review needed for complex queries
      return '.execute()';
    }
  );

  // 4. Convert findUnique({ where: {...} }) -> .eq('field', value).single()
  content = content.replace(
    /findUnique\(\{\s*where:\s*\{([\s\S]*?)\}\s*\}(?:,\s*select:\s*\{([\s\S]*?)\})?\s*\)/g,
    (match, where) => {
      // Extract first condition
      const match2 = where.match(/(\w+):\s*(\w+)/);
      if (match2) {
        const field = FIELD_MAP[match2[1]] || match2[1].toLowerCase();
        return `.eq('${field}', ${match2[2]}).single()`;
      }
      return '.single() // NEEDS MANUAL FIX';
    }
  );

  // 5. Convert findFirst({ where: {...} })
  content = content.replace(
    /findFirst\(\{\s*where:\s*([\s\S]*?)\}(?:,\s*select:\s*\{([\s\S]*?)\})?\s*\)/g,
    (match, where) => '.execute() // NEEDS MANUAL FIX'
  );

  // 6. Convert create({ data: {...} })
  content = content.replace(
    /create\(\{\s*data:\s*([\s\S]*?)\}\s*\)/g,
    'insert(DATA_PLACEHOLDER) // NEEDS MANUAL FIX'
  );

  // 7. Convert update({ where: {...}, data: {...} })
  content = content.replace(
    /update\(\{\s*where:\s*\{([\s\S]*?)\},\s*data:\s*([\s\S]*?)\}\s*\)/g,
    'update(DATA_PLACEHOLDER).eq(CONDITION_PLACEHOLDER) // NEEDS MANUAL FIX'
  );

  // 8. Convert delete({ where: {...} })
  content = content.replace(
    /delete\(\{\s*where:\s*\{([\s\S]*?)\}\s*\)/g,
    'delete().eq(CONDITION_PLACEHOLDER) // NEEDS MANUAL FIX'
  );

  // 9. Convert deleteMany({ where: {...} })
  content = content.replace(
    /deleteMany\(\{\s*where:\s*\{([\s\S]*?)\}\s*\)/g,
    'delete().eq(CONDITION_PLACEHOLDER) // NEEDS MANUAL FIX'
  );

  // 10. Change runtime to edge
  if (content.includes("runtime = 'nodejs'")) {
    content = content.replace(
      "export const runtime = 'nodejs';",
      "// Edge runtime now supported with Supabase!\nexport const runtime = 'edge';"
    );
    modified = true;
  }

  // Check for raw SQL - needs manual migration
  if (content.includes('$queryRaw') || content.includes('$executeRaw')) {
    issues.push('Contains $queryRaw/$executeRaw - MUST be manually converted');
  }

  // Check for transactions
  if (content.includes('$transaction')) {
    issues.push('Contains $transaction - MUST be manually converted');
  }

  // Check for aggregate
  if (content.includes('.aggregate(')) {
    issues.push('Contains aggregate() - MUST be manually converted');
  }

  return { content, modified, issues };
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip if already converted
  if (content.includes("from '@/lib/supabase'")) {
    console.log(`Skipping (already converted): ${path.relative(__dirname, filePath)}`);
    return;
  }

  const { content: newContent, modified, issues } = convertPrismaToSupabase(content);
  
  if (modified || issues.length > 0) {
    const relPath = path.relative(__dirname, filePath);
    console.log(`\n=== ${relPath} ===`);
    
    if (issues.length > 0) {
      issues.forEach(i => console.log(`  ⚠️  ${i}`));
    }
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`  ✅ Converted (but REQUIRES MANUAL REVIEW)`);
    }
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

console.log('='.repeat(60));
console.log('BATCH MIGRATION: Prisma -> Supabase');
console.log('='.repeat(60));
console.log('\n⚠️  WARNING: This is an AUTOMATED migration.');
console.log('⚠️  All converted files REQUIRE MANUAL REVIEW.');
console.log('⚠️  Raw SQL and complex queries MUST be manually converted.\n');

processDirectory(apiDir);

console.log('\n' + '='.repeat(60));
console.log('MIGRATION COMPLETE');
console.log('='.repeat(60));
console.log('\nNext steps:');
console.log('1. Review each converted file');
console.log('2. Fix DATA_PLACEHOLDER and CONDITION_PLACEHOLDER');
console.log('3. Handle $queryRaw, $transaction, aggregate manually');
console.log('4. Test each endpoint');
