import { api } from './api';

export interface Maintenance {
    id: number;
    product_slug?: string;
    kode: string;
    nama: string;
    prioritas: 'Normal' | 'Urgent';
    status: 'In Progress' | 'Open' | 'Rejected' | 'Resolved';
    keperluan: string | null;
    deskripsi: string;
    tanggal_dibutuhkan: string;
    dokumentasi?: string | null;
    created_at?: string;
    updated_at?: string;
    // Legacy support (optional)
    tanggal?: string;
    equipment?: string;
    keterangan?: string | null;
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

export interface MaintenanceResponse {
    data: Maintenance[];
    total: number;
}

export const maintenanceService = {
    getAll: (params: { bulan?: string; tahun?: string; search?: string; page?: number; limit?: number; sortBy?: string; sortDesc?: boolean }) => {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return api.get<MaintenanceResponse>(`/Maintenance?${query}`);
    },
    getById: (id: number) => api.get<Maintenance>(`/Maintenance/${id}`),
    create: (data: Omit<Maintenance, 'id' | 'created_at' | 'updated_at'>) =>
        api.post<Maintenance>('/Maintenance', data),
    update: (id: number, data: Omit<Maintenance, 'id' | 'created_at' | 'updated_at'>) =>
        api.put<Maintenance>(`/Maintenance/${id}`, data),
    delete: (id: number) => api.delete(`/Maintenance/${id}`),
};

export interface MaintenanceSummary {
    bulan: number;
    tahun: number;
    totalKegiatan: number;
    areas: string[];
    equipments: string[];
    byArea: { area: string; count: number }[];
    byEquipment: { equipment: string; count: number }[];
    byDay: { date: string; count: number }[];
}

export function getMaintenanceSummary(
    bulan?: number,
    tahun?: number,
    area?: string,
    equipment?: string
): Promise<MaintenanceSummary> {
    const params = new URLSearchParams();
    if (bulan) params.set('bulan', String(bulan));
    if (tahun) params.set('tahun', String(tahun));
    if (area) params.set('area', area);
    if (equipment) params.set('equipment', equipment);
    return api.get<MaintenanceSummary>(`/Maintenance/summary?${params.toString()}`);
}
