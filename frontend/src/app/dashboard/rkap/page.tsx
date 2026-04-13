'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, RefreshCw, Layers, ChevronLeftIcon, ChevronRightIcon, UploadIcon, FileSpreadsheet, TrendingUp, Settings } from 'lucide-react';
import { AppButton } from '@/components/ui/app-button';
import { useToast } from '@/components/ui/toast';
import { rkoService, RkoTarget, RkoReportRow } from '@/services/rkoService';
import * as XLSX from 'xlsx';

/* ─── Types ─── */
interface MonthTarget { target_volume: number; target_kemasan: number; }
interface ProductRow {
    product_slug: string;
    tab_name: string;
    months: Record<number, MonthTarget>;
    total_volume: number;
    total_kemasan: number;
}
interface ReportProduct {
    product_slug: string;
    tab_name: string;
    jenis_produk: string;
    kemasan: string;
    months: Record<number, { target_volume: number; target_kemasan: number; real_volume: number; real_kemasan: number }>;
    annual: { target_volume: number; target_kemasan: number; real_volume: number; real_kemasan: number };
}

type TabKey = 'konfigurasi' | 'laporan';

/* ─── Constants ─── */
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const TABS: { key: TabKey; label: string }[] = [
    { key: 'konfigurasi', label: 'Konfigurasi RKO' },
    { key: 'laporan', label: 'Laporan Realisasi' },
];

/* ─── Helpers ─── */
function calcTotals(months: Record<number, MonthTarget>) {
    let tv = 0, tk = 0;
    for (let m = 1; m <= 12; m++) {
        tv += Number(months[m]?.target_volume || 0);
        tk += Number(months[m]?.target_kemasan || 0);
    }
    // Clean up floating point precision issues
    return {
        tv: Math.round(tv * 10000) / 10000,
        tk: Math.round(tk * 10000) / 10000
    };
}
function emptyMonths(): Record<number, MonthTarget> {
    const m: Record<number, MonthTarget> = {};
    for (let i = 1; i <= 12; i++) m[i] = { target_volume: 0, target_kemasan: 0 };
    return m;
}
const fmt = (n: number) => n ? n.toLocaleString('id-ID', { maximumFractionDigits: 3 }) : '-';
const pct = (real: number, target: number) => target > 0 ? Math.round((real / target) * 100) : null;

/* ─── Number Input Cell ─── */
function NumCell({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent?: 'blue' | 'amber' | 'emerald' }) {
    const ring = accent === 'blue' ? 'focus:ring-blue-400' : accent === 'amber' ? 'focus:ring-amber-400' : 'focus:ring-emerald-500';
    return (
        <input
            type="number"
            value={value || ''}
            onChange={e => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
            className={`w-full h-9 px-1.5 text-right text-sm bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-inset ${ring} transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            placeholder="-"
        />
    );
}

/* ─── Pct Badge ─── */
function PctBadge({ real, target }: { real: number; target: number }) {
    const p = pct(real, target);
    if (p === null) return <span className="text-gray-300 text-xs">-</span>;
    const color = p >= 100 ? 'bg-emerald-100 text-emerald-700' : p >= 80 ? 'bg-blue-100 text-blue-700' : p >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600';
    return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>{p}%</span>;
}


/* ─── Main Page ─── */
export default function RKAPPage() {
    const [activeTab, setActiveTab] = useState<TabKey>('konfigurasi');
    const [year, setYear] = useState(new Date().getFullYear());
    const [rows, setRows] = useState<ProductRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth() + 1);

    // Report tab state
    const [reportRows, setReportRows] = useState<ReportProduct[]>([]);
    const [reportLoading, setReportLoading] = useState(false);

    const toast = useToast();

    /* ── Fetch config data ── */
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await rkoService.getAll(year);
            const grouped: Record<string, ProductRow> = {};
            (data || []).forEach((t: any) => {
                const key = `${t.product_slug}||${t.tab_name}`;
                if (!grouped[key]) {
                    grouped[key] = { product_slug: t.product_slug, tab_name: t.tab_name, months: emptyMonths(), total_volume: 0, total_kemasan: 0 };
                }
                grouped[key].months[t.bulan] = { target_volume: Number(t.target_volume || 0), target_kemasan: Number(t.target_kemasan || 0) };
            });
            const processed = Object.values(grouped).map(r => {
                const { tv, tk } = calcTotals(r.months);
                return { ...r, total_volume: tv, total_kemasan: tk };
            }).sort((a, b) => a.tab_name.localeCompare(b.tab_name));
            setRows(processed);
            setDirty(false);
        } catch (err: any) {
            toast.error('Gagal', err.message || 'Gagal memuat data RKO');
        } finally { setLoading(false); }
    }, [year]);

    /* ── Fetch report data ── */
    const fetchReport = useCallback(async () => {
        setReportLoading(true);
        try {
            const data = await rkoService.getReport(year);
            // Group by product
            const grouped: Record<string, ReportProduct> = {};
            (data || []).forEach((r: RkoReportRow) => {
                const key = r.product_slug + '||' + r.tab_name;
                if (!grouped[key]) {
                    grouped[key] = {
                        product_slug: r.product_slug,
                        tab_name: r.tab_name,
                        jenis_produk: r.jenis_produk || '',
                        kemasan: r.kemasan || '',
                        months: {},
                        annual: { target_volume: 0, target_kemasan: 0, real_volume: 0, real_kemasan: 0 },
                    };
                }
                grouped[key].months[r.bulan] = {
                    target_volume: r.target_volume,
                    target_kemasan: r.target_kemasan,
                    real_volume: r.real_volume,
                    real_kemasan: r.real_kemasan,
                };
                grouped[key].annual.target_volume += r.target_volume;
                grouped[key].annual.target_kemasan += r.target_kemasan;
                grouped[key].annual.real_volume += r.real_volume;
                grouped[key].annual.real_kemasan += r.real_kemasan;
            });
            setReportRows(Object.values(grouped).sort((a, b) => a.tab_name.localeCompare(b.tab_name)));
        } catch (err: any) {
            toast.error('Gagal', err.message || 'Gagal memuat laporan');
        } finally { setReportLoading(false); }
    }, [year]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { if (activeTab === 'laporan') fetchReport(); }, [activeTab, fetchReport]);

    /* ── Change handlers ── */
    const handleMonthCell = (slug: string, tabName: string, month: number, field: keyof MonthTarget, val: number) => {
        setRows(prev => prev.map(r => {
            if (r.product_slug !== slug || r.tab_name !== tabName) return r;
            const newMonths = { ...r.months, [month]: { ...r.months[month], [field]: val } };
            const { tv, tk } = calcTotals(newMonths);
            return { ...r, months: newMonths, total_volume: tv, total_kemasan: tk };
        }));
        setDirty(true);
    };

    const handleTotalVolume = (slug: string, tabName: string, val: number) => {
        const perMonth = Math.round((val / 12) * 100) / 100;
        setRows(prev => prev.map(r => {
            if (r.product_slug !== slug || r.tab_name !== tabName) return r;
            const newMonths: Record<number, MonthTarget> = {};
            let sumSoFar = 0;
            for (let m = 1; m <= 11; m++) {
                newMonths[m] = { target_volume: perMonth, target_kemasan: r.months[m].target_kemasan };
                sumSoFar += perMonth;
            }
            // Put the remainder in the 12th month to avoid rounding mismatches (e.g. 5.04 vs 5)
            const remaining = Math.round((val - sumSoFar) * 100) / 100;
            newMonths[12] = { target_volume: remaining, target_kemasan: r.months[12].target_kemasan };

            const { tv, tk } = calcTotals(newMonths);
            return { ...r, months: newMonths, total_volume: tv, total_kemasan: tk };
        }));
        setDirty(true);
    };

    const handleTotalKemasan = (slug: string, tabName: string, val: number) => {
        const perMonth = Math.round((val / 12) * 100) / 100;
        setRows(prev => prev.map(r => {
            if (r.product_slug !== slug || r.tab_name !== tabName) return r;
            const newMonths: Record<number, MonthTarget> = {};
            let sumSoFar = 0;
            for (let m = 1; m <= 11; m++) {
                newMonths[m] = { target_volume: r.months[m].target_volume, target_kemasan: perMonth };
                sumSoFar += perMonth;
            }
            // Put the remainder in the 12th month
            const remaining = Math.round((val - sumSoFar) * 100) / 100;
            newMonths[12] = { target_volume: r.months[12].target_volume, target_kemasan: remaining };

            const { tv, tk } = calcTotals(newMonths);
            return { ...r, months: newMonths, total_volume: tv, total_kemasan: tk };
        }));
        setDirty(true);
    };

    /* ── Import from Excel ── */
    const handleImport = (importedTargets: RkoTarget[]) => {
        // Merge imported targets into current rows
        setRows(prev => {
            const next = [...prev];
            importedTargets.forEach(t => {
                if (t.tahun !== year) return;
                const idx = next.findIndex(r => r.product_slug === t.product_slug && r.tab_name === t.tab_name);
                if (idx >= 0) {
                    next[idx] = {
                        ...next[idx],
                        months: { ...next[idx].months, [t.bulan]: { target_volume: t.target_volume, target_kemasan: t.target_kemasan } }
                    };
                    const { tv, tk } = calcTotals(next[idx].months);
                    next[idx] = { ...next[idx], total_volume: tv, total_kemasan: tk };
                }
            });
            return next;
        });
        setDirty(true);
        toast.success('Import Berhasil', `${importedTargets.length} baris data berhasil diimport. Klik Simpan untuk menyimpan.`);
    };

    /* ── Save ── */
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: RkoTarget[] = [];
            rows.forEach(r => {
                for (let m = 1; m <= 12; m++) {
                    payload.push({ product_slug: r.product_slug, tab_name: r.tab_name, tahun: year, bulan: m, target_volume: r.months[m].target_volume, target_kemasan: r.months[m].target_kemasan });
                }
            });
            await rkoService.bulkUpsert(payload);
            setDirty(false);
            toast.success('Berhasil', 'Data RKO berhasil disimpan.');
        } catch (err: any) {
            toast.error('Gagal', err.message || 'Gagal menyimpan data.');
        } finally { setSaving(false); }
    };

    /* ── Grand totals (config tab) ── */
    const grandTV = rows.reduce((s, r) => s + r.total_volume, 0);
    const grandTK = rows.reduce((s, r) => s + r.total_kemasan, 0);
    const grandMonths: Record<number, { v: number; k: number }> = {};
    for (let m = 1; m <= 12; m++) {
        grandMonths[m] = { v: rows.reduce((s, r) => s + (r.months[m]?.target_volume || 0), 0), k: rows.reduce((s, r) => s + (r.months[m]?.target_kemasan || 0), 0) };
    }

    /* ── Report groups ── */
    const groups = [
        { label: 'Produk Cair', filter: (r: ReportProduct) => r.jenis_produk?.toLowerCase().includes('cair') || r.tab_name?.toLowerCase().includes('cair') },
        { label: 'Produk Padat', filter: (r: ReportProduct) => !r.jenis_produk?.toLowerCase().includes('cair') && !r.tab_name?.toLowerCase().includes('cair') },
    ];

    const productSlugsForImport = rows.map(r => ({ tab_name: r.tab_name, product_slug: r.product_slug }));

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">Produk Pengembangan</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">RKAP / RKO</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        RKAP / RKO
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Target & realisasi produksi tahunan per jenis produk</p>
                </div>
                {activeTab === 'konfigurasi' && (
                    <div className="flex items-center gap-2">
                        <AppButton variant="secondary" onClick={fetchData} disabled={loading} icon={<RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />} />
                        <AppButton variant="primary" onClick={handleSave} disabled={saving || !dirty} icon={<Save className="size-4" />} className="relative">
                            {dirty && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white" />}
                            {saving ? 'Menyimpan...' : 'Simpan RKO'}
                        </AppButton>
                    </div>
                )}
                {activeTab === 'laporan' && (
                    <AppButton variant="secondary" onClick={fetchReport} disabled={reportLoading} icon={<RefreshCw className={`size-4 ${reportLoading ? 'animate-spin' : ''}`} />}>
                        Refresh
                    </AppButton>
                )}
            </div>

            {/* Main Card */}
            <div className="bg-white border border-gray-200 overflow-hidden">
                {/* Tabs + Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
                    <div className="flex">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative
                                    ${activeTab === tab.key ? 'text-emerald-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                            >
                                {tab.label}
                                {activeTab === tab.key && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t" />}
                            </button>
                        ))}
                    </div>
                    {/* Year picker + month buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2 gap-2">
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-gray-500">Tahun</span>
                            <AppButton variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-emerald-600" onClick={() => setYear(y => y - 1)} icon={<ChevronLeftIcon className="size-4" />} />
                            <span className="text-sm font-bold text-gray-800 w-12 text-center">{year}</span>
                            <AppButton variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-emerald-600" onClick={() => setYear(y => y + 1)} icon={<ChevronRightIcon className="size-4" />} />
                        </div>
                        <span className="text-gray-200 hidden sm:block">|</span>
                        <div className="hidden sm:flex items-center gap-1">
                            {MONTH_NAMES_SHORT.map((m, i) => (
                                <button key={i} onClick={() => setActiveMonth(i + 1)} className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${activeMonth === i + 1 ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Konfigurasi Tab ── */}
                {activeTab === 'konfigurasi' && (
                    <>
                        <div className="text-xs text-gray-400 italic px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                            Edit kolom <b>Total</b> untuk breakdown ke 12 bulan. Edit cell bulan untuk penyesuaian manual.
                        </div>
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                                </div>
                            ) : rows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Layers className="size-12 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">Tidak ada data produk ditemukan</p>
                                    <p className="text-xs mt-1">Pastikan tabel produksi_tabs sudah terisi</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm border-collapse min-w-max">
                                    <thead className="sticky top-0 z-40">
                                        <tr className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                                            <th rowSpan={2} className="px-4 py-2.5 text-left font-semibold border-b border-r border-gray-200 sticky left-0 z-40 bg-gray-50" style={{ minWidth: 50, maxWidth: 50 }}>No</th>
                                            <th rowSpan={2} className="px-4 py-2.5 text-left font-semibold border-b border-r border-gray-200 sticky z-40 bg-gray-50" style={{ left: 50, minWidth: 250, maxWidth: 280 }}>Jenis Produk</th>
                                            <th colSpan={2} className="px-3 py-2 text-center font-bold border-b border-r border-gray-200 bg-emerald-50 text-emerald-800 sticky z-40" style={{ left: 300, minWidth: 160, maxWidth: 160 }}>Total Tahunan</th>
                                            {MONTH_NAMES_SHORT.map((m, i) => (
                                                <th key={i} colSpan={2} className={`px-2 py-2 text-center font-semibold border-b border-r border-gray-200 ${activeMonth === i + 1 ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>{m}</th>
                                            ))}
                                        </tr>
                                        <tr className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wider">
                                            <th className="px-2 py-1.5 text-center border-b border-r border-gray-200 font-bold bg-emerald-50 uppercase text-emerald-700 sticky z-40" style={{ left: 300, minWidth: 80, maxWidth: 80 }}>Volume</th>
                                            <th className="px-2 py-1.5 text-center border-b border-r border-gray-200 font-bold bg-emerald-50 uppercase text-emerald-700 sticky z-40" style={{ left: 380, minWidth: 80, maxWidth: 80 }}>Kemasan</th>
                                            {MONTH_NAMES_SHORT.map((_, i) => (
                                                <React.Fragment key={i}>
                                                    <th className={`px-1 py-1.5 text-center border-b border-r border-gray-200 min-w-[48px] font-semibold ${activeMonth === i + 1 ? 'bg-blue-50/80 text-blue-600' : ''}`}>Vol</th>
                                                    <th className={`px-1 py-1.5 text-center border-b border-r border-gray-200 min-w-[42px] font-semibold ${activeMonth === i + 1 ? 'bg-blue-50/80 text-blue-600' : ''}`}>Dus</th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rows.map((row, idx) => (
                                            <tr key={`${row.product_slug}||${row.tab_name}`} className="group hover:bg-emerald-50/20 transition-colors">
                                                <td className="px-4 py-0 text-center text-gray-400 font-medium border-r border-gray-100 sticky left-0 z-20 bg-white group-hover:bg-emerald-50" style={{ minWidth: 50, maxWidth: 50 }}>{idx + 1}</td>
                                                <td className="px-4 py-0 font-medium text-gray-800 border-r border-gray-200 sticky z-20 bg-white group-hover:bg-emerald-50 whitespace-nowrap" style={{ left: 50, minWidth: 250, maxWidth: 280 }}>
                                                    <span className="block py-2 truncate" title={row.tab_name}>{row.tab_name}</span>
                                                </td>
                                                <td className="p-0 border-r border-gray-200 sticky z-20 bg-emerald-50 hover:bg-emerald-100" style={{ left: 300, minWidth: 80, maxWidth: 80 }}>
                                                    <NumCell value={row.total_volume} onChange={v => handleTotalVolume(row.product_slug, row.tab_name, v)} accent="emerald" />
                                                </td>
                                                <td className="p-0 border-r border-gray-200 sticky z-20 bg-emerald-50 hover:bg-emerald-100" style={{ left: 380, minWidth: 80, maxWidth: 80 }}>
                                                    <NumCell value={row.total_kemasan} onChange={v => handleTotalKemasan(row.product_slug, row.tab_name, v)} accent="emerald" />
                                                </td>
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                    <React.Fragment key={m}>
                                                        <td className={`p-0 border-r border-gray-100 transition-colors ${activeMonth === m ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                                                            <NumCell value={row.months[m]?.target_volume || 0} onChange={v => handleMonthCell(row.product_slug, row.tab_name, m, 'target_volume', v)} accent={activeMonth === m ? 'blue' : undefined} />
                                                        </td>
                                                        <td className={`p-0 border-r border-gray-100 transition-colors ${activeMonth === m ? 'bg-blue-50/30' : 'hover:bg-amber-50/10'}`}>
                                                            <NumCell value={row.months[m]?.target_kemasan || 0} onChange={v => handleMonthCell(row.product_slug, row.tab_name, m, 'target_kemasan', v)} accent={activeMonth === m ? 'blue' : 'amber'} />
                                                        </td>
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="sticky bottom-0 z-40">
                                        <tr className="bg-emerald-900 text-white text-xs font-semibold">
                                            <td colSpan={2} className="px-4 py-2.5 text-right sticky left-0 bg-emerald-900 border-r border-emerald-800 z-50">TOTAL</td>
                                            <td className="px-3 py-2.5 text-right sticky bg-emerald-900 border-r border-emerald-800 text-emerald-200 z-50" style={{ left: 300, minWidth: 80, maxWidth: 80 }}>{fmt(grandTV)}</td>
                                            <td className="px-3 py-2.5 text-right sticky bg-emerald-900 border-r border-emerald-800 text-emerald-200 z-50" style={{ left: 380, minWidth: 80, maxWidth: 80 }}>{fmt(grandTK)}</td>
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <React.Fragment key={m}>
                                                    <td className={`px-1.5 py-2.5 text-right border-r border-emerald-800 ${activeMonth === m ? 'text-blue-200 bg-emerald-800/50' : 'text-emerald-100'}`}>{fmt(grandMonths[m]?.v)}</td>
                                                    <td className={`px-1.5 py-2.5 text-right border-r border-emerald-800 ${activeMonth === m ? 'text-blue-200 bg-emerald-800/50' : 'text-emerald-100'}`}>{fmt(grandMonths[m]?.k)}</td>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </>
                )}

                {/* ── Laporan Realisasi Tab ── */}
                {activeTab === 'laporan' && (
                    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                        {reportLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                            </div>
                        ) : reportRows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <TrendingUp className="size-12 mb-3 opacity-20" />
                                <p className="text-sm font-medium">Belum ada data</p>
                                <p className="text-xs mt-1">Pastikan data RKO sudah dikonfigurasi di tab Konfigurasi RKO</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm border-collapse min-w-max">
                                <thead className="sticky top-0 z-20">
                                    <tr className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                                        <th rowSpan={3} className="px-3 py-2 text-center border-b border-r border-gray-200 sticky left-0 z-30 bg-gray-50 w-8">No</th>
                                        <th rowSpan={3} className="px-4 py-2 text-left border-b border-r border-gray-200 sticky left-8 z-30 bg-gray-50 min-w-[200px]">Nama Produk</th>
                                        {/* Annual total */}
                                        <th colSpan={4} className="px-3 py-2 text-center font-bold border-b border-r border-gray-200 bg-emerald-50 text-emerald-800">Total Tahun {year}</th>
                                        {/* Monthly */}
                                        {MONTH_NAMES_SHORT.map((m, i) => (
                                            <th key={i} colSpan={2} className={`px-2 py-2 text-center font-semibold border-b border-r border-gray-200 ${activeMonth === i + 1 ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>{m}</th>
                                        ))}
                                    </tr>
                                    <tr className="bg-gray-50 text-[11px] text-gray-500 uppercase">
                                        <th colSpan={2} className="px-2 py-1.5 text-center border-b border-r border-gray-200 bg-emerald-50/70 text-emerald-700 font-bold">Volume (L/Kg)</th>
                                        <th colSpan={2} className="px-2 py-1.5 text-center border-b border-r border-gray-200 bg-emerald-50/70 text-emerald-700 font-bold">Kemasan (Dus)</th>
                                        {MONTH_NAMES_SHORT.map((_, i) => (
                                            <th key={i} colSpan={2} className={`px-2 py-1.5 text-center border-b border-r border-gray-200 font-semibold ${activeMonth === i + 1 ? 'bg-blue-50/70 text-blue-600' : ''}`}>Vol.</th>
                                        ))}
                                    </tr>
                                    <tr className="bg-gray-50 text-[10px] text-gray-400 uppercase">
                                        <th className="px-2 py-1 text-center border-b border-r border-gray-200 bg-emerald-50/50 text-emerald-600">Rencana</th>
                                        <th className="px-2 py-1 text-center border-b border-r border-gray-200 bg-blue-50/50 text-blue-600">Realisasi</th>
                                        <th className="px-2 py-1 text-center border-b border-r border-gray-200 bg-emerald-50/50 text-emerald-600">Rencana</th>
                                        <th className="px-2 py-1 text-center border-b border-r border-gray-200 bg-blue-50/50 text-blue-600">Realisasi</th>
                                        {MONTH_NAMES_SHORT.map((_, i) => (
                                            <React.Fragment key={i}>
                                                <th className={`px-2 py-1 text-center border-b border-r border-gray-100 ${activeMonth === i + 1 ? 'bg-blue-50/30' : ''}`}>Renc.</th>
                                                <th className={`px-2 py-1 text-center border-b border-r border-gray-200 ${activeMonth === i + 1 ? 'bg-blue-50/30' : ''}`}>Real.</th>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {groups.map(group => {
                                        const groupRows = reportRows.filter(group.filter);
                                        if (groupRows.length === 0) return null;
                                        const groupAnnual = { tv_plan: 0, tv_real: 0, tk_plan: 0, tk_real: 0 };
                                        const groupMonths: Record<number, { v_plan: number; v_real: number; k_plan: number; k_real: number }> = {};
                                        for (let m = 1; m <= 12; m++) groupMonths[m] = { v_plan: 0, v_real: 0, k_plan: 0, k_real: 0 };
                                        groupRows.forEach(r => {
                                            groupAnnual.tv_plan += r.annual.target_volume;
                                            groupAnnual.tv_real += r.annual.real_volume;
                                            groupAnnual.tk_plan += r.annual.target_kemasan;
                                            groupAnnual.tk_real += r.annual.real_kemasan;
                                            for (let m = 1; m <= 12; m++) {
                                                groupMonths[m].v_plan += r.months[m]?.target_volume || 0;
                                                groupMonths[m].v_real += r.months[m]?.real_volume || 0;
                                                groupMonths[m].k_plan += r.months[m]?.target_kemasan || 0;
                                                groupMonths[m].k_real += r.months[m]?.real_kemasan || 0;
                                            }
                                        });

                                        return (
                                            <React.Fragment key={group.label}>
                                                {/* Group Header */}
                                                <tr className="bg-gray-100/80">
                                                    <td colSpan={100} className="px-4 py-2 font-bold text-xs text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                                        {group.label}
                                                    </td>
                                                </tr>
                                                {/* Product rows */}
                                                {groupRows.map((row, idx) => (
                                                    <tr key={row.product_slug + '||' + row.tab_name} className="group hover:bg-emerald-50/20 transition-colors border-b border-gray-100">
                                                        <td className="px-3 py-2 text-center text-gray-400 text-xs border-r border-gray-100 sticky left-0 bg-white group-hover:bg-emerald-50/40">{idx + 1}</td>
                                                        <td className="px-4 py-2 font-medium text-gray-800 border-r border-gray-200 sticky left-8 bg-white group-hover:bg-emerald-50/40 whitespace-nowrap">
                                                            {row.tab_name}
                                                        </td>
                                                        {/* Annual */}
                                                        <td className="px-3 py-2 text-right text-xs border-r border-gray-100 bg-emerald-50/30 text-emerald-800 font-medium">{fmt(row.annual.target_volume)}</td>
                                                        <td className="px-3 py-2 text-right text-xs border-r border-gray-200 bg-blue-50/30 text-blue-700 font-medium">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {fmt(row.annual.real_volume)}
                                                                <PctBadge real={row.annual.real_volume} target={row.annual.target_volume} />
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-xs border-r border-gray-100 bg-emerald-50/30 text-emerald-800 font-medium">{fmt(row.annual.target_kemasan)}</td>
                                                        <td className="px-3 py-2 text-right text-xs border-r border-gray-200 bg-blue-50/30 text-blue-700 font-medium">{fmt(row.annual.real_kemasan)}</td>
                                                        {/* Monthly */}
                                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                            <React.Fragment key={m}>
                                                                <td className={`px-3 py-2 text-right text-xs border-r border-gray-100 ${activeMonth === m ? 'bg-blue-50/20' : ''} text-gray-600 font-medium`}>
                                                                    {fmt(row.months[m]?.target_volume || 0)}
                                                                </td>
                                                                <td className={`px-3 py-2 text-right text-xs border-r border-gray-200 ${activeMonth === m ? 'bg-blue-50/20' : ''} text-gray-700 font-medium`}>
                                                                    {fmt(row.months[m]?.real_volume || 0)}
                                                                </td>
                                                            </React.Fragment>
                                                        ))}
                                                    </tr>
                                                ))}
                                                {/* Group subtotal */}
                                                <tr className="bg-gray-50 text-xs font-semibold text-gray-700 border-b-2 border-gray-300">
                                                    <td colSpan={2} className="px-4 py-2 text-right sticky left-0 bg-gray-50 z-10 border-r border-gray-200">Total {group.label}</td>
                                                    <td className="px-3 py-2 text-right border-r border-gray-100 text-emerald-700">{fmt(groupAnnual.tv_plan)}</td>
                                                    <td className="px-3 py-2 text-right border-r border-gray-200 text-blue-700">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {fmt(groupAnnual.tv_real)}
                                                            <PctBadge real={groupAnnual.tv_real} target={groupAnnual.tv_plan} />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right border-r border-gray-100 text-emerald-700">{fmt(groupAnnual.tk_plan)}</td>
                                                    <td className="px-3 py-2 text-right border-r border-gray-200 text-blue-700">{fmt(groupAnnual.tk_real)}</td>
                                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                        <React.Fragment key={m}>
                                                            <td className={`px-3 py-2 text-right border-r border-gray-100 ${activeMonth === m ? 'bg-blue-50/10' : ''} text-gray-600 font-medium`}>
                                                                {fmt(groupMonths[m].v_plan)}
                                                            </td>
                                                            <td className={`px-3 py-2 text-right border-r border-gray-200 ${activeMonth === m ? 'bg-blue-50/10' : ''} text-gray-700 font-medium`}>
                                                                {fmt(groupMonths[m].v_real)}
                                                            </td>
                                                        </React.Fragment>
                                                    ))}
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                                {/* Grand Total footer */}
                                <tfoot className="sticky bottom-0 z-20">
                                    <tr className="bg-emerald-900 text-white text-xs font-semibold">
                                        <td colSpan={2} className="px-4 py-3 text-right sticky left-0 bg-emerald-900 border-r border-emerald-800 z-30">GRAND TOTAL</td>
                                        <td className="px-3 py-3 text-right border-r border-emerald-800 text-emerald-200">
                                            {fmt(reportRows.reduce((s, r) => s + r.annual.target_volume, 0))}
                                        </td>
                                        <td className="px-3 py-3 text-right border-r border-emerald-800 text-blue-200">
                                            {fmt(reportRows.reduce((s, r) => s + r.annual.real_volume, 0))}
                                        </td>
                                        <td className="px-3 py-3 text-right border-r border-emerald-800 text-emerald-200">
                                            {fmt(reportRows.reduce((s, r) => s + r.annual.target_kemasan, 0))}
                                        </td>
                                        <td className="px-3 py-3 text-right border-r border-emerald-800 text-blue-200">
                                            {fmt(reportRows.reduce((s, r) => s + r.annual.real_kemasan, 0))}
                                        </td>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <React.Fragment key={m}>
                                                <td className="px-3 py-3 text-right border-r border-emerald-800 text-emerald-100">
                                                    {fmt(reportRows.reduce((s, r) => s + (r.months[m]?.target_volume || 0), 0))}
                                                </td>
                                                <td className="px-3 py-3 text-right border-r border-emerald-800 text-emerald-50">
                                                    {fmt(reportRows.reduce((s, r) => s + (r.months[m]?.real_volume || 0), 0))}
                                                </td>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
