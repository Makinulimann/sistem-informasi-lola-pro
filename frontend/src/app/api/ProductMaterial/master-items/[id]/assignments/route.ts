import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);

        const assignments = await prisma.productMaterials.findMany({
            where: { MasterItemId: id },
            select: {
                Id: true,
                ProductSlug: true,
                Jenis: true
            }
        });

        return NextResponse.json(assignments);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
