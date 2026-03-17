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
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
    getAnalisa,
    createAnalisa,
    updateAnalisa,
    deleteAnalisa,
    type AnalisaRow,
    type SaveAnalisaRequest
} from '@/lib/analisaService';

/* ─── Icons ─── */
function SearchIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>); }
function PlusIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>); }
function DownloadIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>); }
function ChevronLeftIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>); }
function ChevronRightIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>); }
function MoreIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>); }
function FilterIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>); }
function XIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>); }
function TrashIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>); }
function AlertTriangleIcon() { return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>); }
function PencilIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>); }

/* ─── Types ─── */


/* ─── Constants ─── */
const BULAN_OPTIONS = [
    { value: '', label: 'Semua Bulan' },
    { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' }, { value: '3', label: 'Maret' },
    { value: '4', label: 'April' }, { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' }, { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
];

function getInitialYear() { return new Date().getFullYear().toString(); }

function generateYearOptions() {
    const y = new Date().getFullYear();
    const years = [{ value: '', label: 'Semua Tahun' }];
    for (let i = y; i >= y - 3; i--) {
        years.push({ value: i.toString(), label: i.toString() });
    }
    return years;
}



/* ─── Helpers ─── */
function fmt(n: number | null | undefined): string {
    return Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function formatDateShort(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function formatDateForInput(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        'Lolos': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Tidak Lolos': 'bg-red-50 text-red-700 border-red-200',
        'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
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

/* ═══════════════════════════════════════════ */
/*  Form Modal                                 */
/* ═══════════════════════════════════════════ */

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: SaveAnalisaRequest) => Promise<void>;
    initialData?: AnalisaRow | null;
    productSlug: string;
}

function AnalisaFormModal({ isOpen, onClose, onSave, initialData, productSlug }: ModalProps) {
    const [tanggalSampling, setTanggalSampling] = useState('');
    const [noBAPC, setNoBAPC] = useState('');
    const [kuantum, setKuantum] = useState('');
    const [lembaga, setLembaga] = useState('');
    const [hasilAnalisa, setHasilAnalisa] = useState('Pending');
    const [tanggalAnalisa, setTanggalAnalisa] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormError(null);
            if (initialData) {
                setTanggalSampling(formatDateForInput(initialData.tanggalSampling));
                setNoBAPC(initialData.noBAPC);
                setKuantum(initialData.kuantum.toString());
                setLembaga(initialData.lembaga);
                setHasilAnalisa(initialData.hasilAnalisa);
                setTanggalAnalisa(formatDateForInput(initialData.tanggalAnalisa));
            } else {
                setTanggalSampling(formatDateForInput(new Date().toISOString()));
                setNoBAPC('');
                setKuantum('');
                setLembaga('');
                setHasilAnalisa('Pending');
                setTanggalAnalisa('');
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        try {
            setIsSaving(true);
            await onSave({
                productSlug,
                tanggalSampling: new Date(tanggalSampling).toISOString(),
                noBAPC,
                kuantum: parseFloat(kuantum),
                lembaga,
                hasilAnalisa,
                tanggalAnalisa: tanggalAnalisa ? new Date(tanggalAnalisa).toISOString() : null,
            });
            onClose();
        } catch (error) {
            console.error('Save failed', error);
            setFormError('Gagal menyimpan data.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {initialData ? 'Edit Data Analisa' : 'Tambah Data Analisa'}
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <XIcon />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Tanggal Sampling</label>
                            <input
                                type="date"
                                required
                                value={tanggalSampling}
                                onChange={e => setTanggalSampling(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">No. BAPC</label>
                            <input
                                type="text"
                                required
                                placeholder="Misal: 00739/B/LI.00.02"
                                value={noBAPC}
                                onChange={e => setNoBAPC(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Kuantum</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="0.00"
                                value={kuantum}
                                onChange={e => setKuantum(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Lembaga Sampling</label>
                            <input
                                type="text"
                                required
                                placeholder="Misal: Petrokimia Gresik"
                                value={lembaga}
                                onChange={e => setLembaga(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Hasil Analisa</label>
                            <select
                                value={hasilAnalisa}
                                onChange={e => setHasilAnalisa(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow bg-white"
                            >
                                <option value="Pending">Pending</option>
                                <option value="Lolos">Lolos</option>
                                <option value="Tidak Lolos">Tidak Lolos</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Tanggal Analisa</label>
                            <input
                                type="date"
                                value={tanggalAnalisa}
                                onChange={e => setTanggalAnalisa(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t border-gray-100 mt-6 items-center">
                        {formError && <span className="text-sm text-red-600 font-medium mr-auto">{formError}</span>}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
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
    const slug = productSlug || 'petro-gladiator';

    const [bulan, setBulan] = useState('');
    const [tahun, setTahun] = useState(getInitialYear());
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [data, setData] = useState<AnalisaRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<AnalisaRow | null>(null);

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const b = bulan ? parseInt(bulan) : undefined;
            const t = tahun ? parseInt(tahun) : undefined;
            const res = await getAnalisa(slug, b, t);
            setData(res.data || []);
        } catch (error) {
            console.error('Error fetching analisa data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [slug, bulan, tahun]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (payload: SaveAnalisaRequest) => {
        if (editingData) {
            await updateAnalisa({ id: editingData.id, ...payload });
        } else {
            await createAnalisa(payload);
        }
        fetchData();
    };

    const executeDelete = async () => {
        if (!deleteModal.id) return;
        try {
            setIsDeleting(true);
            setPageError(null);
            await deleteAnalisa(deleteModal.id);
            setDeleteModal({ isOpen: false, id: null });
            fetchData();
        } catch (error) {
            console.error("Delete failed", error);
            setPageError("Gagal menghapus data.");
            setDeleteModal({ isOpen: false, id: null });
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditModal = (row: AnalisaRow) => {
        setEditingData(row);
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingData(null);
        setIsModalOpen(true);
    };

    const filteredData = useMemo(() => {
        let list = data;

        if (search) {
            const s = search.toLowerCase();
            list = list.filter(r =>
                r.noBAPC.toLowerCase().includes(s) ||
                r.lembaga.toLowerCase().includes(s) ||
                r.hasilAnalisa.toLowerCase().includes(s)
            );
        }

        return list;
    }, [data, search]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
    const paginatedSlice = filteredData.slice((page - 1) * pageSize, page * pageSize);

    const TAHUN_OPTIONS = generateYearOptions();

    return (
        <div className="space-y-6">
            <AnalisaFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingData}
                productSlug={slug}
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
                            <button onClick={() => setDeleteModal({ isOpen: false, id: null })} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">Batal</button>
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
                    Analisa {productName}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Kelola kegiatan sampling dan hasil analisa produk
                </p>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

                {/* Actions Only (Tabs removed) */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 bg-gray-50/30">
                    <div className="text-sm font-semibold text-gray-700"></div>

                    {/* Actions */}
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <PlusIcon />
                        Tambah Data
                    </button>
                </div>

                {/* Filters Row */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                        {/* Left: Period */}
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
                <div className="flex-1">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500">Memuat data...</div>
                    ) : (
                        <>
                            {/* Desktop */}
                            <div className="overflow-x-auto hidden sm:block">
                                <table className="w-full text-sm border-collapse border border-gray-200">
                                    <thead>
                                        <tr className="bg-gray-50/80">
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-16">No</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left whitespace-nowrap">Tanggal Sampling</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left whitespace-nowrap">No. BAPC</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right whitespace-nowrap">Kuantum</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left whitespace-nowrap">Lembaga Sampling</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center whitespace-nowrap">Hasil Analisa</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-24">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {paginatedSlice.length === 0 ? (
                                            <tr><td colSpan={8} className="p-12 text-center text-gray-400 text-sm border border-gray-200">Tidak ada data analisa</td></tr>
                                        ) : (
                                            paginatedSlice.map((row, idx) => (
                                                <tr key={row.id} className="hover:bg-emerald-50/10 transition-colors">
                                                    <td className="px-4 py-3 text-gray-700 font-medium text-center border border-gray-200">{((page - 1) * pageSize) + idx + 1}</td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{formatDateShort(row.tanggalSampling)}</td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{row.noBAPC}</td>
                                                    <td className="px-4 py-3 text-right font-mono tabular-nums text-gray-700 border border-gray-200">{fmt(row.kuantum)}</td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{row.lembaga}</td>
                                                    <td className="px-4 py-3 text-center border border-gray-200"><StatusBadge status={row.hasilAnalisa} /></td>

                                                    <td className="px-4 py-3 text-center border border-gray-200">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => openEditModal(row)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Edit">
                                                                <PencilIcon />
                                                            </button>
                                                            <button onClick={() => setDeleteModal({ isOpen: true, id: row.id })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus">
                                                                <TrashIcon />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile view omitted for brevity but mimics desktop fields */}
                            <div className="sm:hidden divide-y divide-gray-100">
                                {paginatedSlice.length === 0 ? (
                                    <div className="px-4 py-12 text-center text-gray-400">Tidak ada data analisa</div>
                                ) : (
                                    paginatedSlice.map((row) => (
                                        <div key={row.id} className="p-4 space-y-2 relative group hover:bg-emerald-50/10">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{formatDateShort(row.tanggalSampling)}</p>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{row.noBAPC}</p>
                                                </div>
                                                <StatusBadge status={row.hasilAnalisa} />
                                                <div className="absolute top-2 right-2 flex gap-1 bg-white opacity-0 group-hover:opacity-100 transition-opacity rounded-md border border-gray-100 shadow-sm px-1 py-0.5">
                                                    <button onClick={() => openEditModal(row)} className="text-xs text-blue-600 px-2 py-1 hover:bg-blue-50 rounded">Edit</button>
                                                    <button onClick={() => setDeleteModal({ isOpen: true, id: row.id })} className="text-xs text-red-600 px-2 py-1 hover:bg-red-50 rounded">Hapus</button>
                                                </div>
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
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && (
                    <div className="mt-auto">
                        <Pagination page={page} totalPages={totalPages} total={filteredData.length} pageSize={pageSize} setPage={setPage} />
                    </div>
                )}
            </div>
        </div>
    );
}
