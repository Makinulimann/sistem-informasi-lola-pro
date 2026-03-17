export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const bulan = searchParams.get('bulan');
        const tahun = searchParams.get('tahun');
        const area = searchParams.get('area');
        const equipment = searchParams.get('equipment');

        const now = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
        const targetBulan = bulan ? parseInt(bulan, 10) : now.getUTCMonth() + 1;
        const targetTahun = tahun ? parseInt(tahun, 10) : now.getUTCFullYear();

        const utcOffset = 7 * 60 * 60 * 1000;
        const localStart = new Date(targetTahun, targetBulan - 1, 1);
        const localEnd = new Date(targetTahun, targetBulan, 1);
        const startUtc = new Date(localStart.getTime() - utcOffset);
        const endUtc = new Date(localEnd.getTime() - utcOffset);

        // Fetch all records
        const { data: baseQuery } = await db.from<any>('maintenances').select('*').execute();

        const allAreas = [...new Set((baseQuery || []).map((m: any) => m.area || m.Area))].filter(Boolean).sort();
        const allEquipments = [...new Set((baseQuery || []).map((m: any) => m.equipment || m.Equipment))].filter(Boolean).sort();

        // Apply date range and filters
        let filteredRecords = (baseQuery || []).filter((m: any) => {
            const mTanggal = m.tanggal || m.Tanggal;
            const mDate = new Date(mTanggal);
            return mDate >= startUtc && mDate < endUtc;
        });

        if (area) {
            filteredRecords = filteredRecords.filter((m: any) => (m.area || m.Area) === area);
        }
        if (equipment) {
            filteredRecords = filteredRecords.filter((m: any) => (m.equipment || m.Equipment) === equipment);
        }

        const byAreaDict: { [key: string]: number } = {};
        const byEquipmentDict: { [key: string]: number } = {};
        const byDayDict: { [key: string]: number } = {};

        filteredRecords.forEach((m: any) => {
            const mArea = m.area || m.Area || 'Unknown';
            const mEquipment = m.equipment || m.Equipment || 'Unknown';
            const mTanggal = m.tanggal || m.Tanggal;

            byAreaDict[mArea] = (byAreaDict[mArea] || 0) + 1;
            byEquipmentDict[mEquipment] = (byEquipmentDict[mEquipment] || 0) + 1;

            const localDate = new Date(new Date(mTanggal).getTime() + utcOffset);
            const dayStr = String(localDate.getUTCDate()).padStart(2, '0');
            byDayDict[dayStr] = (byDayDict[dayStr] || 0) + 1;
        });

        const byArea = Object.keys(byAreaDict)
            .map(key => ({ area: key, count: byAreaDict[key] }))
            .sort((a, b) => b.count - a.count);

        const byEquipment = Object.keys(byEquipmentDict)
            .map(key => ({ equipment: key, count: byEquipmentDict[key] }))
            .sort((a, b) => b.count - a.count);

        const byDay = Object.keys(byDayDict)
            .map(key => ({ date: key, count: byDayDict[key] }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
            bulan: targetBulan,
            tahun: targetTahun,
            totalActivities: filteredRecords.length,
            areas: allAreas,
            equipments: allEquipments,
            byArea,
            byEquipment,
            byDay
        });
    } catch (error) {
        console.error('Error fetching maintenance summary:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
