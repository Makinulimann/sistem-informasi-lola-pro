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

    // Mutasi
    getMutasi: (params: { productSlug: string; perusahaanId?: number; bulan?: string; tahun?: string }) => {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return api.get<BahanBaku[]>(`/bahanbaku/mutasi?${query}`);
    },
    createMutasi: (data: Omit<BahanBaku, 'id' | 'tipe' | 'perusahaan'>) =>
        api.post<BahanBaku>('/bahanbaku/mutasi', data),

    // Materials
    getMaterials: (productSlug: string) =>
        api.get<Material[]>(`/bahanbaku/materials?productSlug=${productSlug}`),
    createMaterial: (productSlug: string, nama: string) =>
        api.post<Material>('/bahanbaku/materials', { productSlug, nama }),
    updateMaterial: (id: number, nama: string) =>
        api.put<Material>(`/bahanbaku/materials/${id}`, { nama }),
    deleteMaterial: (id: number) =>
        api.delete(`/bahanbaku/materials/${id}`),

    // Balance Stok
    getBalance: (params: { productSlug: string; perusahaanId?: number; bulan?: string; tahun?: string }) => {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return api.get<BalanceStok[]>(`/bahanbaku/balance?${query}`);
    }
};
