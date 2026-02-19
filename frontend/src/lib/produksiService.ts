import { api } from './api';

export interface ProduksiTab {
    id: number;
    nama: string;
    order: number;
}

export interface ProduksiRow {
    id: number;
    tanggal: string;
    produksi: number;
    keluar: number;
    kumulatif: number;
    stokAkhir: number;
    coa: number;
    keterangan: string;
}

export interface ProduksiSummary {
    totalProduksi: number;
    totalKeluar: number;
    kumulatif: number;
    stokAkhir: number;
}

export interface ProduksiResponse {
    summary: ProduksiSummary;
    data: ProduksiRow[];
}

// ─── Tabs ───

export async function getTabs(productSlug: string): Promise<ProduksiTab[]> {
    return api.get<ProduksiTab[]>(`/api/produksi/tabs?productSlug=${encodeURIComponent(productSlug)}`);
}

export async function createTab(productSlug: string, nama: string): Promise<ProduksiTab> {
    return api.post<ProduksiTab>('/api/produksi/tabs', { productSlug, nama });
}

export async function renameTab(id: number, nama: string): Promise<ProduksiTab> {
    return api.put<ProduksiTab>(`/api/produksi/tabs/${id}`, { nama });
}

export async function deleteTab(id: number): Promise<void> {
    return api.delete<void>(`/api/produksi/tabs/${id}`);
}

// ─── Production Data ───

export async function getProduksi(
    productSlug: string,
    tabId?: number,
    bulan?: number,
    tahun?: number
): Promise<ProduksiResponse> {
    const params = new URLSearchParams({ productSlug });
    if (tabId !== undefined) params.append('tabId', String(tabId));
    if (bulan !== undefined) params.append('bulan', String(bulan));
    if (tahun !== undefined) params.append('tahun', String(tahun));
    return api.get<ProduksiResponse>(`/api/produksi?${params.toString()}`);
}
