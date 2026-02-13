import { api } from './api';

export interface MasterItem {
    id: number;
    nama: string;
    kode?: string;
    satuanDefault?: string;
    scopeProductSlug?: string | null;
    isActive: boolean;
}

export interface ProductMaterial {
    id: number;
    masterItemId: number;
    nama: string;
    jenis: 'Baku' | 'Penolong';
    satuan?: string;
}

export const masterItemService = {
    // Master Items
    searchMasterItems: async (search?: string, scopeProductSlug?: string): Promise<MasterItem[]> => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (scopeProductSlug) params.append('scopeProductSlug', scopeProductSlug);

        const res = await api.get<MasterItem[]>(`/ProductMaterial/master-items?${params.toString()}`);
        return res;
    },

    createMasterItem: async (nama: string, satuanDefault?: string, scopeProductSlug?: string | null): Promise<MasterItem> => {
        const payload = {
            nama,
            satuanDefault: satuanDefault || null,
            scopeProductSlug: scopeProductSlug || null
        };
        const res = await api.post<MasterItem>('/ProductMaterial/master-items', payload);
        return res;
    },

    // Product Configuration
    getProductMaterials: async (productSlug: string, jenis?: 'Baku' | 'Penolong'): Promise<ProductMaterial[]> => {
        const query = jenis ? `?jenis=${encodeURIComponent(jenis)}` : '';
        const res = await api.get<ProductMaterial[]>(`/ProductMaterial/${productSlug}${query}`);
        return res;
    },

    assignMaterial: async (productSlug: string, masterItemId: number, jenis: 'Baku' | 'Penolong'): Promise<ProductMaterial> => {
        const res = await api.post<ProductMaterial>('/ProductMaterial', { productSlug, masterItemId, jenis });
        return res;
    },

    unassignMaterial: async (id: number): Promise<void> => {
        await api.delete(`/ProductMaterial/${id}`);
    },

    deleteMasterItem: async (id: number): Promise<void> => {
        await api.delete(`/ProductMaterial/master-items/${id}`);
    },

    resetData: async (): Promise<void> => {
        await api.delete('/ProductMaterial/reset');
    }
};
