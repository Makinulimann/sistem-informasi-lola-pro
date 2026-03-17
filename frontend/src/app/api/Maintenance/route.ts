export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const bulan = searchParams.get('bulan');
        const tahun = searchParams.get('tahun');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const sortBy = searchParams.get('sortBy') || 'tanggal';
        const sortDesc = searchParams.get('sortDesc') !== 'false';

        // Get all data (Supabase REST has limited query capabilities)
        const { data: list, error } = await db.from<any>('maintenances').select('*').execute();

        if (error) {
            console.error('Error fetching maintenance:', error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }

        let filteredData = list || [];

        // Filter by date
        if (bulan || tahun) {
            const y = tahun ? parseInt(tahun, 10) : new Date().getFullYear();
            const m = bulan ? parseInt(bulan, 10) : 1;

            filteredData = filteredData.filter((item: any) => {
                const itemDate = new Date(item.tanggal);
                return itemDate.getFullYear() === y && (!bulan || itemDate.getMonth() + 1 === m);
            });
        }

        // Filter by search
        if (search) {
            const s = search.toLowerCase();
            filteredData = filteredData.filter((item: any) =>
                (item.equipment && item.equipment.toLowerCase().includes(s)) ||
                (item.area && item.area.toLowerCase().includes(s)) ||
                (item.kegiatan && item.kegiatan.toLowerCase().includes(s)) ||
                (item.keterangan && item.keterangan.toLowerCase().includes(s))
            );
        }

        // Sort
        const sortDir = sortDesc ? -1 : 1;
        filteredData.sort((a: any, b: any) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            if (aVal < bVal) return -1 * sortDir;
            if (aVal > bVal) return 1 * sortDir;
            return 0;
        });

        // Paginate
        const total = filteredData.length;
        const paginatedData = filteredData.slice((page - 1) * limit, page * limit).map((m: any) => ({
            Id: m.id,
            ProductSlug: m.product_slug,
            Equipment: m.equipment,
            Area: m.area,
            Tanggal: m.tanggal,
            Kegiatan: m.kegiatan,
            Keterangan: m.keterangan || '-',
            CreatedAt: m.created_at,
            UpdatedAt: m.updated_at
        }));

        return NextResponse.json({ Data: paginatedData, Total: total });
    } catch (error) {
        console.error('Error fetching maintenance:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const insertData = {
            product_slug: body.productSlug || body.ProductSlug,
            equipment: body.equipment || body.Equipment || '',
            area: body.area || body.Area || '',
            tanggal: body.tanggal || body.Tanggal || new Date().toISOString(),
            kegiatan: body.kegiatan || body.Kegiatan || '',
            keterangan: body.keterangan || body.Keterangan || ''
        };

        const { data: entity, error } = await db.from<any>('maintenances').insert(insertData);

        if (error) {
            console.error('Error creating maintenance:', error);
            return NextResponse.json({ message: 'Failed to create maintenance' }, { status: 500 });
        }

        return NextResponse.json(entity, { status: 201 });
    } catch (error) {
        console.error('Error creating maintenance:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
