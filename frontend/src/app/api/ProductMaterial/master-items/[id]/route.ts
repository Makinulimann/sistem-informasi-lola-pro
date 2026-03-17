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

        const { data: item } = await db.from<any>('master_items').select('*').eq('id', id).single();

        if (!item) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const nama = body.nama || body.Nama;
        const itemNama = item.nama || item.Nama;
        if (nama !== itemNama) {
            const { data: allItemsCheck } = await db.from<any>('master_items').select('*').execute();
            const existing = (allItemsCheck || []).filter((it: any) =>
                (it.nama || it.Nama || '').toLowerCase() === nama.toLowerCase()
            );
            if (existing && existing.length > 0) {
                return NextResponse.json({ message: 'Item with this name already exists.' }, { status: 400 });
            }
        }

        const { data: updated, error } = await db.from<any>('master_items').update({
            nama: nama,
            kategori: body.kategori || body.Kategori,
            satuan_default: body.satuanDefault || body.SatuanDefault || 'Kg',
            updated_at: new Date().toISOString()
        }).eq('id', id);

        if (error) {
            console.error('Error updating master item:', error);
            return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating master item:', error);
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

        const { data: item } = await db.from<any>('master_items').select('*').eq('id', id).single();
        if (!item) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const { error } = await db.from<any>('master_items').delete().eq('id', id);

        if (error) {
            console.error('Error deleting master item:', error);
            return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting master item:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
