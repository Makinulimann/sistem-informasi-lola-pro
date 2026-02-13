'use client';

import { useState, useMemo, useEffect, useCallback, Fragment } from 'react';
import { format } from 'date-fns';
import { SuplaiModal } from './SuplaiModal';
import { MutasiModal } from './MutasiModal';
import { ConfigurationTab } from './ConfigurationTab';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { bahanBakuService, Perusahaan, BahanBaku, Material, BalanceStok } from '@/lib/bahanBakuService';

/* ─── Types ─── */

type TabKey = 'suplai' | 'mutasi' | 'balance-stok' | 'konfigurasi';

// ...

const tabs: { key: TabKey; label: string }[] = [
    { key: 'suplai', label: 'Suplai' },
    { key: 'mutasi', label: 'Mutasi' },
    { key: 'balance-stok', label: 'Balance Stok' },
    { key: 'konfigurasi', label: 'Konfigurasi' },
];

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

/* ─── Icons ─── */

function SearchIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
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

function EditIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function XIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

/* ─── Constants ─── */

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
    productSlug?: string;
}

export function BahanBakuPage({ productCategory, productName, productSlug }: BahanBakuPageProps) {
    const defaultProductSlug = productSlug || productName.toLowerCase().replace(/\s+/g, '-');
    const [activeTab, setActiveTab] = useState<TabKey>('suplai');
    const [search, setSearch] = useState('');

    // Filter State
    const [bulan, setBulan] = useState('');
    const [tahun, setTahun] = useState('');

    // Data State
    const [suplaiData, setSuplaiData] = useState<SuplaiRow[]>([]);
    const [mutasiData, setMutasiData] = useState<MutasiRow[]>([]);
    const [balanceData, setBalanceData] = useState<BalanceStok[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isSuplaiModalOpen, setIsSuplaiModalOpen] = useState(false);
    const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);



    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {
                productSlug: defaultProductSlug,
                perusahaanId: undefined, // Removed filtering
                bulan: bulan || undefined,
                tahun: tahun || undefined,
            };

            if (activeTab === 'suplai') {
                const data = await bahanBakuService.getSuplai(params);
                setSuplaiData(data.map((item, idx) => ({
                    no: idx + 1,
                    tanggal: format(new Date(item.tanggal), 'dd/MM/yyyy'),
                    jenis: item.jenis,
                    namaBahan: item.namaBahan,
                    kuantum: item.kuantum,
                    dokumen: item.dokumen,
                    keterangan: item.keterangan || '-',
                })));
            } else if (activeTab === 'mutasi') {
                const data = await bahanBakuService.getMutasi(params);
                setMutasiData(data.map((item, idx) => ({
                    no: idx + 1,
                    tanggal: format(new Date(item.tanggal), 'dd/MM/yyyy'),
                    jenis: item.jenis,
                    namaBahan: item.namaBahan,
                    kuantum: item.kuantum,
                    dokumen: item.dokumen,
                    keterangan: item.keterangan || '-',
                })));
            } else if (activeTab === 'balance-stok') {
                const [mats, bals] = await Promise.all([
                    bahanBakuService.getMaterials(defaultProductSlug),
                    bahanBakuService.getBalance(params)
                ]);
                setMaterials(mats);
                setBalanceData(bals);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, defaultProductSlug, bulan, tahun]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddSuplai = async (data: any) => {
        const payload = {
            productSlug: defaultProductSlug,
            perusahaanId: 0, // Default to 0 as field is removed
            tanggal: data.date,
            jenis: 'Bahan Baku',
            namaBahan: data.bahanBakuList?.[0]?.name || '',
            kuantum: parseFloat(data.bahanBakuList?.[0]?.quantum || 0),
            dokumen: data.file ? data.file.name : '',
            keterangan: data.keterangan
        };
        try {
            await bahanBakuService.createSuplai(payload as any);
            fetchData();
        } catch (error) {
            console.error('Failed to create suplai:', error);
        }
    };

    const handleAddMutasi = async (data: any) => {
        const payload = {
            productSlug: defaultProductSlug,
            perusahaanId: 0, // Default to 0
            tanggal: data.date,
            jenis: data.jenis,
            namaBahan: data.namaBahan,
            kuantum: parseFloat(data.quantum || 0),
            dokumen: data.file ? data.file.name : '',
            keterangan: data.keterangan
        };
        try {
            await bahanBakuService.createMutasi(payload as any);
            fetchData();
        } catch (error) {
            console.error('Failed to create mutasi:', error);
        }
    };

    const refreshMaterials = () => {
        bahanBakuService.getMaterials(defaultProductSlug).then(setMaterials);
    };

    return (
        <div className="space-y-6">
            <SuplaiModal
                isOpen={isSuplaiModalOpen}
                onClose={() => setIsSuplaiModalOpen(false)}
                onSubmit={handleAddSuplai}
                productSlug={defaultProductSlug}
            />
            <MutasiModal
                isOpen={isMutasiModalOpen}
                onClose={() => setIsMutasiModalOpen(false)}
                onSubmit={handleAddMutasi}
                productSlug={defaultProductSlug}
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
                        {activeTab !== 'konfigurasi' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                                        <DownloadIcon />
                                        Export Data
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
                        )}

                        {activeTab !== 'balance-stok' && activeTab !== 'konfigurasi' && (
                            <button
                                onClick={() => activeTab === 'mutasi' ? setIsMutasiModalOpen(true) : setIsSuplaiModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                <PlusIcon />
                                Tambah Data
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters Row: Periode, Tahun, Search */}
                {/* Filters Row: Periode, Tahun, Search */}
                {activeTab !== 'konfigurasi' && (
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
                                <button
                                    onClick={fetchData}
                                    className="px-4 py-2 bg-white text-emerald-600 text-sm font-medium rounded-lg border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm"
                                >
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
                )}

                {/* Tab content */}
                <div className="min-h-[400px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'suplai' && <SuplaiTable data={suplaiData} search={search} />}
                            {activeTab === 'mutasi' && <MutasiTable data={mutasiData} search={search} />}
                            {activeTab === 'balance-stok' && (
                                <BalanceStokTable
                                    materials={materials}
                                    data={balanceData}
                                    productSlug={defaultProductSlug}
                                    onMaterialsChange={refreshMaterials}
                                />
                            )}
                            {activeTab === 'konfigurasi' && (
                                <ConfigurationTab productSlug={defaultProductSlug} />
                            )}
                        </>
                    )}
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
                                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                            {row.jenis}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-800 font-medium">{row.namaBahan}</td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700">{row.kuantum.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {/* Eye Icon for viewing documents */}
                                        <button className="text-emerald-600 hover:text-emerald-800 transition-colors p-1" title="Lihat Dokumen">
                                            <EyeIcon />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{row.keterangan}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Mobile View Omitted for Brevity - follows similar pattern */}
            <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map((row) => (
                    <div key={row.no} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">#{row.no}</span>
                            <span className="text-xs text-gray-400">{row.tanggal}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{row.namaBahan}</p>
                        <div className="flex gap-2">
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 rounded-full">{row.jenis}</span>
                            <span className="text-xs text-gray-600 font-mono">{row.kuantum.toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
        </>
    );
}

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
                                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">Tidak ada data ditemukan.</td>
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
                                        <button className="text-emerald-600 hover:text-emerald-800 transition-colors p-1" title="Lihat Dokumen">
                                            <EyeIcon />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[250px] truncate">{row.keterangan}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
        </>
    );
}

/* ═══════════════════════════════════════════ */
/*  Balance Stok Table (Dynamic)               */
/* ═══════════════════════════════════════════ */

interface BalanceStokTableProps {
    materials: Material[];
    data: BalanceStok[];
    productSlug: string;
    onMaterialsChange: () => void;
}

function BalanceStokTable({ materials, data, productSlug, onMaterialsChange }: BalanceStokTableProps) {
    const [isAddingMat, setIsAddingMat] = useState(false);
    const [newMatName, setNewMatName] = useState('');
    const [editingMat, setEditingMat] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    const handleAddMaterial = async () => {
        if (!newMatName.trim()) return;
        await bahanBakuService.createMaterial(productSlug, newMatName);
        setNewMatName('');
        setIsAddingMat(false);
        onMaterialsChange();
    };

    const handleUpdateMaterial = async (id: number) => {
        if (!editName.trim()) return;
        await bahanBakuService.updateMaterial(id, editName);
        setEditingMat(null);
        onMaterialsChange();
    };

    const handleDeleteMaterial = async (id: number) => {
        if (!confirm('Hapus kolom material ini?')) return;
        await bahanBakuService.deleteMaterial(id);
        onMaterialsChange();
    };

    // Helper to get detail for a specific material in a row
    const getDetail = (row: BalanceStok, matId: number) => {
        const d = row.details.find(d => d.materialId === matId);
        return d || { out: 0, in: 0, stokAkhir: 0 };
    };

    return (
        <div className="overflow-x-auto">
            <div className="p-2 flex justify-end">
                {isAddingMat ? (
                    <div className="flex gap-2 items-center">
                        <input
                            value={newMatName}
                            onChange={e => setNewMatName(e.target.value)}
                            placeholder="Nama Material Baru"
                            className="text-xs px-2 py-1 border rounded"
                            autoFocus
                        />
                        <button onClick={handleAddMaterial} className="text-xs bg-emerald-600 text-white px-2 py-1 rounded">Simpan</button>
                        <button onClick={() => setIsAddingMat(false)} className="text-xs text-gray-500 px-2">Batal</button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAddingMat(true)}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
                    >
                        <PlusIcon /> Tambah Kolom Material
                    </button>
                )}
            </div>

            <table className="w-full text-sm whitespace-nowrap">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left font-semibold text-gray-600 border-b border-gray-200" rowSpan={2}>
                            Tanggal
                        </th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-600 border-b border-gray-200" rowSpan={2}>
                            Produksi
                        </th>
                        {materials.map((mat) => (
                            <th
                                key={mat.id}
                                colSpan={3}
                                className="px-2 py-2 text-center font-bold text-gray-700 border-b border-gray-200 border-l border-gray-100 group relative min-w-[200px]"
                            >
                                {editingMat === mat.id ? (
                                    <div className="flex gap-1 justify-center">
                                        <input
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="w-24 text-xs border rounded px-1"
                                        />
                                        <button onClick={() => handleUpdateMaterial(mat.id)} className="text-emerald-600"><CheckIcon /></button>
                                        <button onClick={() => setEditingMat(null)} className="text-red-500"><XIcon /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        {mat.nama}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 absolute right-2 top-1/2 -translate-y-1/2">
                                            <button
                                                onClick={() => { setEditingMat(mat.id); setEditName(mat.nama); }}
                                                className="text-gray-400 hover:text-emerald-600 p-0.5"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMaterial(mat.id)}
                                                className="text-gray-400 hover:text-red-600 p-0.5"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </th>
                        ))}
                    </tr>
                    <tr className="bg-gray-50/60">
                        {materials.map((mat) => (
                            <Fragment key={mat.id}>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 border-b border-gray-200 border-l border-gray-100">Out</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 border-b border-gray-200">In</th>
                                <th className="px-3 py-1.5 text-center text-xs font-semibold text-gray-600 border-b border-gray-200">S Akhir</th>
                            </Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {/* Empty state if no data */}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={2 + materials.length * 3} className="px-4 py-8 text-center text-gray-400">
                                Belum ada data balance stok.
                            </td>
                        </tr>
                    )}
                    {data.map((row) => (
                        <tr key={row.id} className="hover:bg-emerald-50/20 transition-colors">
                            <td className="px-4 py-2.5 text-gray-700 text-[13px]">
                                {format(new Date(row.tanggal), 'dd MMMM yyyy')}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono text-gray-500 text-xs">{fmt(row.produksi)}</td>
                            {materials.map((mat) => {
                                const d = getDetail(row, mat.id);
                                return (
                                    <Fragment key={mat.id}>
                                        <td className="px-3 py-2.5 text-center font-mono text-gray-500 text-xs border-l border-gray-100">{fmt(d.out)}</td>
                                        <td className="px-3 py-2.5 text-center font-mono text-gray-500 text-xs">{fmt(d.in)}</td>
                                        <td className={`px-3 py-2.5 text-center font-mono text-xs font-bold ${d.stokAkhir > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>
                                            {fmt(d.stokAkhir)}
                                        </td>
                                    </Fragment>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
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
    const from = (page - 1) * 10 + 1;
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
    if (n === undefined || n === null) return '0,00';
    return n.toFixed(2).replace('.', ',');
}
