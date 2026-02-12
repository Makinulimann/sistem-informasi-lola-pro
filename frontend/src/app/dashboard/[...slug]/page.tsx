interface PageProps {
    params: Promise<{ slug: string[] }>;
}

export default async function CatchAllPage({ params }: PageProps) {
    const { slug } = await params;
    const breadcrumb = slug.map((s) =>
        s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );

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
