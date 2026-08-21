export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// In-memory store fallback across API calls in the server runtime
const globalMemoryStore = new Map<string, any[]>();

// Official 10 products catalog matching Petrokimia report specs
const OFFICIAL_PRODUCTS = [
  { id: 1, name: 'Petro Fish Cair @1Liter', cleanName: 'Petro Fish', bentuk: 'Cair', kemasan: '1 Liter', slug: 'petro-fish', satuan: 'Liter' },
  { id: 2, name: 'Petro Gladiator Cair @1 Liter', cleanName: 'Petro Gladiator Cair', bentuk: 'Cair', kemasan: '1 Liter', slug: 'petro-gladiator-cair', satuan: 'Liter' },
  { id: 3, name: 'Petro Gladiator Cair @500 ml', cleanName: 'Petro Gladiator Cair', bentuk: 'Cair', kemasan: '500 ml', slug: 'petro-gladiator-cair', satuan: 'Liter' },
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

    const utcOffset = 7 * 60 * 60 * 1000; // UTC+7 WIB

    for (const r of produksiList) {
      if (!r.tanggal) continue;
      const dRaw = new Date(r.tanggal);
      if (isNaN(dRaw.getTime())) continue;
      const localD = new Date(dRaw.getTime() + utcOffset);
      const rYear = localD.getUTCFullYear();
      const rMonth = localD.getUTCMonth() + 1; // 1-12
      const slug = (r.product_slug || '').toLowerCase().trim();
      const bs = Number(r.bs || 0);

      const tabName = tabsMap[r.produksi_tab_id || r.ProduksiTabId] || '';
      const ket = (r.keterangan || '').toLowerCase();

      let matchedId: number | null = null;

      if (slug.includes('petro-fish') || slug.includes('fish')) {
        matchedId = 1;
      } else if (slug.includes('petro-gladiator-cair') || slug.includes('gladiator-cair')) {
        if (tabName.includes('500') || ket.includes('500')) {
          matchedId = 3;
        } else {
          matchedId = 2;
        }
      } else if (slug.includes('phonska')) {
        matchedId = 4;
      } else if (slug.includes('fit-rice') || slug.includes('rice')) {
        matchedId = 5;
      } else if (slug.includes('bio-fertil') || slug.includes('fertil')) {
        if (tabName.includes('10') || ket.includes('10')) {
          matchedId = 6;
        } else if (tabName.includes('2') || ket.includes('2')) {
          matchedId = 7;
        } else {
          matchedId = 8; // Default 5 Kg
        }
      } else if (slug.includes('petro-gladiator') || slug.includes('gladiator')) {
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
    // a) relational monitoring_harians table (Primary)
    // b) app_settings table (Fallback)
    const settingsKey = `monitoring_harian_${tahun}_${bulan}`;
    let savedMap: Record<string, any> = {};

    const addItemsToSavedMap = (items: any[]) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        const idVal = item.id || item.no || item.idVal;
        const nameVal = item.name || item.cleanName || item.productName || item.product_name;

        if (idVal !== undefined) {
          savedMap[`id_${idVal}`] = item;
        }
        if (nameVal) {
          savedMap[`name_${nameVal}`] = item;
        }
      }
    };

    // Layer 1: monitoring_harians table (Primary relational source)
    try {
      const { data: tableData } = await db.from<any>('monitoring_harians').select('*').execute();
      if (tableData && tableData.length > 0) {
        const filteredTable = tableData.filter((t: any) => Number(t.tahun) === tahun && Number(t.bulan) === bulan);
        addItemsToSavedMap(filteredTable);
      }
    } catch (err) {
      console.error('Error fetching from monitoring_harians:', err);
    }

    // Layer 2: app_settings table (Fallback)
    try {
      const { data: settingsRows } = await db.from<any>('app_settings').select('*').eq('key', settingsKey).execute();
      const settingsData = (settingsRows || [])[0];
      if (settingsData && settingsData.value) {
        const parsed = JSON.parse(settingsData.value);
        addItemsToSavedMap(parsed);
      }
    } catch (err) {
      // Ignore
    }

    // 3. Build official product rows
    const rows = OFFICIAL_PRODUCTS.map((prod) => {
      const prodStats = productionMap[prod.id] || { monthBs: 0, ytdBs: 0 };
      const saved = savedMap[`id_${prod.id}`] || savedMap[`name_${prod.name}`] || {};

      // Always use live sum of 'Produksi Belum Sampling' (bs) for official products
      const prodBulanIni = prodStats.monthBs;
      const prodSdBulanIni = prodStats.ytdBs;

      const psg = Number(saved.gudangPsg ?? saved.gudang_psg ?? 0);
      const lolaMitra = Number(saved.gudangLolaMitra ?? saved.gudang_lola_mitra ?? 0);
      const gmg = Number(saved.gudangGmg ?? saved.gudang_gmg ?? 0);
      const totalStok = psg + lolaMitra + gmg;

      const kuantumSoBulanIni = Number(saved.kuantumSoBulanIni ?? saved.kuantum_so_bulan_ini ?? 0);
      const kuantumSoSdBulanIni = Number(saved.kuantumSoSdBulanIni ?? saved.kuantum_so_sd_bulan_ini ?? 0);
      const soOutstanding = Number(saved.soOutstanding ?? saved.so_outstanding ?? 0);

      const stokAkhir = saved.stokAkhir !== undefined ? Number(saved.stokAkhir) : (totalStok - soOutstanding);

      // Use saved name/satuan if user has edited them, otherwise use official defaults
      const savedName = saved.name || saved.productName || saved.product_name;
      const savedSatuan = saved.satuan || saved.Satuan;

      return {
        id: prod.id,
        no: prod.id,
        name: savedName || prod.name,
        cleanName: prod.cleanName,
        bentuk: prod.bentuk,
        kemasan: prod.kemasan,
        slug: prod.slug,
        satuan: savedSatuan || prod.satuan,
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

    // 4. Include custom rows added by user (not in OFFICIAL_PRODUCTS)
    const customKeys = Object.keys(savedMap);
    const addedCustomIds = new Set<string>();

    for (const key of customKeys) {
      const savedItem = savedMap[key];
      if (!savedItem) continue;
      const itemId = savedItem.id || savedItem.no;
      const itemName = savedItem.name || savedItem.productName || savedItem.product_name;

      if (!itemName && !itemId) continue;

      const isOfficial = OFFICIAL_PRODUCTS.some(p => p.id === itemId || p.name === itemName);
      if (isOfficial) continue;

      const itemKey = `${itemId}_${itemName}`;
      if (addedCustomIds.has(itemKey)) continue;
      addedCustomIds.add(itemKey);

      const psg = Number(savedItem.gudangPsg ?? savedItem.gudang_psg ?? 0);
      const lolaMitra = Number(savedItem.gudangLolaMitra ?? savedItem.gudang_lola_mitra ?? 0);
      const gmg = Number(savedItem.gudangGmg ?? savedItem.gudang_gmg ?? 0);
      const totalStok = psg + lolaMitra + gmg;

      const kuantumSoBulanIni = Number(savedItem.kuantumSoBulanIni ?? savedItem.kuantum_so_bulan_ini ?? 0);
      const kuantumSoSdBulanIni = Number(savedItem.kuantumSoSdBulanIni ?? savedItem.kuantum_so_sd_bulan_ini ?? 0);
      const soOutstanding = Number(savedItem.soOutstanding ?? savedItem.so_outstanding ?? 0);
      const stokAkhir = savedItem.stokAkhir !== undefined ? Number(savedItem.stokAkhir) : (totalStok - soOutstanding);

      rows.push({
        id: itemId || Date.now(),
        no: rows.length + 1,
        name: itemName || 'Produk Baru',
        cleanName: savedItem.cleanName || itemName,
        bentuk: savedItem.bentuk || 'Padat',
        kemasan: savedItem.kemasan || '',
        slug: savedItem.slug || `produk-${itemId}`,
        satuan: savedItem.satuan || 'Kg',
        produksiBulanIni: Number(savedItem.produksiBulanIni || 0),
        produksiSdBulanIni: Number(savedItem.produksiSdBulanIni || 0),
        gudangPsg: psg,
        gudangLolaMitra: lolaMitra,
        gudangGmg: gmg,
        totalStok: totalStok,
        kuantumSoBulanIni: kuantumSoBulanIni,
        kuantumSoSdBulanIni: kuantumSoSdBulanIni,
        soOutstanding: soOutstanding,
        stokAkhir: stokAkhir,
      });
    }

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
      const { data: existingRows } = await db.from<any>('app_settings').select('*').eq('key', settingsKey).execute();
      const existingSetting = (existingRows || [])[0];
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

    // 1. Primary: Persist directly to relational monitoring_harians table
    try {
      const { data: allMonitoring } = await db.from<any>('monitoring_harians').select('*').execute();
      const existingList = allMonitoring || [];

      for (const r of rows) {
        const itemData = {
          tahun: Number(tahun),
          bulan: Number(bulan),
          product_name: r.name || r.productName,
          clean_name: r.cleanName || r.name || '',
          kemasan: r.kemasan || '',
          slug: r.slug || '',
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
          (m.product_name === itemData.product_name || (m.slug && m.slug === itemData.slug && m.kemasan === itemData.kemasan))
        );

        if (existingRow) {
          await db.from<any>('monitoring_harians').update(itemData).eq('id', existingRow.id);
        } else {
          await db.from<any>('monitoring_harians').insert(itemData);
        }
      }
    } catch (tableErr) {
      console.error('Error writing to monitoring_harians table:', tableErr);
    }

    return NextResponse.json({ success: true, message: 'Data monitoring harian berhasil disimpan.' });
  } catch (error) {
    console.error('Error saving monitoring harian:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
