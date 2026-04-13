'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PerencanaanProduct, PerencanaanMaterial } from './actions'
import { SaveIcon, FileSpreadsheetIcon, SettingsIcon, XIcon } from 'lucide-react'
import { AppButton } from '@/components/ui/app-button'

interface MaterialConfig {
  stokExisting?: number
  satuan?: string
  customDeps?: Record<string, number>
}
import { AppSelect } from '@/components/ui/app-select'

import { saveMaterialConfig, saveProduksiTargets } from './actions'

interface Props {
  products: PerencanaanProduct[]
  materials: PerencanaanMaterial[]
  initialMonth: number
  initialYear: number
  savedConfigs?: Record<number, any>
  savedTargets?: Record<string, Record<string, number>>
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function SetupModal({ material, products, currentConfig, onClose, onSave }: any) {
  const [stok, setStok] = useState(currentConfig?.stokExisting ?? 0)
  const [satuan, setSatuan] = useState(currentConfig?.satuan ?? 'Kg')
  const [customDeps, setCustomDeps] = useState<Record<string, number>>(() => {
     if (currentConfig?.customDeps) return { ...currentConfig.customDeps }
     const obj: Record<string, number> = {}
     material.deps.forEach((d: any) => obj[d.slug] = d.amount)
     return obj
  })

  return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-lg border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200 relative">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                 <h3 className="text-lg font-bold text-gray-800">Setup Data: {material.nama}</h3>
                 <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors bg-white hover:bg-gray-100 p-1 rounded-full"><XIcon size={18} /></button>
              </div>
              <div className="p-6 space-y-5">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Stock Existing Akhir</label>
                      <input 
                        type="number" 
                        value={stok}
                        onChange={e => setStok(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Satuan Bawaan</label>
                      <select 
                        value={satuan}
                        onChange={e => setSatuan(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-medium bg-white"
                      >
                         <option value="Kg">Kilogram (Kg)</option>
                         <option value="L">Liter (L)</option>
                         <option value="EA">(EA)</option>
                         <option value="Ton">Ton</option>
                      </select>
                    </div>
                 </div>

                 {material.usedBySlugs.length > 0 && (
                 <div className="space-y-3">
                   <h4 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">Custom Total Kebutuhan per Produk</h4>
                   <div className="space-y-2">
                     {material.usedBySlugs.map((slug: string) => {
                       const pName = products.find((p: any) => p.slug === slug)?.name || slug;
                       const currentVal = customDeps[slug] || 0;
                       return (
                         <div key={slug} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 font-medium truncate pr-4">{pName}</span>
                            <div className="flex items-center gap-2 w-32 shrink-0">
                               <input 
                                 type="number" 
                                 value={currentVal}
                                 onChange={e => setCustomDeps(p => ({...p, [slug]: parseFloat(e.target.value) || 0}))}
                                 className="w-full px-2 py-1.5 border border-emerald-100 bg-emerald-50/30 text-emerald-800 rounded text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold"
                               />
                            </div>
                         </div>
                       )
                     })}
                   </div>
                   <p className="text-[11px] text-gray-400 italic mt-2">Ubah nilai ini jika Anda ingin mengesampingkan total kebutuhan yang dihitung otomatis dari Rencana Produksi.</p>
                 </div>
                 )}
              </div>
              <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50/80 gap-2">
                 <AppButton variant="secondary" onClick={onClose}>Batal</AppButton>
                 <AppButton onClick={() => onSave({ stokExisting: stok, satuan, customDeps })}>Simpan Perubahan</AppButton>
              </div>
           </div>
        </div>
  )
}

export default function PerencanaanPengadaanClient({ products, materials, initialMonth, initialYear, savedConfigs = {}, savedTargets = {} }: Props) {
  const router = useRouter()
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)
  const [selectedYear, setSelectedYear] = useState(initialYear)
  const [activeTab, setActiveTab] = useState<'BALANCING' | 'RENCANA'>('BALANCING')
  const [isSavingTargets, setIsSavingTargets] = useState(false)
  
  const [materialConfigs, setMaterialConfigs] = useState<Record<number, MaterialConfig>>(savedConfigs)
  
  const [visibleMonthsCount, setVisibleMonthsCount] = useState<number>(12)
  const [setupMatId, setSetupMatId] = useState<number | null>(null)

  const FULL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']

  const MONTHS = useMemo(() => {
    return [
      MONTH_NAMES[selectedMonth - 1],
      MONTH_NAMES[selectedMonth % 12],
      MONTH_NAMES[(selectedMonth + 1) % 12],
      MONTH_NAMES[(selectedMonth + 2) % 12]
    ]
  }, [selectedMonth])

  const handlePeriodChange = (m: number, y: number) => {
    setSelectedMonth(m)
    setSelectedYear(y)
    router.push(`?month=${m}&year=${y}`)
  }
  // period keys for the selected 4 months
  const periodKeys = useMemo(() => {
    return [0, 1, 2, 3].map(i => {
      let m = selectedMonth + i
      let y = selectedYear
      if (m > 12) {
        m -= 12
        y += 1
      }
      return `${y}-${m}`
    })
  }, [selectedMonth, selectedYear])

  // target quantity per product per month (stored by period key e.g., "2026-4")
  const [targets, setTargets] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {}
    products.forEach(p => {
       init[p.slug] = savedTargets[p.slug] ? { ...savedTargets[p.slug] } : {}
    })
    return init
  })

  const handleTargetChange = (slug: string, periodKey: string, val: string) => {
    const num = parseFloat(val) || 0
    setTargets(prev => {
      return {
        ...prev,
        [slug]: {
          ...(prev[slug] || {}),
          [periodKey]: num
        }
      }
    })
  }

  const exportToExcel = () => {
    let csvStr = `Perencanaan Pengadaan & Balancing Stok - Periode ${selectedYear}\n\n`;
    
    // Rencana Produksi
    csvStr += `RENCANA PRODUKSI\n`;
    csvStr += `No,Jenis Produk,Satuan,${MONTHS.join(',')},Total Kebutuhan\n`;
    products.forEach((p, i) => {
        const targs = periodKeys.map(k => (targets[p.slug] || {})[k] || 0);
        const total = targs.reduce((a,b)=>a+b,0);
        const satuanDisplay = p.name.toLowerCase().includes('cair') ? 'L' : 'Kg';
        csvStr += `${i+1},${p.name},${satuanDisplay},${targs.join(',')},${total}\n`;
    });
    
    csvStr += `\Rencana Pengadaan\n`;
    csvStr += `No,Nama Barang,Satuan,Total Kebutuhan (4 Bln),Stok Akhir,Avg Konsumsi,Prognosa Sisa Stock,${FULL_MONTHS.join(',')}\n`;
    materialForecasts.forEach((mat, i) => {
        const monthValues = FULL_MONTHS.map((m, idx) => mat.stokExisting - (mat.avgPerMonth * (idx + 1)));
        csvStr += `${i+1},${mat.nama},${mat.satuan},${mat.totalKebutuhan},${mat.stokExisting},${mat.avgPerMonth},${mat.prognosaAkhir},${monthValues.join(',')}\n`;
    });

    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `perencanaan_pengadaan_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }



  // Calculate material totals
  const materialForecasts = useMemo(() => {
    return materials.map(mat => {
      let totalKebutuhan = 0
      const monthlyKebutuhan = [0, 0, 0, 0]
      const deps: { slug: string, amount: number, formula: number }[] = []
      const config = materialConfigs[mat.masterItemId] || {}

      mat.usedBySlugs.forEach(slug => {
        const prodTargets = periodKeys.map(k => (targets[slug] || {})[k] || 0)
        const multiplier = 1 // default formula multiplier unneeded
        
        let sumProd = 0
        if (config.customDeps && config.customDeps[slug] !== undefined) {
           sumProd = config.customDeps[slug]
           const avg = sumProd / 4
           monthlyKebutuhan.forEach((_, i) => monthlyKebutuhan[i] += avg)
        } else {
           prodTargets.forEach((t, i) => {
             const req = t * multiplier
             monthlyKebutuhan[i] += req
             sumProd += req
           })
        }

        if (sumProd > 0 || (config.customDeps && config.customDeps[slug] !== undefined)) {
          deps.push({ slug, amount: sumProd, formula: multiplier })
        }
        totalKebutuhan += sumProd
      })

      const stokExisting = config.stokExisting !== undefined ? config.stokExisting : 0
      const satuan = config.satuan || 'Kg'

      const avgPerMonth = totalKebutuhan / MONTHS.length
      const prognosaAkhir = stokExisting - totalKebutuhan

      return {
        ...mat,
        stokExisting,
        satuan,
        totalKebutuhan,
        monthlyKebutuhan,
        avgPerMonth,
        prognosaAkhir,
        deps
      }
    }).sort((a,b) => b.totalKebutuhan - a.totalKebutuhan) // sort desc by need
  }, [materials, targets, periodKeys, MONTHS.length, materialConfigs])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-4">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Perencanaan Pengadaan & Balancing Stok</h1>
          <div className="flex gap-1">
            <button 
              className={`px-5 py-2.5 font-medium text-sm rounded-t-lg transition-colors border-b-2 -mb-[17px] ${activeTab === 'BALANCING' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('BALANCING')}
            >
              Rencana Pengadaan
            </button>
            <button 
              className={`px-5 py-2.5 font-medium text-sm rounded-t-lg transition-colors border-b-2 -mb-[17px] ${activeTab === 'RENCANA' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('RENCANA')}
            >
              Rencana Produksi
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'RENCANA' && (
             <AppButton 
               icon={<SaveIcon size={16} />} 
               loading={isSavingTargets}
               onClick={async () => {
                  setIsSavingTargets(true);
                  const res = await saveProduksiTargets(targets);
                  setIsSavingTargets(false);
                  if (res?.success) alert('Data Rencana Produksi berhasil disimpan!');
                  else alert('Gagal menyimpan: ' + (res?.error || 'Unknown error'));
               }}
             >
               Simpan Rencana
             </AppButton>
          )}
          <AppButton 
            variant="secondary" 
            icon={<FileSpreadsheetIcon size={16} className="text-green-600" />} 
            onClick={exportToExcel}
          >
            Export Excel
          </AppButton>
        </div>
      </div>

      {/* RENCANA PRODUKSI */}
      {activeTab === 'RENCANA' && (
      <section className="bg-white border border-gray-200 overflow-hidden animate-in slide-in-from-right-4 duration-300">
        <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">Rencana Produksi</h2>
             <p className="text-xs text-gray-500 mt-1">Input kuantum produksi per bulan untuk 4 bulan berjalan</p>
           </div>
           <div className="flex items-center overflow-hidden border border-gray-200 bg-white">
             <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 border-r border-gray-200">
               Periode Start
             </div>
             <AppSelect 
               value={selectedMonth.toString()} 
               onChange={e => handlePeriodChange(parseInt(e.target.value), selectedYear)}
               options={MONTH_NAMES.map((m, i) => ({ value: (i + 1).toString(), label: m }))}
               variant="sharp"
               className="border-none py-1.5"
             />
             <div className="h-full w-px bg-gray-200"></div>
             <input 
               type="number" 
               value={selectedYear}
               onChange={e => handlePeriodChange(selectedMonth, parseInt(e.target.value))}
               className="w-20 bg-white px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-0 text-gray-700 h-full border-none"
             />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-gray-700 w-16">No</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-700">Jenis Produk</th>
                <th className="px-5 py-3 text-center font-semibold text-gray-700">Satuan</th>
                {MONTHS.map(m => (
                  <th key={m} className="px-5 py-3 text-right font-semibold text-gray-700 w-32">{m}</th>
                ))}
                <th className="px-5 py-3 text-right font-bold text-emerald-700 bg-emerald-50/50">Total Kebutuhan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {products.map((p, i) => {
                 const targs = periodKeys.map(k => (targets[p.slug] || {})[k] || 0)
                 const total = targs.reduce((a,b)=>a+b,0)
                 const satuanDisplay = p.name.toLowerCase().includes('cair') ? 'L' : 'Kg'
                 return (
                   <tr key={p.slug} className="hover:bg-gray-50 transition-colors">
                     <td className="px-5 py-3 text-gray-500">{i+1}</td>
                     <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                     <td className="px-5 py-3 text-center text-gray-500 text-xs">
                        <span className="px-2 py-1 bg-gray-100 rounded border border-gray-200">{satuanDisplay}</span>
                     </td>
                     {periodKeys.map((k, idx) => (
                       <td key={idx} className="px-3 py-2 text-right">
                         <input 
                           type="number"
                           min="0"
                           value={(targets[p.slug] || {})[k] || ''}
                           onChange={(e) => handleTargetChange(p.slug, k, e.target.value)}
                           className="w-full p-2 border border-emerald-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right bg-emerald-50/30 hover:bg-emerald-50/80 transition-colors font-medium text-emerald-900"
                           placeholder="0"
                         />
                       </td>
                     ))}
                     <td className="px-5 py-3 text-right font-bold text-emerald-700 bg-emerald-50/30">
                        {total.toLocaleString('id-ID')}
                     </td>
                   </tr>
                 )
               })}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* BALANCING STOK */}
      {activeTab === 'BALANCING' && (() => {
      const displayedMonths = FULL_MONTHS.slice(0, visibleMonthsCount);
      return (
      <section className="bg-white border border-gray-200 overflow-hidden animate-in slide-in-from-left-4 duration-300">
        <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">Rencana Pengadaan</h2>
             <p className="text-xs text-gray-500 mt-1">Simulasi sisa stok berdasarkan konsumsi bulanan.</p>
           </div>
           <div className="flex items-center shadow-sm rounded-md overflow-hidden border border-gray-200 bg-white">
             <div className="px-3 py-1.5 bg-gray-50 text-[11px] uppercase tracking-wide font-bold text-gray-500 border-r border-gray-200">
               Rentang Bulan
             </div>
             <input 
               type="number"
               min="1"
               max="12"
               value={visibleMonthsCount}
               onChange={e => {
                  let v = parseInt(e.target.value);
                  if (isNaN(v)) v = 1;
                  if (v < 1) v = 1;
                  if (v > 12) v = 12;
                  setVisibleMonthsCount(v);
               }}
               className="w-16 px-2 py-1.5 text-center text-sm font-semibold text-gray-800 border-none focus:ring-0 focus:outline-none"
             />
             <div className="px-3 py-1.5 bg-gray-50 text-[11px] font-semibold text-gray-400 border-l border-gray-200">
               Bulan
             </div>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 w-16">Aksi</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-700 w-16">No</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-700">Nama Barang</th>
                <th className="px-5 py-3 text-center font-semibold text-gray-700">Satuan</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-700">Jenis Produk</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700 border-r border-gray-200">Kebutuhan Produk</th>
                <th className="px-5 py-3 text-right font-bold text-gray-700 bg-gray-50 border-r border-gray-200">Total Kebutuhan</th>
                <th className="px-5 py-3 text-right font-semibold text-amber-700 bg-amber-50 border-r border-amber-100">Stock Existing Akhir<br/></th>
                <th className="px-5 py-3 text-right font-semibold text-emerald-700 bg-emerald-50 border-r border-gray-200">Avg Konsumsi<br/><span className="text-[10px] font-normal text-emerald-600">Per Bulan</span></th>
                <th className="px-5 py-3 text-right font-semibold text-cyan-700 bg-cyan-50">Prognosa Sisa Stock<br/><span className="text-[10px] font-normal text-cyan-600">Bln ke-4</span></th>
                {displayedMonths.map(m => (
                  <th key={m} className={`px-4 py-3 text-right text-xs font-semibold text-gray-500 w-24 border-l border-gray-200`}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {materialForecasts.length > 0 ? materialForecasts.map((mat, i) => {
                 let runOutMonthIdx = -1;
                 const monthValues = FULL_MONTHS.map((m, idx) => {
                    let projected = mat.stokExisting - (mat.avgPerMonth * (idx + 1));
                    if (projected <= 0 && runOutMonthIdx === -1 && mat.avgPerMonth > 0) {
                        runOutMonthIdx = idx;
                    }
                    return projected;
                 });
                 
                 return (
                   <tr key={mat.masterItemId} className="hover:bg-gray-50 transition-colors">
                     <td className="px-5 py-3 text-center border-r border-gray-200">
                        <button
                           onClick={() => setSetupMatId(mat.masterItemId)}
                           className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded transition-colors"
                        >
                           <SettingsIcon size={14} /> Setup
                        </button>
                     </td>
                     <td className="px-5 py-3 text-gray-500">{i+1}</td>
                     <td className="px-5 py-3 font-medium text-gray-900">{mat.nama}</td>
                     <td className="px-5 py-3 text-center text-gray-500 text-xs">
                        <span className="px-2 py-1 bg-gray-100 rounded border border-gray-200">{mat.satuan}</span>
                     </td>
                     <td className="px-5 py-3 align-top">
                        <div className="flex flex-col gap-1.5 w-full">
                           {mat.deps.length > 0 ? mat.deps.map((d, dIdx) => {
                             const pName = products.find(p => p.slug === d.slug)?.name || d.slug
                             return (
                               <div key={dIdx} className="text-[12px] font-medium text-gray-700 truncate" title={pName}>
                                 {pName}
                               </div>
                             )
                           }) : (
                             <span className="text-gray-400 text-xs italic">Belum ada pemakaian</span>
                           )}
                        </div>
                     </td>
                     <td className="px-5 py-3 align-top border-r border-gray-200">
                        <div className="flex flex-col gap-1.5 items-end w-full">
                           {mat.deps.length > 0 ? mat.deps.map((d, dIdx) => (
                               <div key={dIdx} className="text-[12px] text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded outline outline-1 outline-gray-200 min-w-[50px] text-center">
                                 {d.amount.toLocaleString('id-ID', {maximumFractionDigits: 1})}
                               </div>
                           )) : null}
                        </div>
                     </td>
                     <td className="px-5 py-3 text-right font-bold text-gray-900 bg-gray-50 border-r border-gray-200">
                        {mat.totalKebutuhan > 0 ? mat.totalKebutuhan.toLocaleString('id-ID', {maximumFractionDigits: 1}) : '-'}
                     </td>
                     <td className="px-5 py-3 text-right font-medium text-amber-700 bg-amber-50/50 border-r border-amber-100">
                        {mat.stokExisting.toLocaleString('id-ID', {maximumFractionDigits: 1})}
                     </td>
                     <td className="px-5 py-3 text-right font-bold text-emerald-700 bg-emerald-50/50 border-r border-gray-200">
                        {mat.avgPerMonth > 0 ? mat.avgPerMonth.toLocaleString('id-ID', {maximumFractionDigits: 1}) : '-'}
                     </td>
                     <td className="px-5 py-3 text-right font-bold text-cyan-700 bg-cyan-50/50">
                        {mat.prognosaAkhir.toLocaleString('id-ID', {maximumFractionDigits: 1})}
                     </td>
                     {displayedMonths.map(m => {
                        const originalIdx = FULL_MONTHS.indexOf(m);
                        const val = monthValues[originalIdx];
                        const isRunOut = originalIdx === runOutMonthIdx;
                        return (
                           <td key={m} className={`px-4 py-3 text-right align-top border-l border-gray-200 ${val <= 0 ? 'bg-red-50/30' : ''}`}>
                             <div className="flex flex-col items-end gap-1.5">
                               <span className={`text-[13px] ${val <= 0 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                 {val.toLocaleString('id-ID', {maximumFractionDigits: 1})}
                               </span>
                             </div>
                           </td>
                        );
                     })}
                   </tr>
                 )
               }) : (
                 <tr>
                   <td colSpan={22} className="px-5 py-12 text-center text-gray-400">Belum ada bahan baku yang terintegrasi dengan produk.</td>
                 </tr>
               )}
            </tbody>
          </table>
        </div>

        {(() => {
           const runOutNotes: string[] = [];
           materialForecasts.forEach(mat => {
              const runOutMonthIdx = FULL_MONTHS.findIndex((m, idx) => mat.stokExisting - (mat.avgPerMonth * (idx + 1)) <= 0);
              if (runOutMonthIdx !== -1 && mat.avgPerMonth > 0) {
                 runOutNotes.push(`${mat.nama} akan habis di bulan ke-${runOutMonthIdx + 1} (${FULL_MONTHS[runOutMonthIdx]})`);
              }
           });
           
           if (runOutNotes.length === 0) return null;
           
           return (
              <div className="bg-red-50/30 border-t border-red-100 p-4">
                <h4 className="text-xs font-bold text-red-800 mb-2">Informasi Rencana Pengadaan:</h4>
                <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                   {runOutNotes.map((note, i) => (
                     <li key={i}>{note}</li>
                   ))}
                </ul>
              </div>
           );
        })()}

      </section>
      );
      })()}

      {/* SETUP MODAL */}
      {setupMatId !== null && (() => {
         const matToSetup = materialForecasts.find(m => m.masterItemId === setupMatId);
         if (!matToSetup) return null;
         return (
            <SetupModal 
               material={matToSetup}
               products={products}
               currentConfig={materialConfigs[setupMatId]}
               onClose={() => setSetupMatId(null)}
               onSave={async (config: any) => {
                  setMaterialConfigs(prev => ({
                     ...prev,
                     [setupMatId]: config
                  }));
                  setSetupMatId(null);
                  const res = await saveMaterialConfig(setupMatId, config.stokExisting, config.satuan, config.customDeps);
                  if (!res?.success) {
                     alert("Gagal merubah data database: " + (res?.error || 'Unknown Error'));
                  } else {
                     router.refresh();
                  }
               }}
            />
         )
      })()}

    </div>
  )
}
