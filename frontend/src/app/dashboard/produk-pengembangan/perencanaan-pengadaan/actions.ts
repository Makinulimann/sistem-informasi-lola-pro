'use server'

import { db } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface PerencanaanProduct {
  slug: string
  name: string
  satuan: string
}

export interface PerencanaanMaterial {
  masterItemId: number
  nama: string
  jenis: string
  satuan: string
  usedBySlugs: string[]
  stokExisting: number
}

function titleCase(s: string) {
  if (s === 'phonska-oca') return 'Phonska Oca Plus';
  return s.split('-')
      .map(word => word ? word[0].toUpperCase() + word.slice(1) : '')
      .join(' ');
}

export async function getPerencanaanData(month?: number, year?: number) {
  try {
    // 1. Fetch materials mapped to products
    const { data: allProductMaterials, error: pmError } = await db
      .from<any>('product_materials')
      .select('*')
      .execute();
      
    if (pmError) throw pmError;

    // 2. Fetch master items
    const { data: allMasterItems, error: miError } = await db
      .from<any>('master_items')
      .select('*')
      .execute();
      
    if (miError) throw miError;

    // 3. Fetch bahan bakus for stock calculation
    const { data: allBahanBaku, error: bbError } = await db
      .from<any>('bahan_bakus')
      .select('*')
      .execute();
      
    if (bbError) throw bbError;

    // 4. Fetch saved configs from DB safely
    const { data: rawConfigs, error: configsError } = await db
      .from<any>('perencanaan_material_configs')
      .select('*')
      .execute()
      .catch((e: any) => ({ data: [], error: e })); // fallback safely if table missing
      
    const savedConfigs: Record<number, any> = {};
    if (!configsError && rawConfigs) {
       rawConfigs.forEach((c: any) => {
          const mId = parseInt(c.master_item_id, 10);
          if (!isNaN(mId)) {
             savedConfigs[mId] = {
                stokExisting: c.stok_existing,
                satuan: c.satuan,
                customDeps: typeof c.custom_deps === 'string' ? JSON.parse(c.custom_deps) : c.custom_deps || {}
             };
          }
       });
    }

    // 5. Fetch saved targets for Rencana Produksi
    const { data: rawTargets, error: targetsError } = await db
      .from<any>('perencanaan_produksi_targets')
      .select('*')
      .execute()
      .catch((e: any) => ({ data: [], error: e }));

    const savedTargets: Record<string, Record<string, number>> = {};
    if (!targetsError && rawTargets) {
       rawTargets.forEach((t: any) => {
          if (!savedTargets[t.product_slug]) savedTargets[t.product_slug] = {};
          savedTargets[t.product_slug][t.period_key] = parseFloat(t.target_value) || 0;
       });
    }

    // Process lists
    const uniqueSlugs = new Set<string>();
    const materialMap = new Map<number, PerencanaanMaterial>();
    const masterItemsMap = new Map();
    
    (allMasterItems || []).forEach((m: any) => masterItemsMap.set(m.id || m.Id, m));

    const EXPLICIT_PRODUCTS = [
      { slug: 'bio-fertil-padat', name: 'Bio Fertil Padat', satuan: 'KG' },
      { slug: 'petro-fish-cair', name: 'Petro Fish Cair', satuan: 'KG' },
      { slug: 'phonska-oca-plus-cair', name: 'Phonska Oca Plus Cair', satuan: 'KG' },
      { slug: 'petro-gladiator-padat', name: 'Petro Gladiator Padat', satuan: 'KG' },
      { slug: 'petro-gladiator-cair', name: 'Petro Gladiator Cair', satuan: 'KG' }
    ];

    (allProductMaterials || []).forEach((pm: any) => {
      let slug = pm.product_slug || pm.ProductSlug;
      
      // Map legacy slugs to the required specific 5 slugs to prevent breaks
      if (slug === 'bio-fertil') slug = 'bio-fertil-padat';
      else if (slug === 'petro-fish') slug = 'petro-fish-cair';
      else if (slug === 'phonska-oca') slug = 'phonska-oca-plus-cair';
      else if (slug === 'petro-gladiator') slug = 'petro-gladiator-padat';

      const masterItemId = pm.master_item_id || pm.MasterItemId;
      const jenis = pm.jenis || pm.Jenis;
      
      if (!slug || !masterItemId) return;
      
      uniqueSlugs.add(slug);

      const masterItem = masterItemsMap.get(masterItemId);
      if (!masterItem) return;

      const name = masterItem.nama || masterItem.Nama || '';
      const satuan = masterItem.satuan_default || masterItem.SatuanDefault || 'Kg';

      if (!materialMap.has(masterItemId)) {
        const dateLimit = month && year ? new Date(year, month - 1, 1) : new Date();

        const records = (allBahanBaku || []).filter((r: any) => {
          const rNama = r.nama_bahan || r.NamaBahan;
          if (!(rNama && rNama.toLowerCase() === name.toLowerCase())) return false;
          
          if (month && year) {
             const rTanggal = r.tanggal || r.Tanggal;
             if (rTanggal && new Date(rTanggal) >= dateLimit) return false;
          }
          return true;
        });

        const totalIn = records
          .filter((r: any) => (r.tipe || r.Tipe) === 'Suplai')
          .reduce((sum: number, r: any) => sum + (r.kuantum || r.Kuantum || 0), 0); // basic summing, can add unit conversion later if needed
          
        const totalOut = records
          .filter((r: any) => (r.tipe || r.Tipe) === 'Mutasi')
          .reduce((sum: number, r: any) => sum + (r.kuantum || r.Kuantum || 0), 0);
          
        const stokExisting = totalIn - totalOut;

        materialMap.set(masterItemId, {
          masterItemId,
          nama: name,
          jenis,
          satuan,
          usedBySlugs: [slug],
          stokExisting
        });
      } else {
        const mat = materialMap.get(masterItemId)!;
        if (!mat.usedBySlugs.includes(slug)) {
          mat.usedBySlugs.push(slug);
        }
      }
    });

    const products: PerencanaanProduct[] = EXPLICIT_PRODUCTS;

    const materials: PerencanaanMaterial[] = Array.from(materialMap.values());

    return {
      success: true,
      products,
      materials,
      savedConfigs,
      savedTargets
    };

  } catch (error: any) {
    console.error('Error fetching data:', error);
    return { success: false, error: error.message };
  }
}

export async function saveMaterialConfig(masterItemId: number, stokExisting: number, satuan: string, customDeps: any) {
  try {
     const payload = {
        master_item_id: masterItemId,
        stok_existing: stokExisting,
        satuan,
        custom_deps: customDeps,
        updated_at: new Date().toISOString()
     };

     const { data: existing } = await db 
       .from<any>('perencanaan_material_configs')
       .select('*')
       .eq('master_item_id', masterItemId)
       .single();

     if (existing) {
        const { error } = await db
          .from<any>('perencanaan_material_configs')
          .update(payload)
          .eq('master_item_id', masterItemId);
        if (error) throw error;
     } else {
        const { error } = await db
          .from<any>('perencanaan_material_configs')
          .insert(payload);
        if (error) throw error;
     }
     
     revalidatePath('/dashboard/produk-pengembangan/perencanaan-pengadaan');
     
     return { success: true };
  } catch (error: any) {
     console.error('Error saving config to DB:', error);
     return { success: false, error: error.message };
  }
}

export async function saveProduksiTargets(targets: Record<string, Record<string, number>>) {
  try {
     for (const [productSlug, periodMap] of Object.entries(targets)) {
        const { data: allForSlug } = await db
           .from<any>('perencanaan_produksi_targets')
           .select('*')
           .eq('product_slug', productSlug)
           .execute()
           .catch(() => ({ data: [] }));

        for (const [periodKey, targetValue] of Object.entries(periodMap)) {
           const existing = (allForSlug || []).find((r: any) => r.period_key === periodKey);
           
           const payload = {
              product_slug: productSlug,
              period_key: periodKey,
              target_value: targetValue,
              updated_at: new Date().toISOString()
           };

           if (existing && existing.id) {
              const { error } = await db
                .from<any>('perencanaan_produksi_targets')
                .update(payload)
                .eq('id', existing.id);
              if (error) throw error;
           } else {
              const { error } = await db
                .from<any>('perencanaan_produksi_targets')
                .insert(payload);
              if (error) throw error;
           }
        }
     }
     
     revalidatePath('/dashboard/produk-pengembangan/perencanaan-pengadaan');
     return { success: true };
  } catch (error: any) {
     console.error('Error saving targets to DB:', error);
     return { success: false, error: error.message };
  }
}
