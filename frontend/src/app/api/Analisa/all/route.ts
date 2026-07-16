export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const bulanStr = searchParams.get('bulan');
        const tahunStr = searchParams.get('tahun');

        const { data, error } = await db.from<any>('analisas').select('*').execute();

        if (error) {
            console.error('Error fetching all analisa:', error);
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

        // Sort by tanggal_sampling desc (newest first)
        filteredData.sort((a: any, b: any) => new Date(b.tanggal_sampling).getTime() - new Date(a.tanggal_sampling).getTime());

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
            tanggalAnalisa: item.tanggal_analisa,
            dokumen: item.lembaga
        }));

        return NextResponse.json({ data: formattedData });
    } catch (error) {
        console.error('Error fetching all analisa:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
