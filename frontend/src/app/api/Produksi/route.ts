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

        // Fetch data from Supabase filtered by product_slug
        const { data: filteredRecords, error } = await db.from<any>('produksis').select('*').eq('product_slug', productSlug).execute();

        if (error) {
            console.error('Error fetching produksi:', error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }

        if (!tabIdStr || !bulanStr || !tahunStr) {
            const batchMap: { [kode: string]: { bs: number } } = {};
            for (const r of filteredRecords) {
                if (r.batch_kode && r.bs > 0) {
                    if (!batchMap[r.batch_kode]) batchMap[r.batch_kode] = { bs: 0 };
                    batchMap[r.batch_kode].bs += r.bs;
                }
            }

            const availableBatches = [];
            for (const kode in batchMap) {
                const b = batchMap[kode];
                availableBatches.push({ kode, bsWip: b.bs, psWip: 0, coaWip: 0 });
            }

            return NextResponse.json({ summary: {}, data: [], availableBatches });
        }

        const tabId = parseInt(tabIdStr, 10);
        const bulan = parseInt(bulanStr, 10);
        const tahun = parseInt(tahunStr, 10);

        const utcOffset = 7 * 60 * 60 * 1000;
        const localStart = new Date(tahun, bulan - 1, 1);
        const localEnd = new Date(tahun, bulan, 1);
        const startUtc = new Date(localStart.getTime() - utcOffset);
        const endUtc = new Date(localEnd.getTime() - utcOffset);

        // Filter for this tab
        const tabFilteredRecords = filteredRecords.filter((r: any) => 
            r.produksi_tab_id === tabId
        );

        // Filter for this month's grid display
        const dbRecords = tabFilteredRecords.filter(r => new Date(r.tanggal) >= startUtc && new Date(r.tanggal) < endUtc);

        // Prior records (before current month) for accumulation
        const priorRecords = tabFilteredRecords.filter(r => new Date(r.tanggal) < startUtc);
        const priorBs = priorRecords.reduce((sum: number, r: any) => sum + Number(r.bs || 0), 0);
        const priorPs = priorRecords.reduce((sum: number, r: any) => sum + Number(r.ps || 0), 0);
        const priorPg = priorRecords.reduce((sum: number, r: any) => sum + Number(r.pg || 0), 0);

        const daysInMonth = new Date(tahun, bulan, 0).getDate();
        const fullList = [];

        let runningKumulatif = priorBs;
        let runningStok = priorBs - priorPg;
        let initialBs = priorBs - priorPs;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(tahun, bulan - 1, day);

            const dayMatches = dbRecords.filter((r: any) => {
                const localD = new Date(new Date(r.tanggal).getTime() + utcOffset);
                return localD.getDate() === date.getDate() && localD.getMonth() === date.getMonth();
            });

            const bs = dayMatches.reduce((max, r) => Math.max(max, Number(r.bs || 0)), 0);
            const ps = dayMatches.reduce((max, r) => Math.max(max, Number(r.ps || 0)), 0);
            const coa = dayMatches.reduce((max, r) => Math.max(max, Number(r.coa || 0)), 0);
            const pg = dayMatches.reduce((max, r) => Math.max(max, Number(r.pg || 0)), 0);
            const ket = dayMatches.map((r: any) => r.keterangan).filter(Boolean).join(' ') || "";
            const id = dayMatches.find((r: any) => r.id)?.id ?? 0;
            const batchKode = dayMatches.find((r: any) => r.batch_kode)?.batch_kode ?? "";
            const psBatchKode = dayMatches.find((r: any) => r.ps_batch_kode)?.ps_batch_kode ?? "";
            const coaBatchKode = dayMatches.find((r: any) => r.coa_batch_kode)?.coa_batch_kode ?? "";

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
        for (const r of tabFilteredRecords) {
            const bsNum = Number(r.bs || 0);
            const psNum = Number(r.ps || 0);
            const coaNum = Number(r.coa || 0);

            if (bsNum > 0 || psNum > 0 || coaNum > 0) {
                let effectiveBatch = (r.batch_kode || '').trim();
                if (!effectiveBatch && bsNum > 0) {
                    const d = new Date(r.tanggal);
                    const dd = String(d.getUTCDate()).padStart(2, '0');
                    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                    const yy = String(d.getUTCFullYear()).slice(-2);
                    effectiveBatch = `B-${dd}${mm}${yy}`;

                    // Persist auto-generated batch code if missing in DB
                    db.from<any>('produksis').update({ batch_kode: effectiveBatch }).eq('id', r.id).then(() => {}).catch(() => {});
                }

                if (effectiveBatch && bsNum > 0) {
                    if (!batchMap[effectiveBatch]) batchMap[effectiveBatch] = { bs: 0, ps: 0, coa: 0 };
                    batchMap[effectiveBatch].bs += bsNum;
                }

                const effectivePsBatch = (r.ps_batch_kode || '').trim() || effectiveBatch;
                if (effectivePsBatch && psNum > 0) {
                    if (!batchMap[effectivePsBatch]) batchMap[effectivePsBatch] = { bs: 0, ps: 0, coa: 0 };
                    batchMap[effectivePsBatch].ps += psNum;
                }

                const effectiveCoaBatch = (r.coa_batch_kode || '').trim() || effectivePsBatch || effectiveBatch;
                if (effectiveCoaBatch && coaNum > 0) {
                    if (!batchMap[effectiveCoaBatch]) batchMap[effectiveCoaBatch] = { bs: 0, ps: 0, coa: 0 };
                    batchMap[effectiveCoaBatch].coa += coaNum;
                }
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
            stokAkhir: runningStok,
            initialBs: initialBs
        };

        const availableBatches = [];
        for (const kode in batchMap) {
            const b = batchMap[kode];
            const bsWip = Math.max(0, b.bs - b.ps);
            const psWip = Math.max(0, b.ps - b.coa);
            const coaWip = Math.max(0, b.ps - b.coa);
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

        const dateStr = tanggalValid.includes('T') ? tanggalValid.split('T')[0] : tanggalValid;
        const targetUtc = new Date(`${dateStr}T00:00:00.000Z`);

        const extractYmd = (val: any): string => {
            if (!val) return '';
            if (typeof val === 'string') {
                const clean = val.split('T')[0].split(' ')[0];
                const parts = clean.split('-');
                if (parts.length === 3 && parts[0].length === 4) return clean;
            }
            const d = new Date(val);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        };

        const isSameDate = (d1: any, d2: any): boolean => {
            const y1 = extractYmd(d1);
            const y2 = extractYmd(d2);
            if (y1 && y2 && y1 === y2) return true;
            
            const d1Obj = new Date(d1);
            const d2Obj = new Date(d2);
            if (!isNaN(d1Obj.getTime()) && !isNaN(d2Obj.getTime())) {
                const local1 = new Date(d1Obj.getTime() + 7 * 3600000).toISOString().split('T')[0];
                const local2 = new Date(d2Obj.getTime() + 7 * 3600000).toISOString().split('T')[0];
                return local1 === local2 || local1 === y2 || y1 === local2;
            }
            return false;
        };

        // Check for existing record
        const reqId = body.id || body.Id || body.produksiId;
        const { data: existingArr } = await db.from<any>('produksis').select('*').eq('produksi_tab_id', tabId).execute();
        const existing = (existingArr || []).find((r: any) => {
            if (reqId && Number(r.id) === Number(reqId)) return true;
            if (r.produksi_tab_id !== tabId) return false;
            if (batchKodeValue && r.batch_kode && r.batch_kode.toLowerCase() === batchKodeValue.toLowerCase() && r.bs > 0) return true;
            return isSameDate(r.tanggal, dateStr);
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
