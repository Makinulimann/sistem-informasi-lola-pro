export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const { error: updateError } = await db.from<any>('users').update({ is_verified: true }).eq('id', p.id);

        if (updateError) {
            console.error('Error verifying user:', updateError);
            return NextResponse.json({ message: 'Failed to verify user' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Pengguna berhasil diverifikasi' });
    } catch (error: any) {
        console.error('Error verifying user:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 400 });
    }
}
