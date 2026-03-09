import { api } from './api';

// ─── Types ───

export interface MaterialSummary {
    nama: string;
    jenis: string;
    satuan: string;
    suplai: number;
    mutasi: number;
    stok: number;
}

export interface TabSummary {
    tabName: string;
    totalProduksi: number;
    belumSampling: number;
    prosesSampling: number;
    pengirimanGudang: number;
    coa: number;
}

export interface ProductionSummary {
    tabs: TabSummary[];
    totalProduksi: number;
    totalBelumSampling: number;
    totalProsesSampling: number;
    totalCOA: number;
    totalPengiriman: number;
    stokAkhir: number;
}

export interface ProductSummary {
    slug: string;
    label: string;
    materials: MaterialSummary[];
    production: ProductionSummary;
}

export interface CategorySummaryResponse {
    category: string;
    bulan: number;
    tahun: number;
    products: ProductSummary[];
}

// ─── API ───

export async function getCategorySummary(
    category: string,
    bulan?: number,
    tahun?: number
): Promise<CategorySummaryResponse> {
    const params = new URLSearchParams({ category });
    if (bulan) params.set('bulan', String(bulan));
    if (tahun) params.set('tahun', String(tahun));
    return api.get<CategorySummaryResponse>(`/dashboard/category-summary?${params.toString()}`);
}
