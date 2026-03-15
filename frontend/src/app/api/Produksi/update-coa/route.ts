export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productSlug, tabId, tanggal, batchKode, coa } = body;

        // Basic validation
        if (!productSlug || tabId === undefined || !tanggal || !batchKode) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const localDate = new Date(tanggal);
        if (isNaN(localDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date format.' }, { status: 400 });
        }

        // Find the ProduksiTab based on productSlug and tabId
        const tab = await prisma.produksiTabs.findFirst({
            where: {
                ProductSlug: productSlug,
                Id: tabId
            }
        });

        if (!tab) {
            return NextResponse.json({ error: 'ProduksiTab not found.' }, { status: 404 });
        }

        // 1. Fetch the target batch (to ensure it exists and has BS > 0)
        const targetBatch = await prisma.produksis.findFirst({
            where: {
                ProduksiTabId: tab.Id,
                BatchKode: batchKode,
                BS: { gt: 0 }
            }
        });

        if (!targetBatch) {
            return NextResponse.json({ error: `Kode Batch ${batchKode} tidak ditemukan atau belum ada produksi (BS).` }, { status: 404 });
        }

        // 2. Validate COA value
        if (coa < 0) {
            return NextResponse.json({ error: 'Nilai COA tidak boleh negatif' }, { status: 400 });
        }

        // Find or create the row for the *current* action date
        const utcOffset = 7 * 60 * 60 * 1000;
        const targetUtcDate = new Date(localDate.getTime() - utcOffset);

        let existingRecord = await prisma.produksis.findFirst({
            where: {
                ProduksiTabId: tab.Id,
                Tanggal: targetUtcDate,
            }
        });

        if (existingRecord) {
            // Update existing record for this date
            await prisma.produksis.update({
                where: { Id: existingRecord.Id },
                data: {
                    COA: coa,
                    COABatchKode: batchKode // Note: saving the reference to the target batch
                }
            });
        } else {
            // Create a new record for this date just to hold the COA
            await prisma.produksis.create({
                data: {
                    ProductSlug: productSlug,
                    ProduksiTabId: tab.Id,
                    Tanggal: targetUtcDate,
                    BS: 0,
                    PS: 0,
                    COA: coa,
                    PG: 0,
                    Kumulatif: 0,
                    StokAkhir: 0,
                    BatchKode: '',
                    PSBatchKode: '',
                    COABatchKode: batchKode, // Note: saving the reference
                    Keterangan: ''
                }
            });
        }

        return NextResponse.json({
            success: true,
            batchKode: batchKode,
            coa: coa
        });
    } catch (error) {
        console.error('Error updating COA:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
