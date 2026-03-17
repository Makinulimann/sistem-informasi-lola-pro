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
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                process.env[key] = value;
            }
        } else if (line && line.startsWith('#')) {
            // Also try to read commented ones if they look like our Supabase keys
            const uncommented = line.substring(1).trim();
            const [key, ...valueParts] = uncommented.split('=');
            if (key && (key.includes('SUPABASE') || key.includes('API_URL'))) {
                const value = valueParts.join('=').trim();
                if (!process.env[key]) process.env[key] = value;
            }
        }
    });
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// IMPORTANT: Need Service Role Key for running RPC/SQL if anon key is restricted
// But if they have anon key and RLS is disabled or allows it, we can try.
// Actually, standard anon key CANNOT run raw SQL.
// The user should run this in the Supabase SQL Editor.

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase URL or Anon Key missing in .env.local');
    process.exit(1);
}

console.log('--- Sequence Sync Instructions ---');
console.log('Because Supabase (PostgREST) does not allow running raw SQL via the anon key,');
console.log('please run the following SQL commands in your Supabase SQL Editor:');
console.log('');
console.log('-- Reset sequences for all tables to match migrated data');
console.log('SELECT setval(pg_get_serial_sequence(\'maintenances\', \'id\'), (SELECT MAX(id) FROM maintenances));');
console.log('SELECT setval(pg_get_serial_sequence(\'bahan_bakus\', \'id\'), (SELECT MAX(id) FROM bahan_bakus));');
console.log('SELECT setval(pg_get_serial_sequence(\'produksis\', \'id\'), (SELECT MAX(id) FROM produksis));');
console.log('SELECT setval(pg_get_serial_sequence(\'master_items\', \'id\'), (SELECT MAX(id) FROM master_items));');
console.log('SELECT setval(pg_get_serial_sequence(\'product_materials\', \'id\'), (SELECT MAX(id) FROM product_materials));');
console.log('');
console.log('This will fix the "duplicate key value violates unique constraint" (23505) errors.');
