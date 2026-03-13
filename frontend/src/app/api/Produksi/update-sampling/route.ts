import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productSlug, tabId, tanggal, batchKode, ps } = body;

        // Basic validation
        if (!productSlug || !tabId || !tanggal || !batchKode) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const localDate = new Date(tanggal);
        if (isNaN(localDate.getTime())) {
            return NextResponse.json({ message: 'Invalid date format.' }, { status: 400 });
        }

        // Find the ProduksiTab based on productSlug and tabId
        const tab = await prisma.produksiTabs.findFirst({
            where: {
                ProductSlug: productSlug,
                Id: tabId
            }
        });

        if (!tab) {
            return NextResponse.json({ message: 'ProduksiTab not found.' }, { status: 404 });
        }

        // 1. Fetch the target batch (to ensure it exists and has BS > 0)
        // Note: The batch could have been created on ANY date
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

        // 2. We don't necessarily enforce (PS <= BS) on a *single* transaction here because
        // PS might be done in multiple steps. We just need to record the PS and its batch reference.
        // We ensure the PS is not negative.
        if (ps < 0) {
            return NextResponse.json({ error: 'Nilai sampling tidak boleh negatif' }, { status: 400 });
        }

        // 3. Find or create the row for the *current* action date (tanggal)
        // where we are recording this sampling event
        // Note: This row might not have its own BS (i.e. BS=0)
        const dateObj = new Date(tanggal);
        // Adjust date to UTC+7 for consistent storage if needed, but for comparison, local date is fine if prisma handles it.
        // Assuming `tanggal` from body is already in the desired timezone or will be handled by DB.
        // If `Tanggal` in DB is stored as UTC and `dateObj` is local, comparison might fail.
        // Let's ensure `dateObj` is normalized to start of day in a specific timezone if `Tanggal` in DB is also normalized.
        // For simplicity, assuming `dateObj` directly matches `Tanggal` in DB for comparison.
        // If `Tanggal` in DB is stored as UTC, and `tanggal` from client is local, we need to convert `tanggal` to UTC.
        // The original code had `targetUtc`. Let's re-introduce a similar concept for `dateObj` if `Tanggal` in DB is UTC.
        const utcOffset = 7 * 60 * 60 * 1000; // Assuming UTC+7
        const targetUtcDate = new Date(localDate.getTime() - utcOffset);


        let existingRecord = await prisma.produksis.findFirst({
            where: {
                ProduksiTabId: tab.Id,
                Tanggal: targetUtcDate, // Use the normalized date for comparison
            }
        });

        if (existingRecord) {
            // Update existing record for this date
            await prisma.produksis.update({
                where: { Id: existingRecord.Id },
                data: {
                    PS: ps,
                    PSBatchKode: batchKode // Note: saving the reference to the target batch
                }
            });
        } else {
            // Create a new record for this date just to hold the PS
            await prisma.produksis.create({
                data: {
                    ProductSlug: productSlug,
                    ProduksiTabId: tab.Id,
                    Tanggal: targetUtcDate, // Use the normalized date for creation
                    BS: 0,
                    PS: ps,
                    COA: 0,
                    PG: 0,
                    Kumulatif: 0,
                    StokAkhir: 0,
                    BatchKode: '',
                    PSBatchKode: batchKode, // Note: saving the reference
                    COABatchKode: '',
                    Keterangan: ''
                }
            });
        }
        return NextResponse.json({
            success: true,
            batchKode: batchKode,
            ps: ps
        });
    } catch (error) {
        console.error('Error updating sampling:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
