/**
 * Create Admin User in Supabase Auth
 * Run with: node scripts/create-admin-auth.mjs
 */

const SUPABASE_URL = 'https://wtnnvlibowwffgtjzoou.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bm52bGlib3d3ZmZndGp6b291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM4MzYzOCwiZXhwIjoyMDg4OTU5NjM4fQ.kAxJwbItXQ0IV7HYhfpgeN3GX86OFArEAWq21U7q4qc';

async function createAdminUser() {
  console.log('Creating admin user in Supabase Auth...\n');

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@mail.com',
      password: 'admin@112',
      email_confirm: true,
      user_metadata: {
        full_name: 'Administrator'
      }
    })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✓ Admin user created successfully!');
    console.log('User ID:', data.id);
    console.log('\nNow updating users table to link with this auth user...');
    
    // Update the users table to set role to admin
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/users?email=eq.admin@mail.com`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          role: 'admin',
          is_verified: true
        })
      }
    );

    if (updateResponse.ok) {
      console.log('✓ User role updated to admin in users table');
    } else {
      console.log('⚠ Could not update user role:', await updateResponse.json());
    }

    console.log('\n=== Login Credentials ===');
    console.log('Email: admin@mail.com');
    console.log('Password: admin@112');
    console.log('========================\n');
  } else {
    console.error('Error creating user:', data);
  }
}

createAdminUser();
