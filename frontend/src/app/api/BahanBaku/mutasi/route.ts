export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productSlug = searchParams.get('productSlug');
        const perusahaanId = searchParams.get('perusahaanId');
        const bulan = searchParams.get('bulan');
        const tahun = searchParams.get('tahun');

        if (!productSlug) {
            return NextResponse.json({ message: 'productSlug is required' }, { status: 400 });
        }

        const { data: allBahanBaku, error: bbError } = await db.from<any>('bahan_bakus').select('*').execute();

        if (bbError) {
            console.error('Error fetching bahanbaku:', bbError);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }

        let filteredData = (allBahanBaku || []).filter((item: any) =>
            item.tipe === 'Mutasi' && item.product_slug === productSlug
        );

        if (perusahaanId) {
            filteredData = filteredData.filter((item: any) => item.perusahaan_id === parseInt(perusahaanId, 10));
        }

        if (bulan || tahun) {
            const y = tahun ? parseInt(tahun, 10) : new Date().getFullYear();
            const m = bulan ? parseInt(bulan, 10) : 1;

            filteredData = filteredData.filter((item: any) => {
                const itemDate = new Date(item.tanggal);
                return itemDate.getFullYear() === y && (!bulan || itemDate.getMonth() + 1 === m);
            });
        }

        filteredData.sort((a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

        const mappedData = filteredData.map((item: any) => ({
            id: item.id,
            tipe: item.tipe,
            productSlug: item.product_slug,
            perusahaanId: item.perusahaan_id,
            tanggal: item.tanggal,
            jenis: item.jenis,
            namaBahan: item.nama_bahan,
            kuantum: item.kuantum,
            satuan: item.satuan,
            dokumen: item.dokumen,
            keterangan: item.keterangan || '-',
            NamaBahan: item.nama_bahan, // Extra safety
            Tanggal: item.tanggal // Extra safety
        }));

        return NextResponse.json(mappedData);
    } catch (error) {
        console.error('Error fetching mutasi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const insertData = {
            tipe: 'Mutasi',
            product_slug: body.productSlug || body.ProductSlug,
            perusahaan_id: body.perusahaanId || body.PerusahaanId || null,
            tanggal: body.tanggal || body.Tanggal || new Date().toISOString(),
            jenis: body.jenis || body.Jenis || '',
            nama_bahan: body.namaBahan || body.NamaBahan,
            kuantum: parseFloat(body.kuantum || body.Kuantum || 0),
            satuan: body.satuan || body.Satuan || 'Kg',
            dokumen: body.dokumen || body.Dokumen || '',
            keterangan: body.keterangan || body.Keterangan || ''
        };

        const { data: entity, error } = await db.from<any>('bahan_bakus').insert(insertData);

        if (error) {
            console.error('Error creating mutasi:', error);
            return NextResponse.json({ message: 'Failed to create' }, { status: 500 });
        }

        return NextResponse.json(entity, { status: 201 });
    } catch (error) {
        console.error('Error creating mutasi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
