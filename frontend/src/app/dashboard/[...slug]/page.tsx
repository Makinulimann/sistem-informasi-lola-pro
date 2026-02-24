'use client';

import { use } from 'react';
import { BahanBakuPage } from '@/components/dashboard/BahanBakuPage';
import { ProduksiPage } from '@/components/dashboard/ProduksiPage';
import { AnalisaPage } from '@/components/dashboard/AnalisaPage';
import { CategoryDashboardPage } from '@/components/dashboard/CategoryDashboardPage';

interface PageProps {
    params: Promise<{ slug: string[] }>;
}

// Map of known page types to their components
const PAGE_COMPONENT_MAP: Record<string, React.ComponentType<{ productCategory: string; productName: string; productSlug: string }>> = {
    'bahan-baku': BahanBakuPage,
    'produksi': ProduksiPage,
    'analisa': AnalisaPage,
};

// Known category slugs
const CATEGORY_SLUGS = [
    'produk-pengembangan',
    'produk-petroganik',
    'produk-non-petroganik',
];

function titleCase(s: string) {
    return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CatchAllPage({ params }: PageProps) {
    const { slug } = use(params);
    const lastSegment = slug[slug.length - 1];

    // ── Category Dashboard (single segment like "produk-pengembangan") ──
    if (slug.length === 1 && CATEGORY_SLUGS.includes(slug[0])) {
        return (
            <CategoryDashboardPage
                categorySlug={slug[0]}
                categoryName={titleCase(slug[0])}
            />
        );
    }

    // Check if the last segment matches a known page type
    const PageComponent = PAGE_COMPONENT_MAP[lastSegment];

    if (PageComponent && slug.length >= 3) {
        // slug = ["produk-pengembangan", "petro-gladiator", "bahan-baku"]
        // category = slug[0], product = slug[1]
        const productCategory = titleCase(slug[slug.length - 3]);
        const productSlug = slug[slug.length - 2];
        const productName = titleCase(productSlug);

        return <PageComponent productCategory={productCategory} productName={productName} productSlug={productSlug} />;
    }

    // RKAP page — render a dedicated placeholder
    if (lastSegment === 'rkap' && slug.length >= 3) {
        const productCategory = titleCase(slug[slug.length - 3]);
        const productSlug = slug[slug.length - 2];
        const productName = titleCase(productSlug);

        return <RKAPPlaceholder productCategory={productCategory} productName={productName} />;
    }

    // Default: generic placeholder for unknown pages
    const breadcrumb = slug.map(titleCase);

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <span className="text-gray-600 hover:text-emerald-600 cursor-pointer">Dashboard</span>
                {breadcrumb.map((item, i) => (
                    <span key={i} className="flex items-center gap-2">
                        <span>/</span>
                        <span className={i === breadcrumb.length - 1 ? 'text-gray-800 font-medium' : 'text-gray-600'}>
                            {item}
                        </span>
                    </span>
                ))}
            </div>

            {/* Page title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{breadcrumb[breadcrumb.length - 1]}</h1>
            <p className="text-sm text-gray-500 mb-8">
                {breadcrumb.join(' › ')}
            </p>

            {/* Placeholder content */}
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 mx-auto mb-4 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Halaman {breadcrumb[breadcrumb.length - 1]}</h3>
                <p className="text-sm text-gray-400">Konten akan ditambahkan sesuai kebutuhan.</p>
            </div>
        </div>
    );
}

/* ─── RKAP Placeholder ─── */

function RKAPPlaceholder({ productCategory, productName }: { productCategory: string; productName: string }) {
    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">{productCategory}</span>
                <span>/</span>
                <span className="text-gray-500">{productName}</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">RKAP</span>
            </div>

            {/* Page title */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {productCategory} / {productName} / RKAP
                </h1>
                <p className="text-sm text-gray-500 mt-1">Rencana Kerja dan Anggaran Perusahaan</p>
            </div>

            {/* Content placeholder */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-5 py-3">
                    <div className="flex gap-4">
                        {['Ringkasan', 'Detail Anggaran', 'Realisasi'].map((tab, i) => (
                            <button
                                key={tab}
                                className={`px-3 py-2 text-sm font-medium transition-colors relative ${i === 0
                                    ? 'text-emerald-700'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab}
                                {i === 0 && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 mx-auto mb-4 flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">Data RKAP</h3>
                    <p className="text-sm text-gray-400">Konten RKAP akan ditambahkan sesuai kebutuhan.</p>
                </div>
            </div>
        </div>
    );
}
