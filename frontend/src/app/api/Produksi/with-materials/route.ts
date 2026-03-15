export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
        const existing = await prisma.produksis.findFirst({
            where: {
                ProduksiTabId: tabId,
                Tanggal: targetUtc
            }
        });

        let limitBS = body.BS;

        if (existing) {
            await prisma.produksis.update({
                where: { Id: existing.Id },
                data: {
                    BS: bsValue,
                    Keterangan: ketValue,
                    BatchKode: batchKodeValue
                }
            });
        } else {
            await prisma.produksis.create({
                data: {
                    ProductSlug: productSlug,
                    ProduksiTabId: tabId,
                    Tanggal: targetUtc,
                    BS: bsValue,
                    PS: 0,
                    COA: 0,
                    PG: 0,
                    Keterangan: ketValue,
                    BatchKode: batchKodeValue,
                    Kumulatif: 0,
                    StokAkhir: 0
                }
            });
        }

        // 2. Delete existing Mutasi
        // Prisma deleteMany on multi-condition LIKE
        const produksisKeteranganLike = await prisma.bahanBakus.findMany({
            where: {
                ProductSlug: productSlug,
                Tipe: 'Mutasi',
                Tanggal: targetUtc,
            }
        });

        const toDeleteIds = produksisKeteranganLike
            .filter(b => b.Keterangan?.toLowerCase().startsWith('produksi '))
            .map(b => b.Id);

        if (toDeleteIds.length > 0) {
            await prisma.bahanBakus.deleteMany({
                where: { Id: { in: toDeleteIds } }
            });
        }

        // 3. Create new Mutasi
        const mutasiRecords = [];
        if (materialsArray && Array.isArray(materialsArray)) {
            const productLabel = body.productFullName || body.ProductFullName || productSlug;
            const bsFormatted = bsValue.toString();

            const toCreate = materialsArray
                .filter((mat: any) => (mat.kuantum || mat.Kuantum) > 0)
                .map((mat: any) => ({
                    Tipe: 'Mutasi',
                    ProductSlug: productSlug,
                    Tanggal: targetUtc,
                    Jenis: mat.jenis || mat.Jenis,
                    NamaBahan: mat.namaBahan || mat.NamaBahan,
                    Kuantum: mat.kuantum || mat.Kuantum,
                    Satuan: mat.satuan || mat.Satuan || 'Kg',
                    Dokumen: '',
                    Keterangan: `produksi ${productLabel} sejumlah ${bsFormatted}`
                }));

            if (toCreate.length > 0) {
                await prisma.bahanBakus.createMany({ data: toCreate });

                // Populate response shape
                mutasiRecords.push(...toCreate.map((c: any) => ({
                    NamaBahan: c.NamaBahan,
                    Kuantum: c.Kuantum,
                    Satuan: c.Satuan,
                    Jenis: c.Jenis
                })));
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
