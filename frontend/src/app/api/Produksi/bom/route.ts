export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// GET /api/Produksi/bom?productSlug=xxx&tabId=yyy
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productSlug = searchParams.get('productSlug');
        const tabIdStr = searchParams.get('tabId');

        if (!productSlug || !tabIdStr) {
            return NextResponse.json({ message: 'Missing productSlug or tabId parameter.' }, { status: 400 });
        }

        const tabId = parseInt(tabIdStr, 10);
        if (isNaN(tabId)) {
            return NextResponse.json({ message: 'Invalid tabId parameter.' }, { status: 400 });
        }

        // Fetch all BOM items for the specified slug and tab
        const { data: bomRows, error } = await db.from<any>('bill_of_materials')
            .select('*')
            .eq('product_slug', productSlug)
            .execute();

        if (error) {
            console.error('Error fetching bill_of_materials:', error);
            return NextResponse.json({ message: 'Failed to fetch BOM.' }, { status: 500 });
        }

        const filtered = (bomRows || []).filter(
            (row: any) => row.produksi_tab_id === tabId
        );

        if (filtered.length === 0) {
            // Return default clean state
            return NextResponse.json({
                baseQuantity: 1000,
                items: [],
                variants: []
            });
        }

        const baseQuantity = Number(filtered[0].base_quantity || 1000);
        
        // Standard items (variant_name is default or null/empty)
        const defaultItems = filtered
            .filter((row: any) => row.material_id !== -1 && (!row.variant_name || row.variant_name === 'default'))
            .map((row: any) => ({
                id: row.id,
                materialId: row.material_id,
                quantity: Number(row.material_quantity || 0)
            }));

        // Variant items grouped by variant_name
        const variantMap: Record<string, any[]> = {};
        filtered.forEach((row: any) => {
            if (row.variant_name && row.variant_name !== 'default' && row.material_id !== -1) {
                if (!variantMap[row.variant_name]) variantMap[row.variant_name] = [];
                variantMap[row.variant_name].push({
                    id: row.id,
                    materialId: row.material_id,
                    quantity: Number(row.material_quantity || 0)
                });
            }
        });

        const variants = Object.keys(variantMap).map(name => ({
            name,
            items: variantMap[name]
        }));

        return NextResponse.json({
            baseQuantity,
            items: defaultItems,
            variants
        });

    } catch (error) {
        console.error('Error in GET BOM API:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/Produksi/bom
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productSlug, tabId, baseQuantity, items, variants } = body;

        if (!productSlug || tabId === undefined || baseQuantity === undefined || !Array.isArray(items)) {
            return NextResponse.json({ message: 'Invalid request payload.' }, { status: 400 });
        }

        const tabIdNum = parseInt(tabId, 10);
        const baseQtyNum = parseFloat(baseQuantity);

        if (isNaN(tabIdNum) || isNaN(baseQtyNum) || baseQtyNum <= 0) {
            return NextResponse.json({ message: 'Invalid tabId or baseQuantity.' }, { status: 400 });
        }

        // 1. Delete existing BOM items for this slug and tab
        const { data: existingRows } = await db.from<any>('bill_of_materials')
            .select('id, produksi_tab_id')
            .eq('product_slug', productSlug)
            .execute();

        const idsToDelete = (existingRows || [])
            .filter((row: any) => row.produksi_tab_id === tabIdNum)
            .map((row: any) => row.id);

        for (const id of idsToDelete) {
            await db.from<any>('bill_of_materials').delete().eq('id', id);
        }

        // 2. Insert standard BOM items
        let insertedCount = 0;
        for (const item of items) {
            const matId = parseInt(item.materialId, 10);
            const matQty = parseFloat(item.quantity) || 0;

            if (!isNaN(matId)) {
                const insertObj: any = {
                    product_slug: productSlug,
                    produksi_tab_id: tabIdNum,
                    base_quantity: baseQtyNum,
                    material_id: matId,
                    material_quantity: matQty,
                    variant_name: 'default',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                let { error: insertError } = await db.from<any>('bill_of_materials').insert(insertObj);

                // Fallback if variant_name column does not exist in schema yet
                if (insertError && (insertError as any).code === 'PGRST204') {
                    delete insertObj.variant_name;
                    const retry = await db.from<any>('bill_of_materials').insert(insertObj);
                    insertError = retry.error;
                }

                if (insertError) {
                    console.error('Error inserting standard BOM item:', insertError);
                } else {
                    insertedCount++;
                }
            }
        }

        // 3. Insert variant BOM items (if any)
        if (Array.isArray(variants)) {
            for (const v of variants) {
                if (v && v.name) {
                    let vInserted = 0;
                    if (Array.isArray(v.items)) {
                        for (const item of v.items) {
                            const matId = parseInt(item.materialId, 10);
                            const matQty = parseFloat(item.quantity) || 0;
                            if (!isNaN(matId) && matQty > 0) {
                                const vInsertObj: any = {
                                    product_slug: productSlug,
                                    produksi_tab_id: tabIdNum,
                                    base_quantity: baseQtyNum,
                                    material_id: matId,
                                    material_quantity: matQty,
                                    variant_name: v.name,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString()
                                };
                                let { error: vError } = await db.from<any>('bill_of_materials').insert(vInsertObj);
                                if (vError && (vError as any).code === 'PGRST204') {
                                    delete vInsertObj.variant_name;
                                    const vRetry = await db.from<any>('bill_of_materials').insert(vInsertObj);
                                    vError = vRetry.error;
                                }
                                if (!vError) {
                                    insertedCount++;
                                    vInserted++;
                                }
                            }
                        }
                    }
                    if (vInserted === 0) {
                        const vPlaceholderObj: any = {
                            product_slug: productSlug,
                            produksi_tab_id: tabIdNum,
                            base_quantity: baseQtyNum,
                            material_id: -1,
                            material_quantity: 0,
                            variant_name: v.name,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };
                        let { error: pError } = await db.from<any>('bill_of_materials').insert(vPlaceholderObj);
                        if (pError && (pError as any).code === 'PGRST204') {
                            delete vPlaceholderObj.variant_name;
                            await db.from<any>('bill_of_materials').insert(vPlaceholderObj);
                        }
                    }
                }
            }
        }

        // If no items were inserted, insert a dummy record to preserve base_quantity
        if (insertedCount === 0) {
            await db.from<any>('bill_of_materials').insert({
                product_slug: productSlug,
                produksi_tab_id: tabIdNum,
                base_quantity: baseQtyNum,
                material_id: -1,
                material_quantity: 0,
                variant_name: 'default',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        return NextResponse.json({ success: true, message: 'BOM configuration saved successfully.' });

    } catch (error) {
        console.error('Error in POST BOM API:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
