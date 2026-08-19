export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const productSlug = body.productSlug || body.ProductSlug;
        const tabId = body.tabId !== undefined ? body.tabId : body.TabId;
        const tanggalValid = body.tanggal || body.Tanggal;
        const bsValue = body.bs !== undefined ? body.bs : body.BS;
        const bsSatuanValue = body.bsSatuan || body.BsSatuan || '';
        const variantNameValue = body.variantName || body.VariantName || body.variant_name || '';
        const materialsArray = body.materials || body.Materials;
        const batchKodeValue = body.batchKode || body.BatchKode || '';
        let ketValue = body.keterangan || body.Keterangan || '';

        const prefixParts: string[] = [];
        if (variantNameValue && variantNameValue !== 'default') {
            prefixParts.push(`Varian: ${variantNameValue}`);
        }
        if (batchKodeValue) {
            prefixParts.push(`Batch: ${batchKodeValue}`);
        }

        if (prefixParts.length > 0) {
            const prefixTag = `[${prefixParts.join(' - ')}]`;
            const cleanUserKet = ketValue.replace(/^\[(Varian|Batch):[^\]]+\]\s*/gi, '').trim();
            if (!ketValue.includes(prefixTag)) {
                ketValue = `${prefixTag} ${cleanUserKet}`.trim();
            }
        }

        if (!productSlug || tabId === undefined) {
            return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
        }

        const localDate = new Date(tanggalValid);
        if (isNaN(localDate.getTime())) {
            return NextResponse.json({ message: 'Invalid date format.' }, { status: 400 });
        }

        const dateStr = tanggalValid.includes('T') ? tanggalValid.split('T')[0] : tanggalValid;
        const targetUtc = new Date(`${dateStr}T00:00:00.000Z`);

        const extractYmd = (val: any): string => {
            if (!val) return '';
            if (typeof val === 'string') {
                const clean = val.split('T')[0].split(' ')[0];
                const parts = clean.split('-');
                if (parts.length === 3 && parts[0].length === 4) return clean;
            }
            const d = new Date(val);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        };

        const isSameDate = (d1: any, d2: any): boolean => {
            const y1 = extractYmd(d1);
            const y2 = extractYmd(d2);
            if (y1 && y2 && y1 === y2) return true;
            
            const d1Obj = new Date(d1);
            const d2Obj = new Date(d2);
            if (!isNaN(d1Obj.getTime()) && !isNaN(d2Obj.getTime())) {
                const local1 = new Date(d1Obj.getTime() + 7 * 3600000).toISOString().split('T')[0];
                const local2 = new Date(d2Obj.getTime() + 7 * 3600000).toISOString().split('T')[0];
                return local1 === local2 || local1 === y2 || y1 === local2;
            }
            return false;
        };

        // 1. Upsert Produksi
        const reqId = body.id || body.Id || body.produksiId;

        const extractVariantTag = (ket: string): string => {
            const m = (ket || '').match(/\[Varian:\s*([^-\]]+)/i);
            return m ? m[1].trim().toLowerCase() : '';
        };

        const { data: records } = await db.from<any>('produksis').select('*').eq('product_slug', productSlug).execute();
        const existingMatches = (records || []).filter((r: any) => {
            if (reqId && Number(reqId) > 0 && Number(r.id) === Number(reqId)) return true;
            if (r.produksi_tab_id !== tabId) return false;

            const rowVariant = extractVariantTag(r.keterangan || '');
            const reqVariant = (variantNameValue && variantNameValue !== 'default') ? variantNameValue.trim().toLowerCase() : '';

            const isSameBatch = batchKodeValue
                ? (r.batch_kode && r.batch_kode.toLowerCase() === batchKodeValue.toLowerCase())
                : true;
            const isSameVar = reqVariant ? (rowVariant === reqVariant) : true;

            return isSameDate(r.tanggal, dateStr) && isSameBatch && isSameVar;
        });

        if (existingMatches.length > 0) {
            const primary = existingMatches[0];
            const { error: updateErr } = await db.from<any>('produksis').update({
                bs: bsValue,
                batch_kode: batchKodeValue || primary.batch_kode,
                keterangan: ketValue,
            }).eq('id', primary.id);

            if (updateErr) {
                console.error('Error updating produksis:', updateErr);
                return NextResponse.json({ message: 'Failed to update produksis record: ' + JSON.stringify(updateErr) }, { status: 500 });
            }

            for (let i = 1; i < existingMatches.length; i++) {
                await db.from<any>('produksis').delete().eq('id', existingMatches[i].id);
            }
        } else {
            const { error: insertErr } = await db.from<any>('produksis').insert({
                product_slug: productSlug,
                produksi_tab_id: tabId,
                tanggal: targetUtc.toISOString(),
                bs: bsValue,
                pg: 0,
                kumulatif: 0,
                stok_akhir: 0,
                coa: 0,
                ps: 0,
                batch_kode: batchKodeValue,
                ps_batch_kode: '',
                coa_batch_kode: '',
                keterangan: ketValue
            });

            if (insertErr) {
                console.error('Error inserting produksis:', insertErr);
                return NextResponse.json({ message: 'Failed to insert produksis record: ' + JSON.stringify(insertErr) }, { status: 500 });
            }
        }

        // 2. Delete existing Mutasi
        const { data: relatedBahanBaku } = await db.from<any>('bahan_bakus').select('*').eq('product_slug', productSlug).execute();

        const productLabelDdl = body.productFullName || body.ProductFullName || productSlug;
        
        const toDeleteIds = (relatedBahanBaku || [])
            .filter((b: any) => {
                const ket = b.keterangan || b.Keterangan;
                const rDate = new Date(b.tanggal || b.Tanggal);
                const isSameDate = rDate.getTime() === targetUtc.getTime();
                return ket && ket.toLowerCase().startsWith('produksi ') && ket.toLowerCase().includes(productLabelDdl.toLowerCase()) && isSameDate;
            })
            .map((b: any) => b.id || b.Id);

        for (const id of toDeleteIds) {
            await db.from<any>('bahan_bakus').delete().eq('id', id);
        }

        // 3. Create new Mutasi
        const mutasiRecords = [];
        if (materialsArray && Array.isArray(materialsArray)) {
            const productLabel = body.productFullName || body.ProductFullName || productSlug;
            const bsFormatted = bsValue.toString();

            const toCreate = materialsArray
                .filter((mat: any) => (mat.kuantum || mat.Kuantum) > 0)
                .map((mat: any) => ({
                    tipe: 'Mutasi',
                    product_slug: productSlug,
                    tanggal: targetUtc.toISOString(),
                    jenis: mat.jenis || mat.Jenis || '',
                    nama_bahan: mat.namaBahan || mat.NamaBahan || '',
                    kuantum: mat.kuantum || mat.Kuantum || 0,
                    satuan: mat.satuan || mat.Satuan || 'Kg',
                    dokumen: '',
                    keterangan: `Produksi ${bsFormatted} ${bsSatuanValue} ${productLabel}`.replace(/\s+/g, ' ').trim()
                }));

            // Insert records one by one and log errors if any
            for (const record of toCreate) {
                const result = await db.from<any>('bahan_bakus').insert(record);
                if (result.error) {
                    console.error('Failed to insert Mutasi record:', result.error);
                }
            }

            mutasiRecords.push(...toCreate.map((c: any) => ({
                NamaBahan: c.nama_bahan,
                Kuantum: c.kuantum,
                Satuan: c.satuan,
                Jenis: c.jenis
            })));
        }

        // Sync to analisas table (Create or update pending sampling request)
        if (batchKodeValue) {
            try {
                const { data: existingAnalisaList } = await db.from<any>('analisas').select('*').eq('product_slug', productSlug).execute();
                const existingAnalisa = (existingAnalisaList || []).find((a: any) => a.no_bapc === batchKodeValue);

                const kuantumValue = parseFloat(bsValue || '0');

                if (!existingAnalisa) {
                    await db.from<any>('analisas').insert({
                        product_slug: productSlug,
                        bulan: targetUtc.getMonth() + 1,
                        tahun: targetUtc.getFullYear(),
                        tanggal_sampling: targetUtc.toISOString(),
                        no_bapc: batchKodeValue,
                        kuantum: kuantumValue,
                        lembaga: '',
                        hasil_analisa: 'Pending',
                        tanggal_analisa: targetUtc.toISOString()
                    });
                } else if (existingAnalisa.hasil_analisa === 'Pending') {
                    await db.from<any>('analisas').update({
                        kuantum: kuantumValue > 0 ? kuantumValue : existingAnalisa.kuantum,
                        tanggal_sampling: targetUtc.toISOString(),
                        bulan: targetUtc.getMonth() + 1,
                        tahun: targetUtc.getFullYear()
                    }).eq('id', existingAnalisa.id);
                }
            } catch (analisaErr) {
                console.error('Failed to sync with analisas table in with-materials:', analisaErr);
            }
        }

        return NextResponse.json({
            success: true,
            produksiBs: bsValue,
            mutasiCount: mutasiRecords.length,
            mutasi: mutasiRecords
        });
    } catch (error) {
        console.error('Error saving produksi with materials:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
