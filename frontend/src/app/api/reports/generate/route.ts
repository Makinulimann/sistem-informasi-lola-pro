export const dynamic = 'force-dynamic';
export const runtime = 'edge';

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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { startDate, endDate, rkoYear, apiKey } = body;

        const year = rkoYear ? parseInt(rkoYear, 10) : new Date().getFullYear();

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
        ] = await Promise.all([
            db.from<any>('produksis').select('*').execute(),
            db.from<any>('aktivitas_harians').select('*').execute(),
            db.from<any>('sidebar_menus').select('label,image_url').execute(),
            db.from<any>('produksi_tabs').select('*').execute(),
            db.from<any>('bill_of_materials').select('product_slug,produksi_tab_id,variant_name').execute(),
            db.from<any>('products').select('slug,nama').execute(),
        ]);

        // Map product images from sidebar_menus database table
        const productImageMap: Record<string, string> = {
            'petro-fish': '/images/petro-fish.webp',
            'phonska-oca': '/images/phonska-oca-plus.webp',
            'bio-fertil': '/images/bio-fertil.webp',
            'petro-gladiator': '/images/petro-gladiator.webp',
            'petro-gladiator-cair': '/images/petro-gladiator.webp',
        };

        (sidebarMenus || []).forEach((m: any) => {
            if (m.label && m.image_url) {
                const l = m.label.toLowerCase();
                if (l.includes('fish')) productImageMap['petro-fish'] = m.image_url;
                else if (l.includes('phonska') || l.includes('oca')) productImageMap['phonska-oca'] = m.image_url;
                else if (l.includes('bio') || l.includes('fertil')) productImageMap['bio-fertil'] = m.image_url;
                else if (l.includes('cair')) productImageMap['petro-gladiator-cair'] = m.image_url;
                else if (l.includes('gladiator')) productImageMap['petro-gladiator'] = m.image_url;
            }
        });

        // Filter produksis for Table A from YYYY-01-01 up to endDate
        const periodProduksis = (produksisData || []).filter((p: any) => {
            if (!p.tanggal) return false;
            const t = new Date(p.tanggal).getTime();
            return t >= tableAStartMs && t <= tableAEndMs;
        });

        // Build dynamic product variants from DB (same logic as rko-targets/route.ts)
        const SLUG_NAME_MAP: Record<string, string> = {
            'petro-gladiator': 'Petro Gladiator',
            'bio-fertil': 'Petro Bio Fertil',
            'petro-fish': 'Petro Fish',
            'phonska-oca': 'Phonska Oca Plus',
            'petro-gladiator-cair': 'Petro Gladiator Cair',
        };
        (productsTableData || []).forEach((p: any) => {
            if (p.slug && p.nama) SLUG_NAME_MAP[p.slug] = p.nama;
        });

        const PRODUCT_TYPE_MAP: Record<string, string> = {
            'petro-gladiator': 'Padat',
            'bio-fertil': 'Padat',
            'petro-fish': 'Cair',
            'phonska-oca': 'Cair',
            'petro-gladiator-cair': 'Cair',
        };

        const VALID_SLUGS = new Set(['petro-gladiator', 'bio-fertil', 'petro-fish', 'phonska-oca', 'petro-gladiator-cair']);
        const tabs: any[] = (tabsData || []).filter((t: any) => VALID_SLUGS.has(t.product_slug));
        const bomRows: any[] = bomData || [];

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

        // Sort: Cair first, then Padat (mirrors RKO display order)
        const sortedTabs = [...tabs].sort((a, b) => {
            const aType = PRODUCT_TYPE_MAP[a.product_slug] || 'Padat';
            const bType = PRODUCT_TYPE_MAP[b.product_slug] || 'Padat';
            if (aType === 'Cair' && bType !== 'Cair') return -1;
            if (aType !== 'Cair' && bType === 'Cair') return 1;
            return 0;
        });

        sortedTabs.forEach((t: any) => {
            const prodName = SLUG_NAME_MAP[t.product_slug] || t.product_slug;
            const jenisProduk = PRODUCT_TYPE_MAP[t.product_slug] || 'Padat';
            const satuan = jenisProduk === 'Cair' ? 'Liter' : 'Kg';

            const tabBomRows = bomRows.filter((b: any) => b.produksi_tab_id === t.id);
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
                    const fullName = `${prodName} - ${vName}`;
                    const key = `${t.product_slug}||${fullName}`;
                    if (!addedVarKeys.has(key)) {
                        addedVarKeys.add(key);
                        varId++;
                        officialVariants.push({
                            id: varId,
                            name: fullName,
                            bentuk: jenisProduk,
                            kemasan: vName,
                            productSlug: t.product_slug,
                            satuan,
                            tabId: t.id,
                        });
                    }
                });
            } else {
                // Only add base entry if this slug has no variants at all
                const slugHasVariants = officialVariants.some(v => v.productSlug === t.product_slug && v.kemasan);
                if (!slugHasVariants) {
                    const key = `${t.product_slug}||${prodName}`;
                    if (!addedVarKeys.has(key)) {
                        addedVarKeys.add(key);
                        varId++;
                        officialVariants.push({
                            id: varId,
                            name: prodName,
                            bentuk: jenisProduk,
                            kemasan: '',
                            productSlug: t.product_slug,
                            satuan,
                            tabId: t.id,
                        });
                    }
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

        // Helper to check if a produksis row matches a specific variant
        const matchesVariantExplicit = (p: any, v: DynamicVariant): boolean => {
            if (p.product_slug !== v.productSlug) return false;

            const ket = (p.keterangan || '').toLowerCase();
            const kem = v.kemasan.toLowerCase().replace('@', '').trim();

            if (!kem) return true; // base entry (no variant) matches all rows of this slug
            if (p.produksi_tab_id && p.produksi_tab_id === v.tabId) return true;
            if (ket.includes(kem)) return true;
            if (p.batch_kode && batchToVariantMap.has(p.batch_kode.toLowerCase())) {
                const mappedVar = (batchToVariantMap.get(p.batch_kode.toLowerCase()) || '').toLowerCase();
                if (mappedVar.includes(kem)) return true;
            }

            return false;
        };

        // Group variants by productSlug for smart Pengiriman Gudang (pg) allocation
        const slugVariantsMap = new Map<string, DynamicVariant[]>();
        officialVariants.forEach(v => {
            if (!slugVariantsMap.has(v.productSlug)) slugVariantsMap.set(v.productSlug, []);
            slugVariantsMap.get(v.productSlug)!.push(v);
        });

        // Prepare realization tracking map per variant
        const resultRealization = new Map<number, { realProd: number; realPeng: number }>();
        officialVariants.forEach(v => resultRealization.set(v.id, { realProd: 0, realPeng: 0 }));

        // 1) Calculate realisasiProduksi (bs > 0) per variant
        slugVariantsMap.forEach((variants, slug) => {
            const slugProduksis = periodProduksis.filter((p: any) => p.product_slug === slug);
            const bsBatchCodes = new Set<string>();

            slugProduksis.forEach((p: any) => {
                const bsVal = Number(p.bs) || 0;
                if (bsVal > 0) {
                    // Match to variant
                    const matchedVar = variants.find(v => matchesVariantExplicit(p, v)) || variants[0];
                    const tracking = resultRealization.get(matchedVar.id)!;
                    tracking.realProd += bsVal;
                    if (p.batch_kode) bsBatchCodes.add(p.batch_kode.toLowerCase());
                }
            });

            // 2) Calculate realisasiPengambilan (pg > 0) per variant
            slugProduksis.forEach((p: any) => {
                const pgVal = Number(p.pg) || 0;
                if (pgVal > 0) {
                    const isAlreadyBsBatch = p.batch_kode && bsBatchCodes.has(p.batch_kode.toLowerCase());
                    if (isAlreadyBsBatch) return;

                    // Check explicit variant match
                    const explicitVar = variants.find(v => matchesVariantExplicit(p, v));
                    if (explicitVar) {
                        const tracking = resultRealization.get(explicitVar.id)!;
                        tracking.realPeng += pgVal;
                    } else {
                        // Untagged pg row (e.g. pg = 102 for petro-gladiator-cair without variant tag)
                        // Distribute pgVal across variants of this productSlug proportional to realProd (or stock)
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
                            // Default to first variant if 0 production
                            resultRealization.get(variants[0].id)!.realPeng += pgVal;
                        }
                    }
                }
            });
        });

        const rkoSummary = officialVariants.map(v => {
            const tracking = resultRealization.get(v.id) || { realProd: 0, realPeng: 0 };
            const stokAkhir = Math.max(0, tracking.realProd - tracking.realPeng);

            return {
                no: v.id,
                name: v.name,
                bentuk: v.bentuk,
                kemasan: v.kemasan,
                realisasiProduksi: tracking.realProd,
                realisasiPengambilan: tracking.realPeng,
                stokAkhir: stokAkhir,
                satuan: v.satuan,
            };
        });

        // 2. Filter Aktivitas Harian by exact selected date range [startDate, endDate]
        let filteredAktivitas: ActivityRecord[] = aktivitasData || [];
        if (startDate && endDate) {
            filteredAktivitas = filteredAktivitas.filter((a) => {
                if (!a.tanggal) return false;
                const t = new Date(a.tanggal).getTime();
                return t >= actStartMs && t <= actEndMs;
            });
        }

        // Intelligent Abbreviation & Keyword Classifier
        const classifyLine = (line: string, productSlug: string): string => {
            const l = line.toLowerCase();
            const slug = (productSlug || '').toLowerCase();

            if (/\bpfs\b/i.test(line) || l.includes('petro fish') || l.includes('petrofish') || slug.includes('fish')) return 'petro-fish';
            if (/\bpop\b/i.test(line) || l.includes('phonska') || l.includes('oca') || slug.includes('phonska') || slug.includes('oca')) return 'phonska-oca';
            if (/\bpbf\b/i.test(line) || l.includes('bio fertil') || l.includes('biofertil') || slug.includes('bio') || slug.includes('fertil')) return 'bio-fertil';
            if (/\bpgd.*cair\b/i.test(line) || (/\bpgd\b/i.test(line) && l.includes('cair')) || l.includes('gladiator cair') || slug.includes('gladiator-cair')) return 'petro-gladiator-cair';
            if (/\bpgd\b/i.test(line) || l.includes('gladiator') || slug.includes('gladiator')) return 'petro-gladiator';

            return 'catatan-tambahan';
        };

        // Smart Case-Insensitive & Punctuation-Insensitive Deduplication
        const normalizeText = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

        const rawGrouped: Record<string, { lines: string[]; normSet: Set<string> }> = {
            'petro-fish': { lines: [], normSet: new Set() },
            'phonska-oca': { lines: [], normSet: new Set() },
            'bio-fertil': { lines: [], normSet: new Set() },
            'petro-gladiator': { lines: [], normSet: new Set() },
            'petro-gladiator-cair': { lines: [], normSet: new Set() },
            'catatan-tambahan': { lines: [], normSet: new Set() },
        };

        filteredAktivitas.forEach((act) => {
            const desc = act.deskripsi || '';
            const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);

            lines.forEach(line => {
                const targetCat = classifyLine(line, act.product_slug);
                const norm = normalizeText(line);
                if (!rawGrouped[targetCat].normSet.has(norm)) {
                    rawGrouped[targetCat].normSet.add(norm);
                    rawGrouped[targetCat].lines.push(line);
                }
            });
        });

        const aktivitasGrouped: Record<string, string[]> = {
            'petro-fish': rawGrouped['petro-fish'].lines,
            'phonska-oca': rawGrouped['phonska-oca'].lines,
            'bio-fertil': rawGrouped['bio-fertil'].lines,
            'petro-gladiator': rawGrouped['petro-gladiator'].lines,
            'petro-gladiator-cair': rawGrouped['petro-gladiator-cair'].lines,
            'catatan-tambahan': rawGrouped['catatan-tambahan'].lines,
        };

        // 3. Gemini AI Summarization
        const activeApiKey = apiKey || process.env.GEMINI_API_KEY;
        let aiSummaries: Record<string, string[]> = { ...aktivitasGrouped };

        const categoriesWithData = Object.keys(aktivitasGrouped).filter(k => aktivitasGrouped[k].length > 0);

        if (activeApiKey && categoriesWithData.length > 0) {
            try {
                const prompt = `
Anda adalah Manajer Operasional Kemitraan Produk Pengembangan PT Petrokimia Gresik.
Rangkumlah logbook aktivitas harian berikut untuk periode ${startDate} s/d ${endDate} menjadi poin-poin ringkasan yang padat, jelas, formal, dan profesional dalam Bahasa Indonesia (maksimal 3-5 poin per kategori).

PENTING UNTUK DEDUPLIKASI:
- HANYA hasilkan 1 poin ringkasan unik per aktivitas.
- JANGAN mengulang atau membuat poin ganda untuk aktivitas yang sama (meskipun berbeda huruf kapital/spasi/koma seperti "drum P3" dan "Drum P3").
- Kosongkan array jika tidak ada data untuk kategori tersebut.

Data Logbook Aktivitas Raw:
- Petro Fish (PFS): ${aktivitasGrouped['petro-fish'].join(' | ') || 'Kosong'}
- Phonska Oca Plus (POP): ${aktivitasGrouped['phonska-oca'].join(' | ') || 'Kosong'}
- Petro Bio Fertil (PBF): ${aktivitasGrouped['bio-fertil'].join(' | ') || 'Kosong'}
- Petro Gladiator Padat (PGD Padat): ${aktivitasGrouped['petro-gladiator'].join(' | ') || 'Kosong'}
- Petro Gladiator Cair (PGD Cair): ${aktivitasGrouped['petro-gladiator-cair'].join(' | ') || 'Kosong'}
- Catatan Tambahan (General Maintenance/Lainnya): ${aktivitasGrouped['catatan-tambahan'].join(' | ') || 'Kosong'}

Berikan output HANYA JSON valid dengan struktur berikut:
{
  "petro_fish": ["poin 1", "poin 2"],
  "phonska_oca": ["poin 1", "poin 2"],
  "bio_fertil": ["poin 1", "poin 2"],
  "petro_gladiator": ["poin 1", "poin 2"],
  "petro_gladiator_cair": ["poin 1", "poin 2"],
  "catatan_tambahan": ["poin 1", "poin 2"]
}
`;

                const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-1.5-flash-lite', 'gemini-2.5-flash', 'gemini-1.5-flash'];
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

                        const postDeduplicate = (arr: string[]) => {
                            const result: string[] = [];
                            const seen = new Set<string>();
                            (arr || []).forEach(item => {
                                const norm = normalizeText(item);
                                if (item && !seen.has(norm)) {
                                    seen.add(norm);
                                    result.push(item);
                                }
                            });
                            return result;
                        };

                        aiSummaries = {
                            'petro-fish': postDeduplicate(parsed.petro_fish || []),
                            'phonska-oca': postDeduplicate(parsed.phonska_oca || []),
                            'bio-fertil': postDeduplicate(parsed.bio_fertil || []),
                            'petro-gladiator': postDeduplicate(parsed.petro_gladiator || []),
                            'petro-gladiator-cair': postDeduplicate(parsed.petro_gladiator_cair || []),
                            'catatan-tambahan': postDeduplicate(parsed.catatan_tambahan || []),
                        };
                    }
                } else {
                    aiSummaries = { ...aktivitasGrouped };
                }
            } catch (err) {
                console.error('Gemini AI generation failed, using raw grouped summaries:', err);
                aiSummaries = { ...aktivitasGrouped };
            }
        } else {
            aiSummaries = { ...aktivitasGrouped };
        }

        return NextResponse.json({
            rkoYear: year,
            rkoSummary,
            aiSummaries,
            productImageMap,
            tableADateLabel: `01/01/${year} s/d ${formatYmdToDmy(endDate)}`,
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
