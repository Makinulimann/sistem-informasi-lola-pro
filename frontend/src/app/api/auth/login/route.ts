export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email dan Password wajib diisi.' },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.users.findUnique({
            where: { Email: email }
        });

        if (!user) {
            return NextResponse.json(
                { message: 'Email atau password salah.' },
                { status: 401 }
            );
        }

        if (!user.IsVerified) {
            return NextResponse.json(
                { message: 'Akun belum diverifikasi. Silakan hubungi administrator.' },
                { status: 403 }
            );
        }

        // Verify Password
        const passwordValid = await bcrypt.compare(password, user.PasswordHash);
        if (!passwordValid) {
            return NextResponse.json(
                { message: 'Email atau password salah.' },
                { status: 401 }
            );
        }

        // Generate token matching the exact payload expectations
        const token = await signToken({
            sub: user.Id,
            email: user.Email,
            name: user.FullName,
            role: user.Role,
        });

        // We no longer strictly need to update RefreshToken in DB unless the client specifically asks for it, but for compatibility we mimic the endpoint shape:
        return NextResponse.json({
            accessToken: token,
            user: {
                id: user.Id,
                email: user.Email,
                fullName: user.FullName,
                role: user.Role
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
