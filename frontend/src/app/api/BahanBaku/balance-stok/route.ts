export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function convertUnit(value: number, fromUnit: string, toUnit: string): number {
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

        const configuredMaterials = await prisma.productMaterials.findMany({
            where: { ProductSlug: productSlug },
            include: { MasterItems: true },
            orderBy: [
                { Jenis: 'asc' },
                { MasterItems: { Nama: 'asc' } }
            ]
        });

        const configuredNames = configuredMaterials.map(pm => pm.MasterItems.Nama).filter(Boolean);

        const hasPeriodFilter = !!(bulan || tahun);
        let periodStartUtc = new Date(-8640000000000000); // Min Date
        let periodEndUtc = new Date(8640000000000000);    // Max Date

        if (bulan && tahun) {
            const y = parseInt(tahun, 10);
            const m = parseInt(bulan, 10);
            const localStart = new Date(y, m - 1, 1);
            const localEnd = new Date(y, m, 1); // Start of next month
            periodStartUtc = new Date(localStart.getTime() - 7 * 60 * 60 * 1000);
            periodEndUtc = new Date(localEnd.getTime() - 7 * 60 * 60 * 1000);
        } else if (tahun) {
            const y = parseInt(tahun, 10);
            const localStart = new Date(y, 0, 1);
            const localEnd = new Date(y + 1, 0, 1);
            periodStartUtc = new Date(localStart.getTime() - 7 * 60 * 60 * 1000);
            periodEndUtc = new Date(localEnd.getTime() - 7 * 60 * 60 * 1000);
        }

        const allRecords = await prisma.bahanBakus.findMany({
            where: { NamaBahan: { in: configuredNames } }
        });

        const result = configuredMaterials.map(pm => {
            const materialName = pm.MasterItems.Nama;
            const satuan = pm.MasterItems.SatuanDefault || 'Kg';

            const materialRecords = allRecords.filter(r => r.NamaBahan.toLowerCase() === materialName.toLowerCase());

            const periodRecords = hasPeriodFilter
                ? materialRecords.filter(r => new Date(r.Tanggal) >= periodStartUtc && new Date(r.Tanggal) < periodEndUtc)
                : materialRecords;

            const totalInPeriod = periodRecords
                .filter(r => r.Tipe === 'Suplai')
                .reduce((sum, r) => sum + convertUnit(r.Kuantum, r.Satuan, satuan), 0);

            const totalOutPeriod = periodRecords
                .filter(r => r.Tipe === 'Mutasi')
                .reduce((sum, r) => sum + convertUnit(r.Kuantum, r.Satuan, satuan), 0);

            const cumulativeRecords = hasPeriodFilter
                ? materialRecords.filter(r => new Date(r.Tanggal) < periodEndUtc)
                : materialRecords;

            const totalInCumulative = cumulativeRecords
                .filter(r => r.Tipe === 'Suplai')
                .reduce((sum, r) => sum + convertUnit(r.Kuantum, r.Satuan, satuan), 0);

            const totalOutCumulative = cumulativeRecords
                .filter(r => r.Tipe === 'Mutasi')
                .reduce((sum, r) => sum + convertUnit(r.Kuantum, r.Satuan, satuan), 0);

            return {
                Nama: materialName,
                Jenis: pm.Jenis,
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
