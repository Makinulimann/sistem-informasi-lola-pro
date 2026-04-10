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
        const sortBy = searchParams.get('sortBy') || 'tanggal_dibutuhkan';
        const sortDesc = searchParams.get('sortDesc') !== 'false';

        // Get all data
        const { data: list, error } = await db.from<any>('maintenances').select('*').execute();

        if (error) {
            console.error('Error fetching maintenance:', error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }

        let filteredData = list || [];

        // Filter by date (Period)
        if (bulan || tahun) {
            const m = bulan ? parseInt(bulan, 10) : null;
            const y = tahun ? parseInt(tahun, 10) : null;

            filteredData = filteredData.filter((item: any) => {
                const dateStr = item.tanggal_dibutuhkan || item.tanggal;
                if (!dateStr) return false;
                const d = new Date(dateStr);
                const yearMatch = y ? d.getFullYear() === y : true;
                const monthMatch = m ? d.getMonth() + 1 === m : true;
                return yearMatch && monthMatch;
            });
        }

        // Filter by search
        if (search) {
            const s = search.toLowerCase();
            filteredData = filteredData.filter((item: any) =>
                (item.kode && item.kode.toLowerCase().includes(s)) ||
                (item.nama && item.nama.toLowerCase().includes(s)) ||
                (item.deskripsi && item.deskripsi.toLowerCase().includes(s)) ||
                (item.keperluan && item.keperluan.toLowerCase().includes(s)) ||
                // Legacy support
                (item.equipment && item.equipment.toLowerCase().includes(s)) ||
                (item.area && item.area.toLowerCase().includes(s)) ||
                (item.kegiatan && item.kegiatan.toLowerCase().includes(s)) ||
                (item.keterangan && item.keterangan.toLowerCase().includes(s))
            );
        }

        // Sort
        const sortDir = sortDesc ? -1 : 1;
        filteredData.sort((a: any, b: any) => {
            const aVal = a[sortBy] ?? '';
            const bVal = b[sortBy] ?? '';
            if (aVal < bVal) return -1 * sortDir;
            if (aVal > bVal) return 1 * sortDir;
            return 0;
        });

        // Total before pagination
        const total = filteredData.length;

        // Paginate & Normalize Response
        const paginatedData = filteredData.slice((page - 1) * limit, page * limit).map((m: any) => ({
            id: m.id,
            product_slug: m.product_slug,
            kode: m.kode || m.equipment || '',
            nama: m.nama || m.area || '',
            prioritas: m.prioritas || 'Normal',
            status: m.status || 'Open',
            keperluan: m.keperluan || m.keterangan || '',
            deskripsi: m.deskripsi || m.kegiatan || '',
            tanggal_dibutuhkan: m.tanggal_dibutuhkan || m.tanggal || '',
            dokumentasi: m.dokumentasi || null,
            created_at: m.created_at,
            updated_at: m.updated_at,
            // Legacy aliases for extra safety
            Kode: m.kode || m.equipment || '',
            Nama: m.nama || m.area || '',
            Prioritas: m.prioritas || 'Normal',
            Status: m.status || 'Open',
            TanggalDibutuhkan: m.tanggal_dibutuhkan || m.tanggal || ''
        }));

        return NextResponse.json({ 
            data: paginatedData, 
            total: total,
            // Legacy for compatibility with existing components
            Data: paginatedData,
            Total: total
        });
    } catch (error) {
        console.error('Error fetching maintenance:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const insertData = {
            product_slug: body.product_slug || body.productSlug || body.ProductSlug,
            kode: body.kode || body.Kode || body.equipment || body.Equipment || '',
            nama: body.nama || body.Nama || body.area || body.Area || '',
            deskripsi: body.deskripsi || body.Deskripsi || body.kegiatan || body.Kegiatan || '',
            prioritas: body.prioritas || body.Prioritas || 'Normal',
            status: body.status || body.Status || 'Open',
            keperluan: body.keperluan || body.Keperluan || body.keterangan || body.Keterangan || '',
            tanggal_dibutuhkan: body.tanggal_dibutuhkan || body.TanggalDibutuhkan || body.tanggal || body.Tanggal || new Date().toISOString(),
            dokumentasi: body.dokumentasi || body.Dokumentasi || null
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
