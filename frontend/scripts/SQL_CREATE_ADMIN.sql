-- SQL to create admin user in Supabase
-- Run this in Supabase Dashboard → SQL Editor

-- First, we need to create the user in auth.users table
-- Note: This requires service_role key to be executed programmatically
-- For now, here's what you need to do:

-- Option 1: Use Supabase Admin API (requires service_role key)
-- POST https://wtnnvlibowwffgtjzoou.supabase.co/auth/v1/admin/users
-- Body: {
--   "email": "admin@mail.com",
--   "password": "admin@112",
--   "email_confirm": true
-- }

-- Option 2: User self-registration at /register page
-- Then manually update their role to admin:

-- After user registers, run this to make them admin:
UPDATE users 
SET role = 'Admin', is_verified = true 
WHERE email = 'admin@mail.com';

