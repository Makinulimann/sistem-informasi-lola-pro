export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

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

        // Fetch data from Supabase
        const { data: allRecords, error } = await db.from<any>('produksis').select('*').execute();

        if (error) {
            console.error('Error fetching produksi:', error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }

        // Filter for this product and tab
        const filteredRecords = (allRecords || []).filter((r: any) => 
            r.product_slug === productSlug && r.produksi_tab_id === tabId
        );

        // Filter for this month's grid display
        const dbRecords = filteredRecords.filter(r => new Date(r.tanggal) >= startUtc && new Date(r.tanggal) < endUtc);

        const daysInMonth = new Date(tahun, bulan, 0).getDate();
        const fullList = [];

        let runningKumulatif = 0;
        let runningStok = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(tahun, bulan - 1, day);

            const match = dbRecords.find((r: any) => {
                const localD = new Date(new Date(r.tanggal).getTime() + utcOffset);
                return localD.getDate() === date.getDate() && localD.getMonth() === date.getMonth();
            });

            const bs = match?.bs ?? 0;
            const ps = match?.ps ?? 0;
            const coa = match?.coa ?? 0;
            const pg = match?.pg ?? 0;
            const ket = match?.keterangan ?? "";
            const id = match?.id ?? 0;
            const batchKode = match?.batch_kode ?? "";
            const psBatchKode = match?.ps_batch_kode ?? "";
            const coaBatchKode = match?.coa_batch_kode ?? "";

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

        // --- Calculate Batch WIP available globally ---
        const batchMap: { [kode: string]: { bs: number, ps: number, coa: number } } = {};
        for (const r of filteredRecords) {
            if (r.batch_kode && r.bs > 0) {
                if (!batchMap[r.batch_kode]) batchMap[r.batch_kode] = { bs: 0, ps: 0, coa: 0 };
                batchMap[r.batch_kode].bs += r.bs;
            }
            if (r.ps_batch_kode && r.ps > 0) {
                if (!batchMap[r.ps_batch_kode]) batchMap[r.ps_batch_kode] = { bs: 0, ps: 0, coa: 0 };
                batchMap[r.ps_batch_kode].ps += r.ps;
            }
            if (r.coa_batch_kode && r.coa > 0) {
                if (!batchMap[r.coa_batch_kode]) batchMap[r.coa_batch_kode] = { bs: 0, ps: 0, coa: 0 };
                batchMap[r.coa_batch_kode].coa += r.coa;
            }
        }

        let globalBelumSampling = 0;
        let globalProsesSampling = 0;

        for (const kode in batchMap) {
            const b = batchMap[kode];
            globalBelumSampling += Math.max(0, b.bs - b.ps);
            globalProsesSampling += Math.max(0, b.ps - b.coa);
        }

        const summary = {
            totalProduksi: fullList.reduce((sum, x) => sum + x.bs, 0),
            totalKeluar: fullList.reduce((sum, x) => sum + x.pg, 0),
            totalPs: globalProsesSampling,
            totalCoa: fullList.reduce((sum, x) => sum + x.coa, 0),
            totalBelumSampling: globalBelumSampling,
            kumulatif: runningKumulatif,
            stokAkhir: runningStok
        };

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

        // Check for existing record
        const { data: existingArr } = await db.from<any>('produksis').select('*').eq('produksi_tab_id', tabId).execute();
        const existing = (existingArr || []).find((r: any) => {
            const existingDate = new Date(r.tanggal);
            return existingDate.getTime() === targetUtc.getTime();
        });

        if (existing) {
            // Update existing
            const { error: updateError } = await db.from<any>('produksis').update({
                bs: bsValue,
                ps: psValue,
                coa: coaValue,
                pg: pgValue,
                keterangan: ketValue,
                batch_kode: batchKodeValue,
                ps_batch_kode: psBatchKodeValue || existing.ps_batch_kode,
                coa_batch_kode: coaBatchKodeValue || existing.coa_batch_kode,
                kumulatif: 0,
                stok_akhir: 0
            }).eq('id', existing.id);

            if (updateError) {
                console.error('Error updating produksi:', updateError);
                return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
            }
        } else {
            // Insert new
            const { error: insertError } = await db.from<any>('produksis').insert({
                product_slug: productSlug,
                produksi_tab_id: tabId,
                tanggal: targetUtc.toISOString(),
                bs: bsValue,
                ps: psValue,
                coa: coaValue,
                pg: pgValue,
                keterangan: ketValue,
                batch_kode: batchKodeValue,
                ps_batch_kode: psBatchKodeValue,
                coa_batch_kode: coaBatchKodeValue,
                kumulatif: 0,
                stok_akhir: 0
            });

            if (insertError) {
                console.error('Error inserting produksi:', insertError);
                return NextResponse.json({ message: 'Failed to insert' }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving produksi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
