export const dynamic = 'force-dynamic';
// Using Edge runtime with Supabase Auth (secure, no bcrypt needed)
export const runtime = 'edge';

export const preferredRegion = 'sin1';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signToken } from '@/lib/auth';

// Create Supabase client for Auth (Edge-compatible)
const supabaseUrl = 'https://wtnnvlibowwffgtjzoou.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bm52bGlib3d3ZmZndGp6b291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODM2MzgsImV4cCI6MjA4ODk1OTYzOH0.XxR1BNfFpVhId1nOSMfmvxvcVPi5SBE3JQG-BZJIvwU';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email dan Password wajib diisi.' },
                { status: 400 }
            );
        }

        // Sign in with Supabase Auth (Edge-compatible, secure)
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError || !authData.user) {
            return NextResponse.json(
                { message: 'Email atau password salah.' },
                { status: 401 }
            );
        }

        // Get user metadata from our users table using direct REST call
        const usersResponse = await fetch(
            `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&limit=1`,
            {
                headers: {
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                },
            }
        );
        const users = await usersResponse.json();
        
        if (!usersResponse.ok || !users || users.length === 0) {
            return NextResponse.json(
                { message: 'User tidak ditemukan di sistem. Silakan register terlebih dahulu.' },
                { status: 401 }
            );
        }

        const user = users[0];

        if (!user.is_verified) {
            return NextResponse.json(
                { message: 'Akun belum diverifikasi. Silakan hubungi administrator.' },
                { status: 403 }
            );
        }

        // Generate token
        const token = await signToken({
            sub: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role,
        });

        return NextResponse.json({
            accessToken: token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role
            }
        });

    } catch (error: any) {
        console.error('Login Error:', error);
        return NextResponse.json(
            { message: 'Terjadi kesalahan pada server.' },
            { status: 500 }
        );
    }
}
