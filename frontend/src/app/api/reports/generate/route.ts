export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

interface ActivityRecord {
    id: number;
    product_slug: string;
    pic: string;
    lokasi: string;
    jenis_produk: string;
    tanggal: string;
    deskripsi: string;
}

interface DynamicProduct {
    slug: string;
    name: string;
    bentuk: string;
    satuan: string;
    image: string;
}

const NON_PRODUCT_SLUGS = new Set([
    'bahan-baku',
    'aktivitas-harian',
    'maintenance',
    'rkap-rko',
    'rencana-pengadaan',
    'template-laporan',
]);

const NON_PRODUCT_LABELS = new Set([
    'bahan baku',
    'aktivitas harian',
    'maintenance',
    'rkap / rko',
    'rkap/rko',
    'rkap',
    'rko',
    'rencana pengadaan',
    'template laporan',
]);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { startDate, endDate, rkoYear, apiKey } = body;

        // Validation: Tanggal Mulai Aktivitas & Tanggal Akhir Aktivitas required
        if (!startDate || !endDate || !startDate.trim() || !endDate.trim()) {
            return NextResponse.json(
                { message: 'Tanggal Mulai Aktivitas dan Tanggal Akhir Aktivitas wajib diisi terlebih dahulu.' },
                { status: 400 }
            );
        }

        const year = rkoYear ? parseInt(rkoYear, 10) : new Date().getFullYear();
        const endD = new Date(endDate);
        const month = !isNaN(endD.getTime()) ? endD.getMonth() + 1 : new Date().getMonth() + 1;

        // Date range for Activity Summaries (Section B): [startDate, endDate]
        const actStartMs = new Date(startDate + 'T00:00:00.000Z').getTime();
        const actEndMs = new Date(endDate + 'T23:59:59.999Z').getTime();

        // Date range for Table A (Cumulative Year-To-Date up to endDate): [YYYY-01-01, endDate]
        const tableAStartMs = new Date(`${year}-01-01T00:00:00.000Z`).getTime();
        const tableAEndMs = actEndMs;

        // 1. Fetch all required data in parallel
        const [
            { data: produksisData },
            { data: aktivitasData },
            { data: sidebarMenus },
            { data: tabsData },
            { data: bomData },
            { data: productsTableData },
            { data: monitoringData },
            { data: settingsData },
            { data: bahanBakuMutasiData },
            { data: masterItemsData },
        ] = await Promise.all([
            db.from<any>('produksis').select('*').execute(),
            db.from<any>('aktivitas_harians').select('*').execute(),
            db.from<any>('sidebar_menus').select('*').execute(),
            db.from<any>('produksi_tabs').select('*').execute(),
            db.from<any>('bill_of_materials').select('*').execute(),
            db.from<any>('products').select('slug,nama').execute(),
            db.from<any>('monitoring_harians').select('*').execute(),
            db.from<any>('app_settings').select('*').execute(),
            db.from<any>('bahan_bakus').select('*').eq('tipe', 'Mutasi').execute(),
            db.from<any>('master_items').select('*').execute(),
        ]);

        // Build dynamic products map
        const dynamicProductsMap = new Map<string, DynamicProduct>();

        // Default products list
        const defaultProducts: DynamicProduct[] = [
            { slug: 'petro-fish', name: 'Petro Fish', bentuk: 'Cair', satuan: 'Liter', image: '/images/petro-fish.webp' },
            { slug: 'phonska-oca', name: 'Phonska Oca Plus', bentuk: 'Cair', satuan: 'Liter', image: '/images/phonska-oca-plus.webp' },
            { slug: 'bio-fertil', name: 'Petro Bio Fertil', bentuk: 'Padat', satuan: 'Kg', image: '/images/bio-fertil.webp' },
            { slug: 'petro-gladiator', name: 'Petro Gladiator Padat', bentuk: 'Padat', satuan: 'Kg', image: '/images/petro-gladiator.webp' },
            { slug: 'petro-gladiator-cair', name: 'Petro Gladiator Cair', bentuk: 'Cair', satuan: 'Liter', image: '/images/petro-gladiator.webp' },
        ];

        defaultProducts.forEach(p => dynamicProductsMap.set(p.slug, p));

        // Find "Produk Pengembangan" menu (Level 1) in sidebar_menus
        const produkPengembanganMenu = (sidebarMenus || []).find((m: any) =>
            (m.label || '').toLowerCase().trim() === 'produk pengembangan' && !m.parent_id
        );
        const parentId = produkPengembanganMenu ? produkPengembanganMenu.id : null;

        // Level 2 children of "Produk Pengembangan"
        const level2Menus = (sidebarMenus || []).filter((m: any) =>
            parentId ? m.parent_id === parentId : (m.parent_id && m.is_active !== false)
        );

        level2Menus.forEach((l2: any) => {
            if (l2.is_active === false) return;

            // Must have level 3 children (actual products have sub-pages like Bahan Baku, Produksi, Analisa)
            const l3Children = (sidebarMenus || []).filter((m: any) => m.parent_id === l2.id);
            if (l3Children.length === 0) return;

            const labelNorm = (l2.label || '').toLowerCase().trim();
            if (NON_PRODUCT_LABELS.has(labelNorm)) return;

            const firstChildHref = l3Children.find((c: any) => c.href && c.href !== '#')?.href || '';

            let slug = '';
            if (firstChildHref) {
                const parts = firstChildHref.split('/').filter(Boolean);
                if (parts.length >= 3) {
                    slug = parts[2];
                }
            }
            if (!slug) {
                slug = (l2.label || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            }

            if (!slug || NON_PRODUCT_SLUGS.has(slug.toLowerCase())) return;

            const name = l2.label || slug;
            const satuanStr = (l2.satuan || '').toLowerCase();
            const nameStr = name.toLowerCase();

            const isCair = satuanStr.includes('cair') || satuanStr.includes('liter') || satuanStr.includes('l') || nameStr.includes('cair') || slug.includes('cair');
            const bentuk = isCair ? 'Cair' : 'Padat';
            const satuan = isCair ? 'Liter' : (l2.satuan || 'Kg');

            const image = l2.image_url || dynamicProductsMap.get(slug)?.image || `/images/${slug}.webp`;

            dynamicProductsMap.set(slug, {
                slug,
                name,
                bentuk,
                satuan,
                image,
            });
        });

        // Add from `products` table
        (productsTableData || []).forEach((p: any) => {
            if (p.slug && p.nama && !dynamicProductsMap.has(p.slug) && !NON_PRODUCT_SLUGS.has(p.slug.toLowerCase())) {
                const nameStr = p.nama.toLowerCase();
                if (NON_PRODUCT_LABELS.has(nameStr)) return;
                const isCair = nameStr.includes('cair');
                dynamicProductsMap.set(p.slug, {
                    slug: p.slug,
                    name: p.nama,
                    bentuk: isCair ? 'Cair' : 'Padat',
                    satuan: isCair ? 'Liter' : 'Kg',
                    image: `/images/${p.slug}.webp`,
                });
            }
        });

        // Add from `produksi_tabs` table
        (tabsData || []).forEach((t: any) => {
            if (t.product_slug && !dynamicProductsMap.has(t.product_slug) && !NON_PRODUCT_SLUGS.has(t.product_slug.toLowerCase())) {
                const nameStr = (t.nama || t.product_slug).toLowerCase();
                if (NON_PRODUCT_LABELS.has(nameStr)) return;
                const isCair = nameStr.includes('cair');
                dynamicProductsMap.set(t.product_slug, {
                    slug: t.product_slug,
                    name: t.nama || t.product_slug,
                    bentuk: isCair ? 'Cair' : 'Padat',
                    satuan: isCair ? 'Liter' : 'Kg',
                    image: `/images/${t.product_slug}.webp`,
                });
            }
        });

        const allProductsList = Array.from(dynamicProductsMap.values());

        // Map product images for response
        const productImageMap: Record<string, string> = {};
        allProductsList.forEach(p => {
            productImageMap[p.slug] = p.image;
        });

        // Filter produksis for Table A from YYYY-01-01 up to endDate & deduplicate identical duplicate records
        const rawPeriodProduksis = (produksisData || []).filter((p: any) => {
            if (!p.tanggal) return false;
            const t = new Date(p.tanggal).getTime();
            return t >= tableAStartMs && t <= tableAEndMs;
        });

        const deduplicatedProduksisMap = new Map<string, any>();
        rawPeriodProduksis.forEach((p: any) => {
            const dateStr = p.tanggal ? p.tanggal.split('T')[0] : '';
            const key = `${p.product_slug}||${p.produksi_tab_id}||${dateStr}||${(p.batch_kode || '').toLowerCase()}||${p.bs}||${p.pg}||${(p.keterangan || '').trim()}`;
            if (!deduplicatedProduksisMap.has(key)) {
                deduplicatedProduksisMap.set(key, p);
            }
        });
        const periodProduksis = Array.from(deduplicatedProduksisMap.values());

        // Sort products: Cair first, then Padat
        allProductsList.sort((a, b) => {
            if (a.bentuk === 'Cair' && b.bentuk !== 'Cair') return -1;
            if (a.bentuk !== 'Cair' && b.bentuk === 'Cair') return 1;
            return a.name.localeCompare(b.name);
        });

        interface DynamicVariant {
            id: number;
            name: string;
            bentuk: string;
            kemasan: string;
            productSlug: string;
            satuan: string;
            tabId: number;
        }

        const officialVariants: DynamicVariant[] = [];
        const addedVarKeys = new Set<string>();
        let varId = 0;

        allProductsList.forEach(prod => {
            const prodTabs = (tabsData || []).filter((t: any) => t.product_slug === prod.slug);

            if (prodTabs.length > 0) {
                prodTabs.forEach((t: any) => {
                    const tabBomRows = (bomData || []).filter((b: any) => b.produksi_tab_id === t.id);
                    const variantNames = new Set<string>();

                    tabBomRows.forEach((b: any) => {
                        let v = (b.variant_name || '').trim();
                        if (!v && b.product_slug && b.product_slug.includes('::variant::')) {
                            v = b.product_slug.split('::variant::')[1];
                        }
                        if (v && v !== 'default') variantNames.add(v);
                    });

                    if (variantNames.size > 0) {
                        variantNames.forEach(vName => {
                            const key = `${prod.slug}||${prod.name}||${vName}`;
                            if (!addedVarKeys.has(key)) {
                                addedVarKeys.add(key);
                                varId++;
                                officialVariants.push({
                                    id: varId,
                                    name: prod.name,
                                    bentuk: prod.bentuk,
                                    kemasan: vName,
                                    productSlug: prod.slug,
                                    satuan: prod.satuan,
                                    tabId: t.id,
                                });
                            }
                        });
                    } else {
                        const key = `${prod.slug}||${prod.name}`;
                        if (!addedVarKeys.has(key)) {
                            addedVarKeys.add(key);
                            varId++;
                            officialVariants.push({
                                id: varId,
                                name: prod.name,
                                bentuk: prod.bentuk,
                                kemasan: '',
                                productSlug: prod.slug,
                                satuan: prod.satuan,
                                tabId: t.id,
                            });
                        }
                    }
                });
            } else {
                // If product has no tabs configured yet, still add base entry
                const key = `${prod.slug}||${prod.name}`;
                if (!addedVarKeys.has(key)) {
                    addedVarKeys.add(key);
                    varId++;
                    officialVariants.push({
                        id: varId,
                        name: prod.name,
                        bentuk: prod.bentuk,
                        kemasan: '',
                        productSlug: prod.slug,
                        satuan: prod.satuan,
                        tabId: 0,
                    });
                }
            }
        });

        // Map batch codes to variant names if available
        const batchToVariantMap = new Map<string, string>();
        periodProduksis.forEach((pr: any) => {
            const ket = pr.keterangan || '';
            const varianMatch = ket.match(/\[Varian:\s*([^\]\-]+)/i);
            if (varianMatch) {
                const vName = varianMatch[1].trim();
                if (pr.batch_kode) batchToVariantMap.set(pr.batch_kode.toLowerCase(), vName);
            }
        });

        const slugVariantsMap = new Map<string, DynamicVariant[]>();
        officialVariants.forEach(v => {
            if (!slugVariantsMap.has(v.productSlug)) slugVariantsMap.set(v.productSlug, []);
            slugVariantsMap.get(v.productSlug)!.push(v);
        });

        const extractVariantFromKet = (ket: string): string => {
            const m = (ket || '').match(/\[Varian:\s*([^\]\-]+)/i);
            return m ? m[1].trim().toLowerCase() : '';
        };

        const isExplicitVariantMatch = (p: any, v: DynamicVariant): boolean => {
            if (p.product_slug !== v.productSlug) return false;

            const ket = (p.keterangan || '').toLowerCase();
            const kem = (v.kemasan || '').toLowerCase().replace('@', '').trim();
            const kemNoSpace = kem.replace(/\s+/g, '');

            if (!kem) return true;

            // 1. Direct check for extracted variant tag in keterangan (e.g. "[Varian: 5KG - Batch: B05]")
            const explicitKetVar = extractVariantFromKet(p.keterangan || '');
            if (explicitKetVar) {
                const explicitNoSpace = explicitKetVar.replace(/\s+/g, '');
                if (explicitKetVar === kem || explicitNoSpace === kemNoSpace || explicitKetVar.includes(kem) || kem.includes(explicitKetVar)) {
                    return true;
                }
            }

            // 2. Direct match in keterangan text
            if (ket && (ket.includes(kem) || (kemNoSpace && ket.includes(kemNoSpace)))) {
                return true;
            }

            return false;
        };

        const resultRealization = new Map<number, { realProd: number; realPeng: number }>();
        officialVariants.forEach(v => resultRealization.set(v.id, { realProd: 0, realPeng: 0 }));

        slugVariantsMap.forEach((variants, slug) => {
            const slugProduksis = periodProduksis.filter((p: any) => p.product_slug === slug);
            const bsBatchCodes = new Set<string>();

            slugProduksis.forEach((p: any) => {
                const bsVal = Number(p.bs) || 0;
                if (bsVal > 0) {
                    const matchedVar = variants.find(v => isExplicitVariantMatch(p, v)) || variants[0];
                    const tracking = resultRealization.get(matchedVar.id)!;
                    tracking.realProd += bsVal;
                    if (p.batch_kode) bsBatchCodes.add(p.batch_kode.toLowerCase());
                }
            });

            slugProduksis.forEach((p: any) => {
                const pgVal = Number(p.pg) || 0;
                if (pgVal > 0) {
                    const isAlreadyBsBatch = p.batch_kode && bsBatchCodes.has(p.batch_kode.toLowerCase());
                    if (isAlreadyBsBatch) return;

                    const explicitVar = variants.find(v => isExplicitVariantMatch(p, v));
                    if (explicitVar) {
                        const tracking = resultRealization.get(explicitVar.id)!;
                        tracking.realPeng += pgVal;
                    } else {
                        const totalSlugProd = variants.reduce((sum, v) => sum + resultRealization.get(v.id)!.realProd, 0);

                        if (totalSlugProd > 0) {
                            let remainingPg = pgVal;
                            variants.forEach((v, idx) => {
                                const vProd = resultRealization.get(v.id)!.realProd;
                                const portion = idx === variants.length - 1
                                    ? remainingPg
                                    : Math.min(remainingPg, Math.round((vProd / totalSlugProd) * pgVal));
                                resultRealization.get(v.id)!.realPeng += portion;
                                remainingPg -= portion;
                            });
                        } else {
                            resultRealization.get(variants[0].id)!.realPeng += pgVal;
                        }
                    }
                }
            });
        });

        // Build lookup map for monitoring harian values (Stok GMG, Kuantum SO, SO Outstanding)
        const monitoringMap = new Map<string, any>();
        const normAlphanum = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const indexMonitoringItem = (rawItem: any) => {
            if (!rawItem) return;
            const item = {
                ...rawItem,
                gudangGmg: Number(rawItem.gudangGmg ?? rawItem.gudang_gmg ?? 0),
                kuantumSoSdBulanIni: Number(rawItem.kuantumSoSdBulanIni ?? rawItem.kuantum_so_sd_bulan_ini ?? 0),
                soOutstanding: Number(rawItem.soOutstanding ?? rawItem.so_outstanding ?? 0),
                cleanName: rawItem.cleanName || rawItem.clean_name || rawItem.product_name || rawItem.name || '',
                name: rawItem.name || rawItem.product_name || '',
                slug: rawItem.slug || rawItem.product_slug || '',
                kemasan: rawItem.kemasan || '',
            };

            const slug = (item.slug || '').toLowerCase().trim();
            const kemNorm = normAlphanum(item.kemasan || item.name || '');
            const nameNorm = normAlphanum(item.name || item.cleanName || '');
            const cleanNorm = normAlphanum(item.cleanName || '');

            if (slug && item.kemasan) {
                monitoringMap.set(`${slug}||${kemNorm}`, item);
            }
            if (cleanNorm && item.kemasan) {
                monitoringMap.set(`${cleanNorm}||${kemNorm}`, item);
            }
            if (nameNorm) {
                monitoringMap.set(nameNorm, item);
            }
            if (item.id !== undefined) {
                monitoringMap.set(`id_${item.id}`, item);
            }
        };

        const targetSettingsKey = `monitoring_harian_${year}_${month}`;
        const sortedSettings = (settingsData || []).filter((s: any) => s.key && s.key.startsWith('monitoring_harian_'));
        sortedSettings.sort((a: any, b: any) => (a.key === targetSettingsKey ? 1 : b.key === targetSettingsKey ? -1 : (a.key < b.key ? -1 : 1)));

        sortedSettings.forEach((s: any) => {
            try {
                const parsed = JSON.parse(s.value);
                if (Array.isArray(parsed)) {
                    parsed.forEach((item: any) => indexMonitoringItem(item));
                }
            } catch (e) {}
        });

        (monitoringData || []).forEach((m: any) => indexMonitoringItem(m));

        // Build lookup map for master_items by ID
        const masterItemMap = new Map<number, any>();
        (masterItemsData || []).forEach((mi: any) => {
            if (mi.id) masterItemMap.set(Number(mi.id), mi);
        });

        // Build lookup map for Dus / Kardus consumption using ID-based BOM & master_items mapping
        const variantDusMap = new Map<number, number>();

        // 1. Filter mutasi records up to tableAEndMs & deduplicate by date + product + material + kuantum + keterangan
        const validMutasiList = (bahanBakuMutasiData || []).filter((bb: any) => {
            if (!bb.tanggal) return true;
            const t = new Date(bb.tanggal).getTime();
            return isNaN(t) || t <= tableAEndMs;
        });

        const dedupMutasiMap = new Map<string, any>();
        validMutasiList.forEach((bb: any) => {
            const dateStr = bb.tanggal ? bb.tanggal.split('T')[0] : '';
            const sig = `${bb.product_slug}||${(bb.nama_bahan || '').toLowerCase().trim()}||${bb.kuantum}||${dateStr}||${(bb.keterangan || '').trim()}`;
            if (!dedupMutasiMap.has(sig)) {
                dedupMutasiMap.set(sig, bb);
            }
        });
        const cleanMutasiList = Array.from(dedupMutasiMap.values());

        // Helper to check if a master item is a Box/Dus material (and not stiker/label)
        const isBoxMasterItem = (item: any): boolean => {
            if (!item) return false;
            const nama = (item.nama || '').toLowerCase().trim();
            const isBoxOrDus = nama.startsWith('box ') || nama.startsWith('box_') || nama.startsWith('dus ') || nama.startsWith('dus_') || nama.startsWith('carton');
            const isKardusNotStiker = nama.includes('kardus') && !nama.includes('stiker') && !nama.includes('label') && !nama.includes('kemasan');
            return isBoxOrDus || isKardusNotStiker;
        };

        // 2. Calculate Dus for each official variant using ID-based BOM material_id & shared material allocation
        // Pre-compute expected BOM Dus and target box material for each variant
        interface VariantBoxInfo {
            variant: DynamicVariant;
            vProd: number;
            boxMaterialName: string;
            expectedBomDus: number;
            explicitMutasiQty: number;
            hasExplicitTag: boolean;
        }

        const variantBoxInfoList: VariantBoxInfo[] = [];

        officialVariants.forEach((v) => {
            const tracking = resultRealization.get(v.id) || { realProd: 0, realPeng: 0 };
            const vProd = tracking.realProd;

            if (vProd <= 0) {
                variantDusMap.set(v.id, 0);
                return;
            }

            const kemNorm = (v.kemasan || '').toLowerCase().replace(/\s+/g, '');
            const bomRows = (bomData || []).filter((b: any) => b.produksi_tab_id === v.tabId);

            const hasVariantBomRows = bomRows.some((b: any) => {
                const vName = (b.variant_name || '').toLowerCase().trim();
                const pSlug = (b.product_slug || '').toLowerCase();
                return (vName && vName !== 'default') || pSlug.includes('::variant::');
            });

            const targetBoxMaterialNames = new Set<string>();
            let variantBomBoxQty = 0;
            let variantBomBaseQty = Number(bomRows[0]?.base_quantity || 1000);

            bomRows.forEach((b: any) => {
                const matId = Number(b.material_id);
                if (matId <= 0) return;

                const mi = masterItemMap.get(matId);
                if (isBoxMasterItem(mi)) {
                    const vName = (b.variant_name || '').toLowerCase().replace(/\s+/g, '');
                    const pSlug = (b.product_slug || '').toLowerCase();
                    const matName = (mi?.nama || '').toLowerCase().replace(/\s+/g, '');

                    let isVariantMatch = false;
                    if (hasVariantBomRows) {
                        isVariantMatch = (vName === kemNorm) || (pSlug.includes(`::variant::${kemNorm}`));
                    } else {
                        isVariantMatch = (!vName || vName === 'default') && (matName.includes(kemNorm) || bomRows.filter((row: any) => isBoxMasterItem(masterItemMap.get(row.material_id))).length === 1);
                    }

                    if (isVariantMatch) {
                        if (mi?.nama) targetBoxMaterialNames.add(mi.nama.toLowerCase().trim());
                        if (Number(b.material_quantity) > 0) {
                            variantBomBoxQty = Number(b.material_quantity);
                            if (Number(b.base_quantity) > 0) variantBomBaseQty = Number(b.base_quantity);
                        }
                    }
                }
            });

            const primaryBoxName = Array.from(targetBoxMaterialNames)[0] || '';
            const expectedBomDus = (variantBomBoxQty > 0 && variantBomBaseQty > 0)
                ? Math.round((vProd / variantBomBaseQty) * variantBomBoxQty)
                : 0;

            const prodMutasis = cleanMutasiList.filter((bb: any) => {
                const pSlug = (bb.product_slug || '').toLowerCase();
                return pSlug === v.productSlug || pSlug.startsWith(`${v.productSlug}::variant::`);
            });

            let explicitMutasiQty = 0;
            let hasExplicitTag = false;

            prodMutasis.forEach((bb: any) => {
                const nama = (bb.nama_bahan || bb.NamaBahan || '').toLowerCase().trim();
                const tagMatch = (bb.keterangan || '').match(/\[Varian:\s*([^-\]]+)/i);
                const tagNorm = tagMatch ? tagMatch[1].toLowerCase().replace(/\s+/g, '') : '';

                const matchesByMasterName = targetBoxMaterialNames.has(nama);
                const matchesByVariantTag = tagNorm ? (tagNorm === kemNorm && isBoxMasterItem({ nama })) : false;

                const matchesFallback = targetBoxMaterialNames.size === 0 && (
                    (kemNorm === '500ml' && nama.includes('500ml')) ||
                    (kemNorm === '1liter' && (nama.includes('1liter') || nama.includes('1l'))) ||
                    (kemNorm === '1kg' && nama.includes('1kg')) ||
                    (kemNorm === '2kg' && nama.includes('2kg')) ||
                    (kemNorm === '5kg' && nama.includes('5kg')) ||
                    (kemNorm === '10kg' && nama.includes('10kg')) ||
                    (kemNorm === '20kg' && nama.includes('20kg'))
                );

                if (matchesByVariantTag) {
                    explicitMutasiQty += Number(bb.kuantum || 0);
                    hasExplicitTag = true;
                } else if (matchesByMasterName || matchesFallback) {
                    explicitMutasiQty += Number(bb.kuantum || 0);
                }
            });

            variantBoxInfoList.push({
                variant: v,
                vProd,
                boxMaterialName: primaryBoxName,
                expectedBomDus,
                explicitMutasiQty,
                hasExplicitTag
            });
        });

        // Group active variants by product & boxMaterialName to allocate shared mutasis
        const sharedGroupMap = new Map<string, VariantBoxInfo[]>();
        variantBoxInfoList.forEach(info => {
            const groupKey = `${info.variant.productSlug}||${info.boxMaterialName}`;
            if (!sharedGroupMap.has(groupKey)) sharedGroupMap.set(groupKey, []);
            sharedGroupMap.get(groupKey)!.push(info);
        });

        sharedGroupMap.forEach((group) => {
            if (group.length === 1) {
                // Single active variant for this box material
                const info = group[0];
                const finalDus = info.explicitMutasiQty > 0 ? info.explicitMutasiQty : info.expectedBomDus;
                variantDusMap.set(info.variant.id, finalDus);
            } else {
                // Multiple active variants share the same box material (e.g. Bio Fertil 2KG & 5KG sharing Box Kardus 20Kg)
                const totalSharedMutasi = group[0].explicitMutasiQty; // Physical mutasi recorded for this box material
                const totalExpectedBom = group.reduce((sum, g) => sum + g.expectedBomDus, 0);

                group.forEach(info => {
                    if (info.hasExplicitTag) {
                        variantDusMap.set(info.variant.id, info.explicitMutasiQty);
                    } else if (totalSharedMutasi > 0 && totalExpectedBom > 0) {
                        // Allocate shared physical mutasi proportionally based on BOM expected consumption
                        const portion = Math.round((info.expectedBomDus / totalExpectedBom) * totalSharedMutasi);
                        variantDusMap.set(info.variant.id, portion);
                    } else {
                        variantDusMap.set(info.variant.id, info.expectedBomDus);
                    }
                });
            }
        });

        const rkoSummary = officialVariants.map((v, idx) => {
            const tracking = resultRealization.get(v.id) || { realProd: 0, realPeng: 0 };
            const stokAkhir = Math.max(0, tracking.realProd - tracking.realPeng);

            const kemNorm = normAlphanum(v.kemasan);
            const slugKey = `${v.productSlug}||${kemNorm}`;
            const cleanKey = `${normAlphanum(v.name)}||${kemNorm}`;
            const fullComboKey = normAlphanum(`${v.name} ${v.kemasan}`);

            let monInfo = monitoringMap.get(slugKey) || monitoringMap.get(cleanKey) || monitoringMap.get(fullComboKey) || {};

            if (!monInfo || Object.keys(monInfo).length === 0) {
                // Fallback search across all cached monitoring items
                const baseNameNorm = normAlphanum(v.name);
                for (const item of Array.from(monitoringMap.values())) {
                    const itemKem = normAlphanum(item.kemasan || '');
                    const itemName = normAlphanum(item.name || item.cleanName || '');
                    const itemSlug = (item.slug || '').toLowerCase();

                    const isSlugMatch = itemSlug === v.productSlug;
                    const isNameMatch = itemName.includes(baseNameNorm) || baseNameNorm.includes(itemName);
                    const isKemMatch = !v.kemasan || itemKem.includes(kemNorm) || kemNorm.includes(itemKem);

                    if ((isSlugMatch || isNameMatch) && isKemMatch) {
                        monInfo = item;
                        break;
                    }
                }
            }

            const stokGmg = Number(monInfo.totalStok ?? monInfo.total_stok ?? monInfo.gudangGmg ?? monInfo.gudang_gmg ?? 0);
            const kuantumSo = Number(monInfo.kuantumSoSdBulanIni ?? monInfo.kuantum_so_sd_bulan_ini ?? monInfo.kuantumSoBulanIni ?? monInfo.kuantum_so_bulan_ini ?? 0);
            const soOutstanding = Number(monInfo.soOutstanding ?? monInfo.so_outstanding ?? 0);

            // Per User Directive:
            // 1. Realisasi Pengambilan strictly = Kuantum SO 2026 - SO Outstanding 2026
            const realisasiPengambilan = Math.max(0, kuantumSo - soOutstanding);

            // 2. Stok Akhir = Stok GMG - SO Outstanding
            const finalStokAkhir = Math.max(0, stokGmg - soOutstanding);

            const totalDus = variantDusMap.get(v.id) || 0;

            return {
                no: idx + 1,
                name: v.name,
                bentuk: v.bentuk,
                kemasan: v.kemasan,
                realisasiProduksi: tracking.realProd,
                totalDus: totalDus,
                stokGmg: stokGmg,
                kuantumSo: kuantumSo,
                soOutstanding: soOutstanding,
                realisasiPengambilan: realisasiPengambilan,
                stokAkhir: finalStokAkhir,
                satuan: v.satuan,
            };
        });

        // 2. Filter Aktivitas Harian by date range
        let filteredAktivitas: ActivityRecord[] = aktivitasData || [];
        if (startDate && endDate) {
            filteredAktivitas = filteredAktivitas.filter((a) => {
                if (!a.tanggal) return false;
                const t = new Date(a.tanggal).getTime();
                return t >= actStartMs && t <= actEndMs;
            });
        }

        const classifyLine = (line: string, productSlug: string): string => {
            const l = line.toLowerCase();
            const slug = (productSlug || '').toLowerCase();

            if (slug && dynamicProductsMap.has(slug)) {
                return slug;
            }

            for (const prod of allProductsList) {
                const pSlug = prod.slug.toLowerCase();
                const pName = prod.name.toLowerCase();
                if (l.includes(pName) || (pSlug.length > 3 && l.includes(pSlug))) {
                    return prod.slug;
                }
            }

            if (/\bpfs\b/i.test(line)) return 'petro-fish';
            if (/\bpop\b/i.test(line)) return 'phonska-oca';
            if (/\bpbf\b/i.test(line)) return 'bio-fertil';
            if (/\bpgd.*cair\b/i.test(line)) return 'petro-gladiator-cair';
            if (/\bpgd\b/i.test(line)) return 'petro-gladiator';

            return 'catatan-tambahan';
        };

        const normalizeText = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

        interface DateGroup {
            id: string;
            tanggal: string;
            bullets: string[];
        }

        const rawGroupMap: Record<string, Map<string, Map<string, string>>> = {
            'catatan-tambahan': new Map(),
        };
        allProductsList.forEach(p => {
            rawGroupMap[p.slug] = new Map();
        });

        filteredAktivitas.forEach((act) => {
            const desc = act.deskripsi || '';
            const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);
            const dateDmy = formatYmdToDmy(act.tanggal);

            lines.forEach(line => {
                const targetCat = classifyLine(line, act.product_slug);
                const catMap = rawGroupMap[targetCat] || rawGroupMap['catatan-tambahan'];

                if (!catMap.has(dateDmy)) {
                    catMap.set(dateDmy, new Map());
                }

                const norm = normalizeText(line);
                const innerMap = catMap.get(dateDmy)!;
                if (!innerMap.has(norm)) {
                    innerMap.set(norm, line);
                }
            });
        });

        const buildDateGroupsFromMap = (catMap: Map<string, Map<string, string>>): DateGroup[] => {
            if (!catMap) return [];
            const dates = Array.from(catMap.keys()).sort((a, b) => {
                const partsA = a.split('/').map(Number);
                const partsB = b.split('/').map(Number);
                if (partsA.length === 3 && partsB.length === 3) {
                    const timeA = new Date(partsA[2], partsA[1] - 1, partsA[0]).getTime();
                    const timeB = new Date(partsB[2], partsB[1] - 1, partsB[0]).getTime();
                    return timeA - timeB;
                }
                return a.localeCompare(b);
            });

            return dates.map((d, idx) => ({
                id: `${d}-${idx}`,
                tanggal: d,
                bullets: Array.from(catMap.get(d)!.values()),
            }));
        };

        const rawAktivitasGrouped: Record<string, DateGroup[]> = {};
        allProductsList.forEach(p => {
            rawAktivitasGrouped[p.slug] = buildDateGroupsFromMap(rawGroupMap[p.slug]);
        });
        rawAktivitasGrouped['catatan-tambahan'] = buildDateGroupsFromMap(rawGroupMap['catatan-tambahan']);

        // 3. Gemini AI Summarization
        const activeApiKey = apiKey || process.env.GEMINI_API_KEY;
        let aiSummaries: Record<string, DateGroup[]> = { ...rawAktivitasGrouped };

        const formatCatForPrompt = (groups: DateGroup[]) => {
            if (!groups || groups.length === 0) return 'Kosong';
            return groups.map(g => `[Tanggal ${g.tanggal}: ${g.bullets.join('; ')}]`).join(' | ');
        };

        const categoriesWithData = Object.keys(rawAktivitasGrouped).filter(k => (rawAktivitasGrouped[k] || []).length > 0);

        if (activeApiKey && categoriesWithData.length > 0) {
            try {
                const promptLines = allProductsList.map(p =>
                    `- ${p.name}: ${formatCatForPrompt(rawAktivitasGrouped[p.slug])}`
                );
                promptLines.push(`- Catatan Tambahan (General Maintenance/Lainnya): ${formatCatForPrompt(rawAktivitasGrouped['catatan-tambahan'])}`);

                const jsonStructureParts = allProductsList.map(p =>
                    `  "${p.slug.replace(/-/g, '_')}": [{ "tanggal": "DD/MM/YYYY", "bullets": ["poin 1"] }]`
                );
                jsonStructureParts.push(`  "catatan_tambahan": [{ "tanggal": "DD/MM/YYYY", "bullets": ["catatan 1"] }]`);

                const prompt = `
Anda adalah Manajer Operasional Kemitraan Produk Pengembangan PT Petrokimia Gresik.
Rangkumlah logbook aktivitas harian berikut untuk periode ${startDate} s/d ${endDate} menjadi poin-poin ringkasan yang padat, jelas, formal, dan profesional dalam Bahasa Indonesia (maksimal 3-5 poin per tanggal per kategori).

PENTING UNTUK PENGELOMPOKAN TANGGAL & DEDUPLIKASI:
- Kelompokkan poin ringkasan secara ketat berdasarkan TANGGAL pelaksanaan (format DD/MM/YYYY).
- HANYA hasilkan 1 poin ringkasan unik per aktivitas pada tanggal tersebut.
- Kosongkan array jika tidak ada data untuk kategori tersebut.

Data Logbook Aktivitas Raw:
${promptLines.join('\n')}

Berikan output HANYA JSON valid dengan struktur berikut:
{
${jsonStructureParts.join(',\n')}
}
`;

                const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'];
                let geminiRes: Response | null = null;

                for (const modelName of modelsToTry) {
                    try {
                        const res = await fetch(
                            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeApiKey}`,
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    contents: [{ parts: [{ text: prompt }] }],
                                    generationConfig: { responseMimeType: 'application/json' },
                                }),
                            }
                        );
                        if (res.ok) {
                            geminiRes = res;
                            break;
                        }
                    } catch (e) {
                        console.warn(`Failed with model ${modelName}, trying fallback...`);
                    }
                }

                if (geminiRes && geminiRes.ok) {
                    const resJson = await geminiRes.json();
                    const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (rawText) {
                        const parsed = JSON.parse(rawText);

                        const parseAiCategoryGroups = (arr: any[]): DateGroup[] => {
                            if (!Array.isArray(arr)) return [];
                            return arr.map((item, idx) => {
                                const rawDate = typeof item === 'object' && item?.tanggal ? item.tanggal : '';
                                const cleanDate = formatYmdToDmy(rawDate) || rawDate;
                                const rawBullets = Array.isArray(item?.bullets)
                                    ? item.bullets
                                    : (item?.poin ? [item.poin] : (typeof item === 'string' ? [item] : []));

                                const postBullets: string[] = [];
                                const seen = new Set<string>();
                                rawBullets.forEach((b: any) => {
                                    const str = typeof b === 'string' ? b.trim() : '';
                                    const norm = normalizeText(str);
                                    if (str && !seen.has(norm)) {
                                        seen.add(norm);
                                        postBullets.push(str);
                                    }
                                });

                                return {
                                    id: `${cleanDate}-${idx}`,
                                    tanggal: cleanDate,
                                    bullets: postBullets,
                                };
                            }).filter(g => g.tanggal && g.bullets.length > 0);
                        };

                        const parsedSummaries: Record<string, DateGroup[]> = {};
                        allProductsList.forEach(p => {
                            const keyUnder = p.slug.replace(/-/g, '_');
                            const aiArr = parsed[p.slug] || parsed[keyUnder] || [];
                            parsedSummaries[p.slug] = parseAiCategoryGroups(aiArr);
                        });
                        parsedSummaries['catatan-tambahan'] = parseAiCategoryGroups(parsed.catatan_tambahan || parsed['catatan-tambahan'] || []);

                        aiSummaries = parsedSummaries;
                    }
                } else {
                    aiSummaries = { ...rawAktivitasGrouped };
                }
            } catch (err) {
                console.error('Gemini AI generation failed, using raw grouped summaries:', err);
                aiSummaries = { ...rawAktivitasGrouped };
            }
        } else {
            aiSummaries = { ...rawAktivitasGrouped };
        }

        const productBlocks = allProductsList.map(p => ({
            id: p.slug,
            name: p.name,
            image: p.image,
            dateGroups: aiSummaries[p.slug] || []
        }));

        return NextResponse.json({
            rkoYear: year,
            rkoSummary,
            productBlocks,
            aiSummaries,
            productImageMap,
            tableADateLabel: endDate ? `01/01/${year} s/d ${formatYmdToDmy(endDate)}` : `01/01/${year}`,
            rawActivitiesCount: filteredAktivitas.length,
        });

    } catch (error: any) {
        console.error('Error generating report template:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

function formatYmdToDmy(ymd: string): string {
    if (!ymd) return '';
    const parts = ymd.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return ymd;
}
