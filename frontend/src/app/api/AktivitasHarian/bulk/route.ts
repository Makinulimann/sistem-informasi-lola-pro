export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const items = body.items;

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ message: 'Invalid data format' }, { status: 400 });
        }

        const insertData = items.map((item: any) => ({
            pic: item.pic || item.Pic || null,
            lokasi: item.lokasi || item.Lokasi || null,
            jenis_produk: item.jenis_produk || item.jenisProduk || null,
            tanggal: item.tanggal || item.Tanggal || new Date().toISOString(),
            deskripsi: item.deskripsi || item.Deskripsi || '',
        }));

        const { data: entities, error } = await db.from<any>('aktivitas_harians').insert(insertData);

        if (error) {
            console.error('Error in bulk insert:', error);
            return NextResponse.json({ message: 'Failed to create bulk' }, { status: 500 });
        }

        return NextResponse.json(entities, { status: 201 });
    } catch (error) {
        console.error('Error creating bulk aktivitas harian:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
