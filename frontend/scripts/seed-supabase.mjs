// Seed script to populate Supabase with initial data
// Run with: node scripts/seed-supabase.mjs

const SUPABASE_URL = 'https://wtnnvlibowwffgtjzoou.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bm52bGlib3d3ZmZndGp6b291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODM2MzgsImV4cCI6MjA4ODk1OTYzOH0.XxR1BNfFpVhId1nOSMfmvxvcVPi5SBE3JQG-BZJIvwU';

async function supabaseFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Prefer': options.prefer || 'return=representation',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();
  return { data, status: response.status, error: response.ok ? null : data };
}

// Sample data for seeding
const users = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@petro.com',
    password_hash: '$2a$10$test_hash_for_demo', // In production, use bcrypt
    full_name: 'Administrator',
    no_induk: 'ADMIN001',
    role: 'admin',
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'operator@petro.com',
    password_hash: '$2a$10$test_hash_for_demo',
    full_name: 'Operator Petro',
    no_induk: 'OPR001',
    role: 'operator',
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const sidebarItems = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    title: 'Dashboard',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    parent_id: null,
    order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    title: 'Produk Pengembangan',
    path: '/dashboard/produk-pengembangan',
    icon: 'Package',
    parent_id: null,
    order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    title: 'Petro Gladiator',
    path: '/dashboard/produk-pengembangan/petro-gladiator',
    icon: 'Shield',
    parent_id: '550e8400-e29b-41d4-a716-446655440011',
    order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    title: 'Bahan Baku',
    path: '/dashboard/produk-pengembangan/petro-gladiator/bahan-baku',
    icon: 'Box',
    parent_id: '550e8400-e29b-41d4-a716-446655440012',
    order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440014',
    title: 'Produksi',
    path: '/dashboard/produk-pengembangan/petro-gladiator/produksi',
    icon: 'Factory',
    parent_id: '550e8400-e29b-41d4-a716-446655440012',
    order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440015',
    title: 'Analisa',
    path: '/dashboard/produk-pengembangan/petro-gladiator/analisa',
    icon: 'Microscope',
    parent_id: '550e8400-e29b-41d4-a716-446655440012',
    order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440016',
    title: 'Aktivitas Harian',
    path: '/dashboard/produk-pengembangan/aktivitas-harian',
    icon: 'Calendar',
    parent_id: '550e8400-e29b-41d4-a716-446655440011',
    order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440017',
    title: 'Maintenance',
    path: '/dashboard/produk-pengembangan/maintenance',
    icon: 'Wrench',
    parent_id: '550e8400-e29b-41d4-a716-446655440011',
    order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440018',
    title: 'Admin',
    path: '/dashboard/admin',
    icon: 'Settings',
    parent_id: null,
    order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const settings = [
  {
    id: '550e8400-e29b-41d4-a716-446655440020',
    key: 'company_name',
    value: 'PT Petrokimia Gresik',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440021',
    key: 'app_name',
    value: 'SIPP - Sistem Informasi Produksi Petrokimia',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const perusahaan = [
  {
    id: '550e8400-e29b-41d4-a716-446655440030',
    nama: 'PT Petrokimia Gresik',
    alamat: 'Jalan Jendral Ahmad Yani, Gresik',
    telepon: '(031) 3981811',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const lokasi = [
  {
    id: '550e8400-e29b-41d4-a716-446655440040',
    nama: 'Pabrik Utama',
    deskripsi: 'Lokasi produksi utama',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440041',
    nama: 'Gudang Penyimpanan',
    deskripsi: 'Gudang penyimpanan bahan baku',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const pic = [
  {
    id: '550e8400-e29b-41d4-a716-446655440050',
    nama: 'Kepala Produksi',
    nik: 'PIC001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440051',
    nama: ' QC Manager',
    nik: 'PIC002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function seedTable(tableName, data) {
  console.log(`Seeding ${tableName}...`);
  
  // First, try to delete existing data
  try {
    await supabaseFetch(`${tableName}`, {
      method: 'DELETE',
      headers: { 'Prefer': 'return=minimal' },
    });
  } catch (e) {
    // Table might be empty, ignore
  }
  
  // Insert new data
  const { data: result, error, status } = await supabaseFetch(`${tableName}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (error) {
    console.error(`  Error seeding ${tableName}:`, error);
    return false;
  }
  
  console.log(`  ✓ Seeded ${data.length} records to ${tableName}`);
  return true;
}

async function main() {
  console.log('=== Seeding Supabase Database ===\n');
  
  // Seed tables in order (respecting foreign keys)
  await seedTable('users', users);
  await seedTable('sidebar', sidebarItems);
  await seedTable('settings', settings);
  await seedTable('perusahaan', perusahaan);
  await seedTable('lokasi', lokasi);
  await seedTable('pic', pic);
  
  console.log('\n=== Seeding Complete ===');
  console.log('\nTest login credentials:');
  console.log('  Admin: admin@petro.com / password');
  console.log('  Operator: operator@petro.com / password');
  console.log('\nNote: Password hashing is a demo - in production, use proper bcrypt hashes');
}

main().catch(console.error);
