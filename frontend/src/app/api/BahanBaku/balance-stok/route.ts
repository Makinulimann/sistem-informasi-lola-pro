export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

function convertUnit(value: number, fromUnit: string, toUnit: string): number {
    if (!fromUnit || !toUnit) return value;
    if (fromUnit.toLowerCase() === toUnit.toLowerCase()) return value;

    const normalize = (u: string) => {
        switch (u) {
            case 'l': case 'lt': case 'litre': return 'liter';
            case 'milliliter': case 'millilitre': case 'cc': return 'ml';
            case 'kilo': case 'kilogram': return 'kg';
            case 'gr': case 'g': return 'gram';
            default: return u;
        }
    };

    const from = normalize(fromUnit.trim().toLowerCase());
    const to = normalize(toUnit.trim().toLowerCase());

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
        const productSlug = searchParams.get('productSlug');
        const bulan = searchParams.get('bulan');
        const tahun = searchParams.get('tahun');

        if (!productSlug) {
            return NextResponse.json({ message: 'productSlug is required' }, { status: 400 });
        }

        // Calculate date range
        const utcOffset = 7 * 60 * 60 * 1000;
        const now = new Date();
        const targetBulan = bulan ? parseInt(bulan, 10) : now.getMonth() + 1;
        const targetTahun = tahun ? parseInt(tahun, 10) : now.getFullYear();

        const periodStartUtc = new Date(targetTahun, targetBulan - 1, 1);
        const periodEndUtc = new Date(targetTahun, targetBulan, 1);

        const hasPeriodFilter = !!(bulan || tahun);

        // Fetch all data needed
        const { data: allProductMaterials } = await db.from<any>('product_materials').select('*').execute();
        const { data: allMasterItems } = await db.from<any>('master_items').select('*').execute();
        const { data: allRecords } = await db.from<any>('bahan_bakus').select('*').execute();

        // Build master items lookup
        const masterItemsMap = new Map();
        (allMasterItems || []).forEach((m: any) => masterItemsMap.set(m.id || m.Id, m));

        // Filter product_materials by productSlug
        const configuredMaterials = (allProductMaterials || []).filter((pm: any) => (pm.product_slug || pm.ProductSlug) === productSlug);

        const result = configuredMaterials.map((pm: any) => {
            const masterItemId = pm.master_item_id || pm.MasterItemId;
            const masterItem = masterItemsMap.get(masterItemId);
            const materialName = masterItem?.nama || masterItem?.Nama || '';
            const satuan = masterItem?.satuan_default || masterItem?.SatuanDefault || 'Kg';

            const materialRecords = (allRecords || []).filter((r: any) => {
                const rNamaBahan = r.nama_bahan || r.NamaBahan;
                return rNamaBahan && rNamaBahan.toLowerCase() === materialName.toLowerCase();
            });

            const periodRecords = hasPeriodFilter
                ? materialRecords.filter((r: any) => {
                    const rTanggal = r.tanggal || r.Tanggal;
                    const rDate = new Date(rTanggal);
                    return rDate >= periodStartUtc && rDate < periodEndUtc;
                })
                : materialRecords;

            const totalInPeriod = periodRecords
                .filter((r: any) => (r.tipe || r.Tipe) === 'Suplai')
                .reduce((sum: number, r: any) => sum + convertUnit(r.kuantum || r.Kuantum || 0, r.satuan || r.Satuan || 'Kg', satuan), 0);

            const totalOutPeriod = periodRecords
                .filter((r: any) => (r.tipe || r.Tipe) === 'Mutasi')
                .reduce((sum: number, r: any) => sum + convertUnit(r.kuantum || r.Kuantum || 0, r.satuan || r.Satuan || 'Kg', satuan), 0);

            const cumulativeRecords = hasPeriodFilter
                ? materialRecords.filter((r: any) => {
                    const rTanggal = r.tanggal || r.Tanggal;
                    return new Date(rTanggal) < periodEndUtc;
                })
                : materialRecords;

            const totalInCumulative = cumulativeRecords
                .filter((r: any) => (r.tipe || r.Tipe) === 'Suplai')
                .reduce((sum: number, r: any) => sum + convertUnit(r.kuantum || r.Kuantum || 0, r.satuan || r.Satuan || 'Kg', satuan), 0);

            const totalOutCumulative = cumulativeRecords
                .filter((r: any) => (r.tipe || r.Tipe) === 'Mutasi')
                .reduce((sum: number, r: any) => sum + convertUnit(r.kuantum || r.Kuantum || 0, r.satuan || r.Satuan || 'Kg', satuan), 0);

            return {
                Nama: materialName,
                Jenis: pm.jenis || pm.Jenis,
                Satuan: satuan,
                TotalIn: totalInPeriod,
                TotalOut: totalOutPeriod,
                Stok: totalInCumulative - totalOutCumulative
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching balance-stok computed:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
