export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

async function getAuthUser(request: Request) {
    let token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token && 'cookies' in request) {
        token = (request as any).cookies?.get?.('sippro_token')?.value;
    }
    if (!token) return null;
    return await verifyToken(token);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser(request);
        if (user) {
            const role = String((user as any).role || '').toLowerCase().trim();
            if (role !== 'admin' && role !== 'riset') {
                return NextResponse.json({ message: 'Hanya Admin dan Riset yang dapat memperbarui data analisa.' }, { status: 403 });
            }
        }
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
        if (body.dokumen !== undefined) updateData.dokumen = body.dokumen;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedAnalisa, error } = await db.from<any>('analisas').update(updateData).eq('id', id);

        if (error) {
            console.error('Error updating analisa:', error);
            return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
        }

        // Sync with produksis table if hasil_analisa or tanggalAnalisa was modified
        if (body.hasilAnalisa !== undefined || body.tanggalAnalisa !== undefined) {
            try {
                const { data: currentAnalisa } = await db.from<any>('analisas').select('*').eq('id', id).single();
                if (currentAnalisa) {
                    const { data: produksisList } = await db.from<any>('produksis').select('*').eq('product_slug', currentAnalisa.product_slug).execute();

                    // Clear any existing COA entry for this batch_kode across all rows of this product
                    for (const p of (produksisList || [])) {
                        if (p.coa_batch_kode === currentAnalisa.no_bapc) {
                            await db.from<any>('produksis').update({ coa: 0, coa_batch_kode: '' }).eq('id', p.id);
                        }
                    }

                    const targetHasil = body.hasilAnalisa || currentAnalisa.hasil_analisa;
                    if (targetHasil === 'Lolos') {
                        const targetProduksi = (produksisList || []).find((p: any) => p.ps_batch_kode === currentAnalisa.no_bapc || p.batch_kode === currentAnalisa.no_bapc);
                        const targetDateStr = body.tanggalAnalisa || currentAnalisa.tanggal_analisa || currentAnalisa.tanggal_sampling;
                        const localDate = new Date(targetDateStr);
                        const utcOffset = 7 * 60 * 60 * 1000;
                        const targetUtcDate = new Date(localDate.getTime() - utcOffset);

                        const tabId = targetProduksi?.produksi_tab_id || 1;
                        const coaAmount = currentAnalisa.kuantum || targetProduksi?.ps || 0;

                        const existingRecordOnDate = (produksisList || []).find((p: any) => {
                            const pDate = new Date(p.tanggal);
                            return p.produksi_tab_id === tabId && pDate.getTime() === targetUtcDate.getTime();
                        });

                        if (existingRecordOnDate) {
                            await db.from<any>('produksis').update({
                                coa: coaAmount,
                                coa_batch_kode: currentAnalisa.no_bapc
                            }).eq('id', existingRecordOnDate.id);
                        } else {
                            await db.from<any>('produksis').insert({
                                product_slug: currentAnalisa.product_slug,
                                produksi_tab_id: tabId,
                                tanggal: targetUtcDate.toISOString(),
                                bs: 0,
                                ps: 0,
                                coa: coaAmount,
                                pg: 0,
                                kumulatif: 0,
                                stok_akhir: 0,
                                batch_kode: '',
                                ps_batch_kode: '',
                                coa_batch_kode: currentAnalisa.no_bapc,
                                keterangan: ''
                            });
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
        const user = await getAuthUser(request);
        if (user) {
            const role = String((user as any).role || '').toLowerCase().trim();
            if (role !== 'admin' && role !== 'riset') {
                return NextResponse.json({ message: 'Hanya Admin dan Riset yang dapat menghapus data analisa.' }, { status: 403 });
            }
        }
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
