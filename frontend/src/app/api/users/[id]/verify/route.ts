export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendMail } from '@/lib/mailer';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;

        // 1. Fetch user email & full name
        const userRes = await db.from<any>('users')
            .select('email, full_name')
            .eq('id', p.id)
            .single();

        if (userRes.error || !userRes.data) {
            return NextResponse.json({ message: 'Pengguna tidak ditemukan' }, { status: 404 });
        }
        const user = userRes.data;

        // 2. Update is_verified
        const { error: updateError } = await db.from<any>('users')
            .update({ is_verified: true })
            .eq('id', p.id);

        if (updateError) {
            console.error('Error verifying user:', updateError);
            return NextResponse.json({ message: 'Gagal memverifikasi pengguna' }, { status: 500 });
        }

        // 3. Send email via SMTP
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sistem-informasi-pp.vercel.app';
        const loginUrl = `${appUrl}/`;

        const emailSubject = 'Akun SIPP Anda Telah Diverifikasi';
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; background-color: #ffffff; color: #374151;">
                <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f3f4f6; padding-bottom: 16px;">
                    <h2 style="color: #059669; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.025em;">SIPP</h2>
                    <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">Sistem Informasi Produk Pengembangan - PT Petrokimia Gresik</p>
                </div>
                <div style="margin-bottom: 24px; line-height: 1.6;">
                    <p style="font-size: 16px; margin-top: 0;">Halo, <strong>${user.full_name}</strong>,</p>
                    <p style="font-size: 14px;">Selamat! Akun SIPP Anda dengan email <strong>${user.email}</strong> telah <strong>diverifikasi</strong> oleh Administrator.</p>
                    <p style="font-size: 14px;">Sekarang Anda dapat masuk ke dalam sistem dan mengakses semua fitur produk pengembangan menggunakan tautan di bawah ini:</p>
                </div>
                <div style="text-align: center; margin-bottom: 28px; margin-top: 28px;">
                    <a href="${loginUrl}" style="display: inline-block; padding: 12px 28px; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px;">Masuk ke Aplikasi</a>
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
            console.log(`Verification email sent successfully via SMTP to: ${user.email}`);
        } catch (err) {
            console.error('Failed to send verification email via SMTP:', err);
        }

        return NextResponse.json({ message: 'Pengguna berhasil diverifikasi dan notifikasi email telah dikirim.' });
    } catch (error: any) {
        console.error('Error verifying user:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 400 });
    }
}
