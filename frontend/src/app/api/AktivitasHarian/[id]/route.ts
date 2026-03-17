export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);
        const { data: entity } = await db.from<any>('aktivitas_harians').select('*').eq('id', id).single();

        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        return NextResponse.json(entity);
    } catch (error) {
        console.error('Error fetching aktivitas harian by id:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);
        const body = await request.json();

        const { data: entity } = await db.from<any>('aktivitas_harians').select('*').eq('id', id).single();
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const { data: updated, error } = await db.from<any>('aktivitas_harians').update({
            nama_aktivitas: body.nama_aktivitas,
            deskripsi: body.deskripsi,
            tanggal: body.tanggal,
            lokasi_id: body.lokasi_id,
            pic_id: body.pic_id,
            prioritas: body.prioritas,
            kategori: body.kategori,
            updated_at: new Date().toISOString()
        }).eq('id', id);

        if (error) {
            console.error('Error updating aktivitas harian:', error);
            return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating aktivitas harian:', error);
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

        const { data: entity } = await db.from<any>('aktivitas_harians').select('*').eq('id', id).single();
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const { error } = await db.from<any>('aktivitas_harians').delete().eq('id', id);

        if (error) {
            console.error('Error deleting aktivitas harian:', error);
            return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting aktivitas harian:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
