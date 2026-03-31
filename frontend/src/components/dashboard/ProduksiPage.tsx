'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    getTabs,
    createTab,
    renameTab as renameTabApi,
    deleteTab as deleteTabApi,
    getProduksi,
    saveProduksi,
    cancelProduksiWithMaterials,
    updateSampling,
    updateCOA,
    type ProduksiTab,
    type ProduksiRow,
    type ProduksiSummary,
} from '@/lib/produksiService';
import { BelumSamplingModal } from './BelumSamplingModal';

/* ─── Icons ─── */
function SearchIcon() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>); }
function DownloadIcon() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>); }
function FactoryIcon() { return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M17 18h1" /><path d="M12 18h1" /><path d="M7 18h1" /></svg>); }
function TrendUpIcon() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>); }
function PackageIcon() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>); }
function PlusIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>); }
function PencilIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>); }
function TrashIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>); }
function XIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>); }
function CheckIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>); }
function SettingsIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>); }
function CalendarSmallIcon() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>); }

/* ─── Constants ─── */
const BULAN_OPTIONS = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
    { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' },
];
const BULAN_NAMES: Record<number, string> = Object.fromEntries(BULAN_OPTIONS.map(o => [o.value, o.label]));
function getInitialMonth() { return new Date().getMonth() + 1; }
function getInitialYear() { return new Date().getFullYear(); }
function generateYearOptions() { const y = new Date().getFullYear(); const years = []; for (let i = y; i >= y - 3; i--) years.push(i); return years; }
function fmt(n: number | null | undefined): string { return Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* ─── Date Format: dd-MM-yyyy ─── */
function formatDateShort(dateStr: string): string {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
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
    const [bulan, setBulan] = useState<number>(getInitialMonth);
    const [tahun, setTahun] = useState<number>(getInitialYear);
    const [search, setSearch] = useState('');

    // Tabs
    const [tabs, setTabs] = useState<ProduksiTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<number | null>(null);
    const [tabsLoading, setTabsLoading] = useState(true);
    const [showTabConfig, setShowTabConfig] = useState(false);

    // Tab Config
    const [newTabName, setNewTabName] = useState('');
    const [editingTabId, setEditingTabId] = useState<number | null>(null);
    const [editTabValue, setEditTabValue] = useState('');

    // Data
    const [data, setData] = useState<ProduksiRow[]>([]);
    const [summary, setSummary] = useState<ProduksiSummary>({ totalProduksi: 0, totalKeluar: 0, kumulatif: 0, stokAkhir: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Editing Logic
    const [dirtyRows, setDirtyRows] = useState<Record<string, Partial<ProduksiRow>>>({});

    // Belum Sampling Modal
    const [bsModal, setBsModal] = useState<{ isOpen: boolean; tanggal: string; currentBs: number }>(
        { isOpen: false, tanggal: '', currentBs: 0 }
    );
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; rowDate: string | null }>({ isOpen: false, rowDate: null });

    // Cancel produksi
    const [cancelConfirm, setCancelConfirm] = useState<{ isOpen: boolean; tanggal: string }>({ isOpen: false, tanggal: '' });
    const [cancelLoading, setCancelLoading] = useState(false);

    // PS/COA Modal
    const [psModal, setPsModal] = useState<{ isOpen: boolean; tanggal: string }>({ isOpen: false, tanggal: '' });
    const [coaModal, setCoaModal] = useState<{ isOpen: boolean; tanggal: string }>({ isOpen: false, tanggal: '' });
    const [psValue, setPsValue] = useState<string>('');
    const [psBatchKode, setPsBatchKode] = useState<string>('');
    const [coaValue, setCoaValue] = useState<string>('');
    const [coaBatchKode, setCoaBatchKode] = useState<string>('');
    const [psSaving, setPsSaving] = useState(false);
    const [coaSaving, setCoaSaving] = useState(false);
    const [psError, setPsError] = useState<string | null>(null);
    const [coaError, setCoaError] = useState<string | null>(null);
    const [psDropdownOpen, setPsDropdownOpen] = useState(false);
    const [coaDropdownOpen, setCoaDropdownOpen] = useState(false);

    // ─── Fetch Tabs ───
    const fetchTabs = useCallback(async () => {
        setTabsLoading(true);
        setError(null);
        try {
            let result = await getTabs(slug);
            if (result.length === 0) {
                const defaultTab = await createTab(slug, 'Padat');
                result = [defaultTab];
            }
            setTabs(result);
            if (!activeTabId || !result.find(t => t.id === activeTabId)) {
                setActiveTabId(result[0].id);
            }
        } catch (err: unknown) {
            console.error('Failed to load tabs:', err);
            setError(`Gagal memuat tab: ${err instanceof Error ? err.message : 'Periksa koneksi backend.'}`);
        } finally {
            setTabsLoading(false);
        }
    }, [slug]);

    useEffect(() => { fetchTabs(); }, [fetchTabs]);

    // ─── Fetch Data ───
    const [availableBatches, setAvailableBatches] = useState<{ kode: string, bsWip: number, psWip: number, coaWip: number }[]>([]);

    const fetchData = useCallback(async () => {
        if (!activeTabId) return;
        setLoading(true);
        setError(null);
        setDirtyRows({});
        try {
            const result = await getProduksi(slug, activeTabId, bulan, tahun);
            setData(result.data);
            setSummary(result.summary);
            setAvailableBatches(result.availableBatches || []);
        } catch (err: unknown) {
            console.error('Failed to load produksi data:', err);
            setError(`Gagal memuat data: ${err instanceof Error ? err.message : 'Error tidak diketahui'}`);
            setData([]);
            setSummary({ totalProduksi: 0, totalKeluar: 0, kumulatif: 0, stokAkhir: 0 });
            setAvailableBatches([]);
        } finally {
            setLoading(false);
        }
    }, [slug, activeTabId, bulan, tahun]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Row Editing ───
    const handleInputChange = (date: string, field: keyof ProduksiRow, value: string | number) => {
        const original = data.find(r => r.tanggal === date);
        if (!original) return;

        setDirtyRows(prev => {
            const currentDirty = prev[date] || {};
            const updatedDirty = { ...currentDirty, [field]: value };

            if (updatedDirty[field] === original[field]) {
                delete updatedDirty[field];
            }

            if (Object.keys(updatedDirty).length === 0) {
                const { [date]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [date]: updatedDirty };
        });
    };

    /** Get the RAW stored value (or dirty override) for a field */
    const getRawValue = (row: ProduksiRow, field: keyof ProduksiRow): number => {
        const dirty = dirtyRows[row.tanggal];
        if (dirty && dirty[field] !== undefined) return Number(dirty[field]);
        return Number(row[field]);
    };

    /** Get value for keterangan field */
    const getTextValue = (row: ProduksiRow, field: keyof ProduksiRow): string => {
        const dirty = dirtyRows[row.tanggal];
        if (dirty && dirty[field] !== undefined) return String(dirty[field]);
        return String(row[field]);
    };

    const isRowDirty = (date: string) => {
        return !!dirtyRows[date] && Object.keys(dirtyRows[date]).length > 0;
    };

    const handleCancelRow = (date: string) => {
        setDirtyRows(prev => {
            const { [date]: _, ...rest } = prev;
            return rest;
        });
    };

    const handleSaveRow = async () => {
        const date = confirmModal.rowDate;
        if (!date || !activeTabId) return;

        const original = data.find(r => r.tanggal === date);
        const dirty = dirtyRows[date];
        if (!original || !dirty) {
            setConfirmModal({ isOpen: false, rowDate: null });
            return;
        }

        try {
            await saveProduksi({
                productSlug: slug,
                tabId: activeTabId,
                tanggal: original.tanggal,
                bs: dirty.bs !== undefined ? Number(dirty.bs) : original.bs,
                ps: dirty.ps !== undefined ? Number(dirty.ps) : original.ps,
                coa: dirty.coa !== undefined ? Number(dirty.coa) : original.coa,
                pg: dirty.pg !== undefined ? Number(dirty.pg) : original.pg,
                keterangan: dirty.keterangan !== undefined ? String(dirty.keterangan) : original.keterangan,
                batchKode: original.batchKode || '',
            });

            setConfirmModal({ isOpen: false, rowDate: null });
            setDirtyRows(prev => { const { [date]: _, ...rest } = prev; return rest; });
            await fetchData();
        } catch (err: Error | unknown) {
            console.error('Failed to save:', err);
            alert(`Gagal menyimpan data: ${err instanceof Error ? err.message : String(err)}`);
            setConfirmModal({ isOpen: false, rowDate: null });
        }
    };

    // ─── Tab Management ───
    const handleAddTab = async () => {
        if (!newTabName.trim()) return;
        try {
            await createTab(slug, newTabName);
            setNewTabName('');
            fetchTabs();
        } catch (err) {
            console.error(err);
            alert('Gagal menambah tab');
        }
    };

    const handleRenameTab = async (tabId: number) => {
        if (!editTabValue.trim()) return;
        try {
            await renameTabApi(tabId, editTabValue);
            setEditingTabId(null);
            fetchTabs();
        } catch (err) {
            console.error(err);
            alert('Gagal mengubah nama tab');
        }
    };

    const handleDeleteTab = async (tabId: number) => {
        if (!confirm('Hapus tab ini beserta seluruh datanya?')) return;
        try {
            await deleteTabApi(tabId);
            if (activeTabId === tabId) setActiveTabId(null);
            fetchTabs();
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus tab');
        }
    };

    // ─── Export ───
    const handleExportExcel = () => {
        const activeTabName = tabs.find(t => t.id === activeTabId)?.nama || '';
        const fullProductName = `${productName} ${activeTabName}`.trim();
        const exportDate = format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id });
        const period = `${BULAN_NAMES[bulan]} ${tahun}`;

        const exportData = filtered.map(row => {
            const bs = getRawValue(row, 'bs');
            const ps = getRawValue(row, 'ps');
            const coa = getRawValue(row, 'coa');
            const pg = getRawValue(row, 'pg');
            return {
                'Tanggal': formatDateShort(row.tanggal),
                'Belum Sampling': Math.max(0, bs - coa),
                'Proses Sampling': Math.max(0, ps - coa),
                'COA': coa,
                'Kumulatif Produksi': row.kumulatif,
                'Pengiriman Gudang': pg,
                'Stok Akhir': row.stokAkhir,
                'Keterangan': row.keterangan || ''
            };
        });

        import('@/lib/export-utils').then(({ downloadCSV }) => {
            downloadCSV(
                exportData,
                `Produksi_${fullProductName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`
            );
        });
    };

    const handleExportPDF = () => {
        const activeTabName = tabs.find(t => t.id === activeTabId)?.nama || '';
        const fullProductName = `${productName} ${activeTabName}`.trim();
        const exportDate = format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id });
        const period = `${BULAN_NAMES[bulan]} ${tahun}`;

        const exportData = filtered.map(row => {
            const bs = getRawValue(row, 'bs');
            const ps = getRawValue(row, 'ps');
            const coa = getRawValue(row, 'coa');
            const pg = getRawValue(row, 'pg');
            return {
                tanggal: formatDateShort(row.tanggal),
                belumSampling: fmt(Math.max(0, bs - coa)),
                prosesSampling: fmt(Math.max(0, ps - coa)),
                coa: fmt(coa),
                kumulatif: fmt(row.kumulatif),
                pg: fmt(pg),
                stok: fmt(row.stokAkhir),
                keterangan: row.keterangan || '-'
            };
        });

        import('@/lib/export-utils').then(({ printTable }) => {
            printTable({
                title: fullProductName,
                subtitle: `Periode: ${period}`,
                date: exportDate,
                data: exportData,
                columns: [
                    { key: 'tanggal', label: 'Tanggal' },
                    { key: 'belumSampling', label: 'Belum Sampling' },
                    { key: 'prosesSampling', label: 'Proses Sampling' },
                    { key: 'coa', label: 'COA' },
                    { key: 'kumulatif', label: 'Kumulatif' },
                    { key: 'pg', label: 'Peng. Gudang' },
                    { key: 'stok', label: 'Stok Akhir' },
                    { key: 'keterangan', label: 'Keterangan' }
                ]
            });
        });
    };

    // ─── Helpers ───
    const isToday = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    };

    const periodLabel = `${BULAN_NAMES[bulan]} ${tahun}`;
    const filtered = useMemo(() => {
        if (!search) return data;
        const q = search.toLowerCase();
        return data.filter(row =>
            formatDateShort(row.tanggal).toLowerCase().includes(q) ||
            row.keterangan.toLowerCase().includes(q)
        );
    }, [data, search]);

    const psAvailableBatches = useMemo(() => {
        return availableBatches.filter(b => b.bsWip > 0);
    }, [availableBatches]);

    const coaAvailableBatches = useMemo(() => {
        return availableBatches.filter(b => b.coaWip > 0);
    }, [availableBatches]);

    /* ═══════════════════════════════════════════ */
    /*  RENDER                                     */
    /* ═══════════════════════════════════════════ */
    return (
        <div className="space-y-8 p-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        Produksi {productName}
                    </h1>
                    <p className="text-base text-gray-500 mt-2">
                        Input dan monitoring data produksi harian
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard label="Periode" value={periodLabel} icon={<CalendarSmallIcon />} color="emerald" />
                <SummaryCard label="Total Produksi" value={fmt(summary.totalProduksi)} icon={<FactoryIcon />} color="blue" />
                <SummaryCard label="Kumulatif" value={fmt(summary.kumulatif)} icon={<TrendUpIcon />} color="amber" />
                <SummaryCard label="Stok Akhir" value={fmt(summary.stokAkhir)} icon={<PackageIcon />} color="violet" />
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                    <span className="text-sm font-medium text-red-800">{error}</span>
                    <button onClick={() => { setError(null); fetchTabs(); }} className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg">Coba Lagi</button>
                </div>
            )}

            {/* Main Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
                {/* Tabs Row */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/30">
                    <div className="flex overflow-x-auto scrollbar-hide items-center">
                        {tabsLoading ? (
                            <div className="px-6 py-4 text-gray-400">Memuat tab...</div>
                        ) : (
                            tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTabId(tab.id)}
                                    className={`px-6 py-4 text-base font-medium transition-colors relative whitespace-nowrap
                                    ${activeTabId === tab.id ? 'text-emerald-700 bg-white border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                                >
                                    {tab.nama}
                                </button>
                            ))
                        )}
                    </div>
                    <div className="px-6 py-3 flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => setShowTabConfig(!showTabConfig)}
                            className={`p-2.5 rounded-lg transition-colors ${showTabConfig ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                            title="Konfigurasi Tab"
                        >
                            <SettingsIcon />
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-base font-medium rounded-lg border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors">
                                    <DownloadIcon /> Export
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleExportExcel} className="py-2 px-4 text-base cursor-pointer">Excel</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportPDF} className="py-2 px-4 text-base cursor-pointer">PDF</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Tab Config Panel */}
                {showTabConfig && (
                    <div className="border-b border-gray-100 bg-gray-50/70 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-gray-700">Konfigurasi Tab</h3>
                            <button onClick={() => setShowTabConfig(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white"><XIcon /></button>
                        </div>
                        <div className="space-y-3 mb-4">
                            {tabs.map(tab => (
                                <div key={tab.id} className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
                                    {editingTabId === tab.id ? (
                                        <>
                                            <input autoFocus value={editTabValue} onChange={e => setEditTabValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRenameTab(tab.id); if (e.key === 'Escape') setEditingTabId(null); }} className="flex-1 text-base px-3 py-1.5 border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                                            <button onClick={() => handleRenameTab(tab.id)} className="text-emerald-600 hover:text-emerald-700 p-2 text-sm font-medium">Simpan</button>
                                            <button onClick={() => setEditingTabId(null)} className="text-gray-400 hover:text-gray-600 p-2"><XIcon /></button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-base text-gray-700 font-medium">{tab.nama}</span>
                                            <button onClick={() => { setEditingTabId(tab.id); setEditTabValue(tab.nama); }} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Rename"><PencilIcon /></button>
                                            <button onClick={() => handleDeleteTab(tab.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus"><TrashIcon /></button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <input value={newTabName} onChange={e => setNewTabName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddTab(); }} className="flex-1 text-base px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm" placeholder="Nama tab baru..." />
                            <button onClick={handleAddTab} disabled={!newTabName.trim()} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-base font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                                <PlusIcon /> Tambah
                            </button>
                        </div>
                    </div>
                )}

                {/* Filter Row */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-6 justify-between items-end">
                    <div className="flex items-center gap-3">
                        <span className="text-base font-medium text-gray-500">Periode:</span>
                        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                            <select value={bulan} onChange={e => setBulan(Number(e.target.value))} className="bg-transparent text-base font-medium text-gray-700 focus:outline-none cursor-pointer">
                                {BULAN_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <span className="text-gray-300 mx-1">/</span>
                            <select value={tahun} onChange={e => setTahun(Number(e.target.value))} className="bg-transparent text-base font-medium text-gray-700 focus:outline-none cursor-pointer">
                                {generateYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="relative w-full md:w-80">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></span>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari data..." className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
                    </div>
                </div>

                {/* ═══════════════════ TABLE ═══════════════════ */}
                {loading ? (
                    <div className="p-12 text-center text-gray-400 text-lg">Memuat data...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-200">
                            <thead>
                                {/* Row 1: Group headers */}
                                <tr className="bg-gray-50/80">
                                    <th rowSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 sticky left-0 bg-gray-50/80 z-10 text-left w-32">Tanggal</th>
                                    <th colSpan={3} className="px-4 py-3 font-semibold text-gray-700 text-center border border-gray-200 bg-gray-50/80">Produksi</th>
                                    <th rowSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right w-32">Kumulatif Produksi</th>
                                    <th rowSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-32">Pengiriman Gudang</th>
                                    <th rowSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right w-28">Stok Akhir</th>
                                    <th rowSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left w-44">Keterangan</th>
                                    <th rowSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-20">Aksi</th>
                                </tr>
                                {/* Row 2: Sub-headers under Produksi */}
                                <tr className="bg-gray-50/80">
                                    <th className="px-3 py-2.5 font-medium text-gray-600 text-center text-[11px] uppercase tracking-wider border border-gray-200 w-28">Belum Sampling</th>
                                    <th className="px-3 py-2.5 font-medium text-gray-600 text-center text-[11px] uppercase tracking-wider border border-gray-200 w-28">Proses Sampling</th>
                                    <th className="px-3 py-2.5 font-medium text-gray-600 text-center text-[11px] uppercase tracking-wider border border-gray-200 w-20">COA</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={9} className="p-12 text-center text-gray-400 text-sm border border-gray-200">Tidak ada data.</td></tr>
                                ) : (
                                    filtered.map(row => {
                                        const highlight = isToday(row.tanggal);
                                        const dirty = isRowDirty(row.tanggal);

                                        // Raw values (from original or dirty)
                                        const bs = getRawValue(row, 'bs');
                                        const ps = getRawValue(row, 'ps');
                                        const coa = getRawValue(row, 'coa');
                                        const pg = getRawValue(row, 'pg');

                                        // Cascading display values
                                        const coaDisplay = coa;
                                        const psDisplay = Math.max(0, ps - coa);
                                        const bsDisplay = Math.max(0, bs - coa);

                                        return (
                                            <tr key={row.tanggal} className={`${highlight ? 'bg-amber-50/50' : 'hover:bg-emerald-50/10'} transition-colors`}>
                                                {/* Tanggal */}
                                                <td className={`px-4 py-3 font-medium sticky left-0 z-10 border border-gray-200 ${highlight ? 'text-amber-700 bg-amber-50/90' : 'text-gray-700 bg-white'}`}>
                                                    {formatDateShort(row.tanggal)}
                                                </td>

                                                {/* ── Produksi Group ── */}
                                                {/* Belum Sampling: clickable cell → opens modal */}
                                                <td className="p-1 border border-gray-200">
                                                    <div className="flex items-center gap-0.5">
                                                        <button
                                                            onClick={() => setBsModal({ isOpen: true, tanggal: row.tanggal, currentBs: bs })}
                                                            className={`flex-1 h-9 px-3 text-right font-mono text-sm rounded-lg transition-all outline-none cursor-pointer
                                                                ${bsDisplay > 0
                                                                    ? 'text-emerald-700 font-semibold bg-emerald-50/50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300'
                                                                    : 'text-gray-400 bg-transparent hover:bg-gray-50 border border-transparent hover:border-gray-200'}`}
                                                            title="Klik untuk input produksi & bahan"
                                                        >
                                                            {bsDisplay > 0 ? fmt(bsDisplay) : '0'}
                                                        </button>
                                                        {bs > 0 && (
                                                            <button
                                                                onClick={() => setCancelConfirm({ isOpen: true, tanggal: row.tanggal })}
                                                                className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                                title="Batalkan pengisian produksi"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Proses Sampling: clickable button */}
                                                <td className="p-1 border border-gray-200">
                                                    <button
                                                        onClick={() => {
                                                            setPsModal({ isOpen: true, tanggal: row.tanggal });
                                                            setPsValue(ps > 0 ? String(ps) : '');
                                                            setPsBatchKode(row.psBatchKode || '');
                                                            setPsError(null);
                                                        }}
                                                        className={`w-full h-9 px-3 text-right font-mono text-sm rounded-lg transition-all outline-none cursor-pointer
                                                            ${psDisplay > 0
                                                                ? 'text-amber-700 font-semibold bg-amber-50/50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300'
                                                                : 'text-gray-400 bg-transparent hover:bg-gray-50 border border-transparent hover:border-gray-200'}`}
                                                        title={'Klik untuk input sampling'}
                                                    >
                                                        {psDisplay > 0 ? fmt(psDisplay) : '0'}
                                                    </button>
                                                </td>

                                                {/* COA: clickable button */}
                                                <td className="p-1 border border-gray-200">
                                                    <button
                                                        onClick={() => {
                                                            setCoaModal({ isOpen: true, tanggal: row.tanggal });
                                                            setCoaValue(coa > 0 ? String(coa) : '');
                                                            setCoaBatchKode(row.coaBatchKode || '');
                                                            setCoaError(null);
                                                        }}
                                                        className={`w-full h-9 px-3 text-right font-mono text-sm rounded-lg transition-all outline-none cursor-pointer
                                                            ${coa > 0
                                                                ? 'text-blue-700 font-semibold bg-blue-50/50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300'
                                                                : 'text-gray-400 bg-transparent hover:bg-gray-50 border border-transparent hover:border-gray-200'}`}
                                                        title={'Klik untuk input COA'}
                                                    >
                                                        {coa > 0 ? fmt(coa) : '0'}
                                                    </button>
                                                </td>

                                                {/* Kumulatif Produksi (computed - read only) */}
                                                <td className="px-4 py-3 text-right font-mono text-gray-700 tabular-nums border border-gray-200">
                                                    {fmt(row.kumulatif)}
                                                    {dirty && <span className="text-xs text-amber-500 block">*</span>}
                                                </td>

                                                {/* Pengiriman Gudang (editable) */}
                                                <td className="p-1 border border-gray-200">
                                                    <InputCell value={pg} onChange={v => handleInputChange(row.tanggal, 'pg', v)} />
                                                </td>

                                                {/* Stok Akhir (computed - read only) */}
                                                <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700 tabular-nums border border-gray-200">
                                                    {fmt(row.stokAkhir)}
                                                    {dirty && <span className="text-xs text-amber-500 block">*</span>}
                                                </td>

                                                {/* Keterangan */}
                                                <td className="p-1 border border-gray-200">
                                                    <input
                                                        type="text"
                                                        value={getTextValue(row, 'keterangan')}
                                                        onChange={e => handleInputChange(row.tanggal, 'keterangan', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-transparent bg-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg transition-all outline-none text-gray-600 truncate focus:text-clip"
                                                        placeholder="-"
                                                    />
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3 text-center border border-gray-200">
                                                    {dirty && (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button onClick={() => setConfirmModal({ isOpen: true, rowDate: row.tanggal })} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors shadow-sm" title="Simpan"><CheckIcon /></button>
                                                            <button onClick={() => handleCancelRow(row.tanggal)} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors shadow-sm" title="Batal"><XIcon /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Belum Sampling Modal */}
            <BelumSamplingModal
                isOpen={bsModal.isOpen}
                onClose={() => setBsModal({ isOpen: false, tanggal: '', currentBs: 0 })}
                onSaved={() => fetchData()}
                productSlug={slug}
                productFullName={`${productName} ${tabs.find(t => t.id === activeTabId)?.nama || ''}`.trim()}
                tabId={activeTabId || 0}
                tanggal={bsModal.tanggal}
                currentBs={bsModal.currentBs}
                currentBatchKode={data.find(r => r.tanggal === bsModal.tanggal)?.batchKode || ''}
                bulan={bulan}
                tahun={tahun}
            />

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Simpan Perubahan?</h3>
                        <p className="text-gray-600 mb-6">Apakah anda yakin ingin menyimpan perubahan data ini? Data produksi akan diperbarui.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmModal({ isOpen: false, rowDate: null })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Batal</button>
                            <button onClick={handleSaveRow} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium shadow-sm transition-colors">Ya, Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Produksi Confirmation Modal */}
            {cancelConfirm.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Batalkan Pengisian?</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-5">
                            Data produksi akan di-reset ke 0 dan semua mutasi bahan yang terkait akan dihapus. Stok bahan akan dikembalikan.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setCancelConfirm({ isOpen: false, tanggal: '' })}
                                disabled={cancelLoading}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            >
                                Tidak
                            </button>
                            <button
                                onClick={async () => {
                                    setCancelLoading(true);
                                    try {
                                        await cancelProduksiWithMaterials(slug, activeTabId || 0, cancelConfirm.tanggal);
                                        setCancelConfirm({ isOpen: false, tanggal: '' });
                                        fetchData();
                                    } catch (err) {
                                        console.error('Cancel failed:', err);
                                    } finally {
                                        setCancelLoading(false);
                                    }
                                }}
                                disabled={cancelLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
                            >
                                {cancelLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        Menghapus...
                                    </>
                                ) : (
                                    'Ya, Batalkan'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PS (Proses Sampling) Modal ── */}
            {psModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setPsModal({ isOpen: false, tanggal: '' }); setPsDropdownOpen(false); }}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6" /><path d="M10 9V3" /><path d="M14 9V3" /><path d="M6.864 18.364 10 9h4l3.136 9.364a2 2 0 0 1-1.894 2.636H8.758a2 2 0 0 1-1.894-2.636Z" /></svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Input Proses Sampling</h3>
                        </div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">Kode Batch Target</label>
                        <div className="relative mb-4">
                            <button
                                type="button"
                                onClick={() => setPsDropdownOpen(!psDropdownOpen)}
                                className="w-full flex items-center justify-between text-left text-base text-gray-900 px-4 py-3 bg-white border-2 border-amber-200 rounded-xl hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                            >
                                {psBatchKode ? (
                                    <span className="font-medium">{psBatchKode}</span>
                                ) : (
                                    <span className="text-gray-400">Pilih kode batch...</span>
                                )}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform duration-200 ${psDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                            </button>
                            {psDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                    {psAvailableBatches.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-gray-400 text-center">Tidak ada batch tersedia</div>
                                    ) : (
                                        psAvailableBatches.map(b => (
                                            <button
                                                key={b.kode}
                                                type="button"
                                                onClick={() => { setPsBatchKode(b.kode); setPsDropdownOpen(false); setPsError(null); }}
                                                className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-amber-50 transition-colors ${psBatchKode === b.kode ? 'bg-amber-50 border-l-3 border-amber-500' : ''}`}
                                            >
                                                <span className="font-medium text-gray-800">{b.kode}</span>
                                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Tersedia: {fmt(b.bsWip)}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Sampling</label>
                        <input
                            type="number"
                            step="any"
                            value={psValue}
                            onChange={e => { setPsValue(e.target.value); setPsError(null); }}
                            className="w-full text-xl font-mono font-bold text-gray-900 px-4 py-3 border-2 border-amber-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-gray-300 mb-4"
                            placeholder="0"
                        />

                        {psError && <p className="text-sm text-red-600 mb-3">{psError}</p>}

                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setPsModal({ isOpen: false, tanggal: '' }); setPsDropdownOpen(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Batal</button>
                            <button
                                onClick={async () => {
                                    const val = Number(psValue);
                                    if (!psBatchKode.trim()) { setPsError('Kode Batch wajib diisi'); return; }
                                    if (!psValue || val <= 0) { setPsError('Jumlah harus valid'); return; }

                                    const selectedBatch = psAvailableBatches.find(b => b.kode === psBatchKode);
                                    if (selectedBatch && val > selectedBatch.bsWip) {
                                        setPsError(`Jumlah melebihi batas (Maks. ${fmt(selectedBatch.bsWip)})`);
                                        return;
                                    }

                                    setPsSaving(true);
                                    try {
                                        await updateSampling({
                                            productSlug: slug,
                                            tabId: activeTabId || 0,
                                            tanggal: psModal.tanggal,
                                            batchKode: psBatchKode,
                                            ps: val,
                                        });
                                        setPsModal({ isOpen: false, tanggal: '' });
                                        setPsDropdownOpen(false);
                                        fetchData();
                                    } catch (err: unknown) {
                                        setPsError(err instanceof Error ? err.message : String(err) || 'Gagal menyimpan. Pastikan kode batch benar dan pernah diproduksi.');
                                    } finally {
                                        setPsSaving(false);
                                    }
                                }}
                                disabled={psSaving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white hover:bg-amber-700 rounded-xl font-medium shadow-sm transition-colors disabled:opacity-50"
                            >
                                {psSaving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Menyimpan...</> : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── COA Modal ── */}
            {coaModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setCoaModal({ isOpen: false, tanggal: '' }); setCoaDropdownOpen(false); }}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Input COA</h3>
                        </div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">Kode Batch Target</label>
                        <div className="relative mb-4">
                            <button
                                type="button"
                                onClick={() => setCoaDropdownOpen(!coaDropdownOpen)}
                                className="w-full flex items-center justify-between text-left text-base text-gray-900 px-4 py-3 bg-white border-2 border-blue-200 rounded-xl hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            >
                                {coaBatchKode ? (
                                    <span className="font-medium">{coaBatchKode}</span>
                                ) : (
                                    <span className="text-gray-400">Pilih kode batch...</span>
                                )}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform duration-200 ${coaDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                            </button>
                            {coaDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                    {coaAvailableBatches.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-gray-400 text-center">Tidak ada batch tersedia</div>
                                    ) : (
                                        coaAvailableBatches.map(b => (
                                            <button
                                                key={b.kode}
                                                type="button"
                                                onClick={() => { setCoaBatchKode(b.kode); setCoaDropdownOpen(false); setCoaError(null); }}
                                                className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-blue-50 transition-colors ${coaBatchKode === b.kode ? 'bg-blue-50 border-l-3 border-blue-500' : ''}`}
                                            >
                                                <span className="font-medium text-gray-800">{b.kode}</span>
                                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">Tersedia: {fmt(b.coaWip)}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah COA</label>
                        <input
                            type="number"
                            step="any"
                            value={coaValue}
                            onChange={e => { setCoaValue(e.target.value); setCoaError(null); }}
                            className="w-full text-xl font-mono font-bold text-gray-900 px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-gray-300 mb-4"
                            placeholder="0"
                        />
                        {coaError && <p className="text-sm text-red-600 mb-3">{coaError}</p>}

                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setCoaModal({ isOpen: false, tanggal: '' }); setCoaDropdownOpen(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Batal</button>
                            <button
                                onClick={async () => {
                                    const val = Number(coaValue);
                                    if (!coaBatchKode.trim()) { setCoaError('Kode Batch wajib diisi'); return; }
                                    if (!coaValue || val <= 0) { setCoaError('Jumlah harus valid'); return; }

                                    const selectedBatch = coaAvailableBatches.find(b => b.kode === coaBatchKode);
                                    if (selectedBatch && val > selectedBatch.coaWip) {
                                        setCoaError(`Jumlah melebihi batas (Maks. ${fmt(selectedBatch.coaWip)})`);
                                        return;
                                    }

                                    setCoaSaving(true);
                                    try {
                                        await updateCOA({
                                            productSlug: slug,
                                            tabId: activeTabId || 0,
                                            tanggal: coaModal.tanggal,
                                            batchKode: coaBatchKode,
                                            coa: val,
                                        });
                                        setCoaModal({ isOpen: false, tanggal: '' });
                                        setCoaDropdownOpen(false);
                                        fetchData();
                                    } catch (err: unknown) {
                                        setCoaError(err instanceof Error ? err.message : String(err) || 'Gagal menyimpan. Pastikan kode batch benar dan pernah diproduksi.');
                                    } finally {
                                        setCoaSaving(false);
                                    }
                                }}
                                disabled={coaSaving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium shadow-sm transition-colors disabled:opacity-50"
                            >
                                {coaSaving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Menyimpan...</> : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Input Cell ─── */
function InputCell({ value, onChange }: { value: string | number, onChange: (val: string) => void }) {
    return (
        <input
            type="number"
            step="any"
            value={value === 0 ? '' : value}
            onChange={e => onChange(e.target.value)}
            className="w-full h-10 px-3 text-right font-mono text-base border border-transparent bg-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg transition-all outline-none placeholder-gray-300 text-gray-700"
            placeholder="0"
        />
    );
}

/* ─── Summary Card ─── */
function SummaryCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
    const COLOR_MAP: Record<string, { bg: string, iconBg: string, text: string, border: string }> = {
        emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-100' },
        blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-100' },
        amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-100' },
        violet: { bg: 'bg-violet-50', iconBg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-100' },
    };
    const c = COLOR_MAP[color] ?? COLOR_MAP.emerald;
    return (
        <div className={`${c.bg} ${c.border} border rounded-xl p-5 sm:p-6`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`${c.iconBg} ${c.text} p-2.5 rounded-lg`}>{icon}</div>
                <span className={`text-sm font-semibold uppercase tracking-wider ${c.text}`}>{label}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 pl-1">{value}</p>
        </div>
    );
}
