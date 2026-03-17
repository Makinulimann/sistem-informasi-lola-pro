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

        // Fetch all balance_stoks for the product
        const { data: allBalance } = await db.from<any>('balance_stoks').select('*').execute();
        
        // Fetch all materials
        const { data: allMaterials } = await db.from<any>('materials').select('*').execute();

        // Fetch all balance_stok_details
        const { data: allDetails } = await db.from<any>('balance_stok_details').select('*').execute();

        // Build materials lookup
        const materialsMap = new Map();
        (allMaterials || []).forEach((m: any) => materialsMap.set(m.Id, m));

        // Filter balance records
        let filtered = (allBalance || []).filter(b => b.ProductSlug === productSlug);
        
        if (perusahaanId) {
            filtered = filtered.filter(b => b.PerusahaanId === parseInt(perusahaanId, 10));
        }

        if (bulan || tahun) {
            const y = tahun ? parseInt(tahun, 10) : new Date().getFullYear();
            const m = bulan ? parseInt(bulan, 10) : 1;
            const start = new Date(Date.UTC(y, m - 1, 1));
            const end = new Date(Date.UTC(bulan ? y : y + 1, bulan ? m : 0, 1));
            
            filtered = filtered.filter(b => {
                const bDate = new Date(b.Tanggal);
                return bDate >= start && bDate < end;
            });
        }

        // Sort by Tanggal ascending
        filtered.sort((a, b) => new Date(a.Tanggal).getTime() - new Date(b.Tanggal).getTime());

        // Format response with details
        const formatted = filtered.map(b => {
            const details = (allDetails || []).filter((d: any) => d.BalanceStokId === b.Id);
            return {
                Id: b.Id,
                Tanggal: b.Tanggal,
                Produksi: b.Produksi,
                Details: details.map(d => {
                    const material = materialsMap.get(d.MaterialId);
                    return {
                        MaterialId: d.MaterialId,
                        MaterialNama: material?.Nama || '',
                        Out: d.Out,
                        In: d.In,
                        StokAkhir: d.StokAkhir
                    };
                })
            };
        });

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Error fetching balance:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
