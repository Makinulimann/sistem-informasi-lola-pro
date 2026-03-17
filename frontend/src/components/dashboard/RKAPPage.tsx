'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
    getRKAP,
    createRKAP,
    updateRKAP,
    deleteRKAP,
    RKAPRow,
    SaveRKAPRequest
} from '@/services/rkapService';

import { PencilIcon, Trash2Icon, PlusIcon, SearchIcon, XIcon, AlertTriangleIcon } from 'lucide-react';

/* ─── Utils ─── */
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
    { value: 12, label: 'Desember' }
];

function getBulanLabel(bulan: number) {
    return BULAN_OPTIONS.find(b => b.value === bulan)?.label || bulan.toString();
}

const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
};

const fmt = (num: number) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num);
};


/* ═══════════════════════════════════════════ */
/*  Form Modal Component (Tambah/Edit)         */
/* ═══════════════════════════════════════════ */

interface RKAPFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: SaveRKAPRequest) => Promise<void>;
    initialData?: RKAPRow | null;
    productSlug: string;
}

function RKAPFormModal({ isOpen, onClose, onSave, initialData, productSlug }: RKAPFormModalProps) {
    const currentDate = new Date();
    const [bulan, setBulan] = useState(currentDate.getMonth() + 1);
    const [tahun, setTahun] = useState(currentDate.getFullYear());
    const [target, setTarget] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormError(null);
            if (initialData) {
                setBulan(initialData.bulan);
                setTahun(initialData.tahun);
                setTarget(initialData.target.toString());
            } else {
                setBulan(currentDate.getMonth() + 1);
                setTahun(currentDate.getFullYear());
                setTarget('');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        try {
            setIsSaving(true);
            await onSave({
                productSlug,
                bulan,
                tahun,
                target: parseFloat(target),
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
                        {initialData ? 'Edit Target RKAP' : 'Tambah Target RKAP'}
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <XIcon />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Bulan</label>
                            <select
                                value={bulan}
                                onChange={(e) => setBulan(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow bg-white"
                            >
                                {BULAN_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Tahun</label>
                            <select
                                value={tahun}
                                onChange={(e) => setTahun(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow bg-white"
                            >
                                {generateYearOptions().map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Target RKAP</label>
                        <input
                            type="number"
                            step="any"
                            required
                            placeholder="0.00"
                            value={target}
                            onChange={e => setTarget(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                        />
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

interface RKAPPageProps {
    productCategory: string;
    productName: string;
    productSlug?: string;
}

export function RKAPPage({ productCategory, productName, productSlug }: RKAPPageProps) {
    const slug = productSlug || 'petro-gladiator';

    const [bulan, setBulan] = useState('');
    const [tahun, setTahun] = useState(generateYearOptions()[0].toString());
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [data, setData] = useState<RKAPRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<RKAPRow | null>(null);

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const b = bulan ? parseInt(bulan) : undefined;
            const t = tahun ? parseInt(tahun) : undefined;
            const res = await getRKAP(slug, b, t);
            setData(res.data || []);
        } catch (error) {
            console.error('Error fetching RKAP data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [slug, bulan, tahun]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (payload: SaveRKAPRequest) => {
        if (editingData) {
            await updateRKAP({ id: editingData.id, ...payload });
        } else {
            await createRKAP(payload);
        }
        fetchData();
    };

    const executeDelete = async () => {
        if (!deleteModal.id) return;
        try {
            setIsDeleting(true);
            setPageError(null);
            await deleteRKAP(deleteModal.id);
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

    const openEditModal = (row: RKAPRow) => {
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
                r.target.toString().includes(s) ||
                getBulanLabel(r.bulan).toLowerCase().includes(s) ||
                r.tahun.toString().includes(s)
            );
        }

        return list;
    }, [data, search]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
    const paginatedSlice = filteredData.slice((page - 1) * pageSize, page * pageSize);

    const TAHUN_OPTIONS = generateYearOptions();

    return (
        <div className="space-y-6">
            <RKAPFormModal
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
                <span className="text-gray-800 font-medium">RKAP</span>
            </div>

            {/* Page Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    RKAP {productName}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Kelola data Rencana Kerja dan Anggaran Perusahaan
                </p>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

                {/* Tab Row (Static for RKAP) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 bg-gray-50/50">
                    <div className="flex overflow-x-auto scrollbar-hide px-4 py-3">
                        <span className="text-base font-medium text-emerald-700 border-b-2 border-emerald-600 px-2 py-1">
                            Target RKAP
                        </span>
                    </div>
                </div>

                {/* Filter and Action Row */}
                <div className="p-4 sm:px-6 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
                    {/* Left: Filter Periode & Add */}
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto overflow-hidden">
                            <span className="text-sm font-medium text-gray-500 hidden sm:inline-block">Periode:</span>
                            <select
                                value={bulan}
                                onChange={e => { setBulan(e.target.value); setPage(1); }}
                                className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer flex-1 sm:w-28"
                            >
                                <option value="">Semua Bulan</option>
                                {BULAN_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <span className="text-gray-300 mx-1">/</span>
                            <select
                                value={tahun}
                                onChange={e => { setTahun(e.target.value); setPage(1); }}
                                className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer w-20"
                            >
                                <option value="">Semua</option>
                                {TAHUN_OPTIONS.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={openAddModal}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm w-full sm:w-auto"
                        >
                            <PlusIcon /> <span className="hidden sm:inline-block">Tambah Data</span><span className="sm:hidden">Tambah</span>
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

                {/* ════ Table Content ════ */}
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
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-24">No</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left w-1/4">Bulan</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-1/4">Tahun</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right w-1/4">Target</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-24">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {paginatedSlice.length === 0 ? (
                                            <tr><td colSpan={5} className="p-12 text-center text-gray-400 text-sm border border-gray-200">Tidak ada target RKAP</td></tr>
                                        ) : (
                                            paginatedSlice.map((row, idx) => (
                                                <tr key={row.id} className="hover:bg-emerald-50/10 transition-colors">
                                                    <td className="px-4 py-3 text-gray-700 font-medium text-center border border-gray-200">{((page - 1) * pageSize) + idx + 1}</td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{getBulanLabel(row.bulan)}</td>
                                                    <td className="px-4 py-3 text-gray-700 text-center border border-gray-200">{row.tahun}</td>
                                                    <td className="px-4 py-3 text-gray-700 text-right font-mono tabular-nums border border-gray-200">{fmt(row.target)}</td>

                                                    <td className="px-4 py-3 text-center border border-gray-200">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => openEditModal(row)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Edit">
                                                                <PencilIcon className="size-4" />
                                                            </button>
                                                            <button onClick={() => setDeleteModal({ isOpen: true, id: row.id })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus">
                                                                <Trash2Icon className="size-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile view */}
                            <div className="sm:hidden divide-y divide-gray-100">
                                {paginatedSlice.length === 0 ? (
                                    <div className="px-4 py-12 text-center text-gray-400">Tidak ada target RKAP</div>
                                ) : (
                                    paginatedSlice.map((row) => (
                                        <div key={row.id} className="p-4 space-y-2 relative group hover:bg-emerald-50/10">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{getBulanLabel(row.bulan)} {row.tahun}</p>
                                                </div>
                                                <div className="absolute top-2 right-2 flex gap-1 bg-white opacity-0 group-hover:opacity-100 transition-opacity rounded-md border border-gray-100 shadow-sm px-1 py-0.5">
                                                    <button onClick={() => openEditModal(row)} className="text-xs text-blue-600 px-2 py-1 hover:bg-blue-50 rounded">Edit</button>
                                                    <button onClick={() => setDeleteModal({ isOpen: true, id: row.id })} className="text-xs text-red-600 px-2 py-1 hover:bg-red-50 rounded">Hapus</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                                <div>
                                                    <span className="text-[11px] text-gray-400 uppercase">Target</span>
                                                    <p className="font-mono text-gray-700">{fmt(row.target)}</p>
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
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                        <span className="text-sm text-gray-600">
                            Halaman <span className="font-medium text-gray-900">{page}</span> dari <span className="font-medium text-gray-900">{totalPages}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
