'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { getCategorySummary, type CategorySummaryResponse } from '@/lib/dashboardService';
import { getMaintenanceSummary, type MaintenanceSummary } from '@/lib/maintenanceService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LabelList
} from 'recharts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { AppSelect } from '@/components/ui/app-select';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { AppPagination } from '@/components/ui/app-pagination';
import { AppButton } from '@/components/ui/app-button';
import { AppPeriodFilter } from '@/components/ui/app-period-filter';

/* ─── Unit Conversion ─── */
const MASS_UNITS = ['Ton', 'Kwintal', 'Kg', 'Gram', 'Mg'];
const VOL_UNITS = ['Kl', 'Liter', 'Ml'];

function getUnitFamily(unit: string) {
    const u = unit.toLowerCase();
    if (['ton', 'kwintal', 'kg', 'gram', 'mg', 'kilo', 'kilogram', 'gr', 'g'].includes(u)) return MASS_UNITS;
    if (['kl', 'liter', 'ml', 'l', 'lt'].includes(u)) return VOL_UNITS;
    return [unit];
}

function getBaseMultiplier(unit: string) {
    const u = unit.toLowerCase();
    switch (u) {
        case 'ton': return 1000;
        case 'kwintal': return 100;
        case 'kg': case 'kilo': case 'kilogram': return 1;
        case 'gram': case 'gr': case 'g': return 0.001;
        case 'mg': return 0.000001;
        case 'kl': return 1000;
        case 'liter': case 'l': case 'lt': return 1;
        case 'ml': return 0.001;
        default: return 1;
    }
}

function convertValue(value: number, from: string, to: string) {
    if (from.toLowerCase() === to.toLowerCase()) return value;
    const fromMult = getBaseMultiplier(from);
    const toMult = getBaseMultiplier(to);
    return (value * fromMult) / toMult;
}

/* ─── Helpers ─── */
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
}

function DownloadIcon({ size = 20, ...props }: IconProps) { 
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            {...props}
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    ); 
}

/* ─── Product Color Palette ─── */
const PRODUCT_COLORS = [
    { bg: 'bg-emerald-50', border: 'border-l-emerald-500', text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-400', totalBg: 'bg-emerald-50/70', gradientFrom: 'from-emerald-500', gradientTo: 'to-teal-600' },
    { bg: 'bg-amber-50', border: 'border-l-amber-500', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'ring-amber-400', totalBg: 'bg-amber-50/70', gradientFrom: 'from-amber-500', gradientTo: 'to-orange-600' },
    { bg: 'bg-rose-50', border: 'border-l-rose-500', text: 'text-rose-700', dot: 'bg-rose-500', ring: 'ring-rose-400', totalBg: 'bg-rose-50/70', gradientFrom: 'from-rose-500', gradientTo: 'to-pink-600' },
    { bg: 'bg-cyan-50', border: 'border-l-cyan-500', text: 'text-cyan-700', dot: 'bg-cyan-500', ring: 'ring-cyan-400', totalBg: 'bg-cyan-50/70', gradientFrom: 'from-cyan-500', gradientTo: 'to-teal-600' },
    { bg: 'bg-violet-50', border: 'border-l-violet-500', text: 'text-violet-700', dot: 'bg-violet-500', ring: 'ring-violet-400', totalBg: 'bg-violet-50/70', gradientFrom: 'from-violet-500', gradientTo: 'to-purple-600' },
    { bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-700', dot: 'bg-blue-500', ring: 'ring-blue-400', totalBg: 'bg-blue-50/70', gradientFrom: 'from-blue-500', gradientTo: 'to-indigo-600' },
];

/* ─── Product Image Mapping (slug → image path) ─── */
const PRODUCT_IMAGES: Record<string, string> = {
    'petro-gladiator': '/images/petro-gladiator.png',
    'bio-fertil': '/images/bio-fertil.png',
    'petro-fish': '/images/petro-fish.png',
    'phonska-oca': '/images/phonska-oca-plus.png',
};

function fmt(n?: number | null): string {
    if (n === undefined || n === null || isNaN(n)) return '0';
    if (n === 0) return '0';
    return n % 1 === 0
        ? n.toLocaleString('id-ID')
        : n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}



/* ─── Main Component ─── */
export function CategoryDashboardPage({
    categorySlug,
    categoryName,
}: {
    categorySlug: string;
    categoryName: string;
}) {
    const now = new Date();

    const [matBulan, setMatBulan] = useState<number | null>(now.getMonth() + 1);
    const [matTahun, setMatTahun] = useState<number | null>(now.getFullYear());
    const [prodBulan, setProdBulan] = useState<number | null>(now.getMonth() + 1);
    const [prodTahun, setProdTahun] = useState<number | null>(now.getFullYear());
    const [chartBulan, setChartBulan] = useState<number | null>(now.getMonth() + 1);
    const [chartTahun, setChartTahun] = useState<number | null>(now.getFullYear());
    
    // Unit Filters
    const [padatUnit, setPadatUnit] = useState('Kg');
    const [cairUnit, setCairUnit] = useState('Liter');

    const [matData, setMatData] = useState<CategorySummaryResponse | null>(null);
    const [prodData, setProdData] = useState<CategorySummaryResponse | null>(null);
    const [chartData, setChartData] = useState<CategorySummaryResponse | null>(null);

    const [loadingMat, setLoadingMat] = useState(true);
    const [loadingProd, setLoadingProd] = useState(true);
    const [loadingChart, setLoadingChart] = useState(true);

    const [materialSearch, setMaterialSearch] = useState('');
    const [produksiSearch, setProduksiSearch] = useState('');
    const [selectedMatProduct, setSelectedMatProduct] = useState('');

    const [matPage, setMatPage] = useState(1);
    const [prodPage, setProdPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});

    // Material Balance chart state (independent period)
    const [balanceBulan, setBalanceBulan] = useState<number | null>(now.getMonth() + 1);
    const [balanceTahun, setBalanceTahun] = useState<number | null>(now.getFullYear());
    const [balanceData, setBalanceData] = useState<CategorySummaryResponse | null>(null);
    const [loadingBalance, setLoadingBalance] = useState(true);

    // Maintenance chart state
    const [maintBulan, setMaintBulan] = useState<number | null>(now.getMonth() + 1);
    const [maintTahun, setMaintTahun] = useState<number | null>(now.getFullYear());
    const [maintKeperluan, setMaintKeperluan] = useState('');
    const [maintPic, setMaintPic] = useState('');
    const [maintData, setMaintData] = useState<MaintenanceSummary | null>(null);
    const [loadingMaint, setLoadingMaint] = useState(true);

    // Fetch Material Data
    useEffect(() => {
        let cancelled = false;
        setLoadingMat(true);
        getCategorySummary(categorySlug, matBulan ?? undefined, matTahun ?? undefined)
            .then(res => { if (!cancelled) setMatData(res); })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoadingMat(false); });
        return () => { cancelled = true; };
    }, [categorySlug, matBulan, matTahun]);

    useEffect(() => { setMatPage(1); }, [materialSearch, selectedMatProduct, matBulan, matTahun]);

    // Fetch Production Data
    useEffect(() => {
        let cancelled = false;
        setLoadingProd(true);
        getCategorySummary(categorySlug, prodBulan ?? undefined, prodTahun ?? undefined)
            .then(res => { if (!cancelled) setProdData(res); })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoadingProd(false); });
        return () => { cancelled = true; };
    }, [categorySlug, prodBulan, prodTahun]);

    useEffect(() => { setProdPage(1); }, [produksiSearch, prodBulan, prodTahun]);

    // Fetch Chart Data (independent)
    useEffect(() => {
        let cancelled = false;
        setLoadingChart(true);
        getCategorySummary(categorySlug, chartBulan ?? undefined, chartTahun ?? undefined)
            .then(res => { if (!cancelled) setChartData(res); })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoadingChart(false); });
        return () => { cancelled = true; };
    }, [categorySlug, chartBulan, chartTahun]);

    // Fetch Material Balance Data (independent period)
    useEffect(() => {
        let cancelled = false;
        setLoadingBalance(true);
        getCategorySummary(categorySlug, balanceBulan ?? undefined, balanceTahun ?? undefined)
            .then(res => { if (!cancelled) setBalanceData(res); })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoadingBalance(false); });
        return () => { cancelled = true; };
    }, [categorySlug, balanceBulan, balanceTahun]);

    // Fetch Maintenance Summary (independent)
    useEffect(() => {
        let cancelled = false;
        setLoadingMaint(true);
        getMaintenanceSummary(maintBulan ?? undefined, maintTahun ?? undefined, maintKeperluan || undefined, maintPic || undefined)
            .then(res => { if (!cancelled) setMaintData(res); })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoadingMaint(false); });
        return () => { cancelled = true; };
    }, [maintBulan, maintTahun, maintKeperluan, maintPic]);

    // Aggregate stats
    const stats = useMemo(() => {
        const totalProducts = (prodData || matData)?.products.reduce((acc, p) => acc + (p.production.tabs.length || 0), 0) || 0;
        const uniqueMaterials = new Set<string>();
        matData?.products.forEach(p => p.materials.forEach(m => uniqueMaterials.add(m.nama)));
        const totalMaterials = uniqueMaterials.size;

        // Total production across all products
        let totalProduksi = 0;
        let totalPengiriman = 0;
        prodData?.products.forEach(p => {
            totalProduksi += p.production.totalProduksi || 0;
            totalPengiriman += p.production.totalPengiriman || 0;
        });

        return { totalProducts, totalMaterials, totalProduksi, totalPengiriman };
    }, [matData, prodData]);

    // Chart data: Production per product (uses independent chartData)
    const { productionChartDataPadat, productionChartDataCair } = useMemo(() => {
        if (!chartData) return { productionChartDataPadat: [], productionChartDataCair: [] };
        const NON_PRODUCT_SLUGS = ['aktivitas-harian', 'maintenance'];
        
        const padatData: any[] = [];
        const cairData: any[] = [];

        chartData.products
            .filter(p => !NON_PRODUCT_SLUGS.includes(p.slug))
            .forEach(p => {
                let padatBs = 0; let padatPg = 0;
                let cairBs = 0; let cairPg = 0;

                (p.production.tabs || []).forEach(t => {
                    const fullName = `${p.label} ${t.tabName}`.toLowerCase();
                    const isCair = fullName.includes('cair') || fullName.includes('liquid');
                    if (isCair) {
                        cairBs += t.totalProduksi || 0;
                        cairPg += t.pengirimanGudang || 0;
                    } else {
                        padatBs += t.totalProduksi || 0;
                        padatPg += t.pengirimanGudang || 0;
                    }
                });

                if (padatBs > 0 || padatPg > 0) {
                    padatData.push({
                        name: p.label.length > 12 ? p.label.substring(0, 12) + '…' : p.label,
                        fullName: p.label,
                        produksi: convertValue(padatBs, 'Kg', padatUnit),
                        pengiriman: convertValue(padatPg, 'Kg', padatUnit),
                    });
                }
                
                if (cairBs > 0 || cairPg > 0) {
                    cairData.push({
                        name: p.label.length > 12 ? p.label.substring(0, 12) + '…' : p.label,
                        fullName: p.label,
                        produksi: convertValue(cairBs, 'Liter', cairUnit),
                        pengiriman: convertValue(cairPg, 'Liter', cairUnit),
                    });
                }
            });

        return { productionChartDataPadat: padatData, productionChartDataCair: cairData };
    }, [chartData, padatUnit, cairUnit]);

    // Chart data: Material balance per unique material (each shown independently)
    const materialBalanceData = useMemo(() => {
        if (!balanceData) return [];
        const NON_PRODUCT_SLUGS = ['aktivitas-harian', 'maintenance'];
        const materialMap = new Map<string, { nama: string; satuan: string; suplai: number; mutasi: number; stok: number }>();
        balanceData.products
            .filter(p => !NON_PRODUCT_SLUGS.includes(p.slug))
            .forEach(p => {
                p.materials.forEach(m => {
                    if (!materialMap.has(m.nama)) {
                        materialMap.set(m.nama, { nama: m.nama, satuan: m.satuan, suplai: m.suplai, mutasi: m.mutasi, stok: m.stok });
                    }
                });
            });
        return Array.from(materialMap.values());
    }, [balanceData]);

    // Filtering
    const flattenedMaterialsData = useMemo(() => {
        if (!matData) return [];
        const matMap = new Map<string, any>();

        matData.products.forEach(p => {
            if (selectedMatProduct && p.slug !== selectedMatProduct) return;
            p.materials.forEach(m => {
                const baseUnit = m.satuan;
                const vSuplai = convertValue(m.suplai, m.satuan, baseUnit);
                const vMutasi = convertValue(m.mutasi, m.satuan, baseUnit);
                const vStok = convertValue(m.stok, m.satuan, baseUnit);

                if (!matMap.has(m.nama)) {
                    matMap.set(m.nama, {
                        productSlug: p.slug,
                        productName: p.label,
                        ...m,
                        suplai: vSuplai,
                        mutasi: vMutasi,
                        stok: vStok,
                    });
                }
            });
        });

        let items = Array.from(matMap.values());
        if (materialSearch.trim()) {
            const q = materialSearch.toLowerCase();
            items = items.filter(m =>
                m.productName.toLowerCase().includes(q) ||
                m.nama.toLowerCase().includes(q) ||
                m.jenis.toLowerCase().includes(q) ||
                m.satuan.toLowerCase().includes(q)
            );
        }
        return items;
    }, [matData, selectedMatProduct, materialSearch]);

    const paginatedMaterials = useMemo(() => {
        const start = (matPage - 1) * ITEMS_PER_PAGE;
        return flattenedMaterialsData.slice(start, start + ITEMS_PER_PAGE);
    }, [flattenedMaterialsData, matPage]);
    const matTotalPages = Math.ceil(flattenedMaterialsData.length / ITEMS_PER_PAGE);

    const filteredProduksiData = useMemo(() => {
        if (!prodData) return [];
        if (!produksiSearch.trim()) return prodData.products;
        const q = produksiSearch.toLowerCase();
        return prodData.products.map(p => {
            if (p.label.toLowerCase().includes(q)) return p;
            return {
                ...p,
                production: {
                    ...p.production,
                    tabs: p.production.tabs.filter(t => t.tabName.toLowerCase().includes(q))
                }
            };
        }).filter(p => p.production.tabs.length > 0);
    }, [prodData, produksiSearch]);

    const paginatedProduksiProducts = useMemo(() => {
        const start = (prodPage - 1) * ITEMS_PER_PAGE;
        return filteredProduksiData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProduksiData, prodPage]);
    const prodTotalPages = Math.ceil(filteredProduksiData.length / ITEMS_PER_PAGE);

    const globalLoading = loadingMat && loadingProd && loadingChart;

    const handleExportExcel = () => {
        const exportDate = format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id });
        const period = prodBulan && prodTahun ? `${MONTHS[prodBulan - 1]} ${prodTahun}` : 'Seluruh Periode';
        
        const exportData: any[] = [];
        paginatedProduksiProducts.forEach(product => {
            product.production.tabs.forEach(tab => {
                const isCair = `${product.label} ${tab.tabName}`.toLowerCase().includes('cair') || `${product.label} ${tab.tabName}`.toLowerCase().includes('liquid');
                const baseUnit = isCair ? 'Liter' : 'Kg';
                const currentUnit = isCair ? cairUnit : padatUnit;
                
                exportData.push({
                    'Produk': product.label,
                    'Jenis': tab.tabName,
                    'Total Produksi': fmt(convertValue(tab.totalProduksi || 0, baseUnit, currentUnit)),
                    'Belum Sampling': fmt(convertValue(tab.belumSampling || 0, baseUnit, currentUnit)),
                    'Proses Sampling': fmt(convertValue(tab.prosesSampling || 0, baseUnit, currentUnit)),
                    'COA': fmt(convertValue(tab.coa || 0, baseUnit, currentUnit)),
                    'Pengiriman Gudang': fmt(convertValue(tab.pengirimanGudang || 0, baseUnit, currentUnit)),
                    'Satuan': currentUnit,
                });
            });
        });

        import('@/lib/export-utils').then(({ downloadCSV }) => {
            downloadCSV(
                exportData,
                `Ringkasan_Produksi_${categoryName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`
            );
        });
    };

    const handleExportPDF = () => {
        const exportDate = format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id });
        const period = prodBulan && prodTahun ? `${MONTHS[prodBulan - 1]} ${prodTahun}` : 'Seluruh Periode';

        const exportData: any[] = [];
        paginatedProduksiProducts.forEach(product => {
            product.production.tabs.forEach(tab => {
                const isCair = `${product.label} ${tab.tabName}`.toLowerCase().includes('cair') || `${product.label} ${tab.tabName}`.toLowerCase().includes('liquid');
                const baseUnit = isCair ? 'Liter' : 'Kg';
                const currentUnit = isCair ? cairUnit : padatUnit;
                
                exportData.push({
                    produk: product.label,
                    jenis: tab.tabName,
                    totalProduksi: fmt(convertValue(tab.totalProduksi || 0, baseUnit, currentUnit)),
                    belumSampling: fmt(convertValue(tab.belumSampling || 0, baseUnit, currentUnit)),
                    prosesSampling: fmt(convertValue(tab.prosesSampling || 0, baseUnit, currentUnit)),
                    coa: fmt(convertValue(tab.coa || 0, baseUnit, currentUnit)),
                    pengiriman: fmt(convertValue(tab.pengirimanGudang || 0, baseUnit, currentUnit)),
                    satuan: currentUnit,
                });
            });
        });

        import('@/lib/export-utils').then(({ printTable }) => {
            printTable({
                title: `Ringkasan Produksi - ${categoryName}`,
                subtitle: `Periode: ${period}`,
                date: exportDate,
                data: exportData,
                columns: [
                    { key: 'produk', label: 'Produk' },
                    { key: 'jenis', label: 'Jenis' },
                    { key: 'totalProduksi', label: 'Total Produksi' },
                    { key: 'belumSampling', label: 'Belum Sampling' },
                    { key: 'prosesSampling', label: 'Proses Sampling' },
                    { key: 'coa', label: 'COA' },
                    { key: 'pengiriman', label: 'Pengiriman Gudang' },
                    { key: 'satuan', label: 'Satuan' }
                ]
            });
        });
    };

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                    <span className="text-gray-500">Dashboard</span>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">{categoryName}</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{categoryName}</h1>
            </div>

            {/* ═══ BENTO GRID – Stat Cards ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <BentoStatCard
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4L7.5 4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>}
                    label="Total Produk"
                    value={String(stats.totalProducts)}
                    gradient="from-emerald-500 to-teal-600"
                    bgLight="bg-emerald-50"
                />
                <BentoStatCard
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>}
                    label="Total Bahan"
                    value={String(stats.totalMaterials)}
                    gradient="from-blue-500 to-indigo-600"
                    bgLight="bg-blue-50"
                />
                <BentoStatCard
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /></svg>}
                    label="Total Produksi"
                    value={fmt(stats.totalProduksi)}
                    gradient="from-amber-500 to-orange-600"
                    bgLight="bg-amber-50"
                />
                <BentoStatCard
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>}
                    label="Pengiriman Gudang"
                    value={fmt(stats.totalPengiriman)}
                    gradient="from-violet-500 to-purple-600"
                    bgLight="bg-violet-50"
                />
            </div>

            {/* ═══ BENTO GRID – Ringkasan Produksi (Full Width, Top) ═══ */}
            <div className="bg-white border border-gray-200 overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white flex-shrink-0">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">Ringkasan Produksi</h2>
                            <p className="text-xs text-gray-400">Data kumulatif per produk</p>
                        </div>
                    </div>
                </div>

                {/* Filter Row */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row gap-4 justify-between items-end">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Period Group */}
                        <div className="flex items-center gap-2">
                            <AppPeriodFilter
                                month={prodBulan}
                                year={prodTahun}
                                onMonthChange={setProdBulan}
                                onYearChange={setProdTahun}
                            />
                        </div>

                        {/* Unit Group */}
                        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                            <AppSelect
                                prefixLabel="Padat:"
                                variant="sharp"
                                value={padatUnit}
                                onChange={(e) => setPadatUnit(e.target.value)}
                                options={MASS_UNITS.map(u => ({ label: u, value: u }))}
                                className="h-9 bg-white text-emerald-700"
                            />
                            <AppSelect
                                prefixLabel="Cair:"
                                variant="sharp"
                                value={cairUnit}
                                onChange={(e) => setCairUnit(e.target.value)}
                                options={VOL_UNITS.map(u => ({ label: u, value: u }))}
                                className="h-9 bg-white text-blue-700"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <AppSearchBar
                            value={produksiSearch}
                            onChange={(e) => setProduksiSearch(e.target.value)}
                            placeholder="Cari produk / tab..."
                            containerClassName="w-full lg:w-64"
                            className="h-9 py-1"
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="h-9 px-4 flex items-center gap-2 bg-white text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all whitespace-nowrap">
                                    <DownloadIcon size={16} /> Export
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleExportExcel} className="py-2 px-4 text-xs cursor-pointer">Excel</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportPDF} className="py-2 px-4 text-xs cursor-pointer">PDF</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                {loadingProd ? (
                    <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" /></div>
                ) : filteredProduksiData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    {['Produk', 'Jenis', 'Total Produksi', 'Belum Sampling', 'Proses Sampling', 'COA', 'Pengiriman Gudang', 'Satuan'].map(h => (
                                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border border-gray-200 ${['Total Produksi', 'Belum Sampling', 'Proses Sampling', 'COA', 'Pengiriman Gudang'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProduksiProducts.map((product, productIdx) => {
                                    const tabs = product.production.tabs;
                                    if (tabs.length === 0) return null;
                                    const color = PRODUCT_COLORS[productIdx % PRODUCT_COLORS.length];
                                    return (
                                        <Fragment key={product.slug}>
                                            {tabs.map((tab, idx) => {
                                                const isCair = `${product.label} ${tab.tabName}`.toLowerCase().includes('cair') || `${product.label} ${tab.tabName}`.toLowerCase().includes('liquid');
                                                const baseUnit = isCair ? 'Liter' : 'Kg';
                                                const currentUnit = isCair ? cairUnit : padatUnit;
                                                
                                                const vTotalProduksi = convertValue(tab.totalProduksi || 0, baseUnit, currentUnit);
                                                const vBelumSampling = convertValue(tab.belumSampling || 0, baseUnit, currentUnit);
                                                const vProsesSampling = convertValue(tab.prosesSampling || 0, baseUnit, currentUnit);
                                                const vCoa = convertValue(tab.coa || 0, baseUnit, currentUnit);
                                                const vPengirimanGudang = convertValue(tab.pengirimanGudang || 0, baseUnit, currentUnit);

                                                return (
                                                    <tr key={`${product.slug}-${tab.tabName}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                                                        {idx === 0 && (
                                                            <td className={`px-4 py-3 align-middle border border-gray-200 border-l-[3px] ${color.border} ${color.bg}`} rowSpan={tabs.length + 1}>
                                                                <div className="flex items-center gap-3">
                                                                    {PRODUCT_IMAGES[product.slug] ? (
                                                                        <div className={`w-10 h-10 rounded-lg ring-2 ${color.ring} ring-offset-1 overflow-hidden flex-shrink-0 shadow-sm`}>
                                                                            <img
                                                                                src={PRODUCT_IMAGES[product.slug]}
                                                                                alt={product.label}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className={`w-10 h-10 bg-gradient-to-br ${color.gradientFrom} ${color.gradientTo} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm`}>
                                                                            {product.label.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                    <span className={`font-semibold text-sm ${color.text}`}>{product.label}</span>
                                                                </div>
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 text-gray-600 text-xs border border-gray-200">{tab.tabName}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-700 border border-gray-200">{fmt(vTotalProduksi)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-700 border border-gray-200">{fmt(vBelumSampling)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-700 border border-gray-200">{fmt(vProsesSampling)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-700 border border-gray-200">{fmt(vCoa)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-700 border border-gray-200">{fmt(vPengirimanGudang)}</td>
                                                        <td className="px-4 py-3 text-xs text-center border border-gray-200 bg-gray-50/50 text-gray-500 font-medium">{currentUnit}</td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Subtotal row */}
                                            {(() => {
                                                let tProduksi = 0, tBs = 0, tPs = 0, tCoa = 0, tPg = 0;
                                                tabs.forEach(tab => {
                                                    const isCair = `${product.label} ${tab.tabName}`.toLowerCase().includes('cair') || `${product.label} ${tab.tabName}`.toLowerCase().includes('liquid');
                                                    const baseUnit = isCair ? 'Liter' : 'Kg';
                                                    const currentUnit = isCair ? cairUnit : padatUnit;
                                                    
                                                    tProduksi += convertValue(tab.totalProduksi || 0, baseUnit, currentUnit);
                                                    tBs += convertValue(tab.belumSampling || 0, baseUnit, currentUnit);
                                                    tPs += convertValue(tab.prosesSampling || 0, baseUnit, currentUnit);
                                                    tCoa += convertValue(tab.coa || 0, baseUnit, currentUnit);
                                                    tPg += convertValue(tab.pengirimanGudang || 0, baseUnit, currentUnit);
                                                });
                                                return (
                                                    <tr key={`${product.slug}-total`} className={color.totalBg}>
                                                        <td className={`px-4 py-2 text-xs font-semibold ${color.text} uppercase border border-gray-200`}>Total</td>
                                                        <td className="px-4 py-2 text-right font-mono font-bold text-gray-900 border border-gray-200">{fmt(tProduksi)}</td>
                                                        <td className="px-4 py-2 text-right font-mono font-bold text-gray-900 border border-gray-200">{fmt(tBs)}</td>
                                                        <td className="px-4 py-2 text-right font-mono font-bold text-gray-900 border border-gray-200">{fmt(tPs)}</td>
                                                        <td className={`px-4 py-2 text-right font-mono font-bold ${color.text} border border-gray-200`}>{fmt(tCoa)}</td>
                                                        <td className="px-4 py-2 text-right font-mono font-bold text-gray-900 border border-gray-200">{fmt(tPg)}</td>
                                                        <td className="px-4 py-2 text-xs bg-transparent border border-gray-200"></td>
                                                    </tr>
                                                );
                                            })()}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-sm text-gray-400">
                        {prodData?.products.length === 0 ? 'Belum ada data produksi.' : 'Pencarian tidak ditemukan.'}
                    </div>
                )}
                {prodTotalPages > 1 && (
                    <AppPagination
                        currentPage={prodPage}
                        totalPages={prodTotalPages}
                        onPageChange={setProdPage}
                        totalItems={filteredProduksiData.length}
                    />
                )}
            </div>

            {/* ═══ BENTO GRID – Charts Row 1: Production (full width) ═══ */}
            <div className="bg-white border border-gray-200 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800">Produksi per Produk</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{chartBulan && chartTahun ? `${MONTHS[chartBulan - 1]} ${chartTahun}` : 'Seluruh Periode'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AppPeriodFilter
                            month={chartBulan}
                            year={chartTahun}
                            onMonthChange={setChartBulan}
                            onYearChange={setChartTahun}
                        />
                        <span className="flex items-center gap-1.5 text-xs ml-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Produksi</span>
                        <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Pengiriman</span>
                    </div>
                </div>
                {loadingChart ? (
                    <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" /></div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                        {/* Padat Chart */}
                        <div className="border border-gray-100 bg-gray-50/50 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-medium text-gray-700">Produk Padat</h4>
                                <AppSelect
                                    variant="sharp"
                                    value={padatUnit}
                                    onChange={e => setPadatUnit(e.target.value)}
                                    options={MASS_UNITS.map(u => ({ label: u, value: u }))}
                                    className="h-7 text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                                />
                            </div>
                            {productionChartDataPadat.length > 0 ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={productionChartDataPadat} barGap={4} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={40} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                                            labelFormatter={(l, payload) => payload?.[0]?.payload?.fullName || l}
                                        />
                                        <Bar dataKey="produksi" name={`Produksi (${padatUnit})`} fill="#10b981" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="produksi" formatter={(v: any) => fmt(v as number)} position="top" style={{ fontSize: 10, fill: '#059669', fontWeight: 600 }} />
                                        </Bar>
                                        <Bar dataKey="pengiriman" name={`Pengiriman (${padatUnit})`} fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="pengiriman" formatter={(v: any) => fmt(v as number)} position="top" style={{ fontSize: 10, fill: '#2563eb', fontWeight: 600 }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[240px] text-sm text-gray-400">Belum ada data produksi padat</div>
                            )}
                        </div>

                        {/* Cair Chart */}
                        <div className="border border-gray-100 bg-gray-50/50 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-medium text-gray-700">Produk Cair</h4>
                                <AppSelect
                                    variant="sharp"
                                    value={cairUnit}
                                    onChange={e => setCairUnit(e.target.value)}
                                    options={VOL_UNITS.map(u => ({ label: u, value: u }))}
                                    className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200"
                                />
                            </div>
                            {productionChartDataCair.length > 0 ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={productionChartDataCair} barGap={4} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={40} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                                            labelFormatter={(l, payload) => payload?.[0]?.payload?.fullName || l}
                                        />
                                        <Bar dataKey="produksi" name={`Produksi (${cairUnit})`} fill="#10b981" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="produksi" formatter={(v: any) => fmt(v as number)} position="top" style={{ fontSize: 10, fill: '#059669', fontWeight: 600 }} />
                                        </Bar>
                                        <Bar dataKey="pengiriman" name={`Pengiriman (${cairUnit})`} fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="pengiriman" formatter={(v: any) => fmt(v as number)} position="top" style={{ fontSize: 10, fill: '#2563eb', fontWeight: 600 }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[240px] text-sm text-gray-400">Belum ada data produksi cair</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ BENTO GRID – Charts Row 2: Material Balance + Maintenance (side by side) ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Material Balance Chart — per-material cards */}
                <div className="bg-white border border-gray-200 p-5 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800">Balance Bahan Baku</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{balanceBulan && balanceTahun ? `${MONTHS[balanceBulan - 1]} ${balanceTahun}` : 'Seluruh Periode'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <AppPeriodFilter
                                month={balanceBulan}
                                year={balanceTahun}
                                onMonthChange={setBalanceBulan}
                                onYearChange={setBalanceTahun}
                            />
                        </div>
                    </div>
                    {loadingBalance ? (
                        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
                    ) : materialBalanceData.length > 0 ? (
                        <div className="space-y-3 overflow-y-auto max-h-[340px] pr-1">
                            {materialBalanceData.map(m => {
                                const maxVal = Math.max(m.suplai, m.mutasi, m.stok, 1);
                                return (
                                    <div key={m.nama} className="border border-gray-100 bg-gray-50/50 p-3">
                                        <div className="flex items-baseline justify-between mb-2">
                                            <span className="text-xs font-semibold text-gray-800">{m.nama}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">{m.satuan}</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">Suplai</span>
                                                <div className="flex-1 h-4 bg-gray-200/60 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(m.suplai / maxVal) * 100}%` }} />
                                                </div>
                                                <span className="text-[11px] font-mono font-semibold text-emerald-700 w-12 text-right">{fmt(m.suplai)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">Mutasi</span>
                                                <div className="flex-1 h-4 bg-gray-200/60 rounded-full overflow-hidden">
                                                    <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${(m.mutasi / maxVal) * 100}%` }} />
                                                </div>
                                                <span className="text-[11px] font-mono font-semibold text-rose-700 w-12 text-right">{fmt(m.mutasi)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">Stok</span>
                                                <div className="flex-1 h-4 bg-gray-200/60 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(m.stok / maxVal) * 100}%` }} />
                                                </div>
                                                <span className="text-[11px] font-mono font-semibold text-blue-700 w-12 text-right">{fmt(m.stok)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-12 text-sm text-gray-400">Belum ada data bahan</div>
                    )}
                </div>

                {/* Maintenance Table – Horizontal Bars Replaced with Table */}
                <div className="bg-white border border-gray-200 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800">Kegiatan Maintenance</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{maintBulan && maintTahun ? `${MONTHS[maintBulan - 1]} ${maintTahun}` : 'Seluruh Periode'} &middot; {maintData?.totalActivities ?? 0} kegiatan</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <AppPeriodFilter
                                month={maintBulan}
                                year={maintTahun}
                                onMonthChange={setMaintBulan}
                                onYearChange={setMaintTahun}
                            />
                            <AppSelect
                                variant="ghost"
                                value={maintKeperluan}
                                onChange={e => { setMaintKeperluan(e.target.value); setMaintPic(''); }}
                                options={[
                                    { label: 'Semua Keperluan', value: '' },
                                    ...(maintData?.keperluans ?? []).map(k => ({ label: k, value: k }))
                                ]}
                                className="h-7 text-xs max-w-[140px]"
                            />
                            <AppSelect
                                variant="ghost"
                                value={maintPic}
                                onChange={e => setMaintPic(e.target.value)}
                                options={[
                                    { label: 'Semua PIC', value: '' },
                                    ...(maintData?.pics ?? []).map(p => ({ label: p, value: p }))
                                ]}
                                className="h-7 text-xs max-w-[140px]"
                            />
                        </div>
                    </div>
                    {loadingMaint ? (
                        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
                    ) : (maintData?.byKeperluanAndPic?.length ?? 0) > 0 ? (
                        <div className="overflow-x-auto mt-4 max-h-[300px] overflow-y-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                    <tr className="bg-gray-50/80">
                                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider border border-gray-200 text-left">Keperluan</th>
                                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider border border-gray-200 text-left">PIC</th>
                                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider border border-gray-200 text-center">Jumlah Kegiatan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {maintData?.byKeperluanAndPic.map((row, idx) => (
                                        <tr key={`${row.keperluan}-${row.pic}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-2.5 text-gray-700 border border-gray-200">{row.keperluan}</td>
                                            <td className="px-4 py-2.5 text-gray-700 border border-gray-200">{row.pic}</td>
                                            <td className="px-4 py-2.5 text-center font-mono font-bold text-blue-700 border border-gray-200 bg-blue-50/30">
                                                {row.count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-12 text-sm text-gray-400">Belum ada data maintenance</div>
                    )}
                </div>

            </div>

            {/* ═══ BENTO GRID – Ringkasan Bahan Baku (Full Width) ═══ */}

            {/* ── Material Stock Table ── */}
            <div className="bg-white border border-gray-200 overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">Ringkasan Bahan Baku</h2>
                            <p className="text-xs text-gray-400">Stok, suplai, dan mutasi per produk</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full 2xl:w-auto">
                        <AppPeriodFilter
                            month={matBulan}
                            year={matTahun}
                            onMonthChange={setMatBulan}
                            onYearChange={setMatTahun}
                        />
                        <AppSelect
                            variant="ghost"
                            value={selectedMatProduct}
                            onChange={(e) => setSelectedMatProduct(e.target.value)}
                            options={[
                                { label: 'Semua Produk', value: '' },
                                ...(matData?.products.map(p => ({ label: p.label, value: p.slug })) || [])
                            ]}
                            className="h-8 text-xs max-w-[140px]"
                        />
                        <AppSearchBar
                            value={materialSearch}
                            onChange={(e) => setMaterialSearch(e.target.value)}
                            placeholder="Cari bahan..."
                            className="w-full sm:w-40 text-xs py-1.5 h-8"
                            containerClassName="h-8"
                        />
                    </div>
                </div>
                {loadingMat ? (
                    <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
                ) : flattenedMaterialsData.length > 0 ? (
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    {['Bahan', 'Jenis', 'Suplai', 'Mutasi', 'Stok', 'Satuan'].map(h => (
                                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border border-gray-200 ${['Suplai', 'Mutasi', 'Stok'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedMaterials.map((mat, idx) => {
                                    const baseUnit = mat.satuan;
                                    const unitFamily = getUnitFamily(baseUnit);
                                    const unitStateKey = `mat-${mat.productSlug}-${mat.nama}`;
                                    const currentUnit = selectedUnits[unitStateKey] || baseUnit;

                                    const vSuplai = convertValue(mat.suplai, baseUnit, currentUnit);
                                    const vMutasi = convertValue(mat.mutasi, baseUnit, currentUnit);
                                    const vStok = convertValue(mat.stok, baseUnit, currentUnit);

                                    return (
                                        <tr key={`${mat.productSlug}-${mat.nama}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 text-gray-700 border border-gray-200">{mat.nama}</td>
                                            <td className="px-4 py-3 border border-gray-200">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide
                                                    ${mat.jenis === 'Baku' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {mat.jenis === 'Baku' ? 'Baku' : 'Penolong'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-600 border border-gray-200">{vSuplai > 0 ? `+${fmt(vSuplai)}` : '-'}</td>
                                            <td className="px-4 py-3 text-right font-mono text-red-500 border border-gray-200">{vMutasi > 0 ? `-${fmt(vMutasi)}` : '-'}</td>
                                            <td className={`px-4 py-3 text-right font-mono font-semibold border border-gray-200 ${vStok > 0 ? 'text-gray-900' : vStok < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                {fmt(vStok)}
                                            </td>
                                            <td className="px-4 py-3 text-xs border border-gray-200">
                                                {unitFamily.length > 1 ? (
                                                    <AppSelect
                                                        variant="ghost"
                                                        value={currentUnit}
                                                        onChange={e => setSelectedUnits(prev => ({ ...prev, [unitStateKey]: e.target.value }))}
                                                        options={unitFamily.map(u => ({ label: u, value: u }))}
                                                        className="h-7 text-xs"
                                                    />
                                                ) : (
                                                    <span className="text-gray-400">{currentUnit}</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-sm text-gray-400">
                        {matData?.products.length === 0 ? 'Belum ada data bahan baku.' : 'Pencarian tidak ditemukan.'}
                    </div>
                )}
                {matTotalPages > 1 && (
                    <AppPagination
                        currentPage={matPage}
                        totalPages={matTotalPages}
                        onPageChange={setMatPage}
                        totalItems={flattenedMaterialsData.length}
                    />
                )}
            </div>

            {/* ── Empty State ── */}
            {!globalLoading && stats.totalProducts === 0 && (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center text-gray-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4L7.5 4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-1">Belum Ada Produk</h3>
                    <p className="text-sm text-gray-400">Tidak ada produk yang terdaftar untuk kategori ini.</p>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*  Bento Stat Card                            */
/* ═══════════════════════════════════════════ */

function BentoStatCard({
    icon,
    label,
    value,
    gradient,
    bgLight,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    gradient: string;
    bgLight: string;
}) {
    return (
        <div className={`${bgLight} rounded-lg border border-gray-100 p-4 relative overflow-hidden`}>
            {/* Decorative circle */}
            <div className={`absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br ${gradient} rounded-full opacity-10`} />
            <div className="relative">
                <div className={`w-10 h-10 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-3`}>
                    {icon}
                </div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
                <p className="text-2xl font-bold text-gray-900 font-mono">{value}</p>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*  Table Pagination (consistent with others)  */
/* ═══════════════════════════════════════════ */

function TablePagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (p: number) => void;
    totalItems: number;
    itemsPerPage: number;
}) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30 mt-auto">
            <span className="text-xs text-gray-500">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems} data
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${p === currentPage
                            ? 'bg-emerald-600 text-white'
                            : 'text-gray-500 hover:bg-white'
                            }`}
                    >
                        {p}
                    </button>
                ))}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
            </div>
        </div>
    );
}
