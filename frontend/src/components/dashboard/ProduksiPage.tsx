'use client';

import { useState, useMemo, Fragment } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Icons ─── */

function SearchIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function DownloadIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}

function ChevronLeftIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}

function ChevronRightIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

function FactoryIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M17 18h1" /><path d="M12 18h1" /><path d="M7 18h1" />
        </svg>
    );
}

function TrendUpIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    );
}

function PackageIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
        </svg>
    );
}

/* ─── Types ─── */

interface ProduksiRow {
    tanggal: string;
    produksi: number;
    kumulatif: number;
    keluar: number;
    stokAkhir: number;
    coa: number;
    jam: string;
    keterangan: string;
    crPercent: number;
    analisa: string;
}

type ProductVariant = string;

/* ─── Mock Data ─── */



const BULAN_OPTIONS = [
    { value: '', label: 'Pilih Bulan' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
];

const TAHUN_OPTIONS = [
    { value: '', label: 'Pilih Tahun' },
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
];

const PRODUCT_VARIANTS: ProductVariant[] = [
    'Padat @1Kg',
    'Padat @2Kg',
    'Padat @10Kg',
    'Cair 1 Liter',
    'Cair 500ml',
];

const BULAN_NAMES: Record<string, string> = {
    '01': 'Januari',
    '02': 'Februari',
    '03': 'Maret',
    '04': 'April',
    '05': 'Mei',
    '06': 'Juni',
    '07': 'Juli',
    '08': 'Agustus',
    '09': 'September',
    '10': 'Oktober',
    '11': 'November',
    '12': 'Desember',
};

function getDaysInMonth(month: string, year: string): number {
    if (!month || !year) return 28;
    return new Date(parseInt(year), parseInt(month), 0).getDate();
}

function generateMockData(month: string, year: string): ProduksiRow[] {
    const days = getDaysInMonth(month, year);
    const monthName = BULAN_NAMES[month] || 'Februari';
    const baseStok = 1232.50;

    return Array.from({ length: days }, (_, i) => ({
        tanggal: `${String(i + 1).padStart(2, '0')} ${monthName} ${year || '2026'}`,
        produksi: 0,
        kumulatif: baseStok,
        keluar: 0,
        stokAkhir: baseStok,
        coa: 0,
        jam: '',
        keterangan: '',
        crPercent: 0,
        analisa: '',
    }));
}

/* ─── Number formatting ─── */

function fmt(n: number): string {
    return n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Pagination ─── */

function usePagination<T>(data: T[], pageSize = 15) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
    const paginated = data.slice((page - 1) * pageSize, page * pageSize);
    return { page, setPage, totalPages, paginated, total: data.length };
}

/* ═══════════════════════════════════════════ */
/*  Main Component                             */
/* ═══════════════════════════════════════════ */

interface ProduksiPageProps {
    productCategory: string;
    productName: string;
    productSlug?: string;
}

export function ProduksiPage({ productCategory, productName, productSlug }: ProduksiPageProps) {

    const [bulan, setBulan] = useState('02');
    const [tahun, setTahun] = useState('2026');
    const [activeVariant, setActiveVariant] = useState<ProductVariant>(PRODUCT_VARIANTS[0]);
    const [search, setSearch] = useState('');

    const data = useMemo(() => generateMockData(bulan, tahun), [bulan, tahun]);

    const filtered = useMemo(() =>
        data.filter((row) =>
            search === '' ||
            row.tanggal.toLowerCase().includes(search.toLowerCase()) ||
            row.keterangan.toLowerCase().includes(search.toLowerCase())
        ), [data, search]);

    const { page, setPage, totalPages, paginated, total } = usePagination(filtered);

    // Summary calculations
    const summary = useMemo(() => {
        const totalProd = data.reduce((acc, r) => acc + r.produksi, 0);
        const totalKeluar = data.reduce((acc, r) => acc + r.keluar, 0);
        const lastStok = data.length > 0 ? data[data.length - 1].stokAkhir : 0;
        const kumulatif = data.length > 0 ? data[data.length - 1].kumulatif : 0;
        return { totalProd, totalKeluar, lastStok, kumulatif };
    }, [data]);

    const periodLabel = bulan && tahun
        ? `${BULAN_NAMES[bulan]} ${tahun}`
        : 'Belum dipilih';

    const isToday = (tanggal: string) => {
        const today = new Date();
        const dayStr = String(today.getDate()).padStart(2, '0');
        const monthName = BULAN_NAMES[String(today.getMonth() + 1).padStart(2, '0')] || '';
        const yearStr = String(today.getFullYear());
        return tanggal === `${dayStr} ${monthName} ${yearStr}`;
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">{productCategory}</span>
                <span>/</span>
                <span className="text-gray-500">{productName}</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Produksi</span>
            </div>

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Produksi — {productName}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Data produksi harian dan stok untuk semua varian produk
                    </p>
                </div>
            </div>



            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    label="Periode"
                    value={periodLabel}
                    icon={<CalendarSmallIcon />}
                    color="emerald"
                />
                <SummaryCard
                    label="Total Produksi"
                    value={fmt(summary.totalProd)}
                    icon={<FactoryIcon />}
                    color="blue"
                />
                <SummaryCard
                    label="Kumulatif"
                    value={fmt(summary.kumulatif)}
                    icon={<TrendUpIcon />}
                    color="amber"
                />
                <SummaryCard
                    label="Stok Akhir"
                    value={fmt(summary.lastStok)}
                    icon={<PackageIcon />}
                    color="violet"
                />
            </div>

            {/* Product Variant Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Variant Tabs + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
                    {/* Scrollable tabs */}
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {PRODUCT_VARIANTS.map((variant) => (
                            <button
                                key={variant}
                                onClick={() => { setActiveVariant(variant); setPage(1); }}
                                className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap
                                    ${activeVariant === variant
                                        ? 'text-emerald-700'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {variant}
                                {activeVariant === variant && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Export */}
                    <div className="px-4 py-2 sm:py-0 flex items-center gap-2 shrink-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                                    <DownloadIcon />
                                    Export
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 opacity-50">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white">
                                <DropdownMenuLabel>Pilih Format</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer">
                                    <span className="mr-2">📊</span> Export to Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                    <span className="mr-2">📄</span> Export to PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Filter Row */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                        {/* Left: Period */}
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-sm font-medium text-gray-500 mr-1">Periode:</span>
                                <select
                                    value={bulan}
                                    onChange={(e) => { setBulan(e.target.value); setPage(1); }}
                                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    {BULAN_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <span className="text-gray-300">/</span>
                                <select
                                    value={tahun}
                                    onChange={(e) => { setTahun(e.target.value); setPage(1); }}
                                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    {TAHUN_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <button className="px-4 py-2 bg-white text-emerald-600 text-sm font-medium rounded-lg border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm">
                                Terapkan Filter
                            </button>
                        </div>

                        {/* Right: Search */}
                        <div className="relative w-full md:w-64">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <SearchIcon />
                            </span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Cari data..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Previous Month Summary Row */}
                {bulan && tahun && (
                    <div className="px-4 py-3 bg-emerald-50/60 border-b border-emerald-100">
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Bulan</span>
                                <span className="text-sm font-bold text-gray-800">{periodLabel}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Kumulatif</span>
                                <span className="text-sm font-bold text-gray-800">{fmt(summary.kumulatif)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Stok Akhir</span>
                                <span className="text-sm font-bold text-gray-800">{fmt(summary.lastStok)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Desktop Table */}
                <div className="overflow-x-auto hidden sm:block">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-left">
                                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap sticky left-0 bg-gray-50 z-10">Tanggal</th>
                                <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Prod.</th>
                                <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Kumulatif</th>
                                <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Keluar</th>
                                <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Stok Akhir</th>
                                <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">COA</th>
                                <th className="px-4 py-3 font-semibold text-gray-600 text-center whitespace-nowrap">Jam</th>
                                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Ket.</th>
                                <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">CR%</th>
                                <th className="px-4 py-3 font-semibold text-gray-600 text-center whitespace-nowrap">Analisa</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                                        Tidak ada data ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((row, i) => {
                                    const highlight = isToday(row.tanggal);
                                    return (
                                        <tr
                                            key={i}
                                            className={`transition-colors ${highlight
                                                ? 'bg-amber-50/80 hover:bg-amber-50'
                                                : 'hover:bg-emerald-50/30'
                                                }`}
                                        >
                                            <td className={`px-4 py-3 font-medium whitespace-nowrap sticky left-0 z-10 ${highlight ? 'text-amber-700 bg-amber-50/80' : 'text-gray-700 bg-white'}`}>
                                                {row.tanggal}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">
                                                {fmt(row.produksi)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-700 font-medium tabular-nums">
                                                {fmt(row.kumulatif)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">
                                                {fmt(row.keluar)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-emerald-700">
                                                {fmt(row.stokAkhir)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">
                                                {fmt(row.coa)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-500 text-xs">
                                                {row.jam || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate">
                                                {row.keterangan || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">
                                                {row.crPercent > 0 ? `${fmt(row.crPercent)}%` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-500 text-xs">
                                                {row.analisa || '—'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden divide-y divide-gray-100">
                    {paginated.length === 0 ? (
                        <div className="px-4 py-12 text-center text-gray-400">Tidak ada data ditemukan.</div>
                    ) : (
                        paginated.map((row, i) => {
                            const highlight = isToday(row.tanggal);
                            return (
                                <div key={i} className={`p-4 space-y-3 ${highlight ? 'bg-amber-50/60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm font-semibold ${highlight ? 'text-amber-700' : 'text-gray-800'}`}>
                                            {row.tanggal}
                                        </span>
                                        {highlight && (
                                            <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                                Hari ini
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                        <div>
                                            <span className="text-[11px] text-gray-400 uppercase tracking-wide">Produksi</span>
                                            <p className="font-mono text-gray-700">{fmt(row.produksi)}</p>
                                        </div>
                                        <div>
                                            <span className="text-[11px] text-gray-400 uppercase tracking-wide">Kumulatif</span>
                                            <p className="font-mono text-gray-700 font-medium">{fmt(row.kumulatif)}</p>
                                        </div>
                                        <div>
                                            <span className="text-[11px] text-gray-400 uppercase tracking-wide">Keluar</span>
                                            <p className="font-mono text-gray-700">{fmt(row.keluar)}</p>
                                        </div>
                                        <div>
                                            <span className="text-[11px] text-gray-400 uppercase tracking-wide">Stok Akhir</span>
                                            <p className="font-mono font-semibold text-emerald-700">{fmt(row.stokAkhir)}</p>
                                        </div>
                                        <div>
                                            <span className="text-[11px] text-gray-400 uppercase tracking-wide">COA</span>
                                            <p className="font-mono text-gray-700">{fmt(row.coa)}</p>
                                        </div>
                                        <div>
                                            <span className="text-[11px] text-gray-400 uppercase tracking-wide">CR%</span>
                                            <p className="font-mono text-gray-700">{row.crPercent > 0 ? `${fmt(row.crPercent)}%` : '—'}</p>
                                        </div>
                                    </div>
                                    {(row.jam || row.keterangan || row.analisa) && (
                                        <div className="flex flex-wrap gap-3 pt-1 text-xs text-gray-500 border-t border-gray-100">
                                            {row.jam && <span>Jam: <span className="font-medium text-gray-700">{row.jam}</span></span>}
                                            {row.keterangan && <span>Ket: <span className="font-medium text-gray-700">{row.keterangan}</span></span>}
                                            {row.analisa && <span>Analisa: <span className="font-medium text-gray-700">{row.analisa}</span></span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*  Summary Card                               */
/* ═══════════════════════════════════════════ */

const COLOR_MAP: Record<string, { bg: string; iconBg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-100' },
    amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-100' },
    violet: { bg: 'bg-violet-50', iconBg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-100' },
};

function SummaryCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
    const c = COLOR_MAP[color] || COLOR_MAP.emerald;
    return (
        <div className={`rounded-xl border ${c.border} ${c.bg} p-4 transition-shadow hover:shadow-md`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${c.iconBg} flex items-center justify-center ${c.text}`}>
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{label}</p>
                    <p className={`text-lg font-bold ${c.text} truncate`}>{value}</p>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*  Shared Components                          */
/* ═══════════════════════════════════════════ */

function CalendarSmallIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

function Pagination({
    page,
    totalPages,
    total,
    setPage,
}: {
    page: number;
    totalPages: number;
    total: number;
    setPage: (p: number) => void;
}) {
    const from = total === 0 ? 0 : (page - 1) * 15 + 1;
    const to = Math.min(page * 15, total);

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 sm:mb-0">
                Showing {from} to {to} of {total} entries
            </p>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeftIcon />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-[32px] py-1 rounded-md text-sm font-medium transition-colors
                            ${p === page
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {p}
                    </button>
                ))}
                <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRightIcon />
                </button>
            </div>
        </div>
    );
}
