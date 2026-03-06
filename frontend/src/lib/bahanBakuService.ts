import { api } from './api';

export interface Perusahaan {
    id: number;
    nama: string;
    isActive: boolean;
}

export interface BahanBaku {
    id: number;
    tipe: 'Suplai' | 'Mutasi';
    productSlug: string;
    perusahaanId?: number;
    perusahaan?: Perusahaan;
    tanggal: string;
    jenis: string;
    namaBahan: string;
    kuantum: number;
    satuan?: string;
    dokumen: string;
    keterangan: string;
}

export interface Material {
    id: number;
    productSlug: string;
    nama: string;
    order: number;
    isActive: boolean;
}

export interface BalanceStokDetail {
    materialId: number;
    materialNama: string;
    out: number;
    in: number;
    stokAkhir: number;
}

export interface BalanceStok {
    id: number;
    tanggal: string;
    produksi: number;
    details: BalanceStokDetail[];
}

export interface BalanceStokRow {
    nama: string;
    jenis: string;
    satuan: string;
    totalIn: number;
    totalOut: number;
    stok: number;
}

// Helper to clean params
const cleanParams = (params: any) => {
    const cleaned: any = {};
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            cleaned[key] = params[key];
        }
    });
    return cleaned;
};

export const bahanBakuService = {
    // Perusahaan
    getPerusahaan: () => api.get<Perusahaan[]>('/bahanbaku/perusahaan'),
    createPerusahaan: (nama: string) => api.post<Perusahaan>('/bahanbaku/perusahaan', { nama }),

    // Suplai
    getSuplai: (params: { productSlug: string; perusahaanId?: number; bulan?: string; tahun?: string }) => {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return api.get<BahanBaku[]>(`/bahanbaku/suplai?${query}`);
    },
    createSuplai: (data: Omit<BahanBaku, 'id' | 'tipe' | 'perusahaan'>) =>
        api.post<BahanBaku>('/bahanbaku/suplai', data),
    updateSuplai: (id: number, data: Omit<BahanBaku, 'id' | 'tipe' | 'perusahaan'>) =>
        api.put<BahanBaku>(`/bahanbaku/${id}`, data),
    deleteSuplai: (id: number) => api.delete(`/bahanbaku/${id}`),

    // Mutasi
    getMutasi: (params: { productSlug: string; perusahaanId?: number; bulan?: string; tahun?: string }) => {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return api.get<BahanBaku[]>(`/bahanbaku/mutasi?${query}`);
    },
    createMutasi: (data: Omit<BahanBaku, 'id' | 'tipe' | 'perusahaan'>) =>
        api.post<BahanBaku>('/bahanbaku/mutasi', data),
    updateMutasi: (id: number, data: Omit<BahanBaku, 'id' | 'tipe' | 'perusahaan'>) =>
        api.put<BahanBaku>(`/bahanbaku/${id}`, data),
    deleteMutasi: (id: number) => api.delete(`/bahanbaku/${id}`),

    // Materials
    getMaterials: (productSlug: string) =>
        api.get<Material[]>(`/bahanbaku/materials?productSlug=${productSlug}`),
    createMaterial: (productSlug: string, nama: string) =>
        api.post<Material>('/bahanbaku/materials', { productSlug, nama }),
    updateMaterial: (id: number, nama: string) =>
        api.put<Material>(`/bahanbaku/materials/${id}`, { nama }),
    deleteMaterial: (id: number) =>
        api.delete(`/bahanbaku/materials/${id}`),

    // Balance Stok (computed from Suplai/Mutasi)
    getBalanceStok: (params: { productSlug: string; bulan?: string; tahun?: string }) => {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return api.get<BalanceStokRow[]>(`/bahanbaku/balance-stok?${query}`);
    },

    // History (drill-down for specific material)
    getHistory: (params: { productSlug: string; namaBahan: string; tipe: string; bulan?: string; tahun?: string }) => {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return api.get<BahanBaku[]>(`/bahanbaku/history?${query}`);
    },

    // Balance Stok (legacy)
    getBalance: (params: { productSlug: string; perusahaanId?: number; bulan?: string; tahun?: string }) => {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return api.get<BalanceStok[]>(`/bahanbaku/balance?${query}`);
    }
};
