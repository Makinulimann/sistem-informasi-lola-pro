export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

/**
 * DELETE user by ID
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const { error: deleteError } = await db.from<any>('users').delete().eq('id', p.id);

        if (deleteError) {
            console.error('Error deleting user:', deleteError);
            return NextResponse.json({ message: 'Gagal menghapus pengguna dari database' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Pengguna berhasil dihapus' });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 400 });
    }
}
