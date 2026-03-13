import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const list = await prisma.logbookPics.findMany({
            where: { IsActive: true },
            orderBy: { Nama: 'asc' }
        });
        return NextResponse.json(list);
    } catch (error) {
        console.error('Error fetching pic:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const entity = await prisma.logbookPics.create({
            data: {
                Nama: body.nama || body.Nama,
                IsActive: body.isActive ?? true // Assuming 'isActive' might be sent, otherwise default to true
            }
        });
        return NextResponse.json(entity, { status: 201 });
    } catch (error) {
        console.error('Error creating pic:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
