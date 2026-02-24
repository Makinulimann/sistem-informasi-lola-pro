import { api } from './api';

export interface ProduksiTab {
    id: number;
    nama: string;
    order: number;
}

export interface ProduksiRow {
    id: number;
    tanggal: string;
    bs: number;
    ps: number;
    coa: number;
    pg: number;
    kumulatif: number;
    stokAkhir: number;
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

export interface SaveProduksiRequest {
    productSlug: string;
    tabId: number;
    tanggal: string;
    bs: number;
    ps: number;
    coa: number;
    pg: number;
    keterangan?: string;
}

// ─── Tabs ───

export async function getTabs(productSlug: string): Promise<ProduksiTab[]> {
    return api.get<ProduksiTab[]>(`/produksi/tabs?productSlug=${encodeURIComponent(productSlug)}`);
}

export async function createTab(productSlug: string, nama: string): Promise<ProduksiTab> {
    return api.post<ProduksiTab>('/produksi/tabs', { productSlug, nama });
}

export async function renameTab(id: number, nama: string): Promise<ProduksiTab> {
    return api.put<ProduksiTab>(`/produksi/tabs/${id}`, { nama });
}

export async function deleteTab(id: number): Promise<void> {
    return api.delete<void>(`/produksi/tabs/${id}`);
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
    return api.get<ProduksiResponse>(`/produksi?${params.toString()}`);
}

export async function saveProduksi(data: SaveProduksiRequest): Promise<void> {
    return api.post<void>('/produksi', data);
}

// ─── Get Mutasi for a Produksi date ───

export interface ExistingMutasi {
    namaBahan: string;
    kuantum: number;
    satuan: string;
    jenis: string;
}

export async function getMutasiForProduksi(
    productSlug: string,
    tanggal: string
): Promise<ExistingMutasi[]> {
    const params = new URLSearchParams({ productSlug, tanggal });
    return api.get<ExistingMutasi[]>(`/produksi/mutasi?${params.toString()}`);
}

// ─── Save Produksi + Materials (Combined) ───

export interface MaterialUsage {
    namaBahan: string;
    kuantum: number;
    satuan: string;
    jenis: string;
}

export interface SaveWithMaterialsRequest {
    productSlug: string;
    productFullName?: string;
    tabId: number;
    tanggal: string;
    bs: number;
    keterangan?: string;
    materials: MaterialUsage[];
}

export async function saveProduksiWithMaterials(data: SaveWithMaterialsRequest): Promise<void> {
    return api.post<void>('/produksi/with-materials', data);
}

export async function cancelProduksiWithMaterials(
    productSlug: string,
    tabId: number,
    tanggal: string
): Promise<void> {
    return api.post<void>('/produksi/cancel-with-materials', { productSlug, tabId, tanggal });
}

