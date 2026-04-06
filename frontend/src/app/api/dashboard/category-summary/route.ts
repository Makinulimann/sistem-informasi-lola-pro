export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

function titleCase(s: string) {
    if (s === 'phonska-oca') return 'Phonska Oca Plus';
    return s.split('-')
        .map(word => word ? word[0].toUpperCase() + word.slice(1) : '')
        .join(' ');
}

function convertUnit(value: number, fromUnit: string, toUnit: string): number {
    if ((fromUnit || '').trim().toLowerCase() === (toUnit || '').trim().toLowerCase()) return value;

    const normalize = (u: string) => {
        switch (u) {
            case 'l': case 'lt': case 'litre': return 'liter';
            case 'milliliter': case 'millilitre': case 'cc': return 'ml';
            case 'kilo': case 'kilogram': return 'kg';
            case 'gr': case 'g': return 'gram';
            default: return u;
        }
    };

    const from = normalize((fromUnit || '').trim().toLowerCase());
    const to = normalize((toUnit || '').trim().toLowerCase());

    const massUnits = ['ton', 'kwintal', 'kg', 'gram', 'mg'];
    const volUnits = ['kl', 'liter', 'ml'];

    const toKg = (val: number, u: string) => {
        switch (u) {
            case 'ton': return val * 1000;
            case 'kwintal': return val * 100;
            case 'kg': return val;
            case 'gram': return val / 1000;
            case 'mg': return val / 1000000;
            default: return val;
        }
    };

    const fromKg = (val: number, u: string) => {
        switch (u) {
            case 'ton': return val / 1000;
            case 'kwintal': return val / 100;
            case 'kg': return val;
            case 'gram': return val * 1000;
            case 'mg': return val * 1000000;
            default: return val;
        }
    };

    const toLiter = (val: number, u: string) => {
        switch (u) {
            case 'kl': return val * 1000;
            case 'liter': return val;
            case 'ml': return val / 1000;
            default: return val;
        }
    };

    const fromLiter = (val: number, u: string) => {
        switch (u) {
            case 'kl': return val / 1000;
            case 'liter': return val;
            case 'ml': return val * 1000;
            default: return val;
        }
    };

    if (massUnits.includes(from) && massUnits.includes(to)) {
        return fromKg(toKg(value, from), to);
    }

    if (volUnits.includes(from) && volUnits.includes(to)) {
        return fromLiter(toLiter(value, from), to);
    }

    return value;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const bulan = searchParams.get('bulan');
        const tahun = searchParams.get('tahun');

        if (!category) {
            return NextResponse.json({ message: 'category is required.' }, { status: 400 });
        }

        const now = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
        const targetBulan = bulan ? parseInt(bulan, 10) : now.getUTCMonth() + 1;
        const targetTahun = tahun ? parseInt(tahun, 10) : now.getUTCFullYear();

        const categorySlug = category.toLowerCase();

        // 1. Discover products
        const { data: allMenus } = await db.from<any>('sidebar_menus').select('*').execute();

        const productSlugs = [...new Set((allMenus || [])
            .filter((m: any) => {
                const href = m.href || m.Href;
                return href && href.includes(`/dashboard/${categorySlug}/`);
            })
            .map((m: any) => {
                const href = m.href || m.Href;
                const parts = href.split('/').filter((s: string) => s);
                return parts.length >= 3 ? parts[2] : null;
            })
            .filter(Boolean)
        )] as string[];

        if (productSlugs.length === 0) {
            return NextResponse.json({
                category: titleCase(category),
                bulan: targetBulan,
                tahun: targetTahun,
                products: []
            });
        }

        // 2. Product labels
        const productLabels: { [key: string]: string } = {};
        for (const menu of allMenus || []) {
            const href = menu.href || menu.Href;
            const parentId = menu.parent_id || menu.ParentId;

            for (const slug of productSlugs) {
                if (href && href.includes(`/${slug}/`)) {
                    const parent = (allMenus || []).find((m: any) => (m.id || m.Id) === parentId);
                    if (parent && !productLabels[slug]) {
                        productLabels[slug] = parent.label || parent.Label;
                    }
                }
            }
        }

        // 3. Time bounds
        const utcOffset = 7 * 60 * 60 * 1000;
        const localStart = new Date(targetTahun, targetBulan - 1, 1);
        const localEnd = new Date(targetTahun, targetBulan, 1);
        const startUtc = new Date(localStart.getTime() - utcOffset);
        const endUtc = new Date(localEnd.getTime() - utcOffset);

        // Fetch all materials
        const { data: allProductMaterials } = await db.from<any>('product_materials').select('*').execute();

        // Fetch all master items
        const { data: allMasterItems } = await db.from<any>('master_items').select('*').execute();
        const masterItemsMap = new Map();
        (allMasterItems || []).forEach((m: any) => masterItemsMap.set(m.id || m.Id, m));

        // Fetch all bahan_bakus
        const { data: allBahanBaku } = await db.from<any>('bahan_bakus').select('*').execute();

        // Fetch all produksi_tabs
        const { data: allTabs } = await db.from<any>('produksi_tabs').select('*').execute();

        // Fetch all produksis
        const { data: allProduksi } = await db.from<any>('produksis').select('*').execute();

        const results = [];

        for (const slug of productSlugs) {
            const configuredMaterials = (allProductMaterials || []).filter((pm: any) => (pm.product_slug || pm.ProductSlug) === slug);

            // Join with master items
            const materialSummary = configuredMaterials.map((pm: any) => {
                const masterItemId = pm.master_item_id || pm.MasterItemId;
                const masterItem = masterItemsMap.get(masterItemId);
                const name = masterItem?.nama || masterItem?.Nama || '';
                const satuan = masterItem?.satuan_default || masterItem?.SatuanDefault || 'Kg';
                const jenis = pm.jenis || pm.Jenis;

                const records = (allBahanBaku || []).filter((r: any) => {
                    const rNamaBahan = r.nama_bahan || r.NamaBahan;
                    return rNamaBahan && rNamaBahan.toLowerCase() === name.toLowerCase();
                });

                const periodRecords = records.filter((r: any) => {
                    const rTanggal = r.tanggal || r.Tanggal;
                    return new Date(rTanggal) >= startUtc && new Date(rTanggal) < endUtc;
                });

                const totalIn = periodRecords
                    .filter((r: any) => (r.tipe || r.Tipe) === 'Suplai')
                    .reduce((sum: number, r: any) => sum + convertUnit(r.kuantum || r.Kuantum, r.satuan || r.Satuan, satuan), 0);
                const totalOut = periodRecords
                    .filter((r: any) => (r.tipe || r.Tipe) === 'Mutasi')
                    .reduce((sum: number, r: any) => sum + convertUnit(r.kuantum || r.Kuantum, r.satuan || r.Satuan, satuan), 0);

                const cumIn = records
                    .filter((r: any) => {
                        const rTanggal = r.tanggal || r.Tanggal;
                        return new Date(rTanggal) < endUtc && (r.tipe || r.Tipe) === 'Suplai';
                    })
                    .reduce((sum: number, r: any) => sum + convertUnit(r.kuantum || r.Kuantum, r.satuan || r.Satuan, satuan), 0);
                const cumOut = records
                    .filter((r: any) => {
                        const rTanggal = r.tanggal || r.Tanggal;
                        return new Date(rTanggal) < endUtc && (r.tipe || r.Tipe) === 'Mutasi';
                    })
                    .reduce((sum: number, r: any) => sum + convertUnit(r.kuantum || r.Kuantum, r.satuan || r.Satuan, satuan), 0);

                return {
                    nama: name,
                    jenis: jenis,
                    satuan,
                    suplai: totalIn,
                    mutasi: totalOut,
                    stok: cumIn - cumOut
                };
            });

            const tabs = (allTabs || []).filter((t: any) => (t.product_slug || t.ProductSlug) === slug);

            const produksiRecords = (allProduksi || []).filter((p: any) => (p.product_slug || p.ProductSlug) === slug);

            // Split into this month vs all time
            const monthlyRecords = produksiRecords.filter((r: any) => {
                const rTanggal = r.tanggal || r.Tanggal;
                return new Date(rTanggal) >= startUtc && new Date(rTanggal) < endUtc;
            });

            let totalBS = 0, totalPS = 0, totalCOA = 0, totalPG = 0;
            let totalBelumSampling = 0, totalProsesSampling = 0;

            const tabSummaries = tabs.map((tab: any) => {
                const tabId = tab.id || tab.Id;
                const tabAllRecords = produksiRecords.filter((r: any) => (r.produksi_tab_id || r.ProduksiTabId) === tabId);
                const tabMonthlyRecords = monthlyRecords.filter((r: any) => (r.produksi_tab_id || r.ProduksiTabId) === tabId);

                // --- 1. Monthly totals (BS, PG, COA) ---
                const groupedMonthly: { [key: string]: any } = {};
                for (const r of tabMonthlyRecords) {
                    const rTanggal = r.tanggal || r.Tanggal;
                    const localD = new Date(new Date(rTanggal).getTime() + utcOffset);
                    const key = localD.toISOString().split('T')[0];
                    if (!groupedMonthly[key]) {
                        groupedMonthly[key] = r;
                    }
                }
                const dedupedMonthly: any[] = Object.values(groupedMonthly);
                const bs = dedupedMonthly.reduce((s: number, r: any) => s + (r.bs || r.BS || 0), 0);
                const pg = dedupedMonthly.reduce((s: number, r: any) => s + (r.pg || r.PG || 0), 0);
                const coa = dedupedMonthly.reduce((s: number, r: any) => s + (r.coa || r.COA || 0), 0);

                totalBS += bs;
                totalPG += pg;
                totalCOA += coa;

                // --- 2. Global Batch Balances ---
                const batchMap: { [kode: string]: { bs: number, ps: number, coa: number } } = {};
                for (const r of tabAllRecords) {
                    const batchKode = r.BatchKode || r.batch_kode;
                    const psBatchKode = r.PSBatchKode || r.ps_batch_kode;
                    const coaBatchKode = r.COABatchKode || r.coa_batch_kode;

                    const rBS = r.bs || r.BS || 0;
                    const rPS = r.ps || r.PS || 0;
                    const rCOA = r.coa || r.COA || 0;

                    if (batchKode && rBS > 0) {
                        if (!batchMap[batchKode]) batchMap[batchKode] = { bs: 0, ps: 0, coa: 0 };
                        batchMap[batchKode].bs += rBS;
                    }
                    if (psBatchKode && rPS > 0) {
                        if (!batchMap[psBatchKode]) batchMap[psBatchKode] = { bs: 0, ps: 0, coa: 0 };
                        batchMap[psBatchKode].ps += rPS;
                    }
                    if (coaBatchKode && rCOA > 0) {
                        if (!batchMap[coaBatchKode]) batchMap[coaBatchKode] = { bs: 0, ps: 0, coa: 0 };
                        batchMap[coaBatchKode].coa += rCOA;
                    }
                }

                let tabBelumSampling = 0;
                let tabProsesSampling = 0;

                for (const kode in batchMap) {
                    const b = batchMap[kode];
                    tabBelumSampling += Math.max(0, b.bs - b.ps);
                    tabProsesSampling += Math.max(0, b.ps - b.coa);
                }

                totalBelumSampling += tabBelumSampling;
                totalProsesSampling += tabProsesSampling;

                return {
                    tabName: tab.nama || tab.Nama,
                    totalProduksi: bs,
                    belumSampling: tabBelumSampling,
                    prosesSampling: tabProsesSampling,
                    pengirimanGudang: pg,
                    coa: coa
                };
            });

            results.push({
                slug,
                label: productLabels[slug] || titleCase(slug),
                materials: materialSummary,
                production: {
                    tabs: tabSummaries,
                    totalProduksi: totalBS,
                    totalBelumSampling,
                    totalProsesSampling,
                    totalCOA: totalCOA,
                    totalPengiriman: totalPG,
                    stokAkhir: totalBS - totalPG
                }
            });
        }

        return NextResponse.json({
            category: titleCase(category),
            bulan: targetBulan,
            tahun: targetTahun,
            products: results
        });
    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
