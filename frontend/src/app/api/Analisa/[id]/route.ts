export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
        }

        const body = await request.json();

        const updateData: any = {};
        if (body.tanggalSampling) {
            const date = new Date(body.tanggalSampling);
            updateData.tanggal_sampling = date.toISOString();
            updateData.bulan = date.getMonth() + 1;
            updateData.tahun = date.getFullYear();
        }
        if (body.noBAPC) updateData.no_bapc = body.noBAPC;
        if (body.kuantum !== undefined) updateData.kuantum = parseFloat(body.kuantum);
        if (body.lembaga) updateData.lembaga = body.lembaga;
        if (body.hasilAnalisa) updateData.hasil_analisa = body.hasilAnalisa;
        if (body.tanggalAnalisa !== undefined) {
            updateData.tanggal_analisa = body.tanggalAnalisa ? new Date(body.tanggalAnalisa).toISOString() : null;
        }
        if (body.dokumen !== undefined) updateData.lembaga = body.dokumen;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedAnalisa, error } = await db.from<any>('analisas').update(updateData).eq('id', id);

        if (error) {
            console.error('Error updating analisa:', error);
            return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
        }

        // Sync with produksis table if hasil_analisa was modified
        if (body.hasilAnalisa) {
            try {
                const { data: currentAnalisa } = await db.from<any>('analisas').select('*').eq('id', id).single();
                if (currentAnalisa) {
                    const { data: produksisList } = await db.from<any>('produksis').select('*').eq('product_slug', currentAnalisa.product_slug).execute();
                    const targetProduksi = (produksisList || []).find((p: any) => p.ps_batch_kode === currentAnalisa.no_bapc);

                    if (targetProduksi) {
                        if (body.hasilAnalisa === 'Lolos') {
                            await db.from<any>('produksis').update({
                                coa: targetProduksi.ps,
                                coa_batch_kode: currentAnalisa.no_bapc
                            }).eq('id', targetProduksi.id);
                        } else {
                            await db.from<any>('produksis').update({
                                coa: 0,
                                coa_batch_kode: ''
                            }).eq('id', targetProduksi.id);
                        }
                    }
                }
            } catch (syncError) {
                console.error('Error syncing analisa verification to produksis:', syncError);
            }
        }

        return NextResponse.json({ success: true, data: { id: updatedAnalisa?.Id } });
    } catch (error) {
        console.error('Error updating analisa:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
        }

        const { error } = await db.from<any>('analisas').delete().eq('id', id);

        if (error) {
            console.error('Error deleting analisa:', error);
            return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting analisa:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
