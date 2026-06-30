export const dynamic = 'force-dynamic';
export const preferredRegion = 'sin1';

import { NextResponse } from 'next/server';
import { genSalt, hash, compare } from 'bcrypt-ts';
const bcrypt = { genSalt, hash, compare };
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
    try {
        // Rate limiting: max 3 register attempts per minute per IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const limiter = rateLimit(`register:${ip}`, 3, 60_000);
        if (!limiter.success) {
            return NextResponse.json(
                { message: 'Terlalu banyak percobaan registrasi. Silakan coba lagi nanti.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil(limiter.resetIn / 1000)),
                    },
                }
            );
        }

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json(
                { message: 'Konfigurasi database/Supabase tidak lengkap pada server.' },
                { status: 500 }
            );
        }
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
            logger.error('Insert user error', err);
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
        logger.error('Register Error', error);
        return NextResponse.json(
            { message: 'Terjadi kesalahan pada server.' },
            { status: 500 }
        );
    }
}
