import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

        // Fetch records within date range first to get all distinct areas/equipment efficiently
        const baseQuery = await prisma.maintenances.findMany({
            where: { Tanggal: { gte: startUtc, lt: endUtc } }
        });

        const allAreas = [...new Set(baseQuery.map(m => m.Area))].sort();
        const allEquipments = [...new Set(baseQuery.map(m => m.Equipment))].sort();

        // Now apply area/equipment filters
        let filteredRecords = baseQuery;
        if (area) {
            filteredRecords = filteredRecords.filter(m => m.Area === area);
        }
        if (equipment) {
            filteredRecords = filteredRecords.filter(m => m.Equipment === equipment);
        }

        const byAreaDict: { [key: string]: number } = {};
        const byEquipmentDict: { [key: string]: number } = {};
        const byDayDict: { [key: string]: number } = {};

        filteredRecords.forEach(m => {
            // Group Area
            byAreaDict[m.Area] = (byAreaDict[m.Area] || 0) + 1;
            // Group Equipment
            byEquipmentDict[m.Equipment] = (byEquipmentDict[m.Equipment] || 0) + 1;

            // Group Day (must convert to local time first)
            const localDate = new Date(new Date(m.Tanggal).getTime() + utcOffset);
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
            totalKegiatan: filteredRecords.length,
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
