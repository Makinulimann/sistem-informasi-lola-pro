'use client';

import { useState, useEffect } from 'react';
import { bahanBakuService, type BalanceStokRow } from '@/lib/bahanBakuService';
import { saveProduksiWithMaterials, getMutasiForProduksi, type MaterialUsage } from '@/lib/produksiService';

/* ─── Icons ─── */
function CloseIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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

function ChevronLeftIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}

function CheckCircleIcon() {
    return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

function FlaskIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
            <path d="M8.5 2h7" /><path d="M7 16h10" />
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

/* ─── Types ─── */
interface BelumSamplingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    productSlug: string;
    productFullName: string;
    tabId: number;
    tanggal: string; // yyyy-MM-dd
    currentBs: number;
    currentBatchKode: string;
    bulan: number;
    tahun: number;
}

interface MaterialInput {
    namaBahan: string;
    jenis: string;
    baseSatuan: string;
    displaySatuan: string;
    stokTersedia: number;
    kuantum: number;
}

/* ─── Helpers ─── */
function fmt(n: number | null | undefined): string {
    return Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDisplay(dateStr: string): string {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

/* ─── Unit Conversion ─── */
const MASS_UNITS = ['Ton', 'Kwintal', 'Kg', 'Gram', 'mg'];
const VOL_UNITS = ['KL', 'Liter', 'mL'];

function normalizeUnit(u: string): string {
    const lo = u.trim().toLowerCase();
    const map: Record<string, string> = {
        'l': 'Liter', 'lt': 'Liter', 'litre': 'Liter', 'liter': 'Liter',
        'ml': 'mL', 'milliliter': 'mL', 'cc': 'mL',
        'kl': 'KL',
        'kg': 'Kg', 'kilo': 'Kg', 'kilogram': 'Kg',
        'gram': 'Gram', 'gr': 'Gram', 'g': 'Gram',
        'mg': 'mg', 'ton': 'Ton', 'kwintal': 'Kwintal',
    };
    return map[lo] || u;
}

function getUnitFamily(unit: string): string[] {
    const lo = normalizeUnit(unit).toLowerCase();
    if (['ton', 'kwintal', 'kg', 'gram', 'mg'].includes(lo)) return MASS_UNITS;
    if (['kl', 'liter', 'ml'].includes(lo)) return VOL_UNITS;
    return [unit]; // e.g. Pcs — no conversion available
}

function convertUnit(value: number, fromUnit: string, toUnit: string): number {
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);
    if (from === to) return value;
    const toKg: Record<string, number> = { 'Ton': 1000, 'Kwintal': 100, 'Kg': 1, 'Gram': 0.001, 'mg': 0.000001 };
    const toLiter: Record<string, number> = { 'KL': 1000, 'Liter': 1, 'mL': 0.001 };
    if (from in toKg && to in toKg) return value * toKg[from] / toKg[to];
    if (from in toLiter && to in toLiter) return value * toLiter[from] / toLiter[to];
    return value;
}

const STEPS = [
    { key: 'produksi', label: 'Input Produksi', icon: <FactoryIcon /> },
    { key: 'bahan', label: 'Input Bahan', icon: <FlaskIcon /> },
    { key: 'konfirmasi', label: 'Konfirmasi', icon: <CheckCircleIcon /> },
];

/* ═══════════════════════════════════════════ */
/*  Main Component                             */
/* ═══════════════════════════════════════════ */
export function BelumSamplingModal({
    isOpen,
    onClose,
    onSaved,
    productSlug,
    productFullName,
    tabId,
    tanggal,
    currentBs,
    currentBatchKode,
    bulan,
    tahun,
}: BelumSamplingModalProps) {
    const [step, setStep] = useState(0);
    const [bsValue, setBsValue] = useState<string>('');
    const [batchKode, setBatchKode] = useState<string>('');
    const [keterangan, setKeterangan] = useState<string>('');
    const [materials, setMaterials] = useState<MaterialInput[]>([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setBsValue(currentBs > 0 ? String(currentBs) : '');
            setBatchKode(currentBatchKode || '');
            setKeterangan('');
            setMaterials([]);
            setSaving(false);
            setSuccess(false);
            setError(null);
        }
    }, [isOpen, currentBs, currentBatchKode]);

    // Load materials when moving to step 2
    const loadMaterials = async () => {
        setLoadingMaterials(true);
        try {
            // Fetch balance stok and existing mutasi in parallel
            const [balanceData, existingMutasi] = await Promise.all([
                bahanBakuService.getBalanceStok({
                    productSlug,
                    bulan: String(bulan).padStart(2, '0'),
                    tahun: String(tahun),
                }),
                currentBs > 0
                    ? getMutasiForProduksi(productSlug, tanggal)
                    : Promise.resolve([]),
            ]);

            // Build a lookup of existing mutasi by namaBahan
            const mutasiMap = new Map<string, { kuantum: number; satuan: string }>();
            for (const m of existingMutasi) {
                mutasiMap.set(m.namaBahan, { kuantum: m.kuantum, satuan: m.satuan });
            }

            setMaterials(
                balanceData.map((row) => {
                    const base = normalizeUnit(row.satuan);
                    const existing = mutasiMap.get(row.nama);
                    // When editing, add back the previously used quantity to available stock
                    const stokWithRestore = existing
                        ? row.stok + convertUnit(existing.kuantum, normalizeUnit(existing.satuan), base)
                        : row.stok;
                    return {
                        namaBahan: row.nama,
                        jenis: row.jenis === 'Baku' ? 'Bahan Baku' : 'Bahan Penolong',
                        baseSatuan: base,
                        displaySatuan: existing ? normalizeUnit(existing.satuan) : base,
                        stokTersedia: stokWithRestore,
                        kuantum: existing ? existing.kuantum : 0,
                    };
                })
            );
        } catch (e) {
            console.error('Failed to load balance:', e);
            setMaterials([]);
        } finally {
            setLoadingMaterials(false);
        }
    };

    const handleNext = async () => {
        if (step === 0) {
            if (!bsValue || Number(bsValue) <= 0) {
                setError('Jumlah produksi harus lebih dari 0');
                return;
            }
            if (!batchKode.trim()) {
                setError('Kode Batch wajib diisi');
                return;
            }
            setError(null);
            await loadMaterials();
            setStep(1);
        } else if (step === 1) {
            // Validate: no material should exceed available stock
            const overStockItem = materials.find(m => {
                if (m.kuantum <= 0) return false;
                const stokInDisplay = convertUnit(m.stokTersedia, m.baseSatuan, m.displaySatuan);
                return m.kuantum > stokInDisplay && stokInDisplay > 0;
            });
            if (overStockItem) {
                setError(`Jumlah "${overStockItem.namaBahan}" melebihi stok yang tersedia`);
                return;
            }
            setError(null);
            setStep(2);
        }
    };

    const handleBack = () => {
        setError(null);
        if (step > 0) setStep(step - 1);
    };

    const handleMaterialChange = (idx: number, value: string) => {
        setMaterials(prev => {
            const updated = [...prev];
            const num = value === '' ? 0 : Number(value);
            updated[idx] = { ...updated[idx], kuantum: num };
            return updated;
        });
    };

    const handleSatuanChange = (idx: number, newSatuan: string) => {
        setMaterials(prev => {
            const updated = [...prev];
            const mat = updated[idx];
            // Convert existing kuantum to new unit
            const convertedKuantum = mat.kuantum > 0
                ? convertUnit(mat.kuantum, mat.displaySatuan, newSatuan)
                : 0;
            updated[idx] = {
                ...mat,
                displaySatuan: newSatuan,
                kuantum: convertedKuantum > 0 ? Math.round(convertedKuantum * 1000) / 1000 : 0,
            };
            return updated;
        });
    };

    const usedMaterials = materials.filter(m => m.kuantum > 0);

    const handleSubmit = async () => {
        setSaving(true);
        setError(null);
        try {
            // Send as-is in the display unit (no conversion back)
            const materialsPayload: MaterialUsage[] = usedMaterials.map(m => ({
                namaBahan: m.namaBahan,
                kuantum: m.kuantum,
                satuan: m.displaySatuan,
                jenis: m.jenis === 'Bahan Baku' ? 'Baku' : 'Penolong',
            }));

            await saveProduksiWithMaterials({
                productSlug,
                productFullName,
                tabId,
                tanggal,
                bs: Number(bsValue),
                keterangan: keterangan || undefined,
                batchKode: batchKode.trim(),
                materials: materialsPayload,
            });

            setSuccess(true);
            setTimeout(() => {
                onSaved();
                onClose();
            }, 1200);
        } catch (err: any) {
            console.error('Failed to save:', err);
            setError(err.message || 'Gagal menyimpan data');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* ─── Header ─── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{currentBs > 0 ? 'Edit Produksi' : 'Input Produksi'}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Tanggal: <span className="font-semibold text-gray-700">{formatDateDisplay(tanggal)}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* ─── Step Indicator ─── */}
                <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        {STEPS.map((s, idx) => (
                            <div key={s.key} className="flex items-center flex-1">
                                <div className={`flex items-center gap-2 ${idx <= step ? 'text-emerald-700' : 'text-gray-400'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                                        ${idx < step ? 'bg-emerald-600 text-white' :
                                            idx === step ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600' :
                                                'bg-gray-100 text-gray-400'}`}>
                                        {idx < step ? '✓' : idx + 1}
                                    </div>
                                    <span className={`text-xs font-medium hidden sm:inline ${idx <= step ? 'text-emerald-700' : 'text-gray-400'}`}>
                                        {s.label}
                                    </span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-3 rounded ${idx < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Body ─── */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Success State */}
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-12 text-emerald-600">
                            <CheckCircleIcon />
                            <h4 className="text-lg font-bold mt-4">Data Berhasil {currentBs > 0 ? 'Diperbarui' : 'Disimpan'}!</h4>
                            <p className="text-sm text-gray-500 mt-1">Produksi dan mutasi bahan telah {currentBs > 0 ? 'diperbarui' : 'tercatat'}.</p>
                        </div>
                    ) : (
                        <>
                            {/* Step 1: Input Produksi */}
                            {step === 0 && (
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 p-6">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Jumlah Produksi (Belum Sampling)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="any"
                                                value={bsValue}
                                                onChange={e => { setBsValue(e.target.value); setError(null); }}
                                                className="w-full text-2xl font-mono font-bold text-gray-900 px-4 py-4 border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white placeholder:text-gray-300"
                                                placeholder="0"
                                                autoFocus
                                            />
                                        </div>
                                        {currentBs > 0 && (
                                            <p className="mt-2 text-xs text-gray-400">
                                                Nilai saat ini: <span className="font-semibold text-gray-600">{fmt(currentBs)}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Batch Code Input */}
                                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-6">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Kode Batch <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={batchKode}
                                            onChange={e => { setBatchKode(e.target.value); setError(null); }}
                                            className="w-full text-lg font-mono font-bold text-gray-900 px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white placeholder:text-gray-300 uppercase"
                                            placeholder="Contoh: B001"
                                        />
                                        {currentBatchKode && (
                                            <p className="mt-2 text-xs text-gray-400">
                                                Batch saat ini: <span className="font-semibold text-gray-600">{currentBatchKode}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-blue-800">Langkah Pengisian</p>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    Masukkan jumlah produksi, lalu di langkah selanjutnya Anda dapat menginput bahan-bahan yang digunakan berdasarkan stok yang tersedia.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Keterangan / Notes */}
                                    <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-5">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Keterangan <span className="text-gray-400 font-normal">(opsional)</span>
                                        </label>
                                        <textarea
                                            value={keterangan}
                                            onChange={e => setKeterangan(e.target.value)}
                                            rows={2}
                                            className="w-full text-sm text-gray-800 px-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white placeholder:text-gray-300 resize-none"
                                            placeholder="Tambahkan catatan jika diperlukan..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Input Bahan/Material */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Bahan yang Digunakan</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Input jumlah bahan yang dipakai untuk produksi <span className="font-semibold text-emerald-600">{fmt(Number(bsValue))}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {loadingMaterials ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                        </div>
                                    ) : materials.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                            <FlaskIcon />
                                            <p className="text-sm mt-3">Belum ada material dikonfigurasi.</p>
                                            <p className="text-xs mt-1">Anda dapat melewati langkah ini.</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Bahan</th>
                                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Satuan</th>
                                                        <th className="px-4 py-3 text-right text-xs font-semibold text-blue-600 uppercase tracking-wider w-28">Stok</th>
                                                        <th className="px-4 py-3 text-right text-xs font-semibold text-orange-600 uppercase tracking-wider w-36">Digunakan</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {materials.map((mat, idx) => {
                                                        const unitFamily = getUnitFamily(mat.baseSatuan);
                                                        const hasMultipleUnits = unitFamily.length > 1;
                                                        // Convert stok to display unit for comparison
                                                        const stokInDisplay = convertUnit(mat.stokTersedia, mat.baseSatuan, mat.displaySatuan);
                                                        const noStock = stokInDisplay <= 0;
                                                        const overStock = mat.kuantum > stokInDisplay && !noStock;
                                                        return (
                                                            <tr key={mat.namaBahan} className="hover:bg-gray-50/50 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${mat.jenis === 'Bahan Baku' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                        <div>
                                                                            <span className="text-sm font-medium text-gray-800">{mat.namaBahan}</span>
                                                                            <span className={`ml-2 inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${mat.jenis === 'Bahan Baku' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                                                {mat.jenis}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {hasMultipleUnits ? (
                                                                        <select
                                                                            value={mat.displaySatuan}
                                                                            onChange={e => handleSatuanChange(idx, e.target.value)}
                                                                            className="bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 rounded-md px-2 py-1.5 cursor-pointer hover:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all appearance-none text-center"
                                                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '18px' }}
                                                                        >
                                                                            {unitFamily.map(u => (
                                                                                <option key={u} value={u}>{u}</option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-500 font-medium">{mat.displaySatuan}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${stokInDisplay > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'}`}>
                                                                        {fmt(stokInDisplay)}
                                                                        <span className="text-[10px] font-normal opacity-60">{mat.displaySatuan}</span>
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <input
                                                                        type="number"
                                                                        step="any"
                                                                        value={mat.kuantum === 0 ? '' : mat.kuantum}
                                                                        onChange={e => handleMaterialChange(idx, e.target.value)}
                                                                        disabled={noStock}
                                                                        className={`w-full h-9 px-3 text-right font-mono text-sm border rounded-lg outline-none transition-all
                                                                            ${noStock
                                                                                ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                                                                : overStock
                                                                                    ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
                                                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'}`}
                                                                        placeholder={noStock ? '-' : '0'}
                                                                    />
                                                                    {noStock && (
                                                                        <p className="text-[10px] text-gray-400 mt-0.5 text-right">Stok habis</p>
                                                                    )}
                                                                    {overStock && (
                                                                        <p className="text-[10px] text-red-500 mt-0.5 text-right">Melebihi stok!</p>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Konfirmasi */}
                            {step === 2 && (
                                <div className="space-y-5">
                                    {/* Produksi Summary */}
                                    <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 p-5">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
                                                <FactoryIcon />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Produksi</p>
                                                <p className="text-2xl font-bold text-gray-900 font-mono">{fmt(Number(bsValue))}</p>
                                            </div>
                                        </div>
                                        {keterangan && (
                                            <p className="text-xs text-gray-500 mt-2 ml-[52px] italic">
                                                Keterangan: {keterangan}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1 ml-[52px]">
                                            Kode Batch: <span className="font-semibold text-blue-700 font-mono">{batchKode}</span>
                                        </p>
                                    </div>

                                    {/* Materials Summary */}
                                    {usedMaterials.length > 0 && (
                                        <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl border border-orange-100 p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-700">
                                                    <FlaskIcon />
                                                </div>
                                                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                                                    Bahan Digunakan ({usedMaterials.length} item)
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                {usedMaterials.map(m => (
                                                    <div key={m.namaBahan} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-orange-100/50">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${m.jenis === 'Bahan Baku' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                            <span className="text-sm font-medium text-gray-800">{m.namaBahan}</span>
                                                        </div>
                                                        <span className="text-sm font-bold font-mono text-orange-700">
                                                            {fmt(m.kuantum)} <span className="text-xs font-normal text-gray-400">{m.displaySatuan}</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {usedMaterials.length === 0 && (
                                        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-center">
                                            <p className="text-sm text-gray-500">Tidak ada bahan yang diinput</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Hanya data produksi yang akan disimpan</p>
                                        </div>
                                    )}

                                    <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-amber-800">Konfirmasi</p>
                                                <p className="text-xs text-amber-600 mt-1">
                                                    Setelah disimpan, data produksi akan terupdate dan balance stok bahan akan berkurang sesuai jumlah yang digunakan. Data mutasi akan tercatat di halaman Bahan Baku.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                </div>

                {/* ─── Footer Actions ─── */}
                {!success && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                        <div>
                            {step > 0 && (
                                <button
                                    onClick={handleBack}
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ChevronLeftIcon /> Kembali
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            {step < 2 ? (
                                <button
                                    onClick={handleNext}
                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
                                >
                                    Lanjut <ChevronRightIcon />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Menyimpan...
                                        </>
                                    ) : (
                                        'Simpan Data'
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
