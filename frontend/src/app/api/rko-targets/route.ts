export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface TabRow { id: number; product_slug: string; tab_name?: string; nama?: string; jenis_produk?: string; kemasan?: string; }
interface RkoRow { id?: number; product_slug: string; tab_name: string; tahun: number; bulan: number; target_volume: number; target_kemasan: number; }

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tahun = searchParams.get('tahun');

        if (!tahun) return NextResponse.json({ message: 'Tahun is required' }, { status: 400 });

        // 1. Fetch products table to get exact Product Names (e.g. Petro Gladiator, Petro Bio Fertil, etc.)
        const { data: productsTableData } = await db.from<any>('products').select('slug,nama').execute();
        const dynamicSlugMap: Record<string, string> = {};
        (productsTableData || []).forEach((p: any) => {
            if (p.slug && p.nama) {
                dynamicSlugMap[p.slug] = p.nama;
            }
        });

        // 2. Fetch all produksi tabs and bill_of_materials for packaging variants
        const { data: tabsData } = await db.from<TabRow>('produksi_tabs').select('*').execute();
        const tabs: TabRow[] = tabsData || [];

        const { data: bomData } = await db.from<any>('bill_of_materials').select('product_slug,produksi_tab_id,variant_name').execute();
        const bomRows = bomData || [];

        const SLUG_NAME_MAP: Record<string, string> = {
            'petro-gladiator': 'Petro Gladiator',
            'bio-fertil': 'Petro Bio Fertil',
            'petro-fish': 'Petro Fish',
            'phonska-oca': 'Phonska Oca Plus',
            'petro-gladiator-cair': 'Petro Gladiator Cair',
            ...dynamicSlugMap
        };

        const PRODUCT_TYPE_MAP: Record<string, string> = {
            'petro-gladiator': 'Padat',
            'bio-fertil': 'Padat',
            'petro-fish': 'Cair',
            'phonska-oca': 'Cair',
            'petro-gladiator-cair': 'Cair',
        };

        const products: { product_slug: string; tab_name: string; tab_id: number; jenis_produk: string; kemasan: string }[] = [];
        const addedKeys = new Set<string>();

        tabs.forEach(t => {
            const prodName = SLUG_NAME_MAP[t.product_slug] || t.product_slug;
            const jenisProduk = PRODUCT_TYPE_MAP[t.product_slug] || 'Padat';

            // Find BOM variants for this tab
            const tabBomRows = (bomRows || []).filter((b: any) => b.produksi_tab_id === t.id);
            const variantNames = new Set<string>();
            tabBomRows.forEach((b: any) => {
                let v = (b.variant_name || '').trim();
                if (!v && b.product_slug && b.product_slug.includes('::variant::')) {
                    v = b.product_slug.split('::variant::')[1];
                }
                if (v && v !== 'default') {
                    variantNames.add(v);
                }
            });

            if (variantNames.size > 0) {
                variantNames.forEach(vName => {
                    const fullVariantTabName = `${prodName} - ${vName}`;
                    const key = `${t.product_slug}||${fullVariantTabName}`;
                    if (!addedKeys.has(key)) {
                        addedKeys.add(key);
                        products.push({
                            product_slug: t.product_slug,
                            tab_name: fullVariantTabName,
                            tab_id: t.id,
                            jenis_produk: jenisProduk,
                            kemasan: vName,
                        });
                    }
                });
            } else {
                const key = `${t.product_slug}||${prodName}`;
                if (!addedKeys.has(key)) {
                    addedKeys.add(key);
                    products.push({
                        product_slug: t.product_slug,
                        tab_name: prodName,
                        tab_id: t.id,
                        jenis_produk: jenisProduk,
                        kemasan: '',
                    });
                }
            }
        });

        // Track which slugs already have BOM-based variant entries (to prevent duplicate base entries)
        const slugsWithVariants = new Set<string>();
        products.forEach(p => { if (p.kemasan) slugsWithVariants.add(p.product_slug); });

        // 2. Fetch RKO targets for this year
        const { data: fetchedRko } = await db.from<RkoRow>('rko_targets').select('*').eq('tahun', tahun).execute();
        const rkoRows: RkoRow[] = fetchedRko || [];

        // Include saved rko_targets only if they match valid slugs, are not test rows,
        // AND are not base-name duplicates for slugs that already have BOM variants
        const validSlugs = new Set(['petro-gladiator', 'bio-fertil', 'petro-fish', 'phonska-oca', 'petro-gladiator-cair']);
        rkoRows.forEach(r => {
            const key = `${r.product_slug}||${r.tab_name}`;
            if (!addedKeys.has(key) && validSlugs.has(r.product_slug) && !r.tab_name.toLowerCase().includes('tes')) {
                if (slugsWithVariants.has(r.product_slug)) {
                    // This slug has active BOM variants — skip stale/renamed/deleted rko_targets entries
                    return;
                }
                addedKeys.add(key);
                products.push({
                    product_slug: r.product_slug,
                    tab_name: r.tab_name,
                    tab_id: 0,
                    jenis_produk: PRODUCT_TYPE_MAP[r.product_slug] || 'Padat',
                    kemasan: '',
                });
            }
        });

        // Fetch produksis for realization (bs & pg fields & keterangan / batch codes for variant matching)
        const utcYear = parseInt(tahun, 10);
        const { data: fetchedProduksi } = await db.from<any>('produksis').select('produksi_tab_id,tanggal,bs,pg,keterangan,batch_kode,ps_batch_kode,coa_batch_kode').execute();
        const produksiRows = (fetchedProduksi || []).filter((p: any) => {
            if (!p.tanggal) return false;
            const d = new Date(p.tanggal);
            const localYear = new Date(d.getTime() + 7 * 60 * 60 * 1000).getFullYear();
            return localYear === utcYear;
        });

        // Map batch codes to variant names from all produksis rows
        const batchToVariantMap = new Map<string, string>();
        produksiRows.forEach((pr: any) => {
            const ket = pr.keterangan || '';
            const varianMatch = ket.match(/\[Varian:\s*([^\]\-]+)/i);
            if (varianMatch) {
                const vName = varianMatch[1].trim();
                if (pr.batch_kode) batchToVariantMap.set(pr.batch_kode.toLowerCase(), vName);
                if (pr.ps_batch_kode) batchToVariantMap.set(pr.ps_batch_kode.toLowerCase(), vName);
                if (pr.coa_batch_kode) batchToVariantMap.set(pr.coa_batch_kode.toLowerCase(), vName);
            }
        });

        // Helper for matching variant in production log keterangan or batch code
        const matchesVariant = (pr: any, kemasan: string): boolean => {
            if (!kemasan) return false;
            const ket = (pr.keterangan || '').toLowerCase();
            const kem = kemasan.toLowerCase();
            const cleanKem = kem.replace('@', '').trim();
            const cleanKet = ket.replace('@', '').trim();
            
            if (cleanKet.includes(cleanKem) || ket.includes(kem)) return true;
            if (kem.includes('1kg') || kem.includes('1 kg')) {
                if ((cleanKet.includes('1kg') || cleanKet.includes('1 kg')) && !cleanKet.includes('10kg')) return true;
            }
            if (kem.includes('2kg') || kem.includes('2 kg')) {
                if (cleanKet.includes('2kg') || cleanKet.includes('2 kg')) return true;
            }
            if (kem.includes('1 liter') || kem.includes('1l')) {
                if (cleanKet.includes('1 liter') || cleanKet.includes('1l') || cleanKet.includes('1 lt')) return true;
            }
            if (kem.includes('500 ml') || kem.includes('500ml')) {
                if (cleanKet.includes('500 ml') || cleanKet.includes('500ml')) return true;
            }

            const bCodes = [pr.batch_kode, pr.ps_batch_kode, pr.coa_batch_kode].filter(Boolean);
            for (const bc of bCodes) {
                const mappedVarian = batchToVariantMap.get(bc.toLowerCase());
                if (mappedVarian && mappedVarian.toLowerCase().includes(cleanKem)) {
                    return true;
                }
            }

            return false;
        };

        // Map all batches across tabs that have bs > 0 (to avoid double-counting pg for batches already counted via bs)
        const allBsBatchesByTab = new Map<number, Set<string>>();
        produksiRows.forEach((pr: any) => {
            if (Number(pr.bs || 0) > 0) {
                const tabId = pr.produksi_tab_id;
                if (!allBsBatchesByTab.has(tabId)) allBsBatchesByTab.set(tabId, new Set());
                const b = (pr.batch_kode || pr.ps_batch_kode || pr.coa_batch_kode || '').toLowerCase();
                if (b) allBsBatchesByTab.get(tabId)!.add(b);
            }
        });

        const calcRealVolume = (rows: any[], tabId: number): number => {
            const knownBsBatches = allBsBatchesByTab.get(tabId) || new Set();
            return rows.reduce((sum: number, r: any) => {
                const bsVal = Number(r.bs || 0);
                const pgVal = Number(r.pg || 0);
                if (bsVal > 0) {
                    return sum + bsVal;
                }
                const b = (r.batch_kode || r.ps_batch_kode || r.coa_batch_kode || '').toLowerCase();
                if (pgVal > 0 && b && !knownBsBatches.has(b)) {
                    return sum + pgVal;
                }
                return sum;
            }, 0);
        };

        const merged: any[] = [];
        products.forEach(p => {
            for (let bulan = 1; bulan <= 12; bulan++) {
                const existing = rkoRows.find(r =>
                    r.product_slug === p.product_slug &&
                    r.tab_name === p.tab_name &&
                    Number(r.bulan) === bulan
                );

                // Filter produksis for this tab_id and month
                const tabMonthProduksis = produksiRows.filter((pr: any) => {
                    if (pr.produksi_tab_id !== p.tab_id) return false;
                    const d = new Date(pr.tanggal);
                    const localMonth = new Date(d.getTime() + 7 * 60 * 60 * 1000).getMonth() + 1;
                    return localMonth === bulan;
                });

                let realVolume = 0;
                if (p.kemasan) {
                    // Variant-specific row: match produksis where keterangan or batch code matches variant
                    const matching = tabMonthProduksis.filter((pr: any) => matchesVariant(pr, p.kemasan));
                    realVolume = calcRealVolume(matching, p.tab_id);
                } else {
                    // Base tab row: check if other variants exist for this tab
                    const otherVariantsForTab = products.filter(other => other.tab_id === p.tab_id && other.kemasan);
                    if (otherVariantsForTab.length > 0) {
                        // Include produksis that don't match any specific variant
                        const matching = tabMonthProduksis.filter((pr: any) => {
                            return !otherVariantsForTab.some(v => matchesVariant(pr, v.kemasan));
                        });
                        realVolume = calcRealVolume(matching, p.tab_id);
                    } else {
                        // Tab has no variants, include all produksis for this tab
                        realVolume = calcRealVolume(tabMonthProduksis, p.tab_id);
                    }
                }

                merged.push({
                    product_slug: p.product_slug,
                    tab_name: p.tab_name,
                    tab_id: p.tab_id,
                    jenis_produk: p.jenis_produk,
                    kemasan: p.kemasan,
                    tahun: utcYear,
                    bulan,
                    target_volume: Number(existing?.target_volume || 0),
                    target_kemasan: Number(existing?.target_kemasan || 0),
                    real_volume: realVolume,
                    real_kemasan: 0,
                });
            }
        });

        return NextResponse.json(merged);
    } catch (error: any) {
        logger.error('Error in GET /api/rko-targets', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data: RkoRow[] = await request.json();
        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
        }

        const targetYear = data[0]?.tahun || new Date().getFullYear();

        // Fetch all existing rko_targets for this year
        const { data: existingRows, error: fetchErr } = await db.from<any>('rko_targets')
            .select('*')
            .eq('tahun', targetYear)
            .execute();

        if (fetchErr) {
            console.error('Error fetching existing rko_targets:', fetchErr);
        }

        const existingMap = new Map<string, any>();
        (existingRows || []).forEach((r: any) => {
            const key = `${r.product_slug}||${r.tab_name}||${r.tahun}||${r.bulan}`;
            existingMap.set(key, r);
        });

        let successCount = 0;
        let failCount = 0;
        let lastError: any = null;

        for (const item of data) {
            const key = `${item.product_slug}||${item.tab_name}||${item.tahun}||${item.bulan}`;
            const existing = existingMap.get(key);

            if (existing) {
                const { error: updateErr } = await db.from<any>('rko_targets')
                    .update({
                        target_volume: Number(item.target_volume || 0),
                        target_kemasan: Number(item.target_kemasan || 0),
                    })
                    .eq('id', existing.id);

                if (updateErr) {
                    console.error('Failed to update rko_target:', updateErr);
                    failCount++;
                    lastError = updateErr;
                } else {
                    successCount++;
                }
            } else {
                const { error: insertErr } = await db.from<any>('rko_targets')
                    .insert({
                        product_slug: item.product_slug,
                        tab_name: item.tab_name,
                        tahun: Number(item.tahun),
                        bulan: Number(item.bulan),
                        target_volume: Number(item.target_volume || 0),
                        target_kemasan: Number(item.target_kemasan || 0),
                    });

                if (insertErr) {
                    console.error('Failed to insert rko_target:', insertErr);
                    failCount++;
                    lastError = insertErr;
                } else {
                    successCount++;
                }
            }
        }

        if (failCount > 0 && successCount === 0) {
            const errorMsg = lastError?.message || JSON.stringify(lastError);
            console.error('All rko_target save operations failed:', errorMsg);
            return NextResponse.json({
                message: `Gagal menyimpan data RKO ke database: ${errorMsg}`,
                error: lastError
            }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Success',
            rowsAffected: successCount,
            failedCount: failCount
        });
    } catch (error: any) {
        console.error('Error in POST /api/rko-targets:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
