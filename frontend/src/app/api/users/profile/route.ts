export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { genSalt, hash, compare } from 'bcrypt-ts';

const bcrypt = { genSalt, hash, compare };

// Helper to get authenticated user
async function getAuthUser(request: NextRequest) {
    let token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
        token = request.cookies.get('sippro_token')?.value;
    }

    if (!token) return null;

    const decoded = await verifyToken(token);
    return decoded; // contains { sub: id, email: email, name: name, role: role }
}

/**
 * GET user profile from database
 */
export async function GET(request: NextRequest) {
    try {
        const decoded = await getAuthUser(request);
        if (!decoded) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const userResult = await db.from<any>('users')
            .select('id,email,full_name,no_induk,role,photo_url')
            .eq('id', decoded.sub)
            .single();

        if (userResult.error || !userResult.data) {
            return NextResponse.json({ message: 'User tidak ditemukan.' }, { status: 404 });
        }

        const user = userResult.data;
        return NextResponse.json({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            noInduk: user.no_induk,
            role: user.role,
            photoUrl: user.photo_url || null
        });
    } catch (error) {
        console.error('GET profile error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PUT update profile info (name, email, photo_url)
 */
export async function PUT(request: NextRequest) {
    try {
        const decoded = await getAuthUser(request);
        if (!decoded) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { fullName, email, photoUrl } = await request.json();

        if (!fullName || !email) {
            return NextResponse.json({ message: 'Nama Lengkap dan Email wajib diisi.' }, { status: 400 });
        }

        // Check if email is already taken by another user
        const checkEmail = await db.from<any>('users')
            .select('id')
            .eq('email', email)
            .execute();

        if (!checkEmail.error && checkEmail.data && checkEmail.data.length > 0) {
            const existingUser = checkEmail.data[0];
            if (existingUser.id !== decoded.sub) {
                return NextResponse.json({ message: 'Email sudah digunakan oleh akun lain.' }, { status: 400 });
            }
        }

        // Update profile in users table
        const updateResult = await db.from<any>('users')
            .update({
                full_name: fullName,
                email: email,
                photo_url: photoUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', decoded.sub);

        if (updateResult.error) {
            console.error('Update profile database error:', updateResult.error);
            return NextResponse.json({ message: 'Gagal memperbarui profil di database.' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Profil berhasil diperbarui.',
            user: {
                fullName,
                email,
                photoUrl
            }
        });
    } catch (error) {
        console.error('PUT profile error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH change password
 */
export async function PATCH(request: NextRequest) {
    try {
        const decoded = await getAuthUser(request);
        if (!decoded) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { oldPassword, newPassword } = await request.json();

        if (!oldPassword || !newPassword) {
            return NextResponse.json({ message: 'Password lama dan password baru wajib diisi.' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ message: 'Password baru minimal harus 8 karakter.' }, { status: 400 });
        }

        // Retrieve current password hash from database
        const userResult = await db.from<any>('users')
            .select('password_hash')
            .eq('id', decoded.sub)
            .single();

        if (userResult.error || !userResult.data) {
            return NextResponse.json({ message: 'User tidak ditemukan.' }, { status: 404 });
        }

        const currentHash = userResult.data.password_hash;

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, currentHash);
        if (!isMatch) {
            return NextResponse.json({ message: 'Kata sandi lama yang Anda masukkan salah.' }, { status: 400 });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        // Update database
        const updateResult = await db.from<any>('users')
            .update({
                password_hash: newHash,
                updated_at: new Date().toISOString()
            })
            .eq('id', decoded.sub);

        if (updateResult.error) {
            console.error('Update password database error:', updateResult.error);
            return NextResponse.json({ message: 'Gagal menyimpan kata sandi baru.' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Kata sandi berhasil diperbarui.' });
    } catch (error) {
        console.error('PATCH password error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
