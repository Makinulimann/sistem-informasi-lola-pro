export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function titleCase(s: string) {
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
        const allMenus = await prisma.sidebarMenus.findMany({
            where: { IsActive: true, Href: { not: '#' } }
        });

        const productSlugs = [...new Set(allMenus
            .filter(m => m.Href && m.Href.includes(`/dashboard/${categorySlug}/`))
            .map(m => {
                const parts = m.Href!.split('/').filter(s => s);
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
        for (const menu of allMenus) {
            for (const slug of productSlugs) {
                if (menu.Href && menu.Href.includes(`/${slug}/`)) {
                    const parent = allMenus.find(m => m.Id === menu.ParentId);
                    if (parent && !productLabels[slug]) {
                        productLabels[slug] = parent.Label;
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

        // Fetch all materials at once for these products to minimize queries? Just loop is fine
        const results = [];

        for (const slug of productSlugs) {
            const configuredMaterials = await prisma.productMaterials.findMany({
                where: { ProductSlug: slug },
                include: { MasterItems: true },
                orderBy: [
                    { Jenis: 'asc' },
                    { MasterItems: { Nama: 'asc' } }
                ]
            });

            const configuredNames = configuredMaterials.map(pm => pm.MasterItems.Nama).filter(Boolean);

            const materialRecords = configuredNames.length > 0
                ? await prisma.bahanBakus.findMany({
                    where: { NamaBahan: { in: configuredNames } }
                }) : [];

            const materialSummary = configuredMaterials.map(pm => {
                const name = pm.MasterItems.Nama;
                const satuan = pm.MasterItems.SatuanDefault || 'Kg';
                const records = materialRecords.filter(r => r.NamaBahan.toLowerCase() === name.toLowerCase());

                const periodRecords = records.filter(r => new Date(r.Tanggal) >= startUtc && new Date(r.Tanggal) < endUtc);

                const totalIn = periodRecords
                    .filter(r => r.Tipe === 'Suplai')
                    .reduce((sum, r) => sum + convertUnit(r.Kuantum, r.Satuan, satuan), 0);
                const totalOut = periodRecords
                    .filter(r => r.Tipe === 'Mutasi')
                    .reduce((sum, r) => sum + convertUnit(r.Kuantum, r.Satuan, satuan), 0);

                const cumIn = records
                    .filter(r => new Date(r.Tanggal) < endUtc && r.Tipe === 'Suplai')
                    .reduce((sum, r) => sum + convertUnit(r.Kuantum, r.Satuan, satuan), 0);
                const cumOut = records
                    .filter(r => new Date(r.Tanggal) < endUtc && r.Tipe === 'Mutasi')
                    .reduce((sum, r) => sum + convertUnit(r.Kuantum, r.Satuan, satuan), 0);

                return {
                    nama: name,
                    jenis: pm.Jenis,
                    satuan,
                    suplai: totalIn,
                    mutasi: totalOut,
                    stok: cumIn - cumOut
                }
            });

            // Production summary
            const tabs = await prisma.produksiTabs.findMany({
                where: { ProductSlug: slug }
            });

            const produksiRecords = await prisma.produksis.findMany({
                where: {
                    ProductSlug: slug
                }
            });

            // Split into this month vs all time
            const monthlyRecords = produksiRecords.filter(r =>
                new Date(r.Tanggal) >= startUtc && new Date(r.Tanggal) < endUtc
            );

            let totalBS = 0, totalPS = 0, totalCOA = 0, totalPG = 0;
            let totalBelumSampling = 0, totalProsesSampling = 0;

            const tabSummaries = tabs.map(tab => {
                const tabAllRecords = produksiRecords.filter(r => r.ProduksiTabId === tab.Id);
                const tabMonthlyRecords = monthlyRecords.filter(r => r.ProduksiTabId === tab.Id);

                // --- 1. Monthly totals (BS, PG, COA) ---
                const groupedMonthly: { [key: string]: any } = {};
                for (const r of tabMonthlyRecords) {
                    const localD = new Date(new Date(r.Tanggal).getTime() + utcOffset);
                    const key = localD.toISOString().split('T')[0];
                    if (!groupedMonthly[key]) {
                        groupedMonthly[key] = r;
                    }
                }
                const dedupedMonthly: any[] = Object.values(groupedMonthly);
                const bs = dedupedMonthly.reduce((s, r) => s + r.BS, 0);
                const pg = dedupedMonthly.reduce((s, r) => s + r.PG, 0);
                const coa = dedupedMonthly.reduce((s, r) => s + r.COA, 0);

                totalBS += bs;
                totalPG += pg;
                totalCOA += coa;

                // --- 2. Global Batch Balances (Belum Sampling, Proses Sampling) ---
                // We calculate this across ALL time to show the true WIP balance
                const batchMap: { [kode: string]: { bs: number, ps: number, coa: number } } = {};
                for (const r of tabAllRecords) {
                    // BS adds to a batch
                    if (r.BatchKode && r.BS > 0) {
                        if (!batchMap[r.BatchKode]) batchMap[r.BatchKode] = { bs: 0, ps: 0, coa: 0 };
                        batchMap[r.BatchKode].bs += r.BS;
                    }
                    // PS adds to a batch
                    if (r.PSBatchKode && r.PS > 0) {
                        if (!batchMap[r.PSBatchKode]) batchMap[r.PSBatchKode] = { bs: 0, ps: 0, coa: 0 };
                        batchMap[r.PSBatchKode].ps += r.PS;
                    }
                    // COA adds to a batch
                    if (r.COABatchKode && r.COA > 0) {
                        if (!batchMap[r.COABatchKode]) batchMap[r.COABatchKode] = { bs: 0, ps: 0, coa: 0 };
                        batchMap[r.COABatchKode].coa += r.COA;
                    }
                }

                let tabBelumSampling = 0;
                let tabProsesSampling = 0;

                for (const kode in batchMap) {
                    const b = batchMap[kode];
                    tabBelumSampling += Math.max(0, b.bs - b.coa);
                    tabProsesSampling += Math.max(0, b.ps - b.coa);
                }

                totalBelumSampling += tabBelumSampling;
                totalProsesSampling += tabProsesSampling;

                return {
                    tabName: tab.Nama,
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
