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
            deskripsi: body.deskripsi !== undefined ? body.deskripsi : entity.deskripsi,
            tanggal: body.tanggal !== undefined ? body.tanggal : entity.tanggal,
            lokasi: body.lokasi !== undefined ? body.lokasi : entity.lokasi,
            pic: body.pic !== undefined ? body.pic : entity.pic,
            jenis_produk: body.jenis_produk !== undefined ? body.jenis_produk : (body.jenisProduk !== undefined ? body.jenisProduk : entity.jenis_produk),
            dokumentasi: body.dokumentasi !== undefined ? body.dokumentasi : entity.dokumentasi,
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
