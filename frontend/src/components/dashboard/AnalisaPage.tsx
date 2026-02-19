'use client';

import { useState, useMemo } from 'react';
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

function PlusIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
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

function MoreIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
        </svg>
    );
}

function FilterIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    );
}

/* ─── Types ─── */

type TabKey = 'kegiatan-sampling' | 'hasil-analisa' | 'laporan-hasil-analisa' | 'kegiatan-produksi';

interface SamplingRow {
    no: number;
    tanggalSampling: string;
    noBAPC: string;
    kuantum: number;
    lembagaSampling: string;
    hasilAnalisa: string;
}

interface HasilAnalisaRow {
    no: number;
    tanggal: string;
    noBAPC: string;
    kuantum: number;
    lembaga: string;
}

interface LaporanRow {
    no: number;
    tanggal: string;
    noBAPC: string;
    kuantum: number;
    lembaga: string;
    tglAnalisa: string;
    hasilAnalisa: string;
}

interface KegiatanProduksiRow {
    no: number;
    tanggal: string;
    jenisProduk: string;
    kuantum: number;
    satuan: string;
    shift: string;
    operator: string;
    keterangan: string;
    status: 'Selesai' | 'Proses' | 'Pending';
}

/* ─── Constants ─── */



const BULAN_OPTIONS = [
    { value: '', label: 'Semua Bulan' },
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
    { value: '', label: 'Semua Tahun' },
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
];

const TABS: { key: TabKey; label: string }[] = [
    { key: 'kegiatan-sampling', label: 'Kegiatan Sampling' },
    { key: 'hasil-analisa', label: 'Hasil Analisa' },
    { key: 'laporan-hasil-analisa', label: 'Laporan Hasil Analisa' },
    { key: 'kegiatan-produksi', label: 'Kegiatan Produksi' },
];

/* ─── Mock Data ─── */

const MOCK_SAMPLING: SamplingRow[] = [
    { no: 1, tanggalSampling: '07/02/2023', noBAPC: '00739/B/LI.00.02/39/SF/2023', kuantum: 835.5, lembagaSampling: 'Petrokimia Gresik', hasilAnalisa: 'Lolos' },
    { no: 2, tanggalSampling: '14/03/2023', noBAPC: '00812/B/LI.00.02/42/SF/2023', kuantum: 1250.0, lembagaSampling: 'Petrokimia Gresik', hasilAnalisa: 'Lolos' },
    { no: 3, tanggalSampling: '21/04/2023', noBAPC: '00945/B/LI.00.02/51/SF/2023', kuantum: 920.75, lembagaSampling: 'Lab Terpadu', hasilAnalisa: 'Lolos' },
    { no: 4, tanggalSampling: '05/06/2023', noBAPC: '01023/B/LI.00.02/58/SF/2023', kuantum: 1100.0, lembagaSampling: 'Petrokimia Gresik', hasilAnalisa: 'Tidak Lolos' },
    { no: 5, tanggalSampling: '18/07/2023', noBAPC: '01150/B/LI.00.02/63/SF/2023', kuantum: 780.25, lembagaSampling: 'Lab Terpadu', hasilAnalisa: 'Lolos' },
];

const MOCK_HASIL: HasilAnalisaRow[] = [
    { no: 1, tanggal: '07/02/2023', noBAPC: '00739/B/LI.00.02/39/SF/2023', kuantum: 835.5, lembaga: 'Petrokimia Gresik' },
    { no: 2, tanggal: '14/03/2023', noBAPC: '00812/B/LI.00.02/42/SF/2023', kuantum: 1250.0, lembaga: 'Petrokimia Gresik' },
    { no: 3, tanggal: '21/04/2023', noBAPC: '00945/B/LI.00.02/51/SF/2023', kuantum: 920.75, lembaga: 'Lab Terpadu' },
];

const MOCK_LAPORAN: LaporanRow[] = [
    { no: 1, tanggal: '07/02/2023', noBAPC: '00739/B/LI.00.02/39/SF/2023', kuantum: 835.5, lembaga: 'Petrokimia Gresik', tglAnalisa: '17/02/2023', hasilAnalisa: 'Lolos' },
    { no: 2, tanggal: '14/03/2023', noBAPC: '00812/B/LI.00.02/42/SF/2023', kuantum: 1250.0, lembaga: 'Petrokimia Gresik', tglAnalisa: '24/03/2023', hasilAnalisa: 'Lolos' },
    { no: 3, tanggal: '21/04/2023', noBAPC: '00945/B/LI.00.02/51/SF/2023', kuantum: 920.75, lembaga: 'Lab Terpadu', tglAnalisa: '01/05/2023', hasilAnalisa: 'Lolos' },
    { no: 4, tanggal: '05/06/2023', noBAPC: '01023/B/LI.00.02/58/SF/2023', kuantum: 1100.0, lembaga: 'Petrokimia Gresik', tglAnalisa: '15/06/2023', hasilAnalisa: 'Tidak Lolos' },
];

const MOCK_PRODUKSI: KegiatanProduksiRow[] = [
    { no: 1, tanggal: '02/01/2026', jenisProduk: 'Padat @1Kg', kuantum: 500, satuan: 'Pcs', shift: 'Pagi', operator: 'Ahmad S.', keterangan: 'Normal', status: 'Selesai' },
    { no: 2, tanggal: '02/01/2026', jenisProduk: 'Padat @2Kg', kuantum: 250, satuan: 'Pcs', shift: 'Pagi', operator: 'Budi R.', keterangan: 'Normal', status: 'Selesai' },
    { no: 3, tanggal: '03/01/2026', jenisProduk: 'Cair 1 Liter', kuantum: 320, satuan: 'Pcs', shift: 'Siang', operator: 'Ahmad S.', keterangan: '', status: 'Selesai' },
    { no: 4, tanggal: '04/01/2026', jenisProduk: 'Padat @10Kg', kuantum: 100, satuan: 'Zak', shift: 'Pagi', operator: 'Candra W.', keterangan: 'Mesin maintenance 2 jam', status: 'Selesai' },
    { no: 5, tanggal: '05/01/2026', jenisProduk: 'Cair 500ml', kuantum: 600, satuan: 'Pcs', shift: 'Siang', operator: 'Budi R.', keterangan: '', status: 'Proses' },
    { no: 6, tanggal: '06/01/2026', jenisProduk: 'Padat @1Kg', kuantum: 450, satuan: 'Pcs', shift: 'Pagi', operator: 'Ahmad S.', keterangan: '', status: 'Pending' },
];

/* ─── Helpers ─── */

function fmt(n: number): string {
    return n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

/* ─── Status Badge ─── */

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        'Selesai': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Proses': 'bg-blue-50 text-blue-700 border-blue-200',
        'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
        'Lolos': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Tidak Lolos': 'bg-red-50 text-red-700 border-red-200',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${styles[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {status}
        </span>
    );
}

/* ─── Pagination ─── */

function Pagination({
    page, totalPages, total, pageSize, setPage,
}: {
    page: number; totalPages: number; total: number; pageSize: number; setPage: (p: number) => void;
}) {
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

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
                            ${p === page ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
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

/* ─── Row Action Menu ─── */

function RowActions() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <MoreIcon />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-white">
                <DropdownMenuItem className="cursor-pointer text-sm">Lihat Detail</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-sm">Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-sm text-red-600 focus:text-red-700">Hapus</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/* ═══════════════════════════════════════════ */
/*  Main Component                             */
/* ═══════════════════════════════════════════ */

interface AnalisaPageProps {
    productCategory: string;
    productName: string;
    productSlug?: string;
}

export function AnalisaPage({ productCategory, productName, productSlug }: AnalisaPageProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('kegiatan-sampling');

    const [bulan, setBulan] = useState('');
    const [tahun, setTahun] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const handleTabChange = (key: TabKey) => {
        setActiveTab(key);
        setPage(1);
        setSearch('');
    };


    const samplingData = useMemo(() =>
        MOCK_SAMPLING.filter((r) =>
            search === '' ||
            r.tanggalSampling.includes(search) ||
            r.noBAPC.toLowerCase().includes(search.toLowerCase()) ||
            r.lembagaSampling.toLowerCase().includes(search.toLowerCase()) ||
            r.hasilAnalisa.toLowerCase().includes(search.toLowerCase())
        ), [search]);

    const hasilData = useMemo(() =>
        MOCK_HASIL.filter((r) =>
            search === '' ||
            r.tanggal.includes(search) ||
            r.noBAPC.toLowerCase().includes(search.toLowerCase()) ||
            r.lembaga.toLowerCase().includes(search.toLowerCase())
        ), [search]);

    const laporanData = useMemo(() =>
        MOCK_LAPORAN.filter((r) =>
            search === '' ||
            r.tanggal.includes(search) ||
            r.noBAPC.toLowerCase().includes(search.toLowerCase()) ||
            r.lembaga.toLowerCase().includes(search.toLowerCase()) ||
            r.hasilAnalisa.toLowerCase().includes(search.toLowerCase())
        ), [search]);

    const produksiData = useMemo(() =>
        MOCK_PRODUKSI.filter((r) =>
            search === '' ||
            r.tanggal.includes(search) ||
            r.jenisProduk.toLowerCase().includes(search.toLowerCase()) ||
            r.operator.toLowerCase().includes(search.toLowerCase()) ||
            r.status.toLowerCase().includes(search.toLowerCase())
        ), [search]);

    /* ─── Determine active dataset ─── */

    const activeData = activeTab === 'kegiatan-sampling' ? samplingData
        : activeTab === 'hasil-analisa' ? hasilData
            : activeTab === 'laporan-hasil-analisa' ? laporanData
                : produksiData;

    const totalPages = Math.max(1, Math.ceil(activeData.length / pageSize));
    const paginatedSlice = activeData.slice((page - 1) * pageSize, page * pageSize);

    /* ─── Summary counts ─── */

    const counts = {
        sampling: MOCK_SAMPLING.length,
        hasil: MOCK_HASIL.length,
        laporan: MOCK_LAPORAN.length,
        produksi: MOCK_PRODUKSI.length,
    };
    const tabCounts: Record<TabKey, number> = {
        'kegiatan-sampling': counts.sampling,
        'hasil-analisa': counts.hasil,
        'laporan-hasil-analisa': counts.laporan,
        'kegiatan-produksi': counts.produksi,
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">{productCategory}</span>
                <span>/</span>
                <span className="text-gray-500">{productName}</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Analisa</span>
            </div>

            {/* Page Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Analisa — {productName}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Kelola kegiatan sampling, hasil analisa, dan laporan produksi
                </p>
            </div>



            {/* Main Content Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Tab Row + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
                    {/* Tabs — horizontal scroll on mobile */}
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2
                                    ${activeTab === tab.key
                                        ? 'text-emerald-700'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.label}
                                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold
                                    ${activeTab === tab.key
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {tabCounts[tab.key]}
                                </span>
                                {activeTab === tab.key && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
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

                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                            <PlusIcon />
                            Tambah Data
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                        {/* Left: Period + Filter button */}
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                <FilterIcon />
                                <select
                                    value={bulan}
                                    onChange={(e) => { setBulan(e.target.value); setPage(1); }}
                                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    {BULAN_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <span className="text-gray-300">|</span>
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
                                Terapkan
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

                {/* ════ Table Content Based on Active Tab ════ */}

                {/* --- Kegiatan Sampling --- */}
                {activeTab === 'kegiatan-sampling' && (
                    <>
                        {/* Desktop */}
                        <div className="overflow-x-auto hidden sm:block">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        <th className="px-4 py-3 font-semibold text-gray-600 w-14">No.</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Tanggal Sampling</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">No. BAPC</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Kuantum</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Lembaga Sampling</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Hasil Analisa</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedSlice.length === 0 ? (
                                        <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr>
                                    ) : (
                                        (paginatedSlice as SamplingRow[]).map((row) => (
                                            <tr key={row.no} className="hover:bg-emerald-50/30 transition-colors">
                                                <td className="px-4 py-3 text-gray-500 font-medium">{row.no}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.tanggalSampling}</td>
                                                <td className="px-4 py-3 text-gray-700 font-mono text-xs">{row.noBAPC}</td>
                                                <td className="px-4 py-3 text-right font-mono text-gray-700 tabular-nums">{fmt(row.kuantum)}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.lembagaSampling}</td>
                                                <td className="px-4 py-3"><StatusBadge status={row.hasilAnalisa} /></td>
                                                <td className="px-4 py-3 text-center"><RowActions /></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile */}
                        <div className="sm:hidden divide-y divide-gray-100">
                            {paginatedSlice.length === 0 ? (
                                <div className="px-4 py-12 text-center text-gray-400">No data available</div>
                            ) : (
                                (paginatedSlice as SamplingRow[]).map((row) => (
                                    <div key={row.no} className="p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">{row.tanggalSampling}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">{row.noBAPC}</p>
                                            </div>
                                            <StatusBadge status={row.hasilAnalisa} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-[11px] text-gray-400 uppercase">Kuantum</span>
                                                <p className="font-mono text-gray-700">{fmt(row.kuantum)}</p>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-gray-400 uppercase">Lembaga</span>
                                                <p className="text-gray-700">{row.lembagaSampling}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* --- Hasil Analisa --- */}
                {activeTab === 'hasil-analisa' && (
                    <>
                        <div className="overflow-x-auto hidden sm:block">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        <th className="px-4 py-3 font-semibold text-gray-600 w-14">No.</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Tanggal</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">No. BAPC</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Kuantum</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Lembaga</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedSlice.length === 0 ? (
                                        <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr>
                                    ) : (
                                        (paginatedSlice as HasilAnalisaRow[]).map((row) => (
                                            <tr key={row.no} className="hover:bg-emerald-50/30 transition-colors">
                                                <td className="px-4 py-3 text-gray-500 font-medium">{row.no}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.tanggal}</td>
                                                <td className="px-4 py-3 text-gray-700 font-mono text-xs">{row.noBAPC}</td>
                                                <td className="px-4 py-3 text-right font-mono text-gray-700 tabular-nums">{fmt(row.kuantum)}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.lembaga}</td>
                                                <td className="px-4 py-3 text-center"><RowActions /></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden divide-y divide-gray-100">
                            {paginatedSlice.length === 0 ? (
                                <div className="px-4 py-12 text-center text-gray-400">No data available</div>
                            ) : (
                                (paginatedSlice as HasilAnalisaRow[]).map((row) => (
                                    <div key={row.no} className="p-4 space-y-2">
                                        <p className="text-sm font-semibold text-gray-800">{row.tanggal}</p>
                                        <p className="text-xs text-gray-500 font-mono">{row.noBAPC}</p>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-[11px] text-gray-400 uppercase">Kuantum</span>
                                                <p className="font-mono text-gray-700">{fmt(row.kuantum)}</p>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-gray-400 uppercase">Lembaga</span>
                                                <p className="text-gray-700">{row.lembaga}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* --- Laporan Hasil Analisa --- */}
                {activeTab === 'laporan-hasil-analisa' && (
                    <>
                        <div className="overflow-x-auto hidden sm:block">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        <th className="px-4 py-3 font-semibold text-gray-600 w-14">No.</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Tanggal</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">No. BAPC</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Kuantum</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Lembaga</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Tgl. Analisa</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Hasil Analisa</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedSlice.length === 0 ? (
                                        <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr>
                                    ) : (
                                        (paginatedSlice as LaporanRow[]).map((row) => (
                                            <tr key={row.no} className="hover:bg-emerald-50/30 transition-colors">
                                                <td className="px-4 py-3 text-gray-500 font-medium">{row.no}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.tanggal}</td>
                                                <td className="px-4 py-3 text-gray-700 font-mono text-xs">{row.noBAPC}</td>
                                                <td className="px-4 py-3 text-right font-mono text-gray-700 tabular-nums">{fmt(row.kuantum)}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.lembaga}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.tglAnalisa}</td>
                                                <td className="px-4 py-3"><StatusBadge status={row.hasilAnalisa} /></td>
                                                <td className="px-4 py-3 text-center"><RowActions /></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden divide-y divide-gray-100">
                            {paginatedSlice.length === 0 ? (
                                <div className="px-4 py-12 text-center text-gray-400">No data available</div>
                            ) : (
                                (paginatedSlice as LaporanRow[]).map((row) => (
                                    <div key={row.no} className="p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">{row.tanggal}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">{row.noBAPC}</p>
                                            </div>
                                            <StatusBadge status={row.hasilAnalisa} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-[11px] text-gray-400 uppercase">Kuantum</span>
                                                <p className="font-mono text-gray-700">{fmt(row.kuantum)}</p>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-gray-400 uppercase">Lembaga</span>
                                                <p className="text-gray-700">{row.lembaga}</p>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-gray-400 uppercase">Tgl. Analisa</span>
                                                <p className="text-gray-700">{row.tglAnalisa}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* --- Kegiatan Produksi --- */}
                {activeTab === 'kegiatan-produksi' && (
                    <>
                        <div className="overflow-x-auto hidden sm:block">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        <th className="px-4 py-3 font-semibold text-gray-600 w-14">No.</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Tanggal</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Jenis Produk</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Kuantum</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Satuan</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Shift</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Operator</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Keterangan</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedSlice.length === 0 ? (
                                        <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr>
                                    ) : (
                                        (paginatedSlice as KegiatanProduksiRow[]).map((row) => (
                                            <tr key={row.no} className="hover:bg-emerald-50/30 transition-colors">
                                                <td className="px-4 py-3 text-gray-500 font-medium">{row.no}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.tanggal}</td>
                                                <td className="px-4 py-3 text-gray-700 font-medium">{row.jenisProduk}</td>
                                                <td className="px-4 py-3 text-right font-mono text-gray-700 tabular-nums">{fmt(row.kuantum)}</td>
                                                <td className="px-4 py-3 text-gray-600">{row.satuan}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md
                                                        ${row.shift === 'Pagi' ? 'bg-sky-50 text-sky-700' : 'bg-orange-50 text-orange-700'}`}>
                                                        {row.shift}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">{row.operator}</td>
                                                <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{row.keterangan || '—'}</td>
                                                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                                                <td className="px-4 py-3 text-center"><RowActions /></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden divide-y divide-gray-100">
                            {paginatedSlice.length === 0 ? (
                                <div className="px-4 py-12 text-center text-gray-400">No data available</div>
                            ) : (
                                (paginatedSlice as KegiatanProduksiRow[]).map((row) => (
                                    <div key={row.no} className="p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">{row.tanggal}</p>
                                                <p className="text-xs text-gray-600 mt-0.5">{row.jenisProduk}</p>
                                            </div>
                                            <StatusBadge status={row.status} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-[11px] text-gray-400 uppercase">Kuantum</span>
                                                <p className="font-mono text-gray-700">{fmt(row.kuantum)} {row.satuan}</p>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-gray-400 uppercase">Shift</span>
                                                <p className="text-gray-700">{row.shift}</p>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-gray-400 uppercase">Operator</span>
                                                <p className="text-gray-700">{row.operator}</p>
                                            </div>
                                            {row.keterangan && (
                                                <div>
                                                    <span className="text-[11px] text-gray-400 uppercase">Ket.</span>
                                                    <p className="text-gray-600 text-xs">{row.keterangan}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Pagination */}
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={activeData.length}
                    pageSize={pageSize}
                    setPage={setPage}
                />
            </div>
        </div>
    );
}
