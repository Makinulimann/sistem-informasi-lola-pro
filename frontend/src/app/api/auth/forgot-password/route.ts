export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { signResetToken } from '@/lib/auth';
import { sendMail } from '@/lib/mailer';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { message: 'Email wajib diisi.' },
                { status: 400 }
            );
        }

        // 1. Fetch user by email
        const userRes = await db.from<any>('users')
            .select('id, email, full_name')
            .eq('email', email.trim())
            .single();

        // Security best practice: return success even if user not found, to prevent email enumeration
        if (userRes.error || !userRes.data) {
            return NextResponse.json({
                message: 'Jika email terdaftar di sistem kami, link reset kata sandi telah dikirim.'
            });
        }

        const user = userRes.data;

        // 2. Generate Reset Token
        const resetToken = await signResetToken({
            sub: user.id,
            email: user.email,
            type: 'password-reset',
        });

        // 3. Send Email
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sistem-informasi-pp.vercel.app';
        const resetUrl = `${appUrl}/forgot-password?token=${encodeURIComponent(resetToken)}`;

        const emailSubject = 'Reset Kata Sandi Akun SIPP Anda';
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; background-color: #ffffff; color: #374151;">
                <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f3f4f6; padding-bottom: 16px;">
                    <h2 style="color: #059669; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.025em;">SIPP</h2>
                    <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">Sistem Informasi Produk Pengembangan - PT Petrokimia Gresik</p>
                </div>
                <div style="margin-bottom: 24px; line-height: 1.6;">
                    <p style="font-size: 16px; margin-top: 0;">Halo, <strong>${user.full_name}</strong>,</p>
                    <p style="font-size: 14px;">Kami menerima permintaan untuk mereset kata sandi akun SIPP Anda.</p>
                    <p style="font-size: 14px; color: #dc2626;"><strong>Penting:</strong> Link reset kata sandi ini hanya berlaku selama 1 jam.</p>
                    <p style="font-size: 14px;">Silakan klik tombol di bawah ini untuk mengatur ulang kata sandi Anda:</p>
                </div>
                <div style="text-align: center; margin-bottom: 28px; margin-top: 28px;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 28px; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 6px;">Atur Ulang Kata Sandi</a>
                </div>
                <div style="margin-bottom: 24px; line-height: 1.6;">
                    <p style="font-size: 13px; color: #6b7280;">Jika tombol di atas tidak berfungsi, salin dan tempel URL berikut ke browser Anda:</p>
                    <p style="font-size: 12px; word-break: break-all; color: #2563eb;"><a href="${resetUrl}">${resetUrl}</a></p>
                    <p style="font-size: 13px; color: #6b7280; margin-top: 16px;">Jika Anda tidak meminta pengaturan ulang ini, abaikan email ini dengan aman.</p>
                </div>
                <div style="font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 32px;">
                    <p style="margin: 0;">© 2026 PT Petrokimia Gresik. Hak Cipta Dilindungi Undang-Undang.</p>
                </div>
            </div>
        `;

        try {
            await sendMail({
                to: user.email,
                subject: emailSubject,
                html: emailHtml,
            });
            console.log(`Reset password email sent successfully via SMTP to: ${user.email}`);
        } catch (err) {
            console.error('Failed to send reset password email via SMTP:', err);
            return NextResponse.json(
                { message: 'Gagal mengirim email reset password.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Jika email terdaftar di sistem kami, link reset kata sandi telah dikirim.'
        });

    } catch (error: any) {
        console.error('Error forgot password:', error);
        return NextResponse.json(
            { message: 'Terjadi kesalahan pada server.' },
            { status: 500 }
        );
    }
}
