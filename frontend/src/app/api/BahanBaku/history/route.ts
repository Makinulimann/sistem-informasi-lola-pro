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
        const namaBahan = searchParams.get('namaBahan');
        const tipe = searchParams.get('tipe');
        const bulan = searchParams.get('bulan');
        const tahun = searchParams.get('tahun');

        if (!namaBahan || !tipe) {
            return NextResponse.json({ message: 'namaBahan and tipe are required' }, { status: 400 });
        }

        // Fetch all records and filter in JavaScript
        const { data: allRecords } = await db.from<any>('bahan_bakus').select('*').execute();

        let filtered = (allRecords || []).filter((r: any) => {
            return r.Tipe === tipe && r.NamaBahan === namaBahan;
        });

        if (productSlug) {
            filtered = filtered.filter((r: any) => r.ProductSlug === productSlug);
        }

        if (bulan || tahun) {
            const y = tahun ? parseInt(tahun, 10) : new Date().getFullYear();
            const m = bulan ? parseInt(bulan, 10) : 1;
            const start = new Date(Date.UTC(y, m - 1, 1));
            const end = new Date(Date.UTC(bulan ? y : y + 1, bulan ? m : 0, 1));

            filtered = filtered.filter((r: any) => {
                const rDate = new Date(r.Tanggal);
                return rDate >= start && rDate < end;
            });
        }

        // Sort by Tanggal descending
        filtered.sort((a: any, b: any) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime());

        return NextResponse.json(filtered);
    } catch (error) {
        console.error('Error fetching history:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
