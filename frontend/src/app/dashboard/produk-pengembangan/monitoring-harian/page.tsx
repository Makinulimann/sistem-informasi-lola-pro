'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Save,
  Download,
  RefreshCw,
  Search,
  Package,
  Building2,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Info,
  Plus,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

/* ─── Interfaces ─── */
interface MonitoringRow {
  id: number;
  no: number;
  name: string;
  cleanName?: string;
  bentuk?: string;
  kemasan?: string;
  slug: string;
  satuan: string;
  produksiBulanIni: number;
  produksiSdBulanIni: number;
  gudangPsg: number;
  gudangLolaMitra: number;
  gudangGmg: number;
  totalStok: number;
  kuantumSoBulanIni: number;
  kuantumSoSdBulanIni: number;
  soOutstanding: number;
  stokAkhir: number;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function MonitoringHarianPage() {
  const toast = useToast();

  // State Date Filters
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Table Data State
  const [rows, setRows] = useState<MonitoringRow[]>([]);

  // Format date helper: e.g. "14 August 2026"
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const monthEng = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ][monthIdx] || MONTH_NAMES[monthIdx];
      return `${day} ${monthEng} ${year}`;
    }
    return dateStr;
  };

  /* ─── Load Data ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        tahun: number;
        bulan: number;
        tanggal: string;
        data: MonitoringRow[];
      }>(`/monitoring-harian?bulan=${selectedMonth}&tahun=${selectedYear}&tanggal=${selectedDate}`);

      if (res && res.data) {
        let finalRows = res.data;

        // Merge with localStorage backup if available
        if (typeof window !== 'undefined') {
          try {
            const localKey = `sipp_monitoring_${selectedYear}_${selectedMonth}`;
            const localSavedStr = localStorage.getItem(localKey);
            if (localSavedStr) {
              const localSaved: MonitoringRow[] = JSON.parse(localSavedStr);
              if (Array.isArray(localSaved) && localSaved.length > 0) {
                finalRows = finalRows.map((r) => {
                  const localMatch = localSaved.find((l) => l.id === r.id || l.name === r.name);
                  if (localMatch) {
                    const psg = r.gudangPsg || localMatch.gudangPsg || 0;
                    const lolaMitra = r.gudangLolaMitra || localMatch.gudangLolaMitra || 0;
                    const gmg = r.gudangGmg || localMatch.gudangGmg || 0;
                    const totalStok = psg + lolaMitra + gmg;
                    const soOut = r.soOutstanding || localMatch.soOutstanding || 0;

                    return {
                      ...r,
                      gudangPsg: psg,
                      gudangLolaMitra: lolaMitra,
                      gudangGmg: gmg,
                      totalStok: totalStok,
                      kuantumSoBulanIni: r.kuantumSoBulanIni || localMatch.kuantumSoBulanIni || 0,
                      kuantumSoSdBulanIni: r.kuantumSoSdBulanIni || localMatch.kuantumSoSdBulanIni || 0,
                      soOutstanding: soOut,
                      stokAkhir: totalStok - soOut,
                    };
                  }
                  return r;
                });
              }
            }
          } catch (e) {
            console.error('Failed reading local backup:', e);
          }
        }

        setRows(finalRows);
      }
    } catch (err) {
      console.error('Failed to load monitoring harian:', err);
      toast.error('Gagal Memuat Data', 'Tidak dapat mengambil data monitoring harian dari server.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedDate, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Cell Input Handlers ─── */
  const handleCellChange = (
    index: number,
    field: keyof MonitoringRow,
    value: string
  ) => {
    const numericValue = value === '' ? 0 : parseFloat(value) || 0;

    setRows((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: numericValue };

      // Re-calculate Total Stok (PsG + Lola Mitra + GMG)
      if (['gudangPsg', 'gudangLolaMitra', 'gudangGmg'].includes(field as string)) {
        target.totalStok = (target.gudangPsg || 0) + (target.gudangLolaMitra || 0) + (target.gudangGmg || 0);
        target.stokAkhir = target.totalStok - (target.soOutstanding || 0);
      }

      // Re-calculate Stok Akhir if SO Outstanding changed
      if (field === 'soOutstanding') {
        target.stokAkhir = (target.totalStok || 0) - numericValue;
      }

      updated[index] = target;
      return updated;
    });
  };

  const handleTextCellChange = (
    index: number,
    field: 'name' | 'satuan',
    value: string
  ) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  /* ─── Row Add & Delete Handlers ─── */
  const handleAddRow = () => {
    const newId = Date.now();
    const newRow: MonitoringRow = {
      id: newId,
      no: rows.length + 1,
      name: '',
      satuan: 'Kg',
      slug: `produk-${newId}`,
      produksiBulanIni: 0,
      produksiSdBulanIni: 0,
      gudangPsg: 0,
      gudangLolaMitra: 0,
      gudangGmg: 0,
      totalStok: 0,
      kuantumSoBulanIni: 0,
      kuantumSoSdBulanIni: 0,
      soOutstanding: 0,
      stokAkhir: 0,
    };
    setRows((prev) => [...prev, newRow]);
    toast.success('Produk Ditambahkan', 'Baris produk baru berhasil ditambahkan. Silakan isi nama produk.');
  };

  const handleDeleteRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.info('Produk Dihapus', 'Baris produk telah dihapus dari tabel.');
  };

  /* ─── Save Data ─── */
  const handleSave = async () => {
    setSaving(true);
    try {
      // Save local backup first
      if (typeof window !== 'undefined') {
        try {
          const localKey = `sipp_monitoring_${selectedYear}_${selectedMonth}`;
          localStorage.setItem(localKey, JSON.stringify(rows));
        } catch (e) {
          // Ignore
        }
      }

      await api.post('/monitoring-harian', {
        tahun: selectedYear,
        bulan: selectedMonth,
        rows: rows,
      });
      toast.success('Berhasil Disimpan', 'Data monitoring harian telah tersimpan di sistem.');
    } catch (err) {
      console.error('Failed to save monitoring harian:', err);
      toast.error('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data ke database.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Sync Production Data ─── */
  const handleSyncProduksi = async () => {
    setSyncing(true);
    try {
      await fetchData();
      toast.success('Sync Berhasil', 'Data produksi terbaru berhasil disinkronkan.');
    } catch (err) {
      toast.error('Gagal Sync', 'Gagal menyinkronkan data produksi.');
    } finally {
      setSyncing(false);
    }
  };

  /* ─── Export Excel ─── */
  const handleExportExcel = () => {
    try {
      const currentMonthName = MONTH_NAMES[selectedMonth - 1];
      const exportData = rows.map((r, i) => ({
        'No': i + 1,
        'Nama Produk': r.name,
        'Satuan': r.satuan,
        [`Produksi ${selectedYear} (${currentMonthName})`]: r.produksiBulanIni,
        [`Produksi ${selectedYear} (s/d ${currentMonthName})`]: r.produksiSdBulanIni,
        'Gudang PsG': r.gudangPsg,
        'Gudang Lola Mitra': r.gudangLolaMitra,
        'Gudang GMG': r.gudangGmg,
        'Total Stok': r.totalStok,
        [`Kuantum SO ${selectedYear} (${currentMonthName})`]: r.kuantumSoBulanIni,
        [`Kuantum SO ${selectedYear} (s/d ${currentMonthName})`]: r.kuantumSoSdBulanIni,
        [`SO Outstanding ${selectedYear}`]: r.soOutstanding,
        'Stok Akhir': r.stokAkhir,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitoring Harian');
      XLSX.writeFile(workbook, `Monitoring_Harian_${selectedYear}_${selectedMonth}.xlsx`);
      toast.success('Export Excel Berhasil', 'File Excel telah berhasil diunduh.');
    } catch (err) {
      console.error('Export excel error:', err);
      toast.error('Export Gagal', 'Tidak dapat membuat file Excel.');
    }
  };

  /* ─── Export PDF (Official Clean PDF Blob Generator) ─── */
  const handleExportPDF = () => {
    try {
      const currentMonthName = MONTH_NAMES[selectedMonth - 1];
      const displayDate = formatDateDisplay(selectedDate);

      // Initialize A4 Landscape PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // 1. Clean Title Headers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('DEP. PENGELOLAAN PRODUK', 14, 15);

      doc.setFontSize(11);
      doc.text(`PER      ${displayDate}`, 14, 22);

      // 2. Define Table Header Structure
      const head = [
        [
          { content: 'No', rowSpan: 2, styles: { fillColor: [155, 194, 230], halign: 'center', valign: 'middle' } },
          { content: 'Produk', rowSpan: 2, styles: { fillColor: [155, 194, 230], halign: 'center', valign: 'middle' } },
          { content: 'Satuan', rowSpan: 2, styles: { fillColor: [155, 194, 230], halign: 'center', valign: 'middle' } },
          { content: `Produksi ${selectedYear}`, colSpan: 2, styles: { fillColor: [255, 230, 153], halign: 'center' } },
          { content: 'Gudang', colSpan: 3, styles: { fillColor: [255, 230, 153], halign: 'center' } },
          { content: 'Total Stok', rowSpan: 2, styles: { fillColor: [255, 230, 153], halign: 'center', valign: 'middle' } },
          { content: `Kuantum SO ${selectedYear}`, colSpan: 2, styles: { fillColor: [255, 230, 153], halign: 'center' } },
          { content: `SO Outstanding ${selectedYear}`, rowSpan: 2, styles: { fillColor: [255, 230, 153], halign: 'center', valign: 'middle' } },
          { content: 'Stok Akhir', rowSpan: 2, styles: { fillColor: [255, 230, 153], halign: 'center', valign: 'middle' } },
        ],
        [
          { content: currentMonthName, styles: { fillColor: [255, 230, 153], halign: 'center', valign: 'middle' } },
          { content: `s/d ${currentMonthName}`, styles: { fillColor: [255, 230, 153], halign: 'center', valign: 'middle' } },
          { content: 'PsG', styles: { fillColor: [255, 230, 153], halign: 'center' } },
          { content: 'Lola Mitra', styles: { fillColor: [255, 230, 153], halign: 'center' } },
          { content: 'GMG', styles: { fillColor: [255, 230, 153], halign: 'center' } },
          { content: currentMonthName, styles: { fillColor: [255, 230, 153], halign: 'center', valign: 'middle' } },
          { content: `s/d ${currentMonthName}`, styles: { fillColor: [255, 230, 153], halign: 'center', valign: 'middle' } },
        ],
      ];

      // 3. Build Table Body Rows
      const body = rows.map((r, idx) => [
        idx + 1,
        r.name,
        r.satuan,
        r.produksiBulanIni ? r.produksiBulanIni.toLocaleString('id-ID') : '-',
        r.produksiSdBulanIni ? r.produksiSdBulanIni.toLocaleString('id-ID') : '-',
        r.gudangPsg ? r.gudangPsg.toLocaleString('id-ID') : '-',
        r.gudangLolaMitra ? r.gudangLolaMitra.toLocaleString('id-ID') : '-',
        r.gudangGmg ? r.gudangGmg.toLocaleString('id-ID') : '-',
        r.totalStok ? r.totalStok.toLocaleString('id-ID') : '-',
        r.kuantumSoBulanIni ? r.kuantumSoBulanIni.toLocaleString('id-ID') : '-',
        r.kuantumSoSdBulanIni ? r.kuantumSoSdBulanIni.toLocaleString('id-ID') : '-',
        r.soOutstanding ? r.soOutstanding.toLocaleString('id-ID') : '-',
        r.stokAkhir ? r.stokAkhir.toLocaleString('id-ID') : '-',
      ]);

      // 4. Render Grid Table
      autoTable(doc, {
        startY: 28,
        head: head as any,
        body: body,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          textColor: [0, 0, 0],
          lineColor: [80, 80, 80],
          lineWidth: 0.2,
        },
        headStyles: {
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 0.2,
          lineColor: [80, 80, 80],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left', fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 16 },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right', fontStyle: 'bold' },
          9: { halign: 'right' },
          10: { halign: 'right' },
          11: { halign: 'right' },
          12: { halign: 'right', fontStyle: 'bold' },
        },
      });

      // 5. Output Clean PDF Blob & Open in PDF Viewer
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      toast.success('Export PDF Berhasil', 'Dokumen PDF bersih tanpa watermark browser telah dibuat.');
    } catch (err) {
      console.error('Export PDF error:', err);
      toast.error('Export Gagal', 'Terjadi kesalahan saat membuat file PDF.');
    }
  };

  // Filtered rows for UI table search
  const filteredRows = rows.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.satuan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute Totals for KPI Header Cards
  const totalProduksiBulan = rows.reduce((sum, r) => sum + (r.produksiBulanIni || 0), 0);
  const totalProduksiYtd = rows.reduce((sum, r) => sum + (r.produksiSdBulanIni || 0), 0);
  const totalStokGudang = rows.reduce((sum, r) => sum + (r.totalStok || 0), 0);
  const totalKuantumSoYtd = rows.reduce((sum, r) => sum + (r.kuantumSoSdBulanIni || 0), 0);
  const totalSoOutstanding = rows.reduce((sum, r) => sum + (r.soOutstanding || 0), 0);

  const currentMonthName = MONTH_NAMES[selectedMonth - 1];

  return (
    <div className="space-y-6 p-2 max-w-[1600px] mx-auto">
      {/* ─── Standard SIPP Page Header (Simple & Consistent) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Monitoring Harian Produk
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Laporan harian posisi stok gudang, kuantum SO, dan SO outstanding
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Tambah Baris Produk Baru"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>Tambah Produk</span>
          </button>

          <button
            onClick={handleSyncProduksi}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Sinkronkan data dari catatan produksi"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync Produksi</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Export ke Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Export / Cetak Laporan PDF Resmi"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Data'}</span>
          </button>
        </div>
      </div>

      {/* ─── Control & Filter Bar ─── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white p-4 border border-gray-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5">
            <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-bold text-gray-500 uppercase">PER:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDate(val);
                if (val) {
                  const d = new Date(val);
                  setSelectedYear(d.getFullYear());
                  setSelectedMonth(d.getMonth() + 1);
                }
              }}
              className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer"
            />
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1.5">
            <span className="text-xs text-gray-500 font-medium">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1.5">
            <span className="text-xs text-gray-500 font-medium">Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 border border-emerald-200">
            DEP. PENGELOLAAN PRODUK PER {formatDateDisplay(selectedDate)}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari produk atau satuan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* ─── KPI Summary Cards (Minimalist Standard Style) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-gray-200 hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-1">
            <span>Produksi {selectedYear}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {totalProduksiYtd.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">
            Bulan {currentMonthName}: <span className="font-bold">{totalProduksiBulan.toLocaleString('id-ID')}</span>
          </p>
        </div>

        <div className="bg-white p-4 border border-gray-200 hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-1">
            <span>Total Stok Gudang</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {totalStokGudang.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            PsG + Lola Mitra + GMG
          </p>
        </div>

        <div className="bg-white p-4 border border-gray-200 hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-1">
            <span>Kuantum SO YTD</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {totalKuantumSoYtd.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">
            s/d {currentMonthName}
          </p>
        </div>

        <div className="bg-white p-4 border border-gray-200 hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-1">
            <span>SO Outstanding</span>
            <Info className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-700">
            {totalSoOutstanding.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Tahun {selectedYear}
          </p>
        </div>
      </div>

      {/* ─── Main Editable Table Container ─── */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-emerald-800">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <p className="text-sm font-semibold">Memuat data monitoring harian...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
              <thead>
                {/* ── Level 1 Header ── */}
                <tr>
                  <th
                    rowSpan={2}
                    className="bg-[#9bc2e6] text-gray-900 border border-gray-400 p-2 text-center font-bold w-12"
                  >
                    No
                  </th>
                  <th
                    rowSpan={2}
                    className="bg-[#9bc2e6] text-gray-900 border border-gray-400 p-2 text-center font-bold min-w-[280px]"
                  >
                    Produk
                  </th>
                  <th
                    rowSpan={2}
                    className="bg-[#9bc2e6] text-gray-900 border border-gray-400 p-2 text-center font-bold w-20"
                  >
                    Satuan
                  </th>

                  <th
                    colSpan={2}
                    className="bg-[#ffe699] text-gray-900 border border-gray-400 p-2 text-center font-bold"
                  >
                    Produksi {selectedYear}
                  </th>

                  <th
                    colSpan={3}
                    className="bg-[#ffe699] text-gray-900 border border-gray-400 p-2 text-center font-bold"
                  >
                    Gudang
                  </th>

                  <th
                    rowSpan={2}
                    className="bg-[#ffe699] text-gray-900 border border-gray-400 p-2 text-center font-bold w-28"
                  >
                    Total Stok
                  </th>

                  <th
                    colSpan={2}
                    className="bg-[#ffe699] text-gray-900 border border-gray-400 p-2 text-center font-bold"
                  >
                    Kuantum SO {selectedYear}
                  </th>

                  <th
                    rowSpan={2}
                    className="bg-[#ffe699] text-gray-900 border border-gray-400 p-2 text-center font-bold w-28"
                  >
                    SO Outstanding {selectedYear}
                  </th>

                  <th
                    rowSpan={2}
                    className="bg-[#ffe699] text-gray-900 border border-gray-400 p-2 text-center font-bold w-28"
                  >
                    Stok Akhir
                  </th>

                  <th
                    rowSpan={2}
                    className="bg-[#ffe699] text-gray-900 border border-gray-400 p-2 text-center font-bold w-12"
                  >
                    Aksi
                  </th>
                </tr>

                {/* ── Level 2 Header ── */}
                <tr>
                  <th className="bg-[#ffe699] text-gray-900 border border-gray-400 p-1.5 text-center font-bold w-24">
                    {currentMonthName}
                  </th>
                  <th className="bg-[#ffe699] text-gray-900 border border-gray-400 p-1.5 text-center font-bold w-28">
                    s/d {currentMonthName}
                  </th>

                  <th className="bg-[#ffe699] text-gray-900 border border-gray-400 p-1 text-center font-bold w-24">
                    PsG
                  </th>
                  <th className="bg-[#ffe699] text-gray-900 border border-gray-400 p-1 text-center font-bold w-24">
                    Lola Mitra
                  </th>
                  <th className="bg-[#ffe699] text-gray-900 border border-gray-400 p-1 text-center font-bold w-24">
                    GMG
                  </th>

                  <th className="bg-[#ffe699] text-gray-900 border border-gray-400 p-1.5 text-center font-bold w-24">
                    {currentMonthName}
                  </th>
                  <th className="bg-[#ffe699] text-gray-900 border border-gray-400 p-1.5 text-center font-bold w-28">
                    s/d {currentMonthName}
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-10 text-gray-400">
                      Tidak ada data produk ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => {
                    const rowOriginalIndex = rows.findIndex((item) => item.id === r.id);

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-amber-50/40 transition-colors border-b border-gray-200"
                      >
                        {/* No */}
                        <td className="border border-gray-300 p-2 text-center font-medium text-gray-600 bg-gray-50/50">
                          {idx + 1}
                        </td>

                        {/* Produk (Editable) */}
                        <td className="border border-gray-300 p-1 bg-white">
                          <input
                            type="text"
                            value={r.name || ''}
                            onChange={(e) => handleTextCellChange(rowOriginalIndex, 'name', e.target.value)}
                            placeholder="Nama Produk..."
                            className="w-full bg-transparent px-1.5 py-0.5 outline-none font-semibold text-gray-900 focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500 rounded"
                          />
                        </td>

                        {/* Satuan (Editable) */}
                        <td className="border border-gray-300 p-1 bg-white">
                          <input
                            type="text"
                            value={r.satuan || ''}
                            onChange={(e) => handleTextCellChange(rowOriginalIndex, 'satuan', e.target.value)}
                            placeholder="Satuan..."
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none font-medium text-gray-700 focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500 rounded"
                          />
                        </td>

                        {/* Produksi Bulan Ini */}
                        <td className="border border-gray-300 p-2 text-right font-medium text-gray-800 bg-white">
                          {r.produksiBulanIni ? r.produksiBulanIni.toLocaleString('id-ID') : '-'}
                        </td>

                        {/* Produksi s/d Bulan Ini */}
                        <td className="border border-gray-300 p-2 text-right font-semibold text-gray-900 bg-white">
                          {r.produksiSdBulanIni ? r.produksiSdBulanIni.toLocaleString('id-ID') : '-'}
                        </td>

                        {/* Gudang PsG BA13 */}
                        <td className="border border-gray-300 p-1 bg-amber-50/20">
                          <input
                            type="number"
                            value={r.gudangPsg || ''}
                            onChange={(e) => handleCellChange(rowOriginalIndex, 'gudangPsg', e.target.value)}
                            placeholder="-"
                            className="w-full text-right bg-transparent px-1 py-0.5 outline-none font-medium focus:bg-amber-100 rounded text-gray-900"
                          />
                        </td>

                        {/* Gudang Lola Mitra B025 */}
                        <td className="border border-gray-300 p-1 bg-amber-50/20">
                          <input
                            type="number"
                            value={r.gudangLolaMitra || ''}
                            onChange={(e) => handleCellChange(rowOriginalIndex, 'gudangLolaMitra', e.target.value)}
                            placeholder="-"
                            className="w-full text-right bg-transparent px-1 py-0.5 outline-none font-medium focus:bg-amber-100 rounded text-gray-900"
                          />
                        </td>

                        {/* Gudang GMG B101 */}
                        <td className="border border-gray-300 p-1 bg-amber-50/20">
                          <input
                            type="number"
                            value={r.gudangGmg || ''}
                            onChange={(e) => handleCellChange(rowOriginalIndex, 'gudangGmg', e.target.value)}
                            placeholder="-"
                            className="w-full text-right bg-transparent px-1 py-0.5 outline-none font-medium focus:bg-amber-100 rounded text-gray-900"
                          />
                        </td>

                        {/* Total Stok (Calculated) */}
                        <td className="border border-gray-300 p-2 text-right font-bold text-emerald-950 bg-emerald-50/60">
                          {r.totalStok ? r.totalStok.toLocaleString('id-ID') : '-'}
                        </td>

                        {/* Kuantum SO Bulan Ini */}
                        <td className="border border-gray-300 p-1 bg-white">
                          <input
                            type="number"
                            value={r.kuantumSoBulanIni || ''}
                            onChange={(e) => handleCellChange(rowOriginalIndex, 'kuantumSoBulanIni', e.target.value)}
                            placeholder="-"
                            className="w-full text-right bg-transparent px-1 py-0.5 outline-none font-medium focus:bg-emerald-50 rounded"
                          />
                        </td>

                        {/* Kuantum SO s/d Bulan Ini */}
                        <td className="border border-gray-300 p-1 bg-white">
                          <input
                            type="number"
                            value={r.kuantumSoSdBulanIni || ''}
                            onChange={(e) => handleCellChange(rowOriginalIndex, 'kuantumSoSdBulanIni', e.target.value)}
                            placeholder="-"
                            className="w-full text-right bg-transparent px-1 py-0.5 outline-none font-medium focus:bg-emerald-50 rounded"
                          />
                        </td>

                        {/* SO Outstanding */}
                        <td className="border border-gray-300 p-1 bg-rose-50/20">
                          <input
                            type="number"
                            value={r.soOutstanding || ''}
                            onChange={(e) => handleCellChange(rowOriginalIndex, 'soOutstanding', e.target.value)}
                            placeholder="-"
                            className="w-full text-right bg-transparent px-1 py-0.5 outline-none font-medium focus:bg-rose-100 text-rose-800 rounded"
                          />
                        </td>

                        {/* Stok Akhir (Calculated) */}
                        <td className="border border-gray-300 p-2 text-right font-bold text-gray-900 bg-amber-100/50">
                          {r.stokAkhir ? r.stokAkhir.toLocaleString('id-ID') : '-'}
                        </td>

                        {/* Aksi (Hapus) */}
                        <td className="border border-gray-300 p-1 text-center bg-white">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(r.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Baris Produk</span>
            </button>
          </div>

          <div className="flex items-center gap-3 font-medium">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
