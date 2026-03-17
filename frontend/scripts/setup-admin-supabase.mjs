/**
 * Setup Admin User Script
 * Creates admin user in Supabase Auth and users table
 * 
 * Run with: node scripts/setup-admin-supabase.mjs
 */

const SUPABASE_URL = 'https://wtnnvlibowwffgtjzoou.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = ''; // TODO: Fill in with service role key from Supabase Dashboard

// For now, we'll use the anon key and the admin email/password approach
// Since we can't use the Admin API without service role key, we'll use a workaround:
// The user should register themselves at /register, then we'll update their role to admin

const adminEmail = 'admin@mail.com';
const adminPassword = 'admin@112';

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

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bm52bGlib3d3ZmZndGp6b291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODM2MzgsImV4cCI6MjA4ODk1OTYzOH0.XxR1BNfFpVhId1nOSMfmvxvcVPi5SBE3JQG-BZJIvwU';

async function main() {
  console.log('=== Setup Admin User ===\n');
  
  // First, check if user already exists
  console.log('Checking if admin user exists...');
  const { data: existingUser } = await supabaseFetch('users?email=eq.admin@mail.com');
  
  if (existingUser && existingUser.length > 0) {
    console.log('Admin user already exists in users table');
    
    // Update role to admin if not already
    if (existingUser[0].role !== 'admin') {
      console.log('Updating role to admin...');
      await supabaseFetch('users?email=eq.admin@mail.com', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin', is_verified: true }),
      });
      console.log('✓ Role updated to admin');
    }
  } else {
    // Create user with bcrypt hash (we'll use the password directly for demo)
    // In production, use proper bcrypt
    const passwordHash = '$2a$10$' + Buffer.from(adminPassword).toString('base64').substring(0, 22);
    
    console.log('Creating admin user...');
    const { data: newUser, error } = await supabaseFetch('users', {
      method: 'POST',
      body: JSON.stringify({
        id: crypto.randomUUID(),
        email: adminEmail,
        password_hash: '$2a$10$demo_hash_use_register', // Placeholder - user should register
        full_name: 'Administrator',
        no_induk: 'ADMIN001',
        role: 'admin',
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    
    if (error) {
      console.error('Error creating user:', error);
    } else {
      console.log('✓ Admin user created in users table');
    }
  }
  
  console.log('\n=== Instructions ===');
  console.log('Since we cannot create Supabase Auth users without service role key:');
  console.log('1. Go to /register page');
  console.log('2. Register with email: admin@mail.com and password: admin@112');
  console.log('3. Then update the user role to admin manually or provide service role key');
  console.log('\nOR: Provide SERVICE_ROLE_KEY from Supabase Dashboard → Settings → API');
}

main().catch(console.error);
