import { api } from './api';

export interface AktivitasHarian {
    id: number;
    tanggal: string;
    pic: string;
    lokasi: string;
    deskripsi: string;
    dokumentasi?: string | null;
    createdAt: string;
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
    getAll: (params: { bulan?: string; tahun?: string; search?: string; page?: number; limit?: number; sortBy?: string; sortDesc?: boolean }) => {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return api.get<AktivitasHarianResponse>(`/aktivitasharian?${query}`);
    },
    getById: (id: number) => api.get<AktivitasHarian>(`/aktivitasharian/${id}`),
    create: (data: Omit<AktivitasHarian, 'id' | 'createdAt'>) =>
        api.post<AktivitasHarian>('/aktivitasharian', data),
    update: (id: number, data: Omit<AktivitasHarian, 'id' | 'createdAt'>) =>
        api.put<AktivitasHarian>(`/aktivitasharian/${id}`, data),
    delete: (id: number) => api.delete(`/aktivitasharian/${id}`),

    // PIC Templates
    getPics: () => api.get<LogbookPic[]>('/aktivitasharian/pic'),
    createPic: (nama: string) => api.post<LogbookPic>('/aktivitasharian/pic', { nama }),
    updatePic: (id: number, nama: string) => api.put<LogbookPic>(`/aktivitasharian/pic/${id}`, { nama }),
    deletePic: (id: number) => api.delete(`/aktivitasharian/pic/${id}`),

    // Lokasi Templates
    getLokasis: () => api.get<LogbookLokasi[]>('/aktivitasharian/lokasi'),
    createLokasi: (nama: string) => api.post<LogbookLokasi>('/aktivitasharian/lokasi', { nama }),
    updateLokasi: (id: number, nama: string) => api.put<LogbookLokasi>(`/aktivitasharian/lokasi/${id}`, { nama }),
    deleteLokasi: (id: number) => api.delete(`/aktivitasharian/lokasi/${id}`),
};
