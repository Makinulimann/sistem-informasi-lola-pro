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
    batchKode: string;
    psBatchKode?: string;
    coaBatchKode?: string;
}

export interface ProduksiSummary {
    totalProduksi: number;
    totalKeluar: number;
    totalPs: number;
    totalCoa: number;
    totalBelumSampling: number;
    kumulatif: number;
    stokAkhir: number;
    initialBs?: number;
}

export interface AvailableBatch {
    kode: string;
    variantName?: string;
    label?: string;
    bsWip: number;
    psWip: number;
    coaWip: number;
}

export interface ProduksiResponse {
    summary: ProduksiSummary;
    data: ProduksiRow[];
    availableBatches?: AvailableBatch[];
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
    batchKode?: string;
}

// ─── Tabs ───

export async function getTabs(productSlug: string): Promise<ProduksiTab[]> {
    return api.get<ProduksiTab[]>(`/Produksi/tabs?productSlug=${encodeURIComponent(productSlug)}`);
}

export async function createTab(productSlug: string, nama: string): Promise<ProduksiTab> {
    return api.post<ProduksiTab>('/Produksi/tabs', { productSlug, nama });
}

export async function renameTab(id: number, nama: string): Promise<ProduksiTab> {
    return api.put<ProduksiTab>(`/Produksi/tabs/${id}`, { nama });
}

export async function deleteTab(id: number): Promise<void> {
    return api.delete<void>(`/Produksi/tabs/${id}`);
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
    return api.get<ProduksiResponse>(`/Produksi?${params.toString()}`);
}

export async function saveProduksi(data: SaveProduksiRequest): Promise<void> {
    return api.post<void>('/Produksi', data);
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
    return api.get<ExistingMutasi[]>(`/Produksi/mutasi?${params.toString()}`);
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
    bsSatuan?: string;
    keterangan?: string;
    batchKode?: string;
    variantName?: string;
    materials: MaterialUsage[];
}

export async function saveProduksiWithMaterials(data: SaveWithMaterialsRequest): Promise<void> {
    return api.post<void>('/Produksi/with-materials', data);
}

export async function cancelProduksiWithMaterials(
    productSlug: string,
    tabId: number,
    tanggal: string,
    fieldsToDelete?: string[],
    productFullName?: string
): Promise<void> {
    return api.post<void>('/Produksi/cancel-with-materials', { productSlug, tabId, tanggal, fieldsToDelete, productFullName });
}

// ─── Update Sampling (PS) ───

export interface UpdateSamplingRequest {
    productSlug: string;
    tabId: number;
    tanggal: string;
    batchKode: string;
    variantName?: string;
    ps: number;
}

export async function updateSampling(data: UpdateSamplingRequest): Promise<void> {
    return api.post<void>('/Produksi/update-sampling', data);
}

// ─── Update COA ───

export interface UpdateCOARequest {
    productSlug: string;
    tabId: number;
    tanggal: string;
    batchKode: string;
    variantName?: string;
    coa: number;
}

export async function updateCOA(data: UpdateCOARequest): Promise<void> {
    return api.post<void>('/Produksi/update-coa', data);
}

// ─── BOM Configuration ───

export interface BOMItem {
    id?: number;
    materialId: number;
    quantity: number;
}

export interface BOMVariant {
    name: string;
    items: BOMItem[];
}

export interface BOMConfig {
    baseQuantity: number;
    items: BOMItem[];
    variants?: BOMVariant[];
}

export async function getBOM(productSlug: string, tabId: number): Promise<BOMConfig> {
    return api.get<BOMConfig>(`/Produksi/bom?productSlug=${encodeURIComponent(productSlug)}&tabId=${tabId}`);
}

export async function saveBOM(data: {
    productSlug: string;
    tabId: number;
    baseQuantity: number;
    items: BOMItem[];
    variants?: BOMVariant[];
}): Promise<{ success: boolean; message: string }> {
    return api.post<{ success: boolean; message: string }>('/Produksi/bom', data);
}


