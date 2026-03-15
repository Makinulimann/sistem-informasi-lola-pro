export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const scopeProductSlug = searchParams.get('scopeProductSlug');

        const whereClause: any = { IsActive: true };

        if (scopeProductSlug) {
            whereClause.OR = [
                { ScopeProductSlug: null },
                { ScopeProductSlug: scopeProductSlug }
            ];
        } else {
            whereClause.ScopeProductSlug = null;
        }

        if (search) {
            whereClause.Nama = { contains: search, mode: 'insensitive' };
        }

        const items = await prisma.masterItems.findMany({
            where: whereClause,
            orderBy: [
                { ScopeProductSlug: 'asc' }, // nulls first/last depending on DB
                { Nama: 'asc' }
            ],
            take: 50
        });

        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching master items:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const nama = body.nama || body.Nama;
        const scopeProductSlug = body.scopeProductSlug || body.ScopeProductSlug || null;

        const existing = await prisma.masterItems.findFirst({
            where: {
                Nama: nama,
                OR: [
                    { ScopeProductSlug: null },
                    { ScopeProductSlug: scopeProductSlug }
                ]
            }
        });

        if (existing) {
            return NextResponse.json({ message: 'Item with this name already exists available for this product.' }, { status: 400 });
        }

        const item = await prisma.masterItems.create({
            data: {
                Nama: nama,
                Kode: body.kode || body.Kode || null,
                SatuanDefault: body.satuanDefault || body.SatuanDefault || null,
                ScopeProductSlug: scopeProductSlug,
                IsActive: body.isActive ?? body.IsActive ?? true
            }
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        console.error('Error creating master item:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
