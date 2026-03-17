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
        const id = parseInt(p.id, 10);
        const body = await request.json();

        const { data: tab } = await db.from<any>('produksi_tabs').select('*').eq('id', id).single();

        if (!tab) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const { data: updated, error } = await db.from<any>('produksi_tabs').update({
            Nama: body.nama || body.Nama,
            Order: body.order || body.Order,
            updated_at: new Date().toISOString()
        }).eq('id', id);

        if (error) {
            console.error('Error renaming tab:', error);
            return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
        }

        return NextResponse.json({ Id: updated?.Id, Nama: updated?.Nama, Order: updated?.Order });
    } catch (error) {
        console.error('Error renaming tab:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);

        const { data: tab } = await db.from<any>('produksi_tabs').select('*').eq('id', id).single();

        if (!tab) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        // Cascading delete - delete related produksis first
        await db.from<any>('produksis').delete().eq('produksi_tab_id', id);

        const { error } = await db.from<any>('produksi_tabs').delete().eq('id', id);

        if (error) {
            console.error('Error deleting tab:', error);
            return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting tab:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
