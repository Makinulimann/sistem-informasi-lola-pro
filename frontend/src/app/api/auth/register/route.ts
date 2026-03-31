export const dynamic = 'force-dynamic';
export const preferredRegion = 'sin1';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://wtnnvlibowwffgtjzoou.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bm52bGlib3d3ZmZndGp6b291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODM2MzgsImV4cCI6MjA4ODk1OTYzOH0.XxR1BNfFpVhId1nOSMfmvxvcVPi5SBE3JQG-BZJIvwU';

export async function POST(request: Request) {
    try {
        const { email, password, confirmPassword, fullName, noInduk } = await request.json();

        if (!email || !password || !fullName || !noInduk) {
            return NextResponse.json(
                { message: 'Semua field wajib diisi.' },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { message: 'Password tidak cocok.' },
                { status: 400 }
            );
        }

        // 1. Check if user already exists
        const checkResponse = await fetch(
            `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&limit=1`,
            {
                headers: {
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                },
            }
        );
        const existingUsers = await checkResponse.json();
        
        if (existingUsers && existingUsers.length > 0) {
            return NextResponse.json(
                { message: 'Email sudah terdaftar.' },
                { status: 400 }
            );
        }

        // 2. Hash password with bcryptjs
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const userId = crypto.randomUUID();

        // 3. Create user in public.users table directly
        const insertResponse = await fetch(
            `${supabaseUrl}/rest/v1/users`,
            {
                method: 'POST',
                headers: {
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    id: userId,
                    email,
                    password_hash: passwordHash,
                    full_name: fullName,
                    no_induk: noInduk,
                    role: 'user', // Default role
                    is_verified: false
                })
            }
        );

        if (!insertResponse.ok) {
            const err = await insertResponse.text();
            console.error('Insert user error:', err);
            return NextResponse.json(
                { message: 'Berhasil membuat akun, tapi gagal menyimpan profil.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { 
                message: 'Registrasi berhasil. Akun Anda sedang menunggu verifikasi Admin.',
                user: { id: userId, email, fullName }
            },
            { status: 201 }
        );

    } catch (error: any) {
        console.error('Register Error:', error);
        return NextResponse.json(
            { message: 'Terjadi kesalahan pada server.' },
            { status: 500 }
        );
    }
}
