import { api } from './api';

export interface AktivitasHarian {
    id: number;
    tanggal: string;
    pic?: string | null;
    lokasi?: string | null;
    deskripsi: string;
    dokumentasi?: string | null;
    createdAt: string;
    jenis_produk?: string | null;
}

export interface LogbookPic {
    id: number;
    nama: string;
    isActive: boolean;
}

export interface LogbookLokasi {
    id: number;
    nama: string;
    isActive: boolean;
}

const cleanParams = (params: any) => {
    const cleaned: any = {};
    Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            cleaned[key] = params[key];
        }
    });
    return cleaned;
};

export interface AktivitasHarianResponse {
    data: AktivitasHarian[];
    total: number;
}

export const aktivitasHarianService = {
    // Aktivitas Harian
    getAll: (params: { bulan?: string; tahun?: string; search?: string; jenisProduk?: string; page?: number; limit?: number; sortBy?: string; sortDesc?: boolean }) => {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return api.get<AktivitasHarianResponse>(`/AktivitasHarian?${query}`);
    },
    getById: (id: number) => api.get<AktivitasHarian>(`/AktivitasHarian/${id}`),
    create: (data: Omit<AktivitasHarian, 'id' | 'createdAt'>) =>
        api.post<AktivitasHarian>('/AktivitasHarian', data),
    update: (id: number, data: Omit<AktivitasHarian, 'id' | 'createdAt'>) =>
        api.put<AktivitasHarian>(`/AktivitasHarian/${id}`, data),
    delete: (id: number) => api.delete(`/AktivitasHarian/${id}`),
    createBulk: (data: { items: Omit<AktivitasHarian, 'id' | 'createdAt'>[] }) => 
        api.post<AktivitasHarian[]>('/AktivitasHarian/bulk', data),

    // PIC Templates
    getPics: () => api.get<LogbookPic[]>('/AktivitasHarian/pic'),
    createPic: (nama: string) => api.post<LogbookPic>('/AktivitasHarian/pic', { nama }),
    updatePic: (id: number, nama: string) => api.put<LogbookPic>(`/AktivitasHarian/pic/${id}`, { nama }),
    deletePic: (id: number) => api.delete(`/AktivitasHarian/pic/${id}`),

    // Lokasi Templates
    getLokasis: () => api.get<LogbookLokasi[]>('/AktivitasHarian/lokasi'),
    createLokasi: (nama: string) => api.post<LogbookLokasi>('/AktivitasHarian/lokasi', { nama }),
    updateLokasi: (id: number, nama: string) => api.put<LogbookLokasi>(`/AktivitasHarian/lokasi/${id}`, { nama }),
    deleteLokasi: (id: number) => api.delete(`/AktivitasHarian/lokasi/${id}`),
};
