'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { getCategorySummary, type CategorySummaryResponse } from '@/lib/dashboardService';

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

/* ─── Icons ─── */
function PackageIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 9.4L7.5 4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" />
        </svg>
    );
}
function FactoryIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        </svg>
    );
}
function LayersIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
        </svg>
    );
}
function TruckIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
            <circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
        </svg>
    );
}
function SearchIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

/* ─── Helpers ─── */
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function fmt(n?: number | null): string {
    if (n === undefined || n === null) return '0';
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

    // Separate states for Materials and Production
    const [matBulan, setMatBulan] = useState(now.getMonth() + 1);
    const [matTahun, setMatTahun] = useState(now.getFullYear());
    const [prodBulan, setProdBulan] = useState(now.getMonth() + 1);
    const [prodTahun, setProdTahun] = useState(now.getFullYear());

    const [matData, setMatData] = useState<CategorySummaryResponse | null>(null);
    const [prodData, setProdData] = useState<CategorySummaryResponse | null>(null);

    const [loadingMat, setLoadingMat] = useState(true);
    const [loadingProd, setLoadingProd] = useState(true);

    const [materialSearch, setMaterialSearch] = useState('');
    const [produksiSearch, setProduksiSearch] = useState('');
    const [selectedMatProduct, setSelectedMatProduct] = useState('');

    const [matPage, setMatPage] = useState(1);
    const [prodPage, setProdPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // Unit selections for Materials table
    const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});

    // Fetch Material Data
    useEffect(() => {
        let cancelled = false;
        setLoadingMat(true);
        getCategorySummary(categorySlug, matBulan, matTahun)
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
        getCategorySummary(categorySlug, prodBulan, prodTahun)
            .then(res => { if (!cancelled) setProdData(res); })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoadingProd(false); });
        return () => { cancelled = true; };
    }, [categorySlug, prodBulan, prodTahun]);

    useEffect(() => { setProdPage(1); }, [produksiSearch, prodBulan, prodTahun]);


    // Aggregate stats (combined from both data sources)
    const stats = useMemo(() => {
        const totalProducts = matData?.products.length || prodData?.products.length || 0;

        const uniqueMaterials = new Set<string>();
        matData?.products.forEach(p => p.materials.forEach(m => uniqueMaterials.add(m.nama)));
        const totalMaterials = uniqueMaterials.size;

        return { totalProducts, totalMaterials };
    }, [matData, prodData]);

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

    const globalLoading = loadingMat && loadingProd;

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                        <span className="text-gray-500">Dashboard</span>
                        <span>/</span>
                        <span className="text-gray-800 font-medium">{categoryName}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{categoryName}</h1>
                </div>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard icon={<PackageIcon />} label="Total Produk" value={String(stats.totalProducts)} color="emerald" />
                <StatCard icon={<LayersIcon />} label="Total Bahan" value={String(stats.totalMaterials)} color="blue" />
            </div>

            {/* ── Tables Container (Horizontal on large screens) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

                {/* ── Material Stock Table ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Ringkasan Bahan Baku</h2>
                                <p className="text-xs text-gray-500">Stok, suplai, dan mutasi per produk</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full 2xl:w-auto mt-3 2xl:mt-0">
                            <div className="flex items-center gap-2">
                                <select value={matBulan} onChange={e => setMatBulan(Number(e.target.value))} className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none cursor-pointer focus:border-blue-500">
                                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                                <select value={matTahun} onChange={e => setMatTahun(Number(e.target.value))} className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none cursor-pointer focus:border-blue-500">
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select value={selectedMatProduct} onChange={e => setSelectedMatProduct(e.target.value)} className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none cursor-pointer focus:border-blue-500 max-w-[140px] truncate">
                                    <option value="">Semua Produk</option>
                                    {matData?.products.map(p => <option key={p.slug} value={p.slug}>{p.label}</option>)}
                                </select>
                            </div>
                            <div className="relative flex-1 sm:flex-none">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                                    <SearchIcon />
                                </div>
                                <input
                                    type="text"
                                    value={materialSearch}
                                    onChange={e => setMaterialSearch(e.target.value)}
                                    placeholder="Cari bahan..."
                                    className="block w-full sm:w-48 xl:w-40 pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                    {loadingMat ? (
                        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
                    ) : flattenedMaterialsData.length > 0 ? (
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider">
                                        <th className="px-4 py-3 text-left font-semibold">Bahan</th>
                                        <th className="px-4 py-3 text-left font-semibold">Jenis</th>
                                        <th className="px-4 py-3 text-right font-semibold">Suplai</th>
                                        <th className="px-4 py-3 text-right font-semibold">Mutasi</th>
                                        <th className="px-4 py-3 text-right font-semibold">Stok</th>
                                        <th className="px-4 py-3 text-left font-semibold">Satuan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
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
                                                <td className="px-4 py-3 text-gray-700">{mat.nama}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide
                                                    ${mat.jenis === 'Baku' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                        {mat.jenis === 'Baku' ? 'Baku' : 'Penolong'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-emerald-600">{vSuplai > 0 ? `+${fmt(vSuplai)}` : '-'}</td>
                                                <td className="px-4 py-3 text-right font-mono text-red-500">{vMutasi > 0 ? `-${fmt(vMutasi)}` : '-'}</td>
                                                <td className={`px-4 py-3 text-right font-mono font-semibold ${vStok > 0 ? 'text-gray-900' : vStok < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                    {fmt(vStok)}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {unitFamily.length > 1 ? (
                                                        <select
                                                            value={currentUnit}
                                                            onChange={e => setSelectedUnits(prev => ({ ...prev, [unitStateKey]: e.target.value }))}
                                                            className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded px-1.5 py-1 outline-none focus:border-blue-500 cursor-pointer"
                                                        >
                                                            {unitFamily.map(u => <option key={u} value={u}>{u}</option>)}
                                                        </select>
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
                        <div className="p-8 text-center text-sm text-gray-500">
                            {matData?.products.length === 0 ? 'Belum ada data bahan baku.' : 'Pencarian tidak ditemukan.'}
                        </div>
                    )}
                    {matTotalPages > 1 && (
                        <Pagination currentPage={matPage} totalPages={matTotalPages} onPageChange={setMatPage} />
                    )}
                </div>

                {/* ── Production Summary Table ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Ringkasan Produksi</h2>
                                <p className="text-xs text-gray-500">Data kumulatif per produk</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select value={prodBulan} onChange={e => setProdBulan(Number(e.target.value))} className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none cursor-pointer focus:border-amber-500">
                                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                            <select value={prodTahun} onChange={e => setProdTahun(Number(e.target.value))} className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none cursor-pointer focus:border-amber-500">
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                                    <SearchIcon />
                                </div>
                                <input
                                    type="text"
                                    value={produksiSearch}
                                    onChange={e => setProduksiSearch(e.target.value)}
                                    placeholder="Cari produk / tab..."
                                    className="block w-full sm:w-40 xl:w-32 2xl:w-40 pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                    {loadingProd ? (
                        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" /></div>
                    ) : filteredProduksiData.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider">
                                        <th className="px-4 py-3 text-left font-semibold">Produk</th>
                                        <th className="px-4 py-3 text-left font-semibold">Tab</th>
                                        <th className="px-4 py-3 text-right font-semibold">Total Produksi</th>
                                        <th className="px-4 py-3 text-right font-semibold">Belum Sampling</th>
                                        <th className="px-4 py-3 text-right font-semibold">Proses Sampling</th>
                                        <th className="px-4 py-3 text-right font-semibold">COA</th>
                                        <th className="px-4 py-3 text-right font-semibold">Pengiriman Gudang</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedProduksiProducts.map((product) => {
                                        const tabs = product.production.tabs;
                                        if (tabs.length === 0) return null;
                                        return (
                                            <Fragment key={product.slug}>
                                                {tabs.map((tab, idx) => (
                                                    <tr key={`${product.slug}-${tab.tabName}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                                                        {idx === 0 && (
                                                            <td className="px-4 py-3 font-semibold text-gray-900 align-top" rowSpan={tabs.length + 1}>
                                                                {product.label}
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 text-gray-600 text-xs">{tab.tabName}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(tab.totalProduksi)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(tab.belumSampling)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(tab.prosesSampling)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(tab.coa)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(tab.pengirimanGudang)}</td>
                                                    </tr>
                                                ))}
                                                {/* Subtotal row */}
                                                <tr key={`${product.slug}-total`} className="bg-gray-50/50">
                                                    <td className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Total</td>
                                                    <td className="px-4 py-2 text-right font-mono font-bold text-gray-900">{fmt(product.production.totalProduksi)}</td>
                                                    <td className="px-4 py-2 text-right font-mono font-bold text-gray-900">{fmt(product.production.totalBelumSampling)}</td>
                                                    <td className="px-4 py-2 text-right font-mono font-bold text-gray-900">{fmt(product.production.totalProsesSampling)}</td>
                                                    <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700">{fmt(product.production.stokAkhir)}</td>
                                                    <td className="px-4 py-2 text-right font-mono font-bold text-gray-900">{fmt(product.production.totalPengiriman)}</td>
                                                </tr>
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-sm text-gray-500">
                            {prodData?.products.length === 0 ? 'Belum ada data produksi.' : 'Pencarian tidak ditemukan.'}
                        </div>
                    )}
                    {prodTotalPages > 1 && (
                        <Pagination currentPage={prodPage} totalPages={prodTotalPages} onPageChange={setProdPage} />
                    )}
                </div>

            </div> {/* End grid wrapper */}

            {/* ── Empty State ── */}
            {!globalLoading && stats.totalProducts === 0 && (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center mt-6">
                    <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                        <PackageIcon />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-1">Belum Ada Produk</h3>
                    <p className="text-sm text-gray-400">Tidak ada produk yang terdaftar untuk kategori ini.</p>
                </div>
            )}

            {/* ── Quick Access ── */}
            {!globalLoading && (matData?.products.length || 0) > 0 && (
                <div className="pt-2">
                    <h2 className="text-base font-semibold text-gray-800 mb-3">Akses Cepat</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                        {matData?.products.map(product => (
                            <a
                                key={product.slug}
                                href={`/dashboard/${categorySlug}/${product.slug}/produksi`}
                                className="group block rounded-xl border border-gray-200 bg-white p-4 hover:border-emerald-300 hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-center gap-2.5 mb-1.5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold">
                                        {product.label.charAt(0)}
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors truncate">{product.label}</h3>
                                </div>
                                <p className="text-[11px] text-gray-400 group-hover:text-gray-500">Lihat detail →</p>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Stat Card ─── */
function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: 'emerald' | 'blue' | 'amber' | 'violet';
}) {
    const colorMap = {
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-100', text: 'text-emerald-700' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-100', iconBg: 'bg-blue-100', text: 'text-blue-700' },
        amber: { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-100', text: 'text-amber-700' },
        violet: { bg: 'bg-violet-50', border: 'border-violet-100', iconBg: 'bg-violet-100', text: 'text-violet-700' },
    };
    const c = colorMap[color];

    return (
        <div className={`rounded-xl border ${c.border} ${c.bg} p-4 transition-shadow hover:shadow-md`}>
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 flex-shrink-0 rounded-lg ${c.iconBg} ${c.text} flex items-center justify-center`}>{icon}</div>
                <p className="text-xs font-medium text-gray-500">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${c.text} font-mono block truncate`}>{value}</p>
        </div>
    );
}

function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (p: number) => void }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white mt-auto">
            <span className="text-xs text-gray-500">
                Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex gap-1">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    Sebelumnya
                </button>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    Selanjutnya
                </button>
            </div>
        </div>
    );
}
