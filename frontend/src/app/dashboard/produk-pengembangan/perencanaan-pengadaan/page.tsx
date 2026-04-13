import React from 'react'
import { getPerencanaanData } from './actions'
import PerencanaanPengadaanClient from './PerencanaanPengadaanClient'

export const dynamic = 'force-dynamic'

export default async function PerencanaanPengadaanPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const month = params.month ? parseInt(params.month) : undefined
  const year = params.year ? parseInt(params.year) : undefined

  const result = await getPerencanaanData(month, year)

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Gagal Memuat Data</h2>
        <p className="text-gray-500 mb-4">{result.error}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <PerencanaanPengadaanClient 
        products={result.products ?? []} 
        materials={result.materials ?? []} 
        savedConfigs={result.savedConfigs ?? {}}
        savedTargets={result.savedTargets ?? {}}
        initialMonth={month || new Date().getMonth() + 1}
        initialYear={year || new Date().getFullYear()}
      />
    </div>
  )
}

