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
        const keperluanParams = searchParams.get('keperluan');
        const picParams = searchParams.get('pic');

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

        const getKeperluan = (m: any) => m.keperluan || m.Keperluan || m.keterangan || m.Keterangan || 'Tanpa Keperluan';
        const getPic = (m: any) => m.pic || m.PIC || m.pic_nama || m.nama || m.Nama || m.area || m.Area || 'Unknown PIC';

        const allKeperluans = [...new Set((baseQuery || []).map(getKeperluan))].filter(Boolean).sort();
        const allPics = [...new Set((baseQuery || []).map(getPic))].filter(Boolean).sort();

        // Apply date range and filters
        let filteredRecords = (baseQuery || []).filter((m: any) => {
            if (!bulan && !tahun) return true; // Seluruh periode
            const mTanggal = m.tanggal_dibutuhkan || m.TanggalDibutuhkan || m.tanggal || m.Tanggal;
            const mDate = new Date(mTanggal);
            return mDate >= startUtc && mDate < endUtc;
        });

        if (keperluanParams) {
            filteredRecords = filteredRecords.filter((m: any) => getKeperluan(m) === keperluanParams);
        }
        if (picParams) {
            filteredRecords = filteredRecords.filter((m: any) => getPic(m) === picParams);
        }

        const byKeperluanDict: { [key: string]: number } = {};
        const byPicDict: { [key: string]: number } = {};
        const byDayDict: { [key: string]: number } = {};
        const byKeperluanAndPicDict: { [key: string]: number } = {};

        filteredRecords.forEach((m: any) => {
            const mKeperluan = getKeperluan(m);
            const mPic = getPic(m);
            
            const comboKey = `${mKeperluan}|${mPic}`;

            byKeperluanDict[mKeperluan] = (byKeperluanDict[mKeperluan] || 0) + 1;
            byPicDict[mPic] = (byPicDict[mPic] || 0) + 1;
            byKeperluanAndPicDict[comboKey] = (byKeperluanAndPicDict[comboKey] || 0) + 1;

            const mTanggal = m.tanggal_dibutuhkan || m.TanggalDibutuhkan || m.tanggal || m.Tanggal;
            const localDate = new Date(new Date(mTanggal).getTime() + utcOffset);
            const dayStr = String(localDate.getUTCDate()).padStart(2, '0');
            byDayDict[dayStr] = (byDayDict[dayStr] || 0) + 1;
        });

        const byKeperluan = Object.keys(byKeperluanDict)
            .map(key => ({ keperluan: key, count: byKeperluanDict[key] }))
            .sort((a, b) => b.count - a.count);

        const byPic = Object.keys(byPicDict)
            .map(key => ({ pic: key, count: byPicDict[key] }))
            .sort((a, b) => b.count - a.count);
            
        const byKeperluanAndPic = Object.keys(byKeperluanAndPicDict)
            .map(key => {
                const [keperluan, pic] = key.split('|');
                return { keperluan, pic, count: byKeperluanAndPicDict[key] };
            })
            .sort((a, b) => b.count - a.count);

        const byDay = Object.keys(byDayDict)
            .map(key => ({ date: key, count: byDayDict[key] }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
            bulan: targetBulan,
            tahun: targetTahun,
            totalActivities: filteredRecords.length,
            keperluans: allKeperluans,
            pics: allPics,
            byKeperluan,
            byPic,
            byKeperluanAndPic,
            byDay
        });
    } catch (error) {
        console.error('Error fetching maintenance summary:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

