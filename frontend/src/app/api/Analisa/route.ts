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
        const bulanStr = searchParams.get('bulan');
        const tahunStr = searchParams.get('tahun');

        if (!productSlug) {
            return NextResponse.json({ message: 'productSlug is required.' }, { status: 400 });
        }

        const { data, error } = await db.from<any>('analisas').select('*').eq('product_slug', productSlug).execute();

        if (error) {
            console.error('Error fetching analisa:', error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }

        let filteredData = data || [];

        if (bulanStr) {
            const bulan = parseInt(bulanStr, 10);
            filteredData = filteredData.filter((item: any) => item.bulan === bulan);
        }

        if (tahunStr) {
            const tahun = parseInt(tahunStr, 10);
            filteredData = filteredData.filter((item: any) => item.tahun === tahun);
        }

        // Sort by tanggal_sampling
        filteredData.sort((a: any, b: any) => new Date(a.tanggal_sampling).getTime() - new Date(b.tanggal_sampling).getTime());

        // Convert the property names to match the frontend expectations
        const formattedData = filteredData.map((item: any) => ({
            id: item.id,
            productSlug: item.product_slug,
            bulan: item.bulan,
            tahun: item.tahun,
            tanggalSampling: item.tanggal_sampling,
            noBAPC: item.no_bapc,
            kuantum: item.kuantum,
            lembaga: item.lembaga,
            hasilAnalisa: item.hasil_analisa,
            tanggalAnalisa: item.tanggal_analisa
        }));

        return NextResponse.json({ data: formattedData });
    } catch (error) {
        console.error('Error fetching analisa:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.productSlug || !body.tanggalSampling || !body.noBAPC || !body.kuantum || !body.lembaga || !body.hasilAnalisa) {
             return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        const date = new Date(body.tanggalSampling);
        const bulan = date.getMonth() + 1;
        const tahun = date.getFullYear();

        const insertData = {
            product_slug: body.productSlug,
            bulan: bulan,
            tahun: tahun,
            tanggal_sampling: body.tanggalSampling,
            no_bapc: body.noBAPC,
            kuantum: parseFloat(body.kuantum),
            lembaga: body.lembaga,
            hasil_analisa: body.hasilAnalisa,
            tanggal_analisa: body.tanggalAnalisa || new Date().toISOString()
        };

        const { data: newAnalisa, error } = await db.from<any>('analisas').insert(insertData);

        if (error) {
            console.error('Error creating analisa:', error);
            return NextResponse.json({ message: 'Failed to create analisa' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: { id: newAnalisa?.id } });
    } catch (error) {
        console.error('Error creating analisa:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
