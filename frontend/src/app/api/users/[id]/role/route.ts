export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const body = await request.json();

        const role = body.Role || body.role;
        if (!role) {
            return NextResponse.json({ message: 'Role is required' }, { status: 400 });
        }

        const { error: updateError } = await db.from<any>('users').update({ role: role }).eq('id', p.id);

        if (updateError) {
            console.error('Error updating user role:', updateError);
            return NextResponse.json({ message: 'Failed to update role' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Peran pengguna berhasil diperbarui' });
    } catch (error: any) {
        console.error('Error updating user role:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 400 });
    }
}
