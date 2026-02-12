'use client';

import { useState, useMemo } from 'react';

/* ─── Types ─── */

type TabKey = 'suplai' | 'mutasi' | 'balance-stok';

interface SuplaiRow {
    no: number;
    tanggal: string;
    jenis: string;
    namaBahan: string;
    kuantum: number;
    dokumen: string;
    keterangan: string;
}

interface MutasiRow {
    no: number;
    tanggal: string;
    jenis: string;
    namaBahan: string;
    kuantum: number;
    dokumen: string;
    keterangan: string;
}

interface BalanceRow {
    tanggal: string;
    produksi: number;
    materials: { out: number; in: number; sAkhir: number }[];
}

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

function PlusIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
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

function SortIcon({ direction }: { direction?: 'asc' | 'desc' }) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block ml-1 opacity-40">
            {direction === 'asc' ? (
                <polyline points="18 15 12 9 6 15" />
            ) : direction === 'desc' ? (
                <polyline points="6 9 12 15 18 9" />
            ) : (
                <>
                    <polyline points="7 7 12 2 17 7" />
                    <polyline points="7 17 12 22 17 17" />
                </>
            )}
        </svg>
    );
}

/* ─── Mock Data ─── */

const PERUSAHAAN_OPTIONS = [
    'Semua Perusahaan',
    'PT Petrokimia Gresik',
    'PT Petrokopindo Cipta Selaras',
    'PT Petronika',
];

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

const MOCK_SUPLAI: SuplaiRow[] = [
    { no: 1, tanggal: '21/06/2023', jenis: 'Bahan Baku', namaBahan: 'Gambut', kuantum: 8.18, dokumen: 'DOC-001', keterangan: '-' },
    { no: 2, tanggal: '01/07/2023', jenis: 'Bahan Baku', namaBahan: 'Dolomite', kuantum: 225.6, dokumen: 'DOC-002', keterangan: 'Stok produksi P3' },
    { no: 3, tanggal: '15/07/2023', jenis: 'Bahan Baku', namaBahan: 'Gambut', kuantum: 15.5, dokumen: 'DOC-003', keterangan: 'Pemakaian rutin' },
    { no: 4, tanggal: '20/08/2023', jenis: 'Bahan Penolong', namaBahan: 'Botol Petro Gladiator', kuantum: 5000, dokumen: 'DOC-004', keterangan: 'Pengemasan P3' },
    { no: 5, tanggal: '05/09/2023', jenis: 'Bahan Baku', namaBahan: 'Dolomite', kuantum: 180.2, dokumen: 'DOC-005', keterangan: 'Suplai' },
];

const MOCK_MUTASI: MutasiRow[] = [
    { no: 1, tanggal: '09/07/2023', jenis: 'Bahan Baku', namaBahan: 'Gambut', kuantum: 8.18, dokumen: 'MUT-001', keterangan: 'Untuk Pemakaian ZA Plus 50@kg' },
    { no: 2, tanggal: '12/07/2023', jenis: 'Bahan Baku', namaBahan: 'Dolomite', kuantum: 45.3, dokumen: 'MUT-002', keterangan: 'Mutasi ke Gudang B' },
    { no: 3, tanggal: '25/07/2023', jenis: 'Bahan Penolong', namaBahan: 'Botol Petro Gladiator', kuantum: 1200, dokumen: 'MUT-003', keterangan: 'Transfer gudang' },
];

const MATERIALS = ['Dolomite', 'ZA Curah', 'Botol Petro Gladiator'];
const MOCK_BALANCE: BalanceRow[] = Array.from({ length: 10 }, (_, i) => ({
    tanggal: `${String(i + 1).padStart(2, '0')} Februari 2026`,
    produksi: 0,
    materials: [
        { out: 0, in: 0, sAkhir: 0 },
        { out: 0, in: 0, sAkhir: 0.01 },
        { out: 0, in: 0, sAkhir: 0 },
    ],
}));

/* ─── Pagination helper ─── */

function usePagination<T>(data: T[], pageSize = 10) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
    const paginated = data.slice((page - 1) * pageSize, page * pageSize);
    return { page, setPage, totalPages, paginated, total: data.length };
}

/* ─── Main Component ─── */

interface BahanBakuPageProps {
    productCategory: string;
    productName: string;
}

import { SuplaiModal } from './SuplaiModal';
import { MutasiModal } from './MutasiModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BahanBakuPage({ productCategory, productName }: BahanBakuPageProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('suplai');
    const [search, setSearch] = useState('');
    const [perusahaan, setPerusahaan] = useState('Semua Perusahaan');
    const [bulan, setBulan] = useState('');
    const [tahun, setTahun] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'suplai', label: 'Suplai' },
        { key: 'mutasi', label: 'Mutasi' },
        { key: 'balance-stok', label: 'Balance Stok' },
    ];

    const handleAddData = (data: any) => {
        console.log('New Suplai Data:', data);
    };

    const handleAddMutasi = (data: any) => {
        console.log('New Mutasi Data:', data);
    };

    const handleTambahData = () => {
        if (activeTab === 'mutasi') {
            setIsMutasiModalOpen(true);
        } else {
            setIsModalOpen(true);
        }
    };

    return (
        <div className="space-y-6">
            <SuplaiModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddData}
            />
            <MutasiModal
                isOpen={isMutasiModalOpen}
                onClose={() => setIsMutasiModalOpen(false)}
                onSubmit={handleAddMutasi}
            />

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">{productCategory}</span>
                <span>/</span>
                <span className="text-gray-500">{productName}</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Bahan Baku</span>
            </div>

            {/* Page title */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {productCategory} / {productName} / Bahan Baku
                </h1>
            </div>

            {/* Perusahaan filter */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <label className="block text-sm font-medium text-emerald-700 mb-2">Perusahaan</label>
                <select
                    value={perusahaan}
                    onChange={(e) => setPerusahaan(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                >
                    {PERUSAHAAN_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            {/* Tabs + Actions row */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header with tabs and button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
                    <div className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-5 py-3 text-sm font-medium transition-colors relative
                  ${activeTab === tab.key
                                        ? 'text-emerald-700'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.key && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t" />
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="px-4 py-2 sm:py-0 flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                                    <DownloadIcon />
                                    Export Data
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 opacity-50">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white">
                                <DropdownMenuLabel>Pilih Format</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer">
                                    <span className="mr-2">📄</span> Export to Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                    <span className="mr-2">tj</span> Export to PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {activeTab !== 'balance-stok' && (
                            <button
                                onClick={handleTambahData}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                <PlusIcon />
                                Tambah Data
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters: Periode + Search */}

                {/* Filters Row: Periode, Tahun, Search */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">

                        {/* Left Side: Period Filter */}
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-sm font-medium text-gray-500 mr-2">Periode:</span>
                                <select
                                    value={bulan}
                                    onChange={(e) => setBulan(e.target.value)}
                                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    {BULAN_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <span className="text-gray-300">/</span>
                                <select
                                    value={tahun}
                                    onChange={(e) => setTahun(e.target.value)}
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

                        {/* Right Side: Search */}
                        <div className="relative w-full md:w-64">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <SearchIcon />
                            </span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari data..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Tab content */}
                <div>
                    {activeTab === 'suplai' && <SuplaiTable data={MOCK_SUPLAI} search={search} />}
                    {activeTab === 'mutasi' && <MutasiTable data={MOCK_MUTASI} search={search} />}
                    {activeTab === 'balance-stok' && <BalanceStokTable />}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*  Suplai Table                               */
/* ═══════════════════════════════════════════ */

function SuplaiTable({ data, search }: { data: SuplaiRow[]; search: string }) {
    const filtered = useMemo(() =>
        data.filter((row) =>
            search === '' ||
            row.namaBahan.toLowerCase().includes(search.toLowerCase()) ||
            row.keterangan.toLowerCase().includes(search.toLowerCase()) ||
            row.jenis.toLowerCase().includes(search.toLowerCase())
        ), [data, search]);

    const { page, setPage, totalPages, paginated, total } = usePagination(filtered);

    return (
        <>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-left">
                            <th className="px-4 py-3 font-semibold text-gray-600 w-14">No. <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Tanggal <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Jenis <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Nama Bahan <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-right">Kuantum <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-center">Dokumen <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Keterangan</th>
                            <th className="px-4 py-3 w-12" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                                    Tidak ada data ditemukan.
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row) => (
                                <tr key={row.no} className="hover:bg-emerald-50/30 transition-colors">
                                    <td className="px-4 py-3 text-emerald-600 font-medium">{row.no}</td>
                                    <td className="px-4 py-3 text-gray-700">{row.tanggal}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                            {row.jenis}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-800 font-medium">{row.namaBahan}</td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700">{row.kuantum.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button className="text-emerald-600 hover:text-emerald-800 transition-colors p-1" title="Download">
                                            <DownloadIcon />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{row.keterangan}</td>
                                    <td className="px-4 py-3">
                                        <ActionMenu />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
                {paginated.length === 0 ? (
                    <div className="px-4 py-12 text-center text-gray-400">Tidak ada data ditemukan.</div>
                ) : (
                    paginated.map((row) => (
                        <div key={row.no} className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">#{row.no}</span>
                                <span className="text-xs text-gray-400">{row.tanggal}</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-800">{row.namaBahan}</p>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    {row.jenis}
                                </span>
                                <span className="font-mono text-sm text-gray-700">{row.kuantum.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-500">{row.keterangan}</p>
                            <div className="flex gap-2 pt-1">
                                <button className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                                    <DownloadIcon /> Dokumen
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
        </>
    );
}

/* ═══════════════════════════════════════════ */
/*  Mutasi Table                               */
/* ═══════════════════════════════════════════ */

function MutasiTable({ data, search }: { data: MutasiRow[]; search: string }) {
    const filtered = useMemo(() =>
        data.filter((row) =>
            search === '' ||
            row.namaBahan.toLowerCase().includes(search.toLowerCase()) ||
            row.keterangan.toLowerCase().includes(search.toLowerCase())
        ), [data, search]);

    const { page, setPage, totalPages, paginated, total } = usePagination(filtered);

    return (
        <>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-left">
                            <th className="px-4 py-3 font-semibold text-gray-600 w-14">No. <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Tanggal <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Jenis <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Nama Bahan <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-right">Kuantum <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-center">Dokumen <SortIcon /></th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                    Tidak ada data ditemukan.
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row) => (
                                <tr key={row.no} className="hover:bg-emerald-50/30 transition-colors">
                                    <td className="px-4 py-3 text-emerald-600 font-medium">{row.no}</td>
                                    <td className="px-4 py-3 text-gray-700">{row.tanggal}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                            {row.jenis}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-800 font-medium">{row.namaBahan}</td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700">{row.kuantum.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button className="text-emerald-600 hover:text-emerald-800 transition-colors p-1" title="Download">
                                            <DownloadIcon />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[250px] truncate">{row.keterangan}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
                {paginated.length === 0 ? (
                    <div className="px-4 py-12 text-center text-gray-400">Tidak ada data ditemukan.</div>
                ) : (
                    paginated.map((row) => (
                        <div key={row.no} className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">#{row.no}</span>
                                <span className="text-xs text-gray-400">{row.tanggal}</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-800">{row.namaBahan}</p>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                    {row.jenis}
                                </span>
                                <span className="font-mono text-sm text-gray-700">{row.kuantum.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-500">{row.keterangan}</p>
                        </div>
                    ))
                )}
            </div>

            <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
        </>
    );
}

/* ═══════════════════════════════════════════ */
/*  Balance Stok Table                         */
/* ═══════════════════════════════════════════ */

function BalanceStokTable() {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
                <thead>
                    {/* Material group headers */}
                    <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left font-semibold text-gray-600 border-b border-gray-200" rowSpan={2}>
                            Tanggal
                        </th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-600 border-b border-gray-200" rowSpan={2}>
                            Produksi
                        </th>
                        {MATERIALS.map((mat) => (
                            <th
                                key={mat}
                                colSpan={3}
                                className="px-2 py-2 text-center font-bold text-gray-700 border-b border-gray-200 border-l border-gray-100"
                            >
                                {mat}
                            </th>
                        ))}
                    </tr>
                    {/* Sub-headers: Out, In, S Akhir */}
                    <tr className="bg-gray-50/60">
                        {MATERIALS.map((mat) => (
                            <Fragment key={mat}>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 border-b border-gray-200 border-l border-gray-100">Out</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 border-b border-gray-200">In</th>
                                <th className="px-3 py-1.5 text-center text-xs font-semibold text-gray-600 border-b border-gray-200">S Akhir</th>
                            </Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {/* Saldo row */}
                    <tr className="bg-emerald-50/40">
                        <td className="px-4 py-2.5 font-medium text-gray-600" colSpan={2} />
                        {MATERIALS.map((_, mi) => (
                            <Fragment key={mi}>
                                <td className="px-3 py-2.5 text-center font-mono text-gray-500 text-xs border-l border-gray-100">{fmt(0)}</td>
                                <td className="px-3 py-2.5 text-center font-mono text-gray-500 text-xs">{fmt(0)}</td>
                                <td className="px-3 py-2.5 text-center font-mono text-gray-800 font-bold text-xs">{fmt(mi === 1 ? 0.01 : 0)}</td>
                            </Fragment>
                        ))}
                    </tr>
                    {/* Data rows */}
                    {MOCK_BALANCE.map((row, i) => (
                        <tr key={i} className="hover:bg-emerald-50/20 transition-colors">
                            <td className="px-4 py-2.5 text-gray-700 text-[13px]">{row.tanggal}</td>
                            <td className="px-4 py-2.5 text-center font-mono text-gray-500 text-xs">{fmt(row.produksi)}</td>
                            {row.materials.map((m, mi) => (
                                <Fragment key={mi}>
                                    <td className="px-3 py-2.5 text-center font-mono text-gray-500 text-xs border-l border-gray-100">{fmt(m.out)}</td>
                                    <td className="px-3 py-2.5 text-center font-mono text-gray-500 text-xs">{fmt(m.in)}</td>
                                    <td className={`px-3 py-2.5 text-center font-mono text-xs font-bold ${m.sAkhir > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>
                                        {fmt(m.sAkhir)}
                                    </td>
                                </Fragment>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ─── Shared Components ─── */

function ActionMenu() {
    return (
        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="More actions">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
            </svg>
        </button>
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
    const from = total === 0 ? 0 : (page - 1) * 10 + 1;
    const to = Math.min(page * 10, total);

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

function fmt(n: number): string {
    return n.toFixed(2).replace('.', ',');
}

/* Fragment helper for inline mapping */
import { Fragment } from 'react';
