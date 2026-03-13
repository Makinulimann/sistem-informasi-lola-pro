import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /{productSlug}
export async function GET(
    request: Request,
    { params }: { params: Promise<{ slugOrId: string }> }
) {
    try {
        const p = await params;
        const { searchParams } = new URL(request.url);
        const jenis = searchParams.get('jenis');

        const whereClause: any = { ProductSlug: p.slugOrId };
        if (jenis) {
            whereClause.Jenis = jenis;
        }

        const materials = await prisma.productMaterials.findMany({
            where: whereClause,
            include: {
                MasterItems: true
            }
        });

        const formatted = materials
            .sort((a, b) => a.MasterItems.Nama.localeCompare(b.MasterItems.Nama))
            .map(pm => ({
                Id: pm.Id,
                MasterItemId: pm.MasterItemId,
                Nama: pm.MasterItems.Nama,
                Jenis: pm.Jenis,
                Satuan: pm.MasterItems.SatuanDefault
            }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Error fetching product materials:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /{id}
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ slugOrId: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.slugOrId, 10);

        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
        }

        const pm = await prisma.productMaterials.findUnique({
            where: { Id: id }
        });

        if (!pm) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        await prisma.productMaterials.delete({
            where: { Id: id }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error unassigning material:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
