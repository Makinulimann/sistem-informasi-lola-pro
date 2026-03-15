import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const bulan = searchParams.get('bulan');
        const tahun = searchParams.get('tahun');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const sortBy = searchParams.get('sortBy') || 'Tanggal';
        const sortDesc = searchParams.get('sortDesc') !== 'false';

        const whereClause: any = {};

        if (bulan || tahun) {
            const y = tahun ? parseInt(tahun, 10) : new Date().getFullYear();
            const m = bulan ? parseInt(bulan, 10) : 1;

            const start = new Date(Date.UTC(y, m - 1, 1));
            const end = new Date(Date.UTC(bulan ? y : y + 1, bulan ? m : 0, 1));

            whereClause.Tanggal = { gte: start, lt: end };
        }

        if (search) {
            const s = search.toLowerCase();
            whereClause.OR = [
                { Pic: { contains: s, mode: 'insensitive' } },
                { Lokasi: { contains: s, mode: 'insensitive' } },
                { Deskripsi: { contains: s, mode: 'insensitive' } }
            ];
        }

        const total = await prisma.aktivitasHarians.count({ where: whereClause });

        let orderByClause: any = {};
        if (sortBy) {
            const pascalSortBy = sortBy.charAt(0).toUpperCase() + sortBy.slice(1);
            if (pascalSortBy === 'Tanggal') {
                orderByClause = [
                    { Tanggal: sortDesc ? 'desc' : 'asc' },
                    { CreatedAt: sortDesc ? 'desc' : 'asc' }
                ];
            } else {
                orderByClause[pascalSortBy] = sortDesc ? 'desc' : 'asc';
            }
        } else {
            orderByClause = [
                { Tanggal: 'desc' },
                { CreatedAt: 'desc' }
            ];
        }

        const list = await prisma.aktivitasHarians.findMany({
            where: whereClause,
            orderBy: orderByClause,
            skip: (page - 1) * limit,
            take: limit
        });

        return NextResponse.json({ Data: list, Total: total });
    } catch (error) {
        console.error('Error fetching aktivitas harian:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const entity = await prisma.aktivitasHarians.create({
            data: {
                Tanggal: new Date(body.tanggal || body.Tanggal),
                Pic: body.pic || body.Pic,
                Lokasi: body.lokasi || body.Lokasi,
                Deskripsi: body.deskripsi || body.Deskripsi,
                Dokumentasi: body.dokumentasi || body.Dokumentasi || '',
                CreatedAt: new Date()
            }
        });

        return NextResponse.json(entity, { status: 201 });
    } catch (error) {
        console.error('Error creating aktivitas harian:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
