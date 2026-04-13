export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://wtnnvlibowwffgtjzoou.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bm52bGlib3d3ZmZndGp6b291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODM2MzgsImV4cCI6MjA4ODk1OTYzOH0.XxR1BNfFpVhId1nOSMfmvxvcVPi5SBE3JQG-BZJIvwU';

const HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
};

interface TabRow { id: number; product_slug: string; tab_name?: string; nama?: string; jenis_produk?: string; kemasan?: string; }
interface RkoRow { id?: number; product_slug: string; tab_name: string; tahun: number; bulan: number; target_volume: number; target_kemasan: number; }

async function sbGet(table: string, params: string): Promise<any[]> {
    try {
        const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
        const res = await fetch(url, { 
            headers: HEADERS, 
            cache: 'no-store' 
        });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error(`sbGet error for ${table}:`, e);
        return [];
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tahun = searchParams.get('tahun');
        const mode = searchParams.get('mode');

        if (!tahun) return NextResponse.json({ message: 'Tahun is required' }, { status: 400 });

        // 1. Fetch all produksi tabs (jenis produk rows)
        const tabs: TabRow[] = await sbGet('produksi_tabs', 'select=*');
        const products = tabs.map(t => ({
            product_slug: t.product_slug,
            tab_name: t.tab_name || t.nama || t.product_slug,
            tab_id: t.id,
            jenis_produk: t.jenis_produk || '',
            kemasan: t.kemasan || '',
        }));

        // 2. Fetch RKO targets for this year
        let rkoRows: RkoRow[] = [];
        try {
            const fetched = await sbGet('rko_targets', `select=*&tahun=eq.${tahun}`);
            rkoRows = Array.isArray(fetched) ? fetched : [];
        } catch {
            rkoRows = [];
        }

        if (mode === 'report') {
            // 3. For report mode: also fetch produksis (realization via pg field)
            let produksiRows: any[] = [];
            try {
                const utcYear = parseInt(tahun, 10);
                // Fetch all produksis records for this year
                const fetched = await sbGet('produksis', `select=produksi_tab_id,tanggal,pg&tanggal=gte.${utcYear - 1}-12-31T17%3A00%3A00Z&tanggal=lt.${utcYear + 1}-01-01T17%3A00%3A00Z`);
                produksiRows = Array.isArray(fetched) ? fetched : [];
            } catch {
                produksiRows = [];
            }

            // Build a map: tab_id -> month -> { real_volume: sum(pg), real_kemasan: 0 }
            // pg is in liter/kg (volume). We don't have kemasan realization from produksis.
            const realMap: Record<number, Record<number, { real_volume: number }>> = {};
            for (const p of produksiRows) {
                const tabId = p.produksi_tab_id;
                if (!tabId) continue;
                // Parse month from tanggal (UTC+7)
                const d = new Date(p.tanggal);
                const localMonth = new Date(d.getTime() + 7 * 60 * 60 * 1000).getMonth() + 1;
                const localYear = new Date(d.getTime() + 7 * 60 * 60 * 1000).getFullYear();
                if (localYear !== parseInt(tahun, 10)) continue;
                if (!realMap[tabId]) realMap[tabId] = {};
                if (!realMap[tabId][localMonth]) realMap[tabId][localMonth] = { real_volume: 0 };
                realMap[tabId][localMonth].real_volume += Number(p.pg || 0);
            }

            // Build merged report result
            const merged: any[] = [];
            products.forEach(p => {
                for (let bulan = 1; bulan <= 12; bulan++) {
                    const existing = rkoRows.find(r =>
                        r.product_slug === p.product_slug &&
                        r.tab_name === p.tab_name &&
                        r.bulan === bulan
                    );
                    const real = realMap[p.tab_id]?.[bulan] || { real_volume: 0 };
                    merged.push({
                        product_slug: p.product_slug,
                        tab_name: p.tab_name,
                        tab_id: p.tab_id,
                        jenis_produk: p.jenis_produk,
                        kemasan: p.kemasan,
                        tahun: parseInt(tahun, 10),
                        bulan,
                        target_volume: existing?.target_volume ?? 0,
                        target_kemasan: existing?.target_kemasan ?? 0,
                        real_volume: real.real_volume,
                        real_kemasan: 0, // kemasan realization not tracked in produksis
                    });
                }
            });

            return NextResponse.json(merged);
        }

        // Default mode: config grid (existing behavior)
        const merged: (RkoRow & { tab_id: number })[] = [];
        products.forEach(p => {
            for (let bulan = 1; bulan <= 12; bulan++) {
                const existing = rkoRows.find(r =>
                    r.product_slug === p.product_slug &&
                    r.tab_name === p.tab_name &&
                    r.bulan === bulan
                );
                merged.push({
                    product_slug: p.product_slug,
                    tab_name: p.tab_name,
                    tab_id: p.tab_id,
                    tahun: parseInt(tahun, 10),
                    bulan,
                    target_volume: existing?.target_volume ?? 0,
                    target_kemasan: existing?.target_kemasan ?? 0,
                    ...(existing?.id ? { id: existing.id } : {}),
                });
            }
        });

        return NextResponse.json(merged);
    } catch (error: any) {
        console.error('Error in GET /api/rko-targets:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data: RkoRow[] = await request.json();
        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
        }

        // send all rows so if user zeroes out a target, it updates to 0.
        const payload = data
            .map(d => ({
                product_slug: d.product_slug,
                tab_name: d.tab_name,
                tahun: d.tahun,
                bulan: d.bulan,
                target_volume: d.target_volume,
                target_kemasan: d.target_kemasan,
                updated_at: new Date().toISOString()
            }));

        if (payload.length === 0) {
            return NextResponse.json({ message: 'No targets to save', rowsAffected: 0 });
        }

        const response = await fetch(`${SUPABASE_URL}/rest/v1/rko_targets?on_conflict=product_slug,tab_name,tahun,bulan`, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                ...HEADERS,
                'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Upsert failed: ${err}`);
        }

        return NextResponse.json({ message: 'Success', rowsAffected: payload.length });
    } catch (error: any) {
        console.error('Error in POST /api/rko-targets:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
