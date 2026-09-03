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
    jenis?: string;
    satuan?: string;
    imageUrl?: string;
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
    bulan?: number | null,
    tahun?: number | null,
    startMonth?: number | null,
    startYear?: number | null,
    endMonth?: number | null,
    endYear?: number | null
): Promise<CategorySummaryResponse> {
    const params = new URLSearchParams({ category });
    if (bulan) params.set('bulan', String(bulan));
    if (tahun) params.set('tahun', String(tahun));
    if (startMonth) params.set('startMonth', String(startMonth));
    if (startYear) params.set('startYear', String(startYear));
    if (endMonth) params.set('endMonth', String(endMonth));
    if (endYear) params.set('endYear', String(endYear));
    return api.get<CategorySummaryResponse>(`/dashboard/category-summary?${params.toString()}`);
}

