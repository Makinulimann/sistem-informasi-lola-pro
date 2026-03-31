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
        const ketValue = body.keterangan || body.Keterangan || '';
        const materialsArray = body.materials || body.Materials;
        const batchKodeValue = body.batchKode || body.BatchKode || '';

        if (!productSlug || tabId === undefined) {
            return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
        }

        const localDate = new Date(tanggalValid);
        if (isNaN(localDate.getTime())) {
            return NextResponse.json({ message: 'Invalid date format.' }, { status: 400 });
        }

        const utcOffset = 7 * 60 * 60 * 1000;
        const targetUtc = new Date(localDate.getTime() - utcOffset);

        // 1. Upsert Produksi
        const { data: records } = await db.from<any>('produksis').select('*').eq('product_slug', productSlug).execute();
        const existing = (records || []).find((r: any) => 
            r.produksi_tab_id === tabId && new Date(r.tanggal).getTime() === targetUtc.getTime()
        );

        if (existing) {
            await db.from<any>('produksis').update({
                bs: bsValue,
                batch_kode: batchKodeValue,
                keterangan: ketValue,
                updated_at: new Date().toISOString()
            }).eq('id', existing.id);
        } else {
            await db.from<any>('produksis').insert({
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
        }

        // 2. Delete existing Mutasi
        const { data: relatedBahanBaku } = await db.from<any>('bahan_bakus').select('*').eq('product_slug', productSlug).execute();

        const toDeleteIds = (relatedBahanBaku || [])
            .filter((b: any) => {
                const ket = b.keterangan || b.Keterangan;
                return ket && ket.toLowerCase().startsWith('produksi ');
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
                    keterangan: `produksi ${productLabel} sejumlah ${bsFormatted}`
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
