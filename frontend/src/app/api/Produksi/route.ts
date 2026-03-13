import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productSlug = searchParams.get('productSlug');
        const tabIdStr = searchParams.get('tabId');
        const bulanStr = searchParams.get('bulan');
        const tahunStr = searchParams.get('tahun');

        if (!productSlug) {
            return NextResponse.json({ message: 'productSlug is required.' }, { status: 400 });
        }

        if (!tabIdStr || !bulanStr || !tahunStr) {
            return NextResponse.json({ summary: {}, data: [] });
        }

        const tabId = parseInt(tabIdStr, 10);
        const bulan = parseInt(bulanStr, 10);
        const tahun = parseInt(tahunStr, 10);

        const utcOffset = 7 * 60 * 60 * 1000;
        const localStart = new Date(tahun, bulan - 1, 1);
        const localEnd = new Date(tahun, bulan, 1);
        const startUtc = new Date(localStart.getTime() - utcOffset);
        const endUtc = new Date(localEnd.getTime() - utcOffset);

        // Fetch ALL data for batch WIP calculation across time
        const allRecords: any[] = await prisma.$queryRaw`
            SELECT * FROM "Produksis" 
            WHERE "ProductSlug" = ${productSlug} 
            AND "ProduksiTabId" = ${tabId}
        `;

        // Filter for this month's grid display
        const dbRecords = allRecords.filter(r => new Date(r.Tanggal) >= startUtc && new Date(r.Tanggal) < endUtc);

        const daysInMonth = new Date(tahun, bulan, 0).getDate();
        const fullList = [];

        let runningKumulatif = 0;
        let runningStok = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(tahun, bulan - 1, day);

            const match = dbRecords.find(r => {
                const localD = new Date(new Date(r.Tanggal).getTime() + utcOffset);
                return localD.getDate() === date.getDate() && localD.getMonth() === date.getMonth();
            });

            const bs = match?.BS ?? 0;
            const ps = match?.PS ?? 0;
            const coa = match?.COA ?? 0;
            const pg = match?.PG ?? 0;
            const ket = match?.Keterangan ?? "";
            const id = match?.Id ?? 0;
            const batchKode = match?.BatchKode ?? "";
            const psBatchKode = match?.PSBatchKode ?? "";
            const coaBatchKode = match?.COABatchKode ?? "";

            runningKumulatif += bs;
            runningStok += (bs - pg);

            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');

            fullList.push({
                id: id,
                tanggal: `${yyyy}-${mm}-${dd}`,
                bs: bs,
                ps: ps,
                coa: coa,
                pg: pg,
                kumulatif: runningKumulatif,
                stokAkhir: runningStok,
                keterangan: ket,
                batchKode: batchKode,
                psBatchKode: psBatchKode,
                coaBatchKode: coaBatchKode
            });
        }

        const summary = {
            totalProduksi: fullList.reduce((sum, x) => sum + x.bs, 0),
            totalKeluar: fullList.reduce((sum, x) => sum + x.pg, 0),
            kumulatif: runningKumulatif,
            stokAkhir: runningStok
        };

        // --- Calculate Batch WIP available globally ---
        const batchMap: { [kode: string]: { bs: number, ps: number, coa: number } } = {};
        for (const r of allRecords) {
            if (r.BatchKode && r.BS > 0) {
                if (!batchMap[r.BatchKode]) batchMap[r.BatchKode] = { bs: 0, ps: 0, coa: 0 };
                batchMap[r.BatchKode].bs += r.BS;
            }
            if (r.PSBatchKode && r.PS > 0) {
                if (!batchMap[r.PSBatchKode]) batchMap[r.PSBatchKode] = { bs: 0, ps: 0, coa: 0 };
                batchMap[r.PSBatchKode].ps += r.PS;
            }
            if (r.COABatchKode && r.COA > 0) {
                if (!batchMap[r.COABatchKode]) batchMap[r.COABatchKode] = { bs: 0, ps: 0, coa: 0 };
                batchMap[r.COABatchKode].coa += r.COA;
            }
        }

        const availableBatches = [];
        for (const kode in batchMap) {
            const b = batchMap[kode];
            const bsWip = Math.max(0, b.bs - b.coa);
            const psWip = Math.max(0, b.ps - b.coa);
            const coaWip = Math.max(0, b.bs - b.coa);
            if (bsWip > 0 || psWip > 0 || coaWip > 0) {
                availableBatches.push({ kode, bsWip, psWip, coaWip });
            }
        }

        return NextResponse.json({ summary, data: fullList, availableBatches });
    } catch (error) {
        console.error('Error fetching produksi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const productSlug = body.productSlug || body.ProductSlug;
        const tabId = body.tabId !== undefined ? body.tabId : body.TabId;
        const tanggalValid = body.tanggal || body.Tanggal;
        const bsValue = body.bs !== undefined ? body.bs : body.BS;
        const psValue = body.ps !== undefined ? body.ps : body.PS;
        const coaValue = body.coa !== undefined ? body.coa : body.COA;
        const pgValue = body.pg !== undefined ? body.pg : body.PG;
        const ketValue = body.keterangan || body.Keterangan || '';
        const batchKodeValue = body.batchKode || body.BatchKode || '';
        const psBatchKodeValue = body.psBatchKode || body.PSBatchKode || '';
        const coaBatchKodeValue = body.coaBatchKode || body.COABatchKode || '';

        if (!productSlug || tabId === undefined) {
            return NextResponse.json({ message: 'productSlug and tabId are required.' }, { status: 400 });
        }

        const localDate = new Date(tanggalValid);
        if (isNaN(localDate.getTime())) {
            return NextResponse.json({ message: 'Invalid date format.' }, { status: 400 });
        }

        const utcOffset = 7 * 60 * 60 * 1000;
        const targetUtc = new Date(localDate.getTime() - utcOffset);

        // Upsert equivalent since we might not have a unique index on (TabId, Tanggal)
        const existingArr: any[] = await prisma.$queryRaw`
            SELECT * FROM "Produksis"
            WHERE "ProduksiTabId" = ${tabId} AND "Tanggal" = ${targetUtc}
            LIMIT 1
        `;
        const existing = existingArr[0];

        if (existing) {
            await prisma.$executeRaw`
                UPDATE "Produksis" SET
                    "BS" = ${bsValue},
                    "PS" = ${psValue},
                    "COA" = ${coaValue},
                    "PG" = ${pgValue},
                    "Keterangan" = ${ketValue},
                    "BatchKode" = ${batchKodeValue},
                    "PSBatchKode" = ${psBatchKodeValue || existing.PSBatchKode},
                    "COABatchKode" = ${coaBatchKodeValue || existing.COABatchKode},
                    "Kumulatif" = 0,
                    "StokAkhir" = 0
                WHERE "Id" = ${existing.Id}
            `;
        } else {
            await prisma.$executeRaw`
                INSERT INTO "Produksis" (
                    "ProductSlug", "ProduksiTabId", "Tanggal", "BS", "PS", "COA", "PG", "Keterangan", "BatchKode", "PSBatchKode", "COABatchKode", "Kumulatif", "StokAkhir"
                ) VALUES (
                    ${productSlug}, ${tabId}, ${targetUtc}, ${bsValue}, ${psValue}, ${coaValue}, ${pgValue}, ${ketValue}, ${batchKodeValue}, ${psBatchKodeValue}, ${coaBatchKodeValue}, 0, 0
                )
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving produksi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
