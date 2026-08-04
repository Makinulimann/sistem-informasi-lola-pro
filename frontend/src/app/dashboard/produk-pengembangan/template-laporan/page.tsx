'use client';

import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    Calendar,
    Plus,
    Trash2,
    Download
} from 'lucide-react';
import { AppButton } from '@/components/ui/app-button';
import { useToast } from '@/components/ui/toast';

/* ─── Helper: Format YYYY-MM-DD to DD/MM/YYYY ─── */
function formatYmdToDmy(ymd: string): string {
    if (!ymd) return '';
    const parts = ymd.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return ymd;
}

/* ─── Types ─── */
interface RkoRow {
    no: number;
    name: string;
    bentuk: string;
    kemasan: string;
    realisasiProduksi: number;
    realisasiPengambilan: number;
    stokAkhir: number;
    satuan: string;
}

interface ProductBlock {
    id: string;
    name: string;
    image: string;
    bullets: string[];
}

export default function TemplateLaporanPage() {
    const toast = useToast();

    // Filters & Config
    const [startDate, setStartDate] = useState<string>('2026-03-03');
    const [endDate, setEndDate] = useState<string>('2026-03-07');
    const [rkoYear, setRkoYear] = useState<number>(2026);
    const [updateDate, setUpdateDate] = useState<string>('07/03/2026');
    const [tableADateLabel, setTableADateLabel] = useState<string>('01/01/2026 s/d 07/03/2026');

    // State for generated preview
    const [hasGenerated, setHasGenerated] = useState<boolean>(false);
    const [generating, setGenerating] = useState<boolean>(false);

    // Auto-sync Label Up Date Laporan when Tanggal Akhir Aktivitas changes
    useEffect(() => {
        if (endDate) {
            const dmy = formatYmdToDmy(endDate);
            setUpdateDate(dmy);
            setTableADateLabel(`01/01/${rkoYear} s/d ${dmy}`);
        }
    }, [endDate, rkoYear]);

    // 7 Official RKO Product Variants
    const [rkoTable, setRkoTable] = useState<RkoRow[]>([
        { no: 1, name: 'Phonska OCA Plus', bentuk: 'Cair', kemasan: '1 Liter', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Liter' },
        { no: 2, name: 'Petro Fish', bentuk: 'Cair', kemasan: '1 Liter', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Liter' },
        { no: 3, name: 'Petro Gladiator - PGD @1KG', bentuk: 'Padat', kemasan: '1 Kg', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Kg' },
        { no: 4, name: 'Petro Gladiator - PGD @2KG', bentuk: 'Padat', kemasan: '2 Kg', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Kg' },
        { no: 5, name: 'Petro Bio Fertil', bentuk: 'Padat', kemasan: '5 Kg', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Kg' },
        { no: 6, name: 'Petro Gladiator Cair - 1 Liter', bentuk: 'Cair', kemasan: '1 Liter', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Liter' },
        { no: 7, name: 'Petro Gladiator Cair - 500 ml', bentuk: 'Cair', kemasan: '500 ml', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Liter' },
    ]);

    const [productBlocks, setProductBlocks] = useState<ProductBlock[]>([
        {
            id: 'petro-fish',
            name: 'Petro Fish (PFS)',
            image: '/images/petro-fish.webp',
            bullets: []
        },
        {
            id: 'phonska-oca',
            name: 'Phonska Oca Plus (POP)',
            image: '/images/phonska-oca-plus.webp',
            bullets: []
        },
        {
            id: 'bio-fertil',
            name: 'Petro Bio Fertil (PBF)',
            image: '/images/bio-fertil.webp',
            bullets: []
        },
        {
            id: 'petro-gladiator',
            name: 'Petro Gladiator Padat (PGD)',
            image: '/images/petro-gladiator.webp',
            bullets: []
        },
        {
            id: 'petro-gladiator-cair',
            name: 'Petro Gladiator Cair (PGD Cair)',
            image: '/images/petro-gladiator.webp',
            bullets: []
        }
    ]);

    const [catatanTambahanBullets, setCatatanTambahanBullets] = useState<string[]>([]);

    /* ── Generate Report via API ── */
    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    rkoYear,
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Gagal memproses laporan.');
            }

            const data = await res.json();

            if (data.rkoSummary && data.rkoSummary.length > 0) {
                setRkoTable(data.rkoSummary);
            }

            if (data.tableADateLabel) {
                setTableADateLabel(data.tableADateLabel);
            }

            if (data.aiSummaries) {
                setProductBlocks(prev => prev.map(p => ({
                    ...p,
                    image: data.productImageMap && data.productImageMap[p.id] ? data.productImageMap[p.id] : p.image,
                    bullets: data.aiSummaries[p.id] || []
                })));

                setCatatanTambahanBullets(data.aiSummaries['catatan-tambahan'] || []);
            }

            setHasGenerated(true);
            toast.success('Berhasil', 'Template Laporan berhasil digenerate menggunakan AI.');
        } catch (err: any) {
            console.error('Generate failed:', err);
            toast.error('Gagal Generate Laporan', err.message || 'Terjadi kesalahan saat merangkum data.');
        } finally {
            setGenerating(false);
        }
    };

    /* ── Edit Handlers ── */
    const handleRkoChange = (index: number, field: keyof RkoRow, value: any) => {
        setRkoTable(prev => {
            const next = [...prev];
            const updated = { ...next[index], [field]: value };
            if (field === 'realisasiProduksi' || field === 'realisasiPengambilan') {
                updated.stokAkhir = Math.max(0, (updated.realisasiProduksi || 0) - (updated.realisasiPengambilan || 0));
            }
            next[index] = updated;
            return next;
        });
    };

    const handleBulletChange = (blockId: string, bulletIdx: number, val: string) => {
        setProductBlocks(prev => prev.map(p => {
            if (p.id !== blockId) return p;
            const newBullets = [...p.bullets];
            newBullets[bulletIdx] = val;
            return { ...p, bullets: newBullets };
        }));
    };

    const handleAddBullet = (blockId: string) => {
        setProductBlocks(prev => prev.map(p => {
            if (p.id !== blockId) return p;
            return { ...p, bullets: [...p.bullets, 'Aktivitas baru...'] };
        }));
    };

    const handleDeleteBullet = (blockId: string, bulletIdx: number) => {
        setProductBlocks(prev => prev.map(p => {
            if (p.id !== blockId) return p;
            return { ...p, bullets: p.bullets.filter((_, i) => i !== bulletIdx) };
        }));
    };

    /* ── Export PDF ── */
    const handleExportPDF = () => {
        if (!hasGenerated) {
            toast.warning('Perhatian', 'Generate laporan terlebih dahulu sebelum melakukan export PDF.');
            return;
        }
        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                toast.error('Gagal', 'Popup terblokir oleh browser. Izinkan popup untuk mencetak PDF.');
                return;
            }

            const rkoRowsHtml = rkoTable.map((r, i) => `
                <tr>
                    <td style="text-align: center; border: 1px solid #000; padding: 4px;">${i + 1}</td>
                    <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.name}</td>
                    <td style="text-align: center; border: 1px solid #000; padding: 4px;">${r.bentuk}</td>
                    <td style="text-align: center; border: 1px solid #000; padding: 4px;">${r.kemasan}</td>
                    <td style="text-align: right; border: 1px solid #000; padding: 4px;">${(r.realisasiProduksi || 0).toLocaleString('id-ID')}</td>
                    <td style="text-align: right; border: 1px solid #000; padding: 4px;">${(r.realisasiPengambilan || 0).toLocaleString('id-ID')}</td>
                    <td style="text-align: right; border: 1px solid #000; padding: 4px; font-weight: bold; background: #ecfdf5;">${(r.stokAkhir || 0).toLocaleString('id-ID')}</td>
                    <td style="text-align: center; border: 1px solid #000; padding: 4px;">${r.satuan}</td>
                </tr>
            `).join('');

            const productRowsHtml = productBlocks.map(p => `
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; width: 150px; text-align: center; vertical-align: top; background: #fafafa;">
                        <img src="${p.image}" alt="${p.name}" style="width: 65px; height: 75px; object-fit: contain; margin-bottom: 4px;" />
                        <div style="font-weight: bold; font-size: 8.5pt;">${p.name}</div>
                    </td>
                    <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                        ${p.bullets.length === 0 ? '<div style="color: #666; font-style: italic;">Tidak ada aktivitas harian pada periode terpilih.</div>' : `
                            <ul style="margin: 0; padding-left: 16px; font-size: 8.5pt; line-height: 1.5;">
                                ${p.bullets.map(b => `<li>${b}</li>`).join('')}
                            </ul>
                        `}
                    </td>
                </tr>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Laporan Kemitraan Produk Pengembangan ${rkoYear}</title>
                    <style>
                        @page { size: portrait; margin: 10mm; }
                        * { color: #000000 !important; font-family: Arial, sans-serif; }
                        body { margin: 0; padding: 10px; font-size: 9pt; }
                        .logo-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
                        .logo-header img { height: 42px; object-fit: contain; }
                        .doc-title { text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 8px 0 14px 0; }
                        .update-label { text-align: right; font-size: 8.5pt; font-weight: bold; margin-bottom: 6px; }
                        .section-title { font-size: 9.5pt; font-weight: bold; margin: 14px 0 6px 0; background: #e2e8f0; padding: 4px 8px; border-left: 4px solid #000; display: flex; justify-content: space-between; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 8.5pt; }
                        th { border: 1px solid #000; padding: 5px; background: #f1f5f9; text-align: center; font-weight: bold; }
                        td { border: 1px solid #000; padding: 4px; }
                        @media print {
                            body { padding: 0; }
                            * { color: #000000 !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="logo-header">
                        <img src="/images/logo-PG.webp" alt="Petrokimia Gresik" />
                        <div style="text-align: right;">
                            <div style="font-size: 11pt; font-weight: bold;">PT PETROKIMIA GRESIK</div>
                            <div style="font-size: 8pt; color: #333;">Sistem Informasi Pengelolaan Produk</div>
                        </div>
                    </div>

                    <div class="doc-title">LAPORAN KEMITRAAN PRODUK PENGEMBANGAN</div>
                    <div class="update-label">Up Date: ${updateDate}</div>

                    <div class="section-title">
                        <span>A. INFORMASI PRODUKSI DAN STOK PRODUK KPP TAHUN ${rkoYear}</span>
                        <span style="font-size: 8pt; font-weight: normal; font-style: italic;">(periode: ${tableADateLabel})</span>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th rowSpan="2" style="width: 25px;">No</th>
                                <th rowSpan="2">Nama Produk</th>
                                <th rowSpan="2">Bentuk</th>
                                <th rowSpan="2">Kemasan</th>
                                <th rowSpan="2">Realisasi Produksi</th>
                                <th rowSpan="2">Realisasi Pengambilan</th>
                                <th rowSpan="2">Stok Akhir</th>
                                <th rowSpan="2">Satuan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rkoRowsHtml}
                        </tbody>
                    </table>

                    <div class="section-title">
                        <span>B. UPDATE PROGRES & RANGKUMAN AKTIVITAS</span>
                        <span style="font-size: 8pt; font-weight: normal; font-style: italic;">(periode: ${formatYmdToDmy(startDate)} s/d ${formatYmdToDmy(endDate)})</span>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 150px;">Produk</th>
                                <th>Rangkuman Aktivitas Per Produk</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productRowsHtml}
                        </tbody>
                    </table>

                    <div style="font-weight: bold; margin: 12px 0 6px 0; font-size: 9pt;">Catatan Tambahan & Maintenance General:</div>
                    <table>
                        <tbody>
                            <tr>
                                <td style="padding: 8px; vertical-align: top;">
                                    ${catatanTambahanBullets.length === 0 ? '<div style="color: #666; font-style: italic;">Tidak ada catatan tambahan pada periode terpilih.</div>' : `
                                        <ul style="margin: 0; padding-left: 16px; font-size: 8.5pt; line-height: 1.5;">
                                            ${catatanTambahanBullets.map(b => `<li>${b}</li>`).join('')}
                                        </ul>
                                    `}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
            toast.success('Berhasil', 'Membuka dialog cetak PDF Laporan.');
        } catch (err: any) {
            console.error('Export PDF failed:', err);
            toast.error('Gagal Export PDF', err.message || 'Terjadi kesalahan saat mencetak PDF.');
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">Produk Pengembangan</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Template Laporan</span>
            </div>

            {/* Title & Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        Template Laporan AI
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Generate & rangkum laporan mingguan produk pengembangan berbasis AI
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <AppButton
                        variant="secondary"
                        onClick={handleExportPDF}
                        disabled={!hasGenerated}
                        icon={<Download className="size-4 text-red-600" />}
                    >
                        Export PDF
                    </AppButton>
                    <AppButton
                        variant="primary"
                        onClick={handleGenerate}
                        disabled={generating}
                        icon={<Sparkles className={`size-4 ${generating ? 'animate-spin' : ''}`} />}
                    >
                        {generating ? 'Merangkum AI...' : 'Generate Laporan AI'}
                    </AppButton>
                </div>
            </div>

            {/* Filter Controls Card */}
            <div className="bg-white border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                    Pengaturan & Parameter Rangkuman AI
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Start Date */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Tanggal Mulai Aktivitas
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full text-xs h-9 px-3 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Tanggal Akhir Aktivitas
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full text-xs h-9 px-3 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    {/* Year RKO */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Tahun Realisasi RKO
                        </label>
                        <input
                            type="number"
                            value={rkoYear}
                            onChange={(e) => setRkoYear(parseInt(e.target.value) || new Date().getFullYear())}
                            className="w-full text-xs h-9 px-3 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-medium"
                        />
                    </div>

                    {/* Update Date */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Label Up Date Laporan
                        </label>
                        <input
                            type="text"
                            value={updateDate}
                            onChange={(e) => setUpdateDate(e.target.value)}
                            placeholder="07/03/2026"
                            className="w-full text-xs h-9 px-3 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Editable & Interactive Document Preview */}
            {!hasGenerated ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center max-w-5xl mx-auto shadow-xs flex flex-col items-center justify-center">
                    <Sparkles className="size-12 mb-3 text-emerald-600 opacity-40 animate-pulse" />
                    <h3 className="text-base font-bold text-gray-800">Preview Laporan Belum Digenerate</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md">
                        Tentukan parameter rentang tanggal aktivitas harian di atas, lalu klik tombol <strong className="text-emerald-700">&quot;Generate Laporan AI&quot;</strong> untuk membuat rangkuman otomatis.
                    </p>
                </div>
            ) : (
                <div className="bg-white border border-gray-300 rounded-lg p-6 sm:p-8 shadow-md space-y-6 max-w-5xl mx-auto">
                    {/* Header Logo */}
                    <div className="flex items-center justify-between border-b-2 border-gray-900 pb-3">
                        <div className="flex items-center gap-3">
                            <img src="/images/logo-PG.webp" alt="Petrokimia Gresik" className="h-12 object-contain" />
                        </div>
                        <div className="text-right">
                            <h2 className="text-base font-bold text-gray-900 leading-tight">PT PETROKIMIA GRESIK</h2>
                            <p className="text-xs text-gray-600 font-medium">Sistem Informasi Pengelolaan Produk</p>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-1">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-wide uppercase">
                            LAPORAN KEMITRAAN PRODUK PENGEMBANGAN
                        </h2>
                        <div className="text-right text-xs font-bold text-gray-700">
                            Up Date: <input
                                type="text"
                                value={updateDate}
                                onChange={(e) => setUpdateDate(e.target.value)}
                                className="w-28 text-right font-bold border-b border-gray-400 outline-none focus:border-emerald-600 px-1"
                            />
                        </div>
                    </div>

                    {/* Section A: RKO Table */}
                    <div className="space-y-2">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1.5 border-l-4 border-emerald-600 uppercase flex items-center justify-between">
                            <span>A. Informasi Produksi dan Stok Produk KPP Tahun {rkoYear}</span>
                            <span className="text-[10px] text-emerald-700 font-normal italic lowercase">(periode: {tableADateLabel})</span>
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-800 uppercase font-bold text-center">
                                        <th className="border border-gray-300 px-2 py-2 w-8">No</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">Nama Produk</th>
                                        <th className="border border-gray-300 px-2 py-2 w-16">Bentuk</th>
                                        <th className="border border-gray-300 px-2 py-2 w-20">Kemasan</th>
                                        <th className="border border-gray-300 px-3 py-2">Realisasi Produksi</th>
                                        <th className="border border-gray-300 px-3 py-2">Realisasi Pengambilan</th>
                                        <th className="border border-gray-300 px-3 py-2 bg-emerald-50">Stok Akhir</th>
                                        <th className="border border-gray-300 px-2 py-2 w-16">Satuan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rkoTable.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="border border-gray-300 text-center py-1 font-medium">{row.no}</td>
                                            <td className="border border-gray-300 px-2 py-1 font-bold">{row.name}</td>
                                            <td className="border border-gray-300 text-center py-1 font-semibold">{row.bentuk}</td>
                                            <td className="border border-gray-300 text-center py-1 font-semibold">{row.kemasan}</td>
                                            <td className="border border-gray-300 p-0">
                                                <input
                                                    type="number"
                                                    value={row.realisasiProduksi}
                                                    onChange={(e) => handleRkoChange(idx, 'realisasiProduksi', parseFloat(e.target.value) || 0)}
                                                    className="w-full text-right px-2 py-1 outline-none font-medium focus:bg-emerald-50"
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-0">
                                                <input
                                                    type="number"
                                                    value={row.realisasiPengambilan}
                                                    onChange={(e) => handleRkoChange(idx, 'realisasiPengambilan', parseFloat(e.target.value) || 0)}
                                                    className="w-full text-right px-2 py-1 outline-none font-medium focus:bg-emerald-50"
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-0 bg-emerald-50/50">
                                                <input
                                                    type="number"
                                                    value={row.stokAkhir}
                                                    onChange={(e) => handleRkoChange(idx, 'stokAkhir', parseFloat(e.target.value) || 0)}
                                                    className="w-full text-right px-2 py-1 outline-none font-bold text-emerald-900 bg-transparent focus:bg-emerald-100"
                                                />
                                            </td>
                                            <td className="border border-gray-300 text-center py-1">{row.satuan}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section B: Update Progres Pabrik dan Produk */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1.5 border-l-4 border-emerald-600 uppercase flex items-center justify-between">
                            <span>B. Update Progres & Rangkuman Aktivitas</span>
                            <span className="text-[10px] text-emerald-700 font-normal italic lowercase">(periode: {formatYmdToDmy(startDate)} s/d {formatYmdToDmy(endDate)})</span>
                        </h3>

                        {/* Structured Table for Summarized Product Activities */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-800">Tabel Rangkuman Aktivitas Per Produk:</h4>
                            <div className="overflow-x-auto border border-gray-300 rounded-lg">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-900 font-bold uppercase border-b border-gray-300">
                                            <th className="px-4 py-2.5 text-left w-52 border-r border-gray-300">Produk</th>
                                            <th className="px-4 py-2.5 text-left">Hasil Rangkuman Aktivitas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {productBlocks.map((block) => (
                                            <tr key={block.id} className="hover:bg-gray-50/60">
                                                <td className="px-4 py-3 border-r border-gray-300 bg-gray-50/40 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-14 flex-shrink-0 bg-white rounded border border-gray-200 p-1 flex items-center justify-center">
                                                            <img src={block.image} alt={block.name} className="w-full h-full object-contain" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 text-xs">{block.name}</div>
                                                            <button
                                                                onClick={() => handleAddBullet(block.id)}
                                                                className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-1 hover:underline cursor-pointer"
                                                            >
                                                                <Plus className="size-3" /> Tambah Poin
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    {block.bullets.length === 0 ? (
                                                        <span className="text-gray-400 italic text-xs">Tidak ada aktivitas harian pada periode terpilih.</span>
                                                    ) : (
                                                        <ul className="list-disc list-outside ml-4 space-y-1.5 text-xs text-gray-800">
                                                            {block.bullets.map((bullet, bIdx) => (
                                                                <li key={bIdx} className="group relative">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <input
                                                                            type="text"
                                                                            value={bullet}
                                                                            onChange={(e) => handleBulletChange(block.id, bIdx, e.target.value)}
                                                                            className="w-full bg-transparent outline-none focus:bg-emerald-50/60 rounded px-1.5 py-0.5 border-b border-transparent focus:border-emerald-500 text-xs"
                                                                        />
                                                                        <button
                                                                            onClick={() => handleDeleteBullet(block.id, bIdx)}
                                                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity p-0.5 cursor-pointer"
                                                                            title="Hapus Poin"
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Catatan Tambahan Table */}
                        <div className="pt-2 space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-gray-800">Catatan Tambahan:</h4>
                                <button
                                    onClick={() => setCatatanTambahanBullets(prev => [...prev, 'Catatan baru...'])}
                                    className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                >
                                    <Plus className="size-3" /> Tambah Catatan
                                </button>
                            </div>
                            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50/40">
                                {catatanTambahanBullets.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">Tidak ada catatan tambahan pada periode terpilih.</p>
                                ) : (
                                    <ul className="list-disc list-outside ml-4 space-y-1.5 text-xs text-gray-800">
                                        {catatanTambahanBullets.map((bullet, idx) => (
                                            <li key={idx} className="group relative">
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={bullet}
                                                        onChange={(e) => {
                                                            const next = [...catatanTambahanBullets];
                                                            next[idx] = e.target.value;
                                                            setCatatanTambahanBullets(next);
                                                        }}
                                                        className="w-full bg-transparent outline-none focus:bg-white rounded px-1.5 py-0.5 border-b border-transparent focus:border-emerald-500 text-xs"
                                                    />
                                                    <button
                                                        onClick={() => setCatatanTambahanBullets(prev => prev.filter((_, i) => i !== idx))}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity p-0.5 cursor-pointer"
                                                        title="Hapus Catatan"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
