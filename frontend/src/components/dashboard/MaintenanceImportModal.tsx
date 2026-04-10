'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import {
    UploadIcon, XIcon, FileSpreadsheetIcon, CheckIcon,
    ChevronRightIcon, ChevronLeftIcon, TableIcon
} from 'lucide-react';
import { maintenanceService } from '@/lib/maintenanceService';
import { AppButton } from '@/components/ui/app-button';

/* ── Load xlsx from CDN dynamically ── */
const XLSX_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
let xlsxLoadPromise: Promise<any> | null = null;

function loadXlsx(): Promise<any> {
    if ((window as any).XLSX) return Promise.resolve((window as any).XLSX);
    if (xlsxLoadPromise) return xlsxLoadPromise;
    xlsxLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = XLSX_CDN;
        script.onload = () => resolve((window as any).XLSX);
        script.onerror = () => reject(new Error('Failed to load xlsx library'));
        document.head.appendChild(script);
    });
    return xlsxLoadPromise;
}

function parseExcelDate(value: any): string {
    if (value === undefined || value === null || value === '') return '';
    const num = Number(value);
    if (!isNaN(num) && num > 20000 && num < 60000) {
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    const str = String(value).trim();
    // Try to catch YYYY-MM-DD even if it has time attached
    const dateMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (dateMatch) {
        return `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    }
    return str;
}

interface MaintenanceImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productSlug: string;
}

export function MaintenanceImportModal({ isOpen, onClose, onSuccess, productSlug }: MaintenanceImportModalProps) {
    // Steps: 1=Upload, 2=Pick header row, 3=Mapping, 4=Preview
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Raw sheet data for header row picker
    const [rawRows, setRawRows] = useState<any[][]>([]);
    const [headerRowIndex, setHeaderRowIndex] = useState(0);
    const [workbookRef, setWorkbookRef] = useState<any>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheetName, setSelectedSheetName] = useState<string>('');

    const [mapping, setMapping] = useState<{ [key: string]: string }>({
        kode: '',
        nama: '',
        prioritas: '',
        status: '',
        keperluan: '',
        deskripsi: '',
        tanggal_dibutuhkan: '',
    });

    const xlsxRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    // Preload xlsx from CDN when modal opens
    useEffect(() => {
        if (isOpen && !xlsxRef.current) {
            loadXlsx().then(lib => {
                xlsxRef.current = lib;
            }).catch(() => {
                toast.error('Gagal', 'Gagal memuat library Excel. Periksa koneksi internet Anda.');
            });
        }
    }, [isOpen]);

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setFile(null);
            setExcelData([]);
            setExcelHeaders([]);
            setRawRows([]);
            setHeaderRowIndex(0);
            setWorkbookRef(null);
            setSheetNames([]);
            setSelectedSheetName('');
            setMapping({ kode: '', nama: '', prioritas: '', status: '', keperluan: '', deskripsi: '', tanggal_dibutuhkan: '' });
            setIsProcessing(false);
        }
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const processFile = (uploadedFile: File) => {
        const isValidExtension = uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls') || uploadedFile.name.endsWith('.csv');
        if (!isValidExtension) {
            toast.error('Gagal', 'Mohon unggah file Excel (.xlsx, .xls) atau .csv');
            return;
        }

        if (!xlsxRef.current) {
            toast.error('Memuat...', 'Library Excel masih dimuat, silakan coba lagi dalam beberapa detik.');
            return;
        }

        const XLSX = xlsxRef.current;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheets = workbook.SheetNames;
                const firstSheetName = sheets[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const raw: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (raw.length === 0) {
                    toast.error('File Kosong', 'File Excel tidak mengandung data.');
                    return;
                }

                setRawRows(raw);
                setWorkbookRef(workbook);
                setSheetNames(sheets);
                setSelectedSheetName(firstSheetName);
                setFile(uploadedFile);

                // Auto-detect header row
                let bestRow = 0;
                for (let i = 0; i < Math.min(raw.length, 20); i++) {
                    const textCells = (raw[i] || []).filter((c: any) => typeof c === 'string' && c.trim().length > 0);
                    if (textCells.length >= 2) { bestRow = i; break; }
                }
                setHeaderRowIndex(bestRow);
                setStep(2);
            } catch (error) {
                console.error(error);
                toast.error('Gagal Membaca File', 'Pastikan file Excel tidak rusak/dikunci.');
            }
        };
        reader.readAsArrayBuffer(uploadedFile);
    };

    const handleSheetChange = (sheetName: string) => {
        if (!workbookRef || !xlsxRef.current) return;
        const XLSX = xlsxRef.current;
        const worksheet = workbookRef.Sheets[sheetName];
        const raw: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        setRawRows(raw);
        setSelectedSheetName(sheetName);
        let bestRow = 0;
        for (let i = 0; i < Math.min(raw.length, 20); i++) {
            const textCells = (raw[i] || []).filter((c: any) => typeof c === 'string' && c.trim().length > 0);
            if (textCells.length >= 2) { bestRow = i; break; }
        }
        setHeaderRowIndex(bestRow);
    };

    const applyHeaderRow = useCallback(() => {
        if (rawRows.length === 0) return;
        const headerRow = rawRows[headerRowIndex];
        const headers: string[] = headerRow.map((cell: any, idx: number) => {
            const val = String(cell).trim();
            return val || `Kolom ${String.fromCharCode(65 + idx)}`;
        });
        const dataRows = rawRows.slice(headerRowIndex + 1);
        const json = dataRows
            .map(row => {
                const obj: any = {};
                headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : ''; });
                return obj;
            })
            .filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));

        setExcelHeaders(headers);
        setExcelData(json);

        // Auto-map columns
        const autoMap: { [key: string]: string } = {
            kode: '', nama: '', prioritas: '', status: '', keperluan: '', deskripsi: '', tanggal_dibutuhkan: ''
        };
        headers.forEach(h => {
            const lh = h.toLowerCase();
            if (lh.includes('kode') || lh.includes('equipment') || lh.includes('id')) autoMap.kode = h;
            if (lh.includes('nama') || lh.includes('pemohon') || lh.includes('pic')) autoMap.nama = h;
            if (lh.includes('priorit')) autoMap.prioritas = h;
            if (lh.includes('status') || lh.includes('state')) autoMap.status = h;
            if (lh.includes('keperluan') || lh.includes('tujuan') || lh.includes('keterangan')) autoMap.keperluan = h;
            if (lh.includes('deskripsi') || lh.includes('description') || lh.includes('detail') || lh.includes('kegiatan')) autoMap.deskripsi = h;
            if (lh.includes('tgl') || lh.includes('tanggal') || lh.includes('date')) autoMap.tanggal_dibutuhkan = h;
        });
        setMapping(autoMap);
        setStep(3);
    }, [rawRows, headerRowIndex]);

    const handleNextToPreview = () => {
        if (!mapping.kode || !mapping.nama || !mapping.deskripsi || !mapping.tanggal_dibutuhkan) {
            toast.warning('Pemetaan Kurang', 'Kolom "Kode", "Nama", "Deskripsi", dan "Tanggal" wajib dipetakan!');
            return;
        }
        setStep(4);
    };

    const handleImport = async () => {
        setIsProcessing(true);
        try {
            let successCount = 0;
            let skipCount = 0;

            for (const row of validExcelData) {
                const kodeVal = mapping.kode ? String(row[mapping.kode] ?? '') : '';
                const namaVal = mapping.nama ? String(row[mapping.nama] ?? '') : '';
                const deskripsiVal = mapping.deskripsi ? String(row[mapping.deskripsi] ?? '') : '';
                let tanggalStr = mapping.tanggal_dibutuhkan ? parseExcelDate(row[mapping.tanggal_dibutuhkan]) : '';

                if (!kodeVal || !namaVal || !deskripsiVal || !tanggalStr) {
                    skipCount++;
                    continue;
                }

                // Final normalization to ISO string for backend
                if (tanggalStr && !tanggalStr.includes('T')) {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(tanggalStr)) {
                        tanggalStr = `${tanggalStr}T00:00:00.000Z`;
                    } else {
                        try {
                            const d = new Date(tanggalStr);
                            if (!isNaN(d.getTime())) tanggalStr = d.toISOString();
                        } catch (e) {}
                    }
                }

                // Normalize prioritas
                let prioritasVal: 'Normal' | 'Urgent' = 'Normal';
                if (mapping.prioritas) {
                    const raw = String(row[mapping.prioritas] ?? '').trim().toLowerCase();
                    if (raw === 'urgent') prioritasVal = 'Urgent';
                }

                // Normalize status
                type StatusType = 'In Progress' | 'Open' | 'Rejected' | 'Resolved';
                let statusVal: StatusType = 'Open';
                if (mapping.status) {
                    const raw = String(row[mapping.status] ?? '').trim().toLowerCase();
                    if (raw === 'in progress' || raw === 'inprogress') statusVal = 'In Progress';
                    else if (raw === 'resolved') statusVal = 'Resolved';
                    else if (raw === 'rejected') statusVal = 'Rejected';
                }

                await maintenanceService.create({
                    product_slug: productSlug,
                    kode: kodeVal,
                    nama: namaVal,
                    prioritas: prioritasVal,
                    status: statusVal,
                    keperluan: mapping.keperluan ? String(row[mapping.keperluan] ?? '') || null : null,
                    deskripsi: deskripsiVal,
                    tanggal_dibutuhkan: tanggalStr,
                });
                successCount++;
            }

            if (successCount > 0) {
                toast.success('Berhasil Import', `${successCount} data maintenance ditambahkan.${skipCount > 0 ? ` (${skipCount} baris dilewati)` : ''}`);
                onSuccess();
                onClose();
            } else if (skipCount > 0) {
                toast.warning('Import Dilewati', `Semua ${skipCount} baris dilewati karena data tidak lengkap.`);
            } else {
                toast.error('Gagal', 'Tidak ada data valid yang ditemukan.');
            }
        } catch (error) {
            console.error('Import failed', error);
            toast.error('Gagal Import', 'Terjadi kesalahan sistem, silakan coba lagi.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    const systemFields = [
        { key: 'kode', label: 'Kode', required: true },
        { key: 'nama', label: 'Nama Pemohon', required: true },
        { key: 'deskripsi', label: 'Deskripsi', required: true },
        { key: 'tanggal_dibutuhkan', label: 'Tanggal Dibutuhkan', required: true },
        { key: 'keperluan', label: 'Keperluan', required: false },
        { key: 'prioritas', label: 'Prioritas', required: false },
        { key: 'status', label: 'Status', required: false },
    ];

    const validExcelData = excelData.filter(row => {
        if (!mapping.kode || !mapping.nama || !mapping.deskripsi || !mapping.tanggal_dibutuhkan) return true;
        const k = row[mapping.kode];
        const n = row[mapping.nama];
        const d = row[mapping.deskripsi];
        const t = row[mapping.tanggal_dibutuhkan];
        return [k, n, d, t].every(v => v !== undefined && v !== null && v !== '');
    });

    const previewData = validExcelData.slice(0, 5);
    const rawPreviewRows = rawRows.slice(0, 15);

    const stepLabels = [
        { num: 1, text: 'Upload File' },
        { num: 2, text: 'Pilih Baris Header' },
        { num: 3, text: 'Mapping Kolom' },
        { num: 4, text: 'Preview' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-4xl flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">Import Excel</h2>
                    <AppButton 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose} 
                        icon={<XIcon className="size-5" />} 
                        className="text-gray-400 hover:text-gray-600"
                    />
                </div>

                {/* Steps indicator */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 shrink-0 flex items-center justify-between">
                    {stepLabels.map((s, idx) => (
                        <div key={s.num} className="flex flex-col flex-1 items-center relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all z-10 ${
                                step === s.num ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/20' :
                                step > s.num ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400 border border-gray-200'
                            }`}>
                                {step > s.num ? <CheckIcon className="size-4" /> : s.num}
                            </div>
                            <span className={`text-xs font-medium mt-2 ${step === s.num ? 'text-gray-900' : 'text-gray-400'}`}>
                                {s.text}
                            </span>
                            {idx < stepLabels.length - 1 && (
                                <div className={`absolute top-4 left-1/2 w-full h-0.5 -z-10 ${step > s.num ? 'bg-emerald-200' : 'bg-gray-200'}`}
                                    style={{ width: 'calc(100% - 2rem)', left: 'calc(50% + 1rem)' }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">

                    {/* ── STEP 1: Upload ── */}
                    {step === 1 && (
                        <div
                            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-colors cursor-pointer"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            role="button"
                        >
                            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls,.csv" />
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100">
                                <FileSpreadsheetIcon className="size-8" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">Upload File Excel</h3>
                            <p className="text-sm text-gray-500 text-center mb-6 max-w-sm">
                                Tarik &amp; lepaskan file Anda di sini, atau klik untuk menelusuri dari komputer Anda. <br/>
                                <span className="text-xs">(Format diterima: .xlsx, .xls, .csv)</span>
                            </p>
                            <AppButton variant="secondary" className="pointer-events-none">
                                Pilih File
                            </AppButton>
                        </div>
                    )}

                    {/* ── STEP 2: Pick Header Row ── */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="bg-amber-50 border border-amber-200 p-4">
                                <div className="flex items-start gap-3">
                                    <TableIcon className="size-5 text-amber-600 mt-0.5 shrink-0" />
                                    <div>
                                        <h3 className="text-sm font-semibold text-amber-900">Pilih Baris Header</h3>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Klik pada baris yang berisi <strong>judul kolom</strong> (header) di file Excel Anda.
                                            Data akan dibaca mulai dari baris setelah header yang dipilih.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {sheetNames.length > 1 && (
                                <div className="flex items-center gap-3 bg-white p-4 border border-gray-200 shadow-sm">
                                    <TableIcon className="size-5 text-emerald-600 shrink-0" />
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                            Pilih Sheet / Tab Excel
                                        </label>
                                        <select
                                            value={selectedSheetName}
                                            onChange={(e) => handleSheetChange(e.target.value)}
                                            className="w-full bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                                        >
                                            {sheetNames.map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto max-h-[350px]">
                                    <table className="w-full text-xs border-collapse">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-gray-100 text-gray-500 text-left">
                                                <th className="px-3 py-2 border-r border-b border-gray-200 w-16 text-center font-semibold">Baris</th>
                                                {rawPreviewRows[0]?.map((_: any, colIdx: number) => (
                                                    <th key={colIdx} className="px-3 py-2 border-r border-b border-gray-200 font-semibold min-w-[100px]">
                                                        {String.fromCharCode(65 + colIdx)}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rawPreviewRows.map((row, rowIdx) => (
                                                <tr
                                                    key={rowIdx}
                                                    onClick={() => setHeaderRowIndex(rowIdx)}
                                                    className={`cursor-pointer transition-colors ${
                                                        headerRowIndex === rowIdx
                                                            ? 'bg-emerald-100 ring-2 ring-inset ring-emerald-500'
                                                            : rowIdx < headerRowIndex ? 'bg-gray-50/50 text-gray-400' : 'hover:bg-blue-50'
                                                    }`}
                                                >
                                                    <td className={`px-3 py-2 border-r border-b border-gray-200 text-center font-bold ${
                                                        headerRowIndex === rowIdx ? 'text-emerald-700 bg-emerald-200/50' : 'text-gray-400'
                                                    }`}>
                                                        {rowIdx + 1}
                                                        {headerRowIndex === rowIdx && <span className="ml-1 text-[10px]">✓</span>}
                                                    </td>
                                                    {row.map((cell: any, colIdx: number) => (
                                                        <td key={colIdx} className={`px-3 py-2 border-r border-b border-gray-200 whitespace-nowrap max-w-[150px] truncate ${
                                                            headerRowIndex === rowIdx ? 'font-bold text-emerald-800' : ''
                                                        }`}>
                                                            {cell !== '' && cell !== null && cell !== undefined ? String(cell) : ''}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 text-center">
                                Baris <strong className="text-emerald-700">{headerRowIndex + 1}</strong> dipilih sebagai header.
                                Data akan dibaca mulai dari baris <strong>{headerRowIndex + 2}</strong>.
                            </p>
                        </div>
                    )}

                    {/* ── STEP 3: Mapping ── */}
                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            <div className="bg-emerald-50 border border-emerald-100 p-5">
                                <h3 className="text-sm font-semibold text-emerald-800 mb-1">Berhasil Membaca File</h3>
                                <p className="text-sm text-emerald-700">Ditemukan <strong>{excelData.length}</strong> baris data (header di baris {headerRowIndex + 1}).</p>
                            </div>

                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Sesuaikan Kolom (Mapping)</h3>
                                <p className="text-sm text-gray-600 mb-6">Pilih kolom dari file Excel Anda yang paling sesuai dengan isian sistem berikut.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                    {systemFields.map(field => (
                                        <div key={field.key} className="flex flex-col gap-1.5">
                                            <label className="text-sm font-medium text-gray-700">
                                                {field.label} {field.required && <span className="text-red-500">*</span>}
                                            </label>
                                            <select
                                                value={mapping[field.key]}
                                                onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                                className={`w-full px-3 py-2 bg-gray-50 border ${!mapping[field.key] && field.required ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'} text-sm focus:outline-none focus:ring-2 focus:bg-white focus:ring-emerald-500 transition-colors cursor-pointer`}
                                            >
                                                <option value="">-- Jangan Import Kolom Ini --</option>
                                                {excelHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                            {!mapping[field.key] && field.required && (
                                                <span className="text-xs text-red-500">Wajib diisi</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 4: Preview ── */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="bg-blue-50 border border-blue-100 p-4">
                                <h3 className="font-semibold text-blue-900 text-sm">Preview Data Yang Akan Di-import</h3>
                                <p className="text-sm text-blue-700 mt-1">
                                    Menampilkan {previewData.length} baris pertama dari <strong>{validExcelData.length}</strong> baris valid.
                                    {validExcelData.length < excelData.length && (
                                        <span className="ml-1 text-orange-600">({excelData.length - validExcelData.length} baris dilewati karena data tidak lengkap)</span>
                                    )}
                                </p>
                            </div>

                            <div className="border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-left font-medium text-xs uppercase tracking-wider">
                                                <th className="px-4 py-3 border-r border-gray-200">#</th>
                                                <th className="px-4 py-3 border-r border-gray-200">Kode</th>
                                                <th className="px-4 py-3 border-r border-gray-200">Nama</th>
                                                <th className="px-4 py-3 border-r border-gray-200">Prioritas</th>
                                                <th className="px-4 py-3 border-r border-gray-200">Status</th>
                                                <th className="px-4 py-3 border-r border-gray-200">Deskripsi</th>
                                                <th className="px-4 py-3">Tanggal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {previewData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 border-r border-gray-200 text-gray-500">{idx + 1}</td>
                                                    <td className="px-4 py-2 border-r border-gray-200 text-gray-900 font-medium whitespace-nowrap">
                                                        {mapping.kode && row[mapping.kode] !== undefined && row[mapping.kode] !== '' ? String(row[mapping.kode]).substring(0, 40) : <span className="text-red-400 text-xs italic">Kosong</span>}
                                                    </td>
                                                    <td className="px-4 py-2 border-r border-gray-200 text-gray-700 whitespace-nowrap">
                                                        {mapping.nama && row[mapping.nama] !== undefined && row[mapping.nama] !== '' ? String(row[mapping.nama]).substring(0, 40) : <span className="text-red-400 text-xs italic">Kosong</span>}
                                                    </td>
                                                    <td className="px-4 py-2 border-r border-gray-200 text-gray-700 whitespace-nowrap">
                                                        {mapping.prioritas && row[mapping.prioritas] ? String(row[mapping.prioritas]) : <span className="text-gray-400">Normal</span>}
                                                    </td>
                                                    <td className="px-4 py-2 border-r border-gray-200 text-gray-700 whitespace-nowrap">
                                                        {mapping.status && row[mapping.status] ? String(row[mapping.status]) : <span className="text-gray-400">Open</span>}
                                                    </td>
                                                    <td className="px-4 py-2 border-r border-gray-200 text-gray-700 min-w-[160px]">
                                                        {mapping.deskripsi && row[mapping.deskripsi] !== undefined && row[mapping.deskripsi] !== '' ? (
                                                            <span className="line-clamp-2 text-xs">{String(row[mapping.deskripsi])}</span>
                                                        ) : <span className="text-red-400 text-xs italic">Kosong</span>}
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-900 whitespace-nowrap">
                                                        {mapping.tanggal_dibutuhkan && row[mapping.tanggal_dibutuhkan] !== undefined && row[mapping.tanggal_dibutuhkan] !== '' ? parseExcelDate(row[mapping.tanggal_dibutuhkan]) : <span className="text-red-400 text-xs italic">Kosong</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                    <AppButton
                        variant="secondary"
                        onClick={() => {
                            if (step > 1) setStep(step - 1);
                            else onClose();
                        }}
                        icon={step > 1 ? <ChevronLeftIcon className="size-4"/> : undefined}
                        disabled={isProcessing}
                    >
                        {step > 1 ? 'Kembali' : 'Batal'}
                    </AppButton>

                    {step === 2 && (
                        <AppButton
                            onClick={applyHeaderRow}
                            variant="primary"
                            iconRight={<ChevronRightIcon className="size-4" />}
                        >
                            Gunakan Baris {headerRowIndex + 1} Sebagai Header
                        </AppButton>
                    )}

                    {step === 3 && (
                        <AppButton
                            onClick={handleNextToPreview}
                            variant="primary"
                            iconRight={<ChevronRightIcon className="size-4" />}
                        >
                            Selanjutnya
                        </AppButton>
                    )}

                    {step === 4 && (
                        <AppButton
                            onClick={handleImport}
                            variant="primary"
                            loading={isProcessing}
                            disabled={isProcessing || validExcelData.length === 0}
                            icon={!isProcessing && <CheckIcon className="size-4" />}
                        >
                            Import {validExcelData.length} Data
                        </AppButton>
                    )}
                </div>
            </div>
        </div>
    );
}
