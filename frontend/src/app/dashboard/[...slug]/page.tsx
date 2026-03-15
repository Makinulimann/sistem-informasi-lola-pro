'use client';

export const runtime = 'edge';


import { use } from 'react';
import { BahanBakuPage } from '@/components/dashboard/BahanBakuPage';
import { ProduksiPage } from '@/components/dashboard/ProduksiPage';
import { AnalisaPage } from '@/components/dashboard/AnalisaPage';
import { RKAPPage } from '@/components/dashboard/RKAPPage';
import { CategoryDashboardPage } from '@/components/dashboard/CategoryDashboardPage';

interface PageProps {
    params: Promise<{ slug: string[] }>;
}

// Map of known page types to their components
const PAGE_COMPONENT_MAP: Record<string, React.ComponentType<{ productCategory: string; productName: string; productSlug: string }>> = {
    'bahan-baku': BahanBakuPage,
    'produksi': ProduksiPage,
    'analisa': AnalisaPage,
    'rkap': RKAPPage,
};

// Known category slugs
const CATEGORY_SLUGS = [
    'produk-pengembangan',
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

    // Dedicated placeholder routing conditions removed, RKAPPage handled standardly by generic slug check


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

