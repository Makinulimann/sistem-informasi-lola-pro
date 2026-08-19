export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// In-memory store fallback across API calls in the server runtime
const globalMemoryStore = new Map<string, any[]>();

// Official 10 products catalog matching Petrokimia report specs
const OFFICIAL_PRODUCTS = [
  { id: 1, name: 'Petro Fish Cair @1Liter 1000961', cleanName: 'Petro Fish', bentuk: 'Cair', kemasan: '1 Liter', slug: 'petro-fish', satuan: 'Liter' },
  { id: 2, name: 'Petro Gladiator Cair @1 Liter 1001205', cleanName: 'Petro Gladiator Cair', bentuk: 'Cair', kemasan: '1 Liter', slug: 'petro-gladiator-cair', satuan: 'Liter' },
  { id: 3, name: 'Petro Gladiator Cair @500 ml 1001204', cleanName: 'Petro Gladiator Cair', bentuk: 'Cair', kemasan: '500 ml', slug: 'petro-gladiator-cair', satuan: 'Liter' },
  { id: 4, name: 'Phonska Oca Plus @1 Liter', cleanName: 'Phonska Oca Plus', bentuk: 'Cair', kemasan: '1 Liter', slug: 'phonska-oca', satuan: 'Liter' },
  { id: 5, name: 'Fit Rice @2 Kg', cleanName: 'Fit Rice', bentuk: 'Padat', kemasan: '2 Kg', slug: 'fit-rice', satuan: 'Kg' },
  { id: 6, name: 'Petro Bio Fertil @10 Kg', cleanName: 'Petro Bio Fertil', bentuk: 'Padat', kemasan: '10 Kg', slug: 'bio-fertil', satuan: 'Kg' },
  { id: 7, name: 'Petro Bio Fertil @2 Kg', cleanName: 'Petro Bio Fertil', bentuk: 'Padat', kemasan: '2 Kg', slug: 'bio-fertil', satuan: 'Kg' },
  { id: 8, name: 'Petro Bio Fertil @5 Kg', cleanName: 'Petro Bio Fertil', bentuk: 'Padat', kemasan: '5 Kg', slug: 'bio-fertil', satuan: 'Kg' },
  { id: 9, name: 'Petro Gladiator Padat @1 Kg', cleanName: 'Petro Gladiator', bentuk: 'Padat', kemasan: '1 Kg', slug: 'petro-gladiator', satuan: 'Kg' },
  { id: 10, name: 'Petro Gladiator Padat @2 Kg', cleanName: 'Petro Gladiator', bentuk: 'Padat', kemasan: '2 Kg', slug: 'petro-gladiator', satuan: 'Kg' },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const bulan = parseInt(searchParams.get('bulan') || String(now.getMonth() + 1), 10);
    const tahun = parseInt(searchParams.get('tahun') || String(now.getFullYear()), 10);
    const tanggalStr = searchParams.get('tanggal') || `${tahun}-${String(bulan).padStart(2, '0')}-14`;

    // 1. Fetch tabs & live production records from database
    const { data: allTabsData } = await db.from<any>('produksi_tabs').select('*').execute();
    const tabsMap: Record<number, string> = {};
    (allTabsData || []).forEach((t: any) => {
      tabsMap[t.id || t.Id] = (t.nama || t.Nama || '').toLowerCase();
    });

    const { data: allProduksi } = await db.from<any>('produksis').select('*').execute();
    const produksiList = allProduksi || [];

    // Calculate production per official product ID
    const productionMap: Record<number, { monthBs: number; ytdBs: number }> = {};
    OFFICIAL_PRODUCTS.forEach((p) => {
      productionMap[p.id] = { monthBs: 0, ytdBs: 0 };
    });

    for (const r of produksiList) {
      if (!r.tanggal) continue;
      const d = new Date(r.tanggal);
      const rYear = d.getFullYear();
      const rMonth = d.getMonth() + 1; // 1-12
      const slug = (r.product_slug || '').toLowerCase().trim();
      const bs = Number(r.bs || 0);

      const tabName = tabsMap[r.produksi_tab_id || r.ProduksiTabId] || '';
      const ket = (r.keterangan || '').toLowerCase();

      let matchedId: number | null = null;

      if (slug === 'petro-fish') {
        matchedId = 1;
      } else if (slug === 'petro-gladiator-cair') {
        if (tabName.includes('500') || ket.includes('500')) {
          matchedId = 3;
        } else {
          matchedId = 2;
        }
      } else if (slug === 'phonska-oca') {
        matchedId = 4;
      } else if (slug === 'fit-rice') {
        matchedId = 5;
      } else if (slug === 'bio-fertil') {
        if (tabName.includes('10') || ket.includes('10')) {
          matchedId = 6;
        } else if (tabName.includes('2') || ket.includes('2')) {
          matchedId = 7;
        } else {
          matchedId = 8; // Default 5 Kg
        }
      } else if (slug === 'petro-gladiator') {
        if (tabName.includes('2') || ket.includes('2')) {
          matchedId = 10;
        } else {
          matchedId = 9; // Default 1 Kg
        }
      }

      if (matchedId && productionMap[matchedId]) {
        if (rYear === tahun) {
          if (rMonth <= bulan) {
            productionMap[matchedId].ytdBs += bs;
          }
          if (rMonth === bulan) {
            productionMap[matchedId].monthBs += bs;
          }
        }
      }
    }

    // 2. Fetch saved monitoring harian inputs from:
    // a) Memory store
    // b) app_settings table
    // c) monitoring_harians table
    const settingsKey = `monitoring_harian_${tahun}_${bulan}`;
    let savedMap: Record<string, any> = {};

    const addItemsToSavedMap = (items: any[]) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        const idVal = item.id || item.no || item.idVal;
        const nameVal = item.name || item.productName || item.product_name;

        if (idVal !== undefined) {
          savedMap[`id_${idVal}`] = item;
        }
        if (nameVal) {
          savedMap[`name_${nameVal}`] = item;
        }
      }
    };

    // Layer 1: Memory cache
    const memData = globalMemoryStore.get(settingsKey);
    if (memData) {
      addItemsToSavedMap(memData);
    }

    // Layer 2: app_settings table
    try {
      const { data: settingsData } = await db.from<any>('app_settings').select('*').eq('key', settingsKey).single();
      if (settingsData && settingsData.value) {
        const parsed = JSON.parse(settingsData.value);
        addItemsToSavedMap(parsed);
      }
    } catch (err) {
      // Ignore
    }

    // Layer 3: monitoring_harians table
    try {
      const { data: tableData } = await db.from<any>('monitoring_harians').select('*').execute();
      if (tableData && tableData.length > 0) {
        const filteredTable = tableData.filter((t: any) => Number(t.tahun) === tahun && Number(t.bulan) === bulan);
        addItemsToSavedMap(filteredTable);
      }
    } catch (err) {
      // Ignore
    }

    // 3. Build 10 product rows
    const rows = OFFICIAL_PRODUCTS.map((prod) => {
      const prodStats = productionMap[prod.id] || { monthBs: 0, ytdBs: 0 };
      const saved = savedMap[`id_${prod.id}`] || savedMap[`name_${prod.name}`] || {};

      const prodBulanIni = saved.produksiBulanIni !== undefined ? Number(saved.produksiBulanIni) : prodStats.monthBs;
      const prodSdBulanIni = saved.produksiSdBulanIni !== undefined ? Number(saved.produksiSdBulanIni) : prodStats.ytdBs;

      const psg = Number(saved.gudangPsg ?? saved.gudang_psg ?? 0);
      const lolaMitra = Number(saved.gudangLolaMitra ?? saved.gudang_lola_mitra ?? 0);
      const gmg = Number(saved.gudangGmg ?? saved.gudang_gmg ?? 0);
      const totalStok = psg + lolaMitra + gmg;

      const kuantumSoBulanIni = Number(saved.kuantumSoBulanIni ?? saved.kuantum_so_bulan_ini ?? 0);
      const kuantumSoSdBulanIni = Number(saved.kuantumSoSdBulanIni ?? saved.kuantum_so_sd_bulan_ini ?? 0);
      const soOutstanding = Number(saved.soOutstanding ?? saved.so_outstanding ?? 0);

      const stokAkhir = saved.stokAkhir !== undefined ? Number(saved.stokAkhir) : (totalStok - soOutstanding);

      return {
        id: prod.id,
        no: prod.id,
        name: prod.name,
        cleanName: prod.cleanName,
        bentuk: prod.bentuk,
        kemasan: prod.kemasan,
        slug: prod.slug,
        satuan: prod.satuan,
        produksiBulanIni: prodBulanIni,
        produksiSdBulanIni: prodSdBulanIni,
        gudangPsg: psg,
        gudangLolaMitra: lolaMitra,
        gudangGmg: gmg,
        totalStok: totalStok,
        kuantumSoBulanIni: kuantumSoBulanIni,
        kuantumSoSdBulanIni: kuantumSoSdBulanIni,
        soOutstanding: soOutstanding,
        stokAkhir: stokAkhir,
      };
    });

    return NextResponse.json({
      tahun,
      bulan,
      tanggal: tanggalStr,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching monitoring harian:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tahun, bulan, rows } = body;

    if (!tahun || !bulan || !Array.isArray(rows)) {
      return NextResponse.json({ message: 'tahun, bulan, and rows array are required.' }, { status: 400 });
    }

    const settingsKey = `monitoring_harian_${tahun}_${bulan}`;

    // 1. Instantly save to global memory cache
    globalMemoryStore.set(settingsKey, rows);

    // 2. Persist to app_settings table
    const payloadJson = JSON.stringify(rows);
    try {
      const { data: existingSetting } = await db.from<any>('app_settings').select('*').eq('key', settingsKey).single();
      if (existingSetting) {
        await db.from<any>('app_settings').update({
          value: payloadJson,
          updated_at: new Date().toISOString(),
        }).eq('key', settingsKey);
      } else {
        await db.from<any>('app_settings').insert({
          key: settingsKey,
          value: payloadJson,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (appErr) {
      console.error('Failed to write to app_settings:', appErr);
    }

    // 3. Persist to monitoring_harians table if present
    try {
      const { data: allMonitoring } = await db.from<any>('monitoring_harians').select('*').execute();
      const existingList = allMonitoring || [];

      for (const r of rows) {
        const itemData = {
          tahun: Number(tahun),
          bulan: Number(bulan),
          product_name: r.name || r.productName,
          satuan: r.satuan || 'Liter',
          produksi_bulan_ini: Number(r.produksiBulanIni || 0),
          produksi_sd_bulan_ini: Number(r.produksiSdBulanIni || 0),
          gudang_psg: Number(r.gudangPsg || 0),
          gudang_lola_mitra: Number(r.gudangLolaMitra || 0),
          gudang_gmg: Number(r.gudangGmg || 0),
          total_stok: Number(r.totalStok || 0),
          kuantum_so_bulan_ini: Number(r.kuantumSoBulanIni || 0),
          kuantum_so_sd_bulan_ini: Number(r.kuantumSoSdBulanIni || 0),
          so_outstanding: Number(r.soOutstanding || 0),
          stok_akhir: Number(r.stokAkhir || 0),
          updated_at: new Date().toISOString(),
        };

        const existingRow = existingList.find((m: any) =>
          Number(m.tahun) === Number(tahun) &&
          Number(m.bulan) === Number(bulan) &&
          m.product_name === itemData.product_name
        );

        if (existingRow) {
          await db.from<any>('monitoring_harians').update(itemData).eq('id', existingRow.id);
        } else {
          await db.from<any>('monitoring_harians').insert(itemData);
        }
      }
    } catch (tableErr) {
      // Ignore
    }

    return NextResponse.json({ success: true, message: 'Data monitoring harian berhasil disimpan.' });
  } catch (error) {
    console.error('Error saving monitoring harian:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
