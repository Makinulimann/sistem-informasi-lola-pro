'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    getTabs,
    createTab,
    renameTab as renameTabApi,
    deleteTab as deleteTabApi,
    getProduksi,
    type ProduksiTab,
    type ProduksiRow,
    type ProduksiSummary,
} from '@/lib/produksiService';

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

function PlusIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function PencilIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
    );
}

function XIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

/* ─── Constants ─── */

const BULAN_OPTIONS = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
];

const BULAN_NAMES: Record<number, string> = Object.fromEntries(BULAN_OPTIONS.map(o => [o.value, o.label]));

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

function generateYearOptions() {
    const years = [];
    for (let y = currentYear; y >= currentYear - 3; y--) {
        years.push(y);
    }
    return years;
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
    const slug = productSlug || 'petro-gladiator';

    // ─── State ───
    const [bulan, setBulan] = useState<number | null>(currentMonth);
    const [tahun, setTahun] = useState<number | null>(currentYear);
    const [search, setSearch] = useState('');

    // Tabs
    const [tabs, setTabs] = useState<ProduksiTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<number | null>(null);
    const [tabsLoading, setTabsLoading] = useState(true);

    // Tab management modal
    const [showAddTab, setShowAddTab] = useState(false);
    const [newTabName, setNewTabName] = useState('');
    const [renamingTabId, setRenamingTabId] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Data
    const [data, setData] = useState<ProduksiRow[]>([]);
    const [summary, setSummary] = useState<ProduksiSummary>({ totalProduksi: 0, totalKeluar: 0, kumulatif: 0, stokAkhir: 0 });
    const [loading, setLoading] = useState(false);

    // ─── Fetch Tabs ───
    const fetchTabs = useCallback(async () => {
        setTabsLoading(true);
        try {
            const result = await getTabs(slug);
            setTabs(result);
            // If no tabs, auto-create "Padat" as default
            if (result.length === 0) {
                const defaultTab = await createTab(slug, 'Padat');
                setTabs([defaultTab]);
                setActiveTabId(defaultTab.id);
            } else if (!activeTabId || !result.find(t => t.id === activeTabId)) {
                setActiveTabId(result[0].id);
            }
        } catch (err) {
            console.error('Failed to load tabs:', err);
        } finally {
            setTabsLoading(false);
        }
    }, [slug, activeTabId]);

    useEffect(() => { fetchTabs(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Fetch Data ───
    const fetchData = useCallback(async () => {
        if (!activeTabId) return;
        setLoading(true);
        try {
            const result = await getProduksi(
                slug,
                activeTabId,
                bulan ?? undefined,
                tahun ?? undefined
            );
            setData(result.data);
            setSummary(result.summary);
        } catch (err) {
            console.error('Failed to load produksi data:', err);
            setData([]);
            setSummary({ totalProduksi: 0, totalKeluar: 0, kumulatif: 0, stokAkhir: 0 });
        } finally {
            setLoading(false);
        }
    }, [slug, activeTabId, bulan, tahun]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Tab actions ───
    const handleAddTab = async () => {
        if (!newTabName.trim()) return;
        try {
            const tab = await createTab(slug, newTabName.trim());
            setTabs(prev => [...prev, tab]);
            setActiveTabId(tab.id);
            setNewTabName('');
            setShowAddTab(false);
        } catch (err) {
            console.error('Failed to create tab:', err);
        }
    };

    const handleRenameTab = async (id: number) => {
        if (!renameValue.trim()) return;
        try {
            const updated = await renameTabApi(id, renameValue.trim());
            setTabs(prev => prev.map(t => t.id === id ? { ...t, nama: updated.nama } : t));
            setRenamingTabId(null);
            setRenameValue('');
        } catch (err) {
            console.error('Failed to rename tab:', err);
        }
    };

    const handleDeleteTab = async (id: number) => {
        if (!confirm('Hapus tab ini beserta semua data produksinya?')) return;
        try {
            await deleteTabApi(id);
            setTabs(prev => prev.filter(t => t.id !== id));
            if (activeTabId === id) {
                const remaining = tabs.filter(t => t.id !== id);
                setActiveTabId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (err) {
            console.error('Failed to delete tab:', err);
        }
    };

    // ─── Filter helpers ───
    const hasFilter = bulan !== null || tahun !== null;
    const clearFilter = () => {
        setBulan(null);
        setTahun(null);
    };

    const periodLabel = bulan && tahun
        ? `${BULAN_NAMES[bulan]} ${tahun}`
        : tahun
            ? `Tahun ${tahun}`
            : 'Semua Periode';

    // ─── Search ───
    const filtered = useMemo(() => {
        if (!search) return data;
        const q = search.toLowerCase();
        return data.filter(row =>
            new Date(row.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toLowerCase().includes(q) ||
            row.keterangan.toLowerCase().includes(q)
        );
    }, [data, search]);

    const { page, setPage, totalPages, paginated, total } = usePagination(filtered);

    // Reset page when filter/tab changes
    useEffect(() => { setPage(1); }, [activeTabId, bulan, tahun, search]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Date formatting ───
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const isToday = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
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
                    value={fmt(summary.totalProduksi)}
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
                    value={fmt(summary.stokAkhir)}
                    icon={<PackageIcon />}
                    color="violet"
                />
            </div>

            {/* Data Table Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Tabs + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
                    {/* Tabs */}
                    <div className="flex overflow-x-auto scrollbar-hide items-center">
                        {tabsLoading ? (
                            <div className="px-4 py-3 text-sm text-gray-400">Memuat tab...</div>
                        ) : (
                            <>
                                {tabs.map(tab => (
                                    <div key={tab.id} className="relative group flex items-center">
                                        {renamingTabId === tab.id ? (
                                            <div className="flex items-center gap-1 px-2 py-2">
                                                <input
                                                    autoFocus
                                                    value={renameValue}
                                                    onChange={e => setRenameValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleRenameTab(tab.id);
                                                        if (e.key === 'Escape') { setRenamingTabId(null); setRenameValue(''); }
                                                    }}
                                                    className="text-sm px-2 py-1 border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 w-24"
                                                />
                                                <button onClick={() => handleRenameTab(tab.id)} className="text-emerald-600 hover:text-emerald-800 p-1">
                                                    ✓
                                                </button>
                                                <button onClick={() => { setRenamingTabId(null); setRenameValue(''); }} className="text-gray-400 hover:text-gray-600 p-1">
                                                    <XIcon />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setActiveTabId(tab.id)}
                                                className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap
                                                    ${activeTabId === tab.id
                                                        ? 'text-emerald-700'
                                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {tab.nama}
                                                {activeTabId === tab.id && (
                                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t" />
                                                )}
                                            </button>
                                        )}

                                        {/* Tab context menu */}
                                        {activeTabId === tab.id && renamingTabId !== tab.id && (
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                                                <button
                                                    onClick={() => { setRenamingTabId(tab.id); setRenameValue(tab.nama); }}
                                                    className="p-1 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                    title="Rename"
                                                >
                                                    <PencilIcon />
                                                </button>
                                                {tabs.length > 1 && (
                                                    <button
                                                        onClick={() => handleDeleteTab(tab.id)}
                                                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Add tab button */}
                                {showAddTab ? (
                                    <div className="flex items-center gap-1 px-2 py-2">
                                        <input
                                            autoFocus
                                            value={newTabName}
                                            onChange={e => setNewTabName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleAddTab();
                                                if (e.key === 'Escape') { setShowAddTab(false); setNewTabName(''); }
                                            }}
                                            placeholder="Nama tab..."
                                            className="text-sm px-2 py-1 border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 w-28"
                                        />
                                        <button onClick={handleAddTab} className="text-emerald-600 hover:text-emerald-800 p-1 text-sm font-medium">
                                            ✓
                                        </button>
                                        <button onClick={() => { setShowAddTab(false); setNewTabName(''); }} className="text-gray-400 hover:text-gray-600 p-1">
                                            <XIcon />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowAddTab(true)}
                                        className="flex items-center gap-1 px-3 py-3 text-sm text-gray-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors whitespace-nowrap"
                                        title="Tambah Tab"
                                    >
                                        <PlusIcon />
                                    </button>
                                )}
                            </>
                        )}
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
                        {/* Left: Period filter (auto-apply) */}
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-sm font-medium text-gray-500 mr-1">Periode:</span>
                                <select
                                    value={bulan ?? ''}
                                    onChange={e => setBulan(e.target.value ? Number(e.target.value) : null)}
                                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    <option value="">Semua Bulan</option>
                                    {BULAN_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <span className="text-gray-300">/</span>
                                <select
                                    value={tahun ?? ''}
                                    onChange={e => setTahun(e.target.value ? Number(e.target.value) : null)}
                                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    <option value="">Semua Tahun</option>
                                    {generateYearOptions().map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            {hasFilter && (
                                <button
                                    onClick={clearFilter}
                                    className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5"
                                >
                                    <XIcon /> Hapus Filter
                                </button>
                            )}
                        </div>

                        {/* Right: Search */}
                        <div className="relative w-full md:w-64">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <SearchIcon />
                            </span>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari data..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Summary Strip */}
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
                                <span className="text-sm font-bold text-gray-800">{fmt(summary.stokAkhir)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">
                        <div className="inline-flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
                            Memuat data...
                        </div>
                    </div>
                )}

                {/* Desktop Table */}
                {!loading && (
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
                                    <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Ket.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                            {data.length === 0 ? 'Belum ada data produksi.' : 'Tidak ada data ditemukan.'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((row) => {
                                        const highlight = isToday(row.tanggal);
                                        return (
                                            <tr
                                                key={row.id}
                                                className={`transition-colors ${highlight
                                                    ? 'bg-amber-50/80 hover:bg-amber-50'
                                                    : 'hover:bg-emerald-50/30'
                                                    }`}
                                            >
                                                <td className={`px-4 py-3 font-medium whitespace-nowrap sticky left-0 z-10 ${highlight ? 'text-amber-700 bg-amber-50/80' : 'text-gray-700 bg-white'}`}>
                                                    {formatDate(row.tanggal)}
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
                                                <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                                                    {row.keterangan || '—'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Mobile Cards */}
                {!loading && (
                    <div className="sm:hidden divide-y divide-gray-100">
                        {paginated.length === 0 ? (
                            <div className="px-4 py-12 text-center text-gray-400">
                                {data.length === 0 ? 'Belum ada data produksi.' : 'Tidak ada data ditemukan.'}
                            </div>
                        ) : (
                            paginated.map((row) => {
                                const highlight = isToday(row.tanggal);
                                return (
                                    <div key={row.id} className={`p-4 space-y-3 ${highlight ? 'bg-amber-50/60' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm font-semibold ${highlight ? 'text-amber-700' : 'text-gray-800'}`}>
                                                {formatDate(row.tanggal)}
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
                                        </div>
                                        {row.keterangan && (
                                            <div className="pt-1 text-xs text-gray-500 border-t border-gray-100">
                                                Ket: <span className="font-medium text-gray-700">{row.keterangan}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Pagination */}
                {!loading && <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />}
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
    const c = COLOR_MAP[color] ?? COLOR_MAP.emerald;
    return (
        <div className={`${c.bg} ${c.border} border rounded-xl p-4 sm:p-5`}>
            <div className="flex items-center gap-3 mb-2">
                <div className={`${c.iconBg} ${c.text} p-2 rounded-lg`}>
                    {icon}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>{label}</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 pl-1">{value}</p>
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*  Shared Components                          */
/* ═══════════════════════════════════════════ */

function CalendarSmallIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
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
    if (total === 0) return null;

    return (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
                Menampilkan <span className="font-medium text-gray-700">{Math.min((page - 1) * 15 + 1, total)}</span>
                {' – '}
                <span className="font-medium text-gray-700">{Math.min(page * 15, total)}</span>
                {' dari '}
                <span className="font-medium text-gray-700">{total}</span> data
            </span>
            <div className="flex items-center gap-1">
                <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeftIcon />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc: (number | 'ellipsis')[], p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                        acc.push(p);
                        return acc;
                    }, [])
                    .map((item, i) =>
                        item === 'ellipsis' ? (
                            <span key={`e${i}`} className="px-2 text-gray-300">…</span>
                        ) : (
                            <button
                                key={item}
                                onClick={() => setPage(item as number)}
                                className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors
                                    ${page === item
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {item}
                            </button>
                        )
                    )}
                <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRightIcon />
                </button>
            </div>
        </div>
    );
}
