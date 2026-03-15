export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const list = await prisma.perusahaans.findMany({
            where: { IsActive: true },
            orderBy: { Nama: 'asc' }
        });
        return NextResponse.json(list);
    } catch (error) {
        console.error('Error fetching perusahaan:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const entity = await prisma.perusahaans.create({
            data: {
                Nama: body.nama || body.Nama,
                IsActive: body.isActive ?? body.IsActive ?? true,
                CreatedAt: new Date()
            }
        });
        return NextResponse.json(entity, { status: 201 });
    } catch (error) {
        console.error('Error creating perusahaan:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
