import { api } from './api';

export interface AnalisaRow {
    id: number;
    productSlug: string;
    bulan: number;
    tahun: number;
    tanggalSampling: string;
    noBAPC: string;
    kuantum: number;
    lembaga: string;
    hasilAnalisa: string;
    tanggalAnalisa: string | null;
}

export interface SaveAnalisaRequest {
    productSlug: string;
    tanggalSampling: string;
    noBAPC: string;
    kuantum: number;
    lembaga: string;
    hasilAnalisa: string;
    tanggalAnalisa?: string | null;
}

export interface UpdateAnalisaRequest {
    id: number;
    tanggalSampling?: string;
    noBAPC?: string;
    kuantum?: number;
    lembaga?: string;
    hasilAnalisa?: string;
    tanggalAnalisa?: string | null;
}

// ─── Fetch Analisa Data ───
export async function getAnalisa(
    productSlug: string,
    bulan?: number,
    tahun?: number
): Promise<{ data: AnalisaRow[] }> {
    const params = new URLSearchParams({ productSlug });
    if (bulan !== undefined) params.append('bulan', String(bulan));
    if (tahun !== undefined) params.append('tahun', String(tahun));
    return api.get<{ data: AnalisaRow[] }>(`/Analisa?${params.toString()}`);
}

// ─── Save / Create Analisa ───
export async function createAnalisa(data: SaveAnalisaRequest): Promise<{ success: boolean; data: { id: number } }> {
    return api.post<{ success: boolean; data: { id: number } }>('/Analisa', data);
}

// ─── Update Analisa ───
export async function updateAnalisa(data: UpdateAnalisaRequest): Promise<{ success: boolean; data: { id: number } }> {
    const { id, ...updatePayload } = data;
    return api.put<{ success: boolean; data: { id: number } }>(`/Analisa/${id}`, updatePayload);
}

// ─── Delete Analisa ───
export async function deleteAnalisa(id: number): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/Analisa/${id}`);
}
