export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const productSlug = body.productSlug || body.ProductSlug;
        const tabId = body.tabId !== undefined ? body.tabId : body.TabId;
        const tanggalValid = body.tanggal || body.Tanggal;

        if (!productSlug || tabId === undefined) {
            return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
        }

        const localDate = new Date(tanggalValid);
        if (isNaN(localDate.getTime())) {
            return NextResponse.json({ message: 'Invalid date format.' }, { status: 400 });
        }

        const utcOffset = 7 * 60 * 60 * 1000;
        const targetUtc = new Date(localDate.getTime() - utcOffset);

        // 1. Reset produksi BS to 0
        const record = await prisma.produksis.findFirst({
            where: {
                ProduksiTabId: tabId,
                Tanggal: targetUtc
            }
        });

        if (record) {
            await prisma.produksis.update({
                where: { Id: record.Id },
                data: {
                    BS: 0,
                    Keterangan: ''
                }
            });
        }

        // 2. Delete related Mutasi records for that product + date
        const relatedMutasi = await prisma.bahanBakus.findMany({
            where: {
                ProductSlug: productSlug,
                Tipe: 'Mutasi',
                Tanggal: targetUtc
            }
        });

        const toDeleteIds = relatedMutasi
            .filter(b => b.Keterangan?.toLowerCase().startsWith('produksi '))
            .map(b => b.Id);

        if (toDeleteIds.length > 0) {
            await prisma.bahanBakus.deleteMany({
                where: { Id: { in: toDeleteIds } }
            });
        }

        return NextResponse.json({
            success: true,
            deletedMutasiCount: toDeleteIds.length
        });
    } catch (error) {
        console.error('Error canceling produksi with materials:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
