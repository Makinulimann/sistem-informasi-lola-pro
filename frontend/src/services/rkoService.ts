import { api } from '@/lib/api';

export interface RkoTarget {
    id?: number;
    product_slug: string;
    tab_name: string;
    tahun: number;
    bulan: number;
    target_volume: number;
    target_kemasan: number;
}

export interface RkoReportRow {
    product_slug: string;
    tab_name: string;
    tab_id: number;
    jenis_produk: string;
    kemasan: string;
    tahun: number;
    bulan: number;
    target_volume: number;
    target_kemasan: number;
    real_volume: number;
    real_kemasan: number;
}

export const rkoService = {
    getAll: async (tahun: number): Promise<RkoTarget[]> => {
        return api.get<RkoTarget[]>(`/rko-targets?tahun=${tahun}`);
    },
    getReport: async (tahun: number): Promise<RkoReportRow[]> => {
        return api.get<RkoReportRow[]>(`/rko-targets?mode=report&tahun=${tahun}`);
    },
    bulkUpsert: async (data: RkoTarget[]) => {
        return api.post<{ message: string; rowsAffected: number }>('/rko-targets', data);
    },
};
