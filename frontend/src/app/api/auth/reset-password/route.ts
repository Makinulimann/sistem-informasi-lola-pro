export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { verifyResetToken } from '@/lib/auth';
import { genSalt, hash } from 'bcrypt-ts';

export async function POST(request: Request) {
    try {
        const { token, newPassword, confirmPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json(
                { message: 'Token dan Password baru wajib diisi.' },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { message: 'Konfirmasi password tidak cocok.' },
                { status: 400 }
            );
        }

        // 1. Verify Reset Token
        const payload = await verifyResetToken(token);
        if (!payload || payload.type !== 'password-reset') {
            return NextResponse.json(
                { message: 'Token reset kata sandi tidak valid atau telah kedaluwarsa.' },
                { status: 400 }
            );
        }

        const userId = payload.sub;

        // 2. Hash New Password
        const salt = await genSalt(10);
        const passwordHash = await hash(newPassword, salt);

        // 3. Update User Password in DB
        const { error: updateError } = await db.from<any>('users')
            .update({ password_hash: passwordHash })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating password in database:', updateError);
            return NextResponse.json(
                { message: 'Gagal memperbarui kata sandi di server.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Kata sandi Anda berhasil diperbarui. Silakan login kembali.'
        });

    } catch (error: any) {
        console.error('Error resetting password:', error);
        return NextResponse.json(
            { message: 'Terjadi kesalahan pada server.' },
            { status: 500 }
        );
    }
}
