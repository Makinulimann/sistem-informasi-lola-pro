'use client';

import { useState, useMemo, useEffect, useCallback, Fragment } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
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
import { cn } from "@/lib/utils";
import { bahanBakuService, Perusahaan, BahanBaku, Material, BalanceStok, BalanceStokRow } from '@/lib/bahanBakuService';
import { PencilIcon, Trash2Icon as TrashIcon } from 'lucide-react';

/* ─── Types ─── */

type TabKey = 'suplai' | 'mutasi' | 'balance-stok' | 'konfigurasi';

/** Format number with locale-aware thousand separators */
const fmtNumber = (n: number | null | undefined) => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInteger = (n: number | null | undefined) => Number(n || 0).toLocaleString('id-ID');

// ...

const tabs: { key: TabKey; label: string }[] = [
    { key: 'suplai', label: 'Suplai' },
    { key: 'mutasi', label: 'Mutasi' },
    { key: 'balance-stok', label: 'Balance Stok' },
    { key: 'konfigurasi', label: 'Konfigurasi' },
];

interface SuplaiRow {
    id: number;
    no: number;
    tanggal: string;
    jenis: string;
    namaBahan: string;
    kuantum: number;
    satuan: string;
    dokumen: string;
    keterangan: string;
}

interface MutasiRow {
    id: number;
    no: number;
    tanggal: string;
    jenis: string;
    namaBahan: string;
    kuantum: number;
    satuan: string;
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



function AlertTriangleIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}

function MoreIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
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
    const [balanceStokRows, setBalanceStokRows] = useState<BalanceStokRow[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isSuplaiModalOpen, setIsSuplaiModalOpen] = useState(false);
    const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<any>(null);

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null; type: 'suplai' | 'mutasi' | null }>({ isOpen: false, id: null, type: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);



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
                    id: item.id,
                    no: idx + 1,
                    tanggal: format(new Date(item.tanggal), 'yyyy-MM-dd'),
                    jenis: item.jenis,
                    namaBahan: item.namaBahan,
                    kuantum: item.kuantum,
                    satuan: item.satuan || 'Kg',
                    dokumen: item.dokumen,
                    keterangan: item.keterangan || '-',
                })));
            } else if (activeTab === 'mutasi') {
                const data = await bahanBakuService.getMutasi(params);
                setMutasiData(data.map((item, idx) => ({
                    id: item.id,
                    no: idx + 1,
                    tanggal: format(new Date(item.tanggal), 'dd/MM/yyyy'),
                    jenis: item.jenis,
                    namaBahan: item.namaBahan,
                    kuantum: item.kuantum,
                    satuan: item.satuan || 'Kg',
                    dokumen: item.dokumen,
                    keterangan: item.keterangan || '-',
                })));
            } else if (activeTab === 'balance-stok') {
                const rows = await bahanBakuService.getBalanceStok({
                    productSlug: defaultProductSlug,
                    bulan: bulan || undefined,
                    tahun: tahun || undefined
                });
                setBalanceStokRows(rows);
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
            perusahaanId: 0, // Default to 0
            tanggal: data.date,
            jenis: data.jenis,
            namaBahan: data.namaBahan,
            kuantum: parseFloat(data.quantum || 0),
            satuan: data.satuan,
            dokumen: data.file ? data.file.name : (editData?.dokumen || ''),
            keterangan: data.keterangan || ''
        };
        try {
            if (editingId) {
                await bahanBakuService.updateSuplai(editingId, payload);
            } else {
                await bahanBakuService.createSuplai(payload as any);
            }
            fetchData();
            setEditingId(null);
            setEditData(null);
        } catch (error) {
            console.error('Failed to save suplai:', error);
            alert('Gagal menyimpan data suplai.');
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
            satuan: data.satuan,
            dokumen: data.file ? data.file.name : (editData?.dokumen || ''),
            keterangan: data.keterangan
        };
        try {
            if (editingId) {
                await bahanBakuService.updateMutasi(editingId, payload);
            } else {
                await bahanBakuService.createMutasi(payload as any);
            }
            fetchData();
            setEditingId(null);
            setEditData(null);
        } catch (error) {
            console.error('Failed to save mutasi:', error);
            alert('Gagal menyimpan data mutasi.');
        }
    };

    const confirmDelete = (type: 'suplai' | 'mutasi', id: number) => {
        setDeleteModal({ isOpen: true, id, type });
    };

    const executeDelete = async () => {
        if (!deleteModal.id || !deleteModal.type) return;
        try {
            setIsDeleting(true);
            setPageError(null);
            if (deleteModal.type === 'suplai') {
                await bahanBakuService.deleteSuplai(deleteModal.id);
            } else {
                await bahanBakuService.deleteMutasi(deleteModal.id);
            }
            fetchData();
            setDeleteModal({ isOpen: false, id: null, type: null });
        } catch (error) {
            console.error('Failed to delete data:', error);
            setPageError('Gagal menghapus data.');
            setDeleteModal({ isOpen: false, id: null, type: null });
        } finally {
            setIsDeleting(false);
        }
    };

    const refreshMaterials = () => {
        bahanBakuService.getMaterials(defaultProductSlug).then(setMaterials);
    };

    const handleEditSuplai = (item: SuplaiRow) => {
        setEditingId(item.id);
        setEditData(item);
        setIsSuplaiModalOpen(true);
    };

    const handleEditMutasi = (item: MutasiRow) => {
        setEditingId(item.id);
        setEditData(item);
        setIsMutasiModalOpen(true);
    };

    const handleExportExcel = () => {
        let dataToExport: any[] = [];
        let filename = '';
        let sheetName = '';

        if (activeTab === 'suplai') {
            dataToExport = suplaiData.map(row => ({
                No: row.no,
                Tanggal: format(new Date(row.tanggal), 'dd/MM/yyyy'),
                Jenis: row.jenis,
                'Nama Bahan': row.namaBahan,
                Kuantum: row.kuantum,
                Satuan: row.satuan,
                Dokumen: row.dokumen,
                Keterangan: row.keterangan,
            }));
            filename = `Suplai_Data_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
            sheetName = 'Data Suplai';
        } else if (activeTab === 'mutasi') {
            dataToExport = mutasiData.map(row => ({
                No: row.no,
                Tanggal: format(new Date(row.tanggal), 'dd/MM/yyyy'),
                Jenis: row.jenis,
                'Nama Bahan': row.namaBahan,
                Kuantum: row.kuantum,
                Satuan: row.satuan,
                Dokumen: row.dokumen,
                Keterangan: row.keterangan,
            }));
            filename = `Mutasi_Data_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
            sheetName = 'Data Mutasi';
        } else if (activeTab === 'balance-stok') {
            dataToExport = balanceStokRows.map(row => ({
                'Nama Bahan': row.nama,
                'Jenis': row.jenis === 'Baku' ? 'Bahan Baku' : 'Bahan Penolong',
                'Satuan': row.satuan,
                'Pemasukan': row.totalIn,
                'Pengeluaran': row.totalOut,
                'Stok Akhir': row.stok,
            }));
            filename = `Balance_Stok_Data_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
            sheetName = 'Balance Stok';
        }

        if (dataToExport.length > 0) {
            import('xlsx').then((XLSX) => {
                const ws = XLSX.utils.json_to_sheet(dataToExport);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
                XLSX.writeFile(wb, filename);
            });
        } else {
            alert('Tidak ada data untuk diekspor.');
        }
    };

    const handleExportPDF = () => {
        let headers: string[] = [];
        let dataRows: any[][] = [];
        let title = '';

        if (activeTab === 'suplai') {
            title = 'Data Suplai Bahan Baku';
            headers = ['No.', 'Tanggal', 'Jenis', 'Nama Bahan', 'Kuantum', 'Satuan', 'Dokumen', 'Keterangan'];
            dataRows = suplaiData.map(row => [
                row.no,
                format(new Date(row.tanggal), 'dd/MM/yyyy'),
                row.jenis,
                row.namaBahan,
                fmtInteger(row.kuantum),
                row.satuan,
                row.dokumen || '-',
                row.keterangan || '-',
            ]);
        } else if (activeTab === 'mutasi') {
            title = 'Data Mutasi Bahan Baku';
            headers = ['No.', 'Tanggal', 'Jenis', 'Nama Bahan', 'Kuantum', 'Satuan', 'Dokumen', 'Keterangan'];
            dataRows = mutasiData.map(row => [
                row.no,
                format(new Date(row.tanggal), 'dd/MM/yyyy'),
                row.jenis,
                row.namaBahan,
                fmtInteger(row.kuantum),
                row.satuan,
                row.dokumen || '-',
                row.keterangan || '-',
            ]);
        } else if (activeTab === 'balance-stok') {
            title = 'Balance Stok Bahan Baku';
            headers = ['Nama Bahan', 'Jenis', 'Satuan', 'Pemasukan', 'Pengeluaran', 'Stok Akhir'];
            dataRows = balanceStokRows.map(row => [
                row.nama,
                row.jenis === 'Baku' ? 'Bahan Baku' : 'Bahan Penolong',
                row.satuan,
                fmtInteger(row.totalIn),
                fmtInteger(row.totalOut),
                fmtInteger(row.stok),
            ]);
        }

        if (dataRows.length > 0) {
            Promise.all([
                import('jspdf'),
                import('jspdf-autotable')
            ]).then(([jsPDFModule, autoTableModule]) => {
                const jsPDF = jsPDFModule.default;
                const autoTable = autoTableModule.default;

                const doc = new jsPDF();
                doc.text(title, 14, 15);
                autoTable(doc, {
                    startY: 20,
                    head: [headers],
                    body: dataRows,
                    theme: 'grid',
                    styles: {
                        font: 'helvetica',
                        fontSize: 8,
                        cellPadding: 2,
                        halign: 'left',
                    },
                    headStyles: {
                        fillColor: [23, 162, 184], // A nice blue color
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                    },
                    columnStyles: {
                        3: { halign: 'right' }, // Pemasukan
                        4: { halign: 'right' }, // Pengeluaran
                        5: { halign: 'right' }, // Stok Akhir
                    }
                });
                doc.save(`${title.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
            });
        } else {
            alert('Tidak ada data untuk diekspor.');
        }
    };

    return (
        <div className="space-y-6">
            <SuplaiModal
                isOpen={isSuplaiModalOpen}
                onClose={() => {
                    setIsSuplaiModalOpen(false);
                    setEditingId(null);
                    setEditData(null);
                }}
                onSubmit={handleAddSuplai}
                productSlug={defaultProductSlug}
                initialData={editData}
            />
            <MutasiModal
                isOpen={isMutasiModalOpen}
                onClose={() => {
                    setIsMutasiModalOpen(false);
                    setEditingId(null);
                    setEditData(null);
                }}
                onSubmit={handleAddMutasi}
                productSlug={defaultProductSlug}
                initialData={editData}
            />

            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                                <AlertTriangleIcon />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Data?</h3>
                            <p className="text-sm text-gray-500 mb-6">Data yang dihapus tidak dapat dikembalikan. Lanjutkan?</p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setDeleteModal({ isOpen: false, id: null, type: null })} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">Batal</button>
                            <button onClick={executeDelete} disabled={isDeleting} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pageError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                    <span className="text-sm font-medium text-red-800">{pageError}</span>
                    <button onClick={() => setPageError(null)} className="px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors">Tutup</button>
                </div>
            )}

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
                                    <button suppressHydrationWarning className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                                        <DownloadIcon />
                                        Export Data
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg rounded-lg p-1 z-50">
                                    <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50">
                                        <span className="mr-2">📄</span> Export to Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50">
                                        <span className="mr-2">📑</span> Export to PDF
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

                {/* Filters Row */}
                {activeTab !== 'konfigurasi' && (
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                            {/* Left Side: Period Filter (only for Suplai/Mutasi) */}
                            {/* Left Side: Period Filter (Available for all tabs) */}
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
                                {(bulan || tahun) && (
                                    <button
                                        onClick={() => { setBulan(''); setTahun(''); }}
                                        className="px-4 py-2 bg-white text-gray-500 text-sm font-medium rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                                    >
                                        ✕ Hapus Filter
                                    </button>
                                )}
                                {activeTab === 'balance-stok' && (bulan || tahun) && (
                                    <span className="text-xs text-gray-400 italic ml-2">
                                        {`Menampilkan data periode: ${bulan ? BULAN_OPTIONS.find(o => o.value === bulan)?.label : ''} ${tahun}`}
                                    </span>
                                )}
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
                            {activeTab === 'suplai' && <SuplaiTable data={suplaiData} search={search} onDelete={(id) => confirmDelete('suplai', id)} onEdit={handleEditSuplai} />}
                            {activeTab === 'mutasi' && <MutasiTable data={mutasiData} search={search} onEdit={handleEditMutasi} onDelete={(id) => confirmDelete('mutasi', id)} />}
                            {activeTab === 'balance-stok' && (
                                <BalanceStokTable
                                    data={balanceStokRows}
                                    productSlug={defaultProductSlug}
                                    search={search}
                                    bulan={bulan}
                                    tahun={tahun}
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

function SuplaiTable({ data, search, onDelete, onEdit }: { data: SuplaiRow[]; search: string; onDelete: (id: number) => void; onEdit: (item: SuplaiRow) => void }) {
    const filtered = useMemo(() =>
        data.filter((row) =>
            search === '' ||
            row.namaBahan.toLowerCase().includes(search.toLowerCase()) ||
            row.keterangan.toLowerCase().includes(search.toLowerCase()) ||
            row.jenis.toLowerCase().includes(search.toLowerCase())
        ), [data, search]);

    const { page, setPage, totalPages, paginated, total } = usePagination(filtered);

    // Sorting helper (simple implementation)
    const [sortConfig, setSortConfig] = useState<{ key: keyof SuplaiRow | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

    const sortedData = useMemo(() => {
        if (!sortConfig.key) return paginated;
        const sorted = [...paginated].sort((a, b) => {
            const aVal = a[sortConfig.key!] as any;
            const bVal = b[sortConfig.key!] as any;
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [paginated, sortConfig]);

    const requestSort = (key: keyof SuplaiRow) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <>
            <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-50/80">
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-16">No</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('tanggal')}>
                                <div className="flex items-center gap-1.5">
                                    Tanggal <SortIcon direction={sortConfig.key === 'tanggal' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('jenis')}>
                                <div className="flex items-center gap-1.5">
                                    Jenis <SortIcon direction={sortConfig.key === 'jenis' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('namaBahan')}>
                                <div className="flex items-center gap-1.5">
                                    Nama Bahan <SortIcon direction={sortConfig.key === 'namaBahan' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('kuantum')}>
                                <div className="flex items-center justify-end gap-1.5">
                                    Kuantum <SortIcon direction={sortConfig.key === 'kuantum' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center">Dokumen</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Keterangan</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-24">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-12 text-center text-gray-400 text-sm border border-gray-200">
                                    Tidak ada data ditemukan.
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row) => (
                                <tr key={row.id} className="hover:bg-emerald-50/10 transition-colors">
                                    <td className="px-4 py-3 text-gray-700 font-medium text-center border border-gray-200">{row.no}</td>
                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{format(new Date(row.tanggal), 'dd/MM/yyyy')}</td>
                                    <td className="px-4 py-3 border border-gray-200">
                                        <span className={cn(
                                            "inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full border",
                                            row.jenis === 'Bahan Baku'
                                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        )}>
                                            {row.jenis}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-800 font-medium border border-gray-200">{row.namaBahan || '-'}</td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700 border border-gray-200">
                                        {fmtInteger(row.kuantum)} <span className="text-gray-400 text-[11px] ml-0.5">{row.satuan}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center border border-gray-200">
                                        {row.dokumen ? (
                                            <button className="text-emerald-600 hover:text-emerald-800 transition-colors p-1" title={row.dokumen}>
                                                <EyeIcon />
                                            </button>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate border border-gray-200">{row.keterangan || '-'}</td>
                                    <td className="px-4 py-3 text-center border border-gray-200">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Edit">
                                                <PencilIcon size={14} />
                                            </button>
                                            <button onClick={() => onDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus">
                                                <TrashIcon size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Mobile View */}
            <div className="sm:hidden divide-y divide-gray-100">
                {sortedData.map((row) => (
                    <div key={row.id} className="p-4 space-y-3 bg-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-400">#{row.no}</span>
                                <span className="text-xs text-gray-500">{format(new Date(row.tanggal), 'dd/MM/yyyy')}</span>
                            </div>
                            <div className="flex gap-1 justify-end">
                                <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><PencilIcon size={14} /></button>
                                <button onClick={() => onDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><TrashIcon size={14} /></button>
                            </div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-gray-800">{row.namaBahan}</p>
                                <span className={cn("text-xs px-2 py-0.5 rounded-full mt-1 inline-block", row.jenis === 'Bahan Baku' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700")}>
                                    {row.jenis}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-mono font-medium text-gray-700">
                                    {fmtInteger(row.kuantum)} {row.satuan}
                                </p>
                            </div>
                        </div>
                        {row.dokumen && (
                            <div className="flex items-center gap-2 text-xs text-emerald-600">
                                <EyeIcon /> <span>{row.dokumen}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
        </>
    );
}

function MutasiTable({ data, search, onEdit, onDelete }: { data: MutasiRow[]; search: string; onEdit: (row: MutasiRow) => void; onDelete: (id: number) => void }) {
    const filtered = useMemo(() =>
        data.filter((row) =>
            search === '' ||
            row.namaBahan.toLowerCase().includes(search.toLowerCase()) ||
            row.keterangan.toLowerCase().includes(search.toLowerCase())
        ), [data, search]);

    const { page, setPage, totalPages, paginated, total } = usePagination(filtered);

    // Sorting helper
    const [sortConfig, setSortConfig] = useState<{ key: keyof MutasiRow | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

    const sortedData = useMemo(() => {
        if (!sortConfig.key) return paginated;
        const sorted = [...paginated].sort((a, b) => {
            const aVal = a[sortConfig.key!] as any;
            const bVal = b[sortConfig.key!] as any;
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [paginated, sortConfig]);

    const requestSort = (key: keyof MutasiRow) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <>
            <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-50/80">
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-16">No</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('tanggal')}>
                                <div className="flex items-center gap-1.5">
                                    Tanggal <SortIcon direction={sortConfig.key === 'tanggal' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('jenis')}>
                                <div className="flex items-center gap-1.5">
                                    Jenis <SortIcon direction={sortConfig.key === 'jenis' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('namaBahan')}>
                                <div className="flex items-center gap-1.5">
                                    Nama Bahan <SortIcon direction={sortConfig.key === 'namaBahan' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('kuantum')}>
                                <div className="flex items-center justify-end gap-1.5">
                                    Kuantum <SortIcon direction={sortConfig.key === 'kuantum' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center">Dokumen</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Keterangan</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-24">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-12 text-center text-gray-400 text-sm border border-gray-200">
                                    Tidak ada data ditemukan.
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row) => (
                                <tr key={row.id} className="hover:bg-emerald-50/10 transition-colors">
                                    <td className="px-4 py-3 text-gray-700 font-medium text-center border border-gray-200">{row.no}</td>
                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{row.tanggal}</td>
                                    <td className="px-4 py-3 border border-gray-200">
                                        <span className={cn(
                                            "inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full border",
                                            row.jenis === 'Bahan Baku'
                                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        )}>
                                            {row.jenis}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-800 font-medium border border-gray-200">{row.namaBahan || '-'}</td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700 border border-gray-200">
                                        {fmtInteger(row.kuantum)} <span className="text-gray-400 text-[11px] ml-0.5">{row.satuan}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center border border-gray-200">
                                        {row.dokumen ? (
                                            <button className="text-emerald-600 hover:text-emerald-800 transition-colors p-1" title={row.dokumen}>
                                                <EyeIcon />
                                            </button>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate border border-gray-200">{row.keterangan || '-'}</td>
                                    <td className="px-4 py-3 text-center border border-gray-200">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Edit">
                                                <PencilIcon size={14} />
                                            </button>
                                            <button onClick={() => onDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus">
                                                <TrashIcon size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Mobile View */}
            <div className="sm:hidden divide-y divide-gray-100">
                {sortedData.map((row) => (
                    <div key={row.id} className="p-4 space-y-3 bg-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-400">#{row.no}</span>
                                <span className="text-xs text-gray-500">{row.tanggal}</span>
                            </div>
                            <div className="flex gap-1 justify-end">
                                <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><PencilIcon size={14} /></button>
                                <button onClick={() => onDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><TrashIcon size={14} /></button>
                            </div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-gray-800">{row.namaBahan}</p>
                                <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full mt-1 inline-block",
                                    row.jenis === 'Bahan Baku' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                                )}>
                                    {row.jenis}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-mono font-medium text-gray-700">
                                    {fmtInteger(row.kuantum)} {row.satuan}
                                </p>
                            </div>
                        </div>
                        {row.dokumen && (
                            <div className="flex items-center gap-2 text-xs text-emerald-600">
                                <EyeIcon /> <span>{row.dokumen}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
        </>
    );
}

/* ─── Frontend unit conversion helper ─── */

const MASS_UNITS = ['Ton', 'Kwintal', 'Kg', 'Gram', 'mg'];
const VOL_UNITS = ['KL', 'Liter', 'mL'];

function getUnitFamily(unit: string): string[] {
    const lo = unit.toLowerCase();
    if (['ton', 'kwintal', 'kg', 'gram', 'mg', 'kilogram', 'kilo', 'gr', 'g'].includes(lo)) return MASS_UNITS;
    if (['kl', 'liter', 'l', 'lt', 'litre', 'ml', 'milliliter', 'cc'].includes(lo)) return VOL_UNITS;
    return [unit]; // unknown family, just keep original
}

function normalizeUnit(u: string): string {
    const lo = u.trim().toLowerCase();
    const map: Record<string, string> = {
        'l': 'Liter', 'lt': 'Liter', 'litre': 'Liter', 'liter': 'Liter',
        'ml': 'mL', 'milliliter': 'mL', 'cc': 'mL',
        'kl': 'KL',
        'kg': 'Kg', 'kilo': 'Kg', 'kilogram': 'Kg',
        'gram': 'Gram', 'gr': 'Gram', 'g': 'Gram',
        'mg': 'mg',
        'ton': 'Ton',
        'kwintal': 'Kwintal',
    };
    return map[lo] || u;
}

function convertUnitFE(value: number, fromUnit: string, toUnit: string): number {
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);
    if (from === to) return value;

    // Mass → Kg base
    const toKg: Record<string, number> = { 'Ton': 1000, 'Kwintal': 100, 'Kg': 1, 'Gram': 0.001, 'mg': 0.000001 };
    // Vol → Liter base
    const toLiter: Record<string, number> = { 'KL': 1000, 'Liter': 1, 'mL': 0.001 };

    if (from in toKg && to in toKg) {
        return value * toKg[from] / toKg[to];
    }
    if (from in toLiter && to in toLiter) {
        return value * toLiter[from] / toLiter[to];
    }
    return value;
}

/* ═══════════════════════════════════════════ */
/*  Balance Stok Table (Computed)               */
/* ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════ */
/*  Balance Stok Table (Computed)               */
/* ═══════════════════════════════════════════ */

interface BalanceStokTableProps {
    data: BalanceStokRow[];
    productSlug: string;
    search: string;
    bulan?: string;
    tahun?: string;
}

function BalanceStokTable({ data, productSlug, search, bulan, tahun }: BalanceStokTableProps) {
    const [historyModal, setHistoryModal] = useState<{ nama: string; tipe: string } | null>(null);
    const [historyData, setHistoryData] = useState<BahanBaku[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    // Per-row display satuan overrides: { 'Molase': 'mL' }
    const [satuanOverrides, setSatuanOverrides] = useState<Record<string, string>>({});
    const [categoryFilter, setCategoryFilter] = useState<'All' | 'Baku' | 'Penolong'>('All');

    const getDisplaySatuan = (row: BalanceStokRow) => satuanOverrides[row.nama] || normalizeUnit(row.satuan);

    const getConvertedRow = (row: BalanceStokRow) => {
        const displaySatuan = getDisplaySatuan(row);
        const fromSatuan = normalizeUnit(row.satuan);
        return {
            totalIn: convertUnitFE(row.totalIn, fromSatuan, displaySatuan),
            totalOut: convertUnitFE(row.totalOut, fromSatuan, displaySatuan),
            stok: convertUnitFE(row.stok, fromSatuan, displaySatuan),
            satuan: displaySatuan,
        };
    };

    const handleSatuanChange = (materialName: string, newSatuan: string) => {
        setSatuanOverrides(prev => ({ ...prev, [materialName]: newSatuan }));
    };

    const openHistory = async (nama: string, tipe: 'Suplai' | 'Mutasi') => {
        setHistoryModal({ nama, tipe });
        setHistoryLoading(true);
        try {
            const data = await bahanBakuService.getHistory({
                productSlug,
                namaBahan: nama,
                tipe,
                bulan: bulan || undefined,
                tahun: tahun || undefined,
            });
            setHistoryData(data);
        } catch (e) {
            console.error('Failed to load history:', e);
            setHistoryData([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const closeHistory = () => {
        setHistoryModal(null);
        setHistoryData([]);
    };



    // Filter Logic
    const filteredData = data.filter(row => {
        const matchesSearch = row.nama.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || (categoryFilter === 'Baku' && row.jenis === 'Baku') || (categoryFilter === 'Penolong' && row.jenis === 'Penolong');
        return matchesSearch && matchesCategory;
    });

    // Separate Baku and Penolong for visual grouping (from filtered data)
    const bakuItems = filteredData.filter(r => r.jenis === 'Baku');
    const penolongItems = filteredData.filter(r => r.jenis === 'Penolong');

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Belum ada material dikonfigurasi</p>
                <p className="text-xs text-gray-400">Tambahkan material di tab <span className="font-semibold text-emerald-600">Konfigurasi</span> terlebih dahulu.</p>
            </div>
        );
    }

    const renderRow = (row: BalanceStokRow, idx: number, isLast: boolean) => {
        const converted = getConvertedRow(row);
        const unitFamily = getUnitFamily(row.satuan);

        return (
            <tr key={`${row.jenis}-${row.nama}`} className="hover:bg-emerald-50/10 transition-colors group">
                <td className="px-4 py-3 text-emerald-600 font-medium text-center border border-gray-200">{idx + 1}</td>
                <td className="px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            row.jenis === 'Baku' ? 'bg-emerald-500' : 'bg-amber-500'
                        )} />
                        <span className="text-gray-800 font-medium">{row.nama}</span>
                    </div>
                </td>
                <td className="px-4 py-3 border border-gray-200">
                    <span className={cn(
                        'inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full border',
                        row.jenis === 'Baku'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                    )}>
                        {row.jenis === 'Baku' ? 'Bahan Baku' : 'Bahan Penolong'}
                    </span>
                </td>
                <td className="px-4 py-3 text-center border border-gray-200">
                    {unitFamily.length > 1 ? (
                        <select
                            value={converted.satuan}
                            onChange={(e) => handleSatuanChange(row.nama, e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg px-2 py-1 cursor-pointer hover:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all appearance-none text-center"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '18px' }}
                        >
                            {unitFamily.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-sm text-gray-500">{converted.satuan}</span>
                    )}
                </td>
                <td className="px-4 py-3 text-center border border-gray-200">
                    {converted.totalIn > 0 ? (
                        <button
                            onClick={() => openHistory(row.nama, 'Suplai')}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 transition-all cursor-pointer group/in"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /></svg>
                            {fmtNumber(converted.totalIn)} <span className="text-[11px] font-normal text-blue-600/70">{converted.satuan}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-0 group-hover/in:opacity-100 transition-opacity text-blue-400"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                    ) : (
                        <span className="text-sm text-gray-300 font-mono">—</span>
                    )}
                </td>
                <td className="px-4 py-3 text-center border border-gray-200">
                    {converted.totalOut > 0 ? (
                        <button
                            onClick={() => openHistory(row.nama, 'Mutasi')}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-100 hover:border-orange-200 transition-all cursor-pointer group/out"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><polyline points="7 1 3 5 7 9" /><path d="M21 11V9a4 4 0 0 0-4-4H3" /></svg>
                            {fmtNumber(converted.totalOut)} <span className="text-[11px] font-normal text-orange-600/70">{converted.satuan}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-0 group-hover/out:opacity-100 transition-opacity text-orange-400"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                    ) : (
                        <span className="text-sm text-gray-300 font-mono">—</span>
                    )}
                </td>
                <td className="px-4 py-3 text-center border border-gray-200">
                    <span className={cn(
                        'inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold',
                        converted.stok > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            converted.stok < 0 ? 'bg-red-50 text-red-600 border border-red-100' :
                                'bg-gray-50 text-gray-400 border border-gray-100'
                    )}>
                        {fmtNumber(converted.stok)} <span className="text-xs font-normal opacity-70">{converted.satuan}</span>
                    </span>
                </td>
            </tr>
        );
    };

    return (
        <>
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex gap-2">
                    {(['All', 'Baku', 'Penolong'] as const).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                                categoryFilter === cat
                                    ? 'bg-white text-emerald-700 border-emerald-200 shadow-sm'
                                    : 'text-gray-500 border-transparent hover:bg-white hover:border-gray-200'
                            )}
                        >
                            {cat === 'All' ? 'Semua' : cat === 'Baku' ? 'Bahan Baku' : 'Bahan Penolong'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-50/80">
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-12">No</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Nama Bahan</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Jenis</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-24">Satuan</th>
                            <th className="px-4 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider border border-gray-200 text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /></svg>
                                    In (Masuk)
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-orange-700 uppercase tracking-wider border border-gray-200 text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-600"><polyline points="7 1 3 5 7 9" /><path d="M21 11V9a4 4 0 0 0-4-4H3" /></svg>
                                    Out (Keluar)
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-emerald-700 uppercase tracking-wider border border-gray-200 text-center">Stok Akhir</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                    Tidak ada data yang cocok dengan filter atau pencarian.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {bakuItems.length > 0 && categoryFilter !== 'Penolong' && (
                                    <>
                                        <tr className="bg-emerald-50/30">
                                            <td colSpan={7} className="px-5 py-2">
                                                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Bahan Baku</span>
                                            </td>
                                        </tr>
                                        {bakuItems.map((row, idx) => renderRow(row, idx, idx === bakuItems.length - 1))}
                                    </>
                                )}
                                {penolongItems.length > 0 && categoryFilter !== 'Baku' && (
                                    <>
                                        <tr className="bg-amber-50/30">
                                            <td colSpan={7} className="px-5 py-2">
                                                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Bahan Penolong</span>
                                            </td>
                                        </tr>
                                        {penolongItems.map((row, idx) => renderRow(row, bakuItems.length + idx, idx === penolongItems.length - 1))}
                                    </>
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ─── History Modal ─── */}
            {
                historyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={closeHistory}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className={cn(
                                'flex items-center justify-between px-6 py-4 border-b',
                                historyModal.tipe === 'Suplai' ? 'bg-gradient-to-r from-blue-50 to-white border-blue-100' : 'bg-gradient-to-r from-orange-50 to-white border-orange-100'
                            )}>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                        {historyModal.tipe === 'Suplai' ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /></svg>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500"><polyline points="7 1 3 5 7 9" /><path d="M21 11V9a4 4 0 0 0-4-4H3" /></svg>
                                        )}
                                        Riwayat {historyModal.tipe}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Material: <span className="font-semibold text-gray-700">{historyModal.nama}</span></p>
                                </div>
                                <button onClick={closeHistory} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto">
                                {historyLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                    </div>
                                ) : historyData.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                        <p className="text-sm">Tidak ada data riwayat.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm border-collapse border border-gray-200">
                                        <thead className="sticky top-0 bg-white z-10">
                                            <tr className="bg-gray-50/80">
                                                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-10">No</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Tanggal</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right">Kuantum</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center">Satuan</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Dokumen</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Keterangan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {historyData.map((item, idx) => (
                                                <tr key={item.id} className="hover:bg-emerald-50/10 transition-colors group">
                                                    <td className="px-4 py-3 text-gray-700 text-center font-medium border border-gray-200">{idx + 1}</td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{format(new Date(item.tanggal), 'dd/MM/yyyy')}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-gray-700 border border-gray-200">{fmtNumber(item.kuantum)}</td>
                                                    <td className="px-4 py-3 text-center text-[11px] text-gray-500 border border-gray-200">{item.satuan || 'Kg'}</td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{item.dokumen || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate border border-gray-200">{item.keterangan || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50/80">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-3 text-right text-xs font-bold text-gray-700 border border-gray-200 uppercase tracking-wider">Total</td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-gray-800 border border-gray-200">{fmtNumber(historyData.reduce((s, i) => s + i.kuantum, 0))}</td>
                                                <td colSpan={3} className="border border-gray-200"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </>
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
