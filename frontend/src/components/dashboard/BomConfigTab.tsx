'use client';

import { useState, useEffect } from 'react';
import { getBOM, saveBOM } from '@/lib/produksiService';
import { api } from '@/lib/api';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';

interface ProductMaterial {
    id: number;
    masterItemId: number;
    nama: string;
    jenis: string;
    satuan: string;
}

interface BomConfigTabProps {
    productSlug: string;
    tabId: number;
    productName: string;
    variantName: string;
    baseUnit: string;
}

export function BomConfigTab({
    productSlug,
    tabId,
    productName,
    variantName,
    baseUnit
}: BomConfigTabProps) {
    const [materials, setMaterials] = useState<ProductMaterial[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [baseQuantity, setBaseQuantity] = useState<string>('1000');
    const [quantities, setQuantities] = useState<Record<number, string>>({}); // keyed by masterItemId
    
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Fetch assigned materials & current BOM config
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setErrorMessage(null);
            setSuccessMessage(null);
            try {
                // 1. Fetch materials assigned to this product
                const materialsData = await api.get<ProductMaterial[]>(`/ProductMaterial/${productSlug}`);
                setMaterials(materialsData);

                // 2. Fetch current BOM config
                const bomConfig = await getBOM(productSlug, tabId);
                if (bomConfig) {
                    setBaseQuantity(String(bomConfig.baseQuantity || '1000'));
                    
                    const qtyMap: Record<number, string> = {};
                    bomConfig.items.forEach(item => {
                        qtyMap[item.materialId] = String(item.quantity || '');
                    });
                    setQuantities(qtyMap);
                }
            } catch (err: any) {
                console.error('Failed to load BOM configuration:', err);
                setErrorMessage('Gagal memuat konfigurasi BOM.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [productSlug, tabId]);

    const handleQuantityChange = (masterItemId: number, value: string) => {
        setQuantities(prev => ({
            ...prev,
            [masterItemId]: value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const parsedBaseQty = parseFloat(baseQuantity);
        if (isNaN(parsedBaseQty) || parsedBaseQty <= 0) {
            setErrorMessage('Jumlah produksi dasar harus lebih dari 0.');
            setSaving(false);
            return;
        }

        try {
            const items = materials.map(mat => {
                const qtyStr = quantities[mat.masterItemId] || '0';
                return {
                    materialId: mat.masterItemId,
                    quantity: parseFloat(qtyStr) || 0
                };
            });

            await saveBOM({
                productSlug,
                tabId,
                baseQuantity: parsedBaseQty,
                items
            });

            setSuccessMessage('Konfigurasi BOM berhasil disimpan.');
        } catch (err: any) {
            console.error('Failed to save BOM:', err);
            setErrorMessage(err.message || 'Gagal menyimpan konfigurasi BOM.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                <span className="ml-3 text-gray-500 text-sm">Memuat data BOM...</span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">Bill of Material (BOM)</h3>
            </div>

            {/* Error or Success Alert */}
            {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                    {errorMessage}
                </div>
            )}
            {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
                    {successMessage}
                </div>
            )}

            {/* Target Production Quantity Input */}
            <div className="max-w-xs">
                <AppInput
                    label="Jumlah Produksi Dasar"
                    type="number"
                    value={baseQuantity}
                    onChange={e => setBaseQuantity(e.target.value)}
                    rightElement={<span className="text-gray-400 text-xs font-semibold pr-2">{baseUnit}</span>}
                    placeholder="1000"
                    className="font-mono font-semibold"
                />
            </div>

            {/* Materials List Table */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-800">Daftar Kebutuhan Bahan</h4>
                {materials.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 border border-dashed">
                        Belum ada material yang ditugaskan untuk produk ini.
                        Silakan atur di tab Konfigurasi Bahan terlebih dahulu.
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-gray-200">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Nama Bahan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 w-48">Kategori</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 w-28">Satuan</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-48">Kuantitas BOM</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {materials.map(mat => {
                                    const value = quantities[mat.masterItemId] || '';
                                    const isBaku = mat.jenis.toLowerCase().includes('baku');
                                    return (
                                        <tr key={mat.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 border-r border-gray-200 font-medium text-gray-850">
                                                {mat.nama}
                                            </td>
                                            <td className="px-4 py-3 border-r border-gray-200">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${isBaku ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                    {isBaku ? 'Bahan Baku' : 'Bahan Penolong'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-gray-500 font-semibold border-r border-gray-200">
                                                {mat.satuan}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2 max-w-[150px] ml-auto">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={value}
                                                        onChange={e => handleQuantityChange(mat.masterItemId, e.target.value)}
                                                        className="w-full text-right px-3 py-1.5 border border-gray-200 text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                        placeholder="0"
                                                    />
                                                    <span className="text-gray-500 text-sm font-semibold w-12 text-left">
                                                        {mat.satuan}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Save Button */}
            <div className="pt-2">
                <AppButton
                    onClick={handleSave}
                    loading={saving}
                    disabled={materials.length === 0}
                    variant="primary"
                    className="shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 px-6 py-2.5 text-sm"
                >
                    Simpan Konfigurasi
                </AppButton>
            </div>
        </div>
    );
}
