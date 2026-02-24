'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CategoryDashboardPage } from '@/components/dashboard/CategoryDashboardPage';

/* ─── Types ─── */
interface CategoryInfo {
    slug: string;
    label: string;
    icon: string;
    productCount: number;
}

/* ─── Icons ─── */
function FlaskIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3h6" /><path d="M10 9V3" /><path d="M14 9V3" />
            <path d="M6.864 18.364 10 9h4l3.136 9.364a2 2 0 0 1-1.894 2.636H8.758a2 2 0 0 1-1.894-2.636Z" />
        </svg>
    );
}
function PackageIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 9.4L7.5 4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" />
        </svg>
    );
}
function LayersIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
        </svg>
    );
}

const iconMap: Record<string, React.ReactNode> = {
    flask: <FlaskIcon />,
    package: <PackageIcon />,
    layers: <LayersIcon />,
};

export default function DashboardPage() {
    const [categories, setCategories] = useState<CategoryInfo[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<CategoryInfo[]>('/dashboard/categories')
            .then(cats => {
                setCategories(cats);
                if (cats.length > 0) setActiveCategory(cats[0].slug);
            })
            .catch(err => console.error('Failed to load categories:', err))
            .finally(() => setLoading(false));
    }, []);

    const activeCat = categories.find(c => c.slug === activeCategory);

    return (
        <div className="space-y-6">
            {/* ── Page Header ── */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Sistem Informasi Pengelolaan Produk</p>
            </div>

            {/* ── Category Tabs ── */}
            {loading ? (
                <div className="flex items-center gap-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 w-48 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => {
                        const isActive = cat.slug === activeCategory;
                        return (
                            <button
                                key={cat.slug}
                                onClick={() => setActiveCategory(cat.slug)}
                                className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border
                                    ${isActive
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                            >
                                <span className={`transition-colors ${isActive ? 'text-emerald-100' : 'text-gray-400 group-hover:text-emerald-500'}`}>
                                    {iconMap[cat.icon] || <PackageIcon />}
                                </span>
                                <span>{cat.label}</span>
                                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-md font-semibold
                                    ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    {cat.productCount}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Category Content ── */}
            {activeCategory && activeCat && (
                <CategoryDashboardPage
                    key={activeCategory}
                    categorySlug={activeCategory}
                    categoryName={activeCat.label}
                />
            )}

            {/* ── Empty state ── */}
            {!loading && categories.length === 0 && (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center text-gray-400">
                        <PackageIcon />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-1">Tidak Ada Kategori</h3>
                    <p className="text-sm text-gray-400">Belum ada kategori produk yang dikonfigurasi.</p>
                </div>
            )}
        </div>
    );
}
