export default function DashboardPage() {
    return (
        <div>
            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Selamat datang di Sistem Informasi Pengelolaan Produk</p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <StatCard
                    title="Total Produk KP"
                    value="?"
                    subtitle="Aktif"
                    color="emerald"
                />
                <StatCard
                    title="Total Produk KNonP"
                    value="?"
                    subtitle="Aktif"
                    color="amber"
                />
                <StatCard
                    title="Total KPP"
                    value="?"
                    subtitle="Produk"
                    color="teal"
                />
                <StatCard
                    title="RKAP Target"
                    value="0"
                    subtitle="Pencapaian"
                    color="green"
                />
            </div>

            {/* Quick access grid */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Akses Cepat - KPP</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <QuickCard title="PetroGladiator" href="/dashboard/kpp/petro-gladiator/produksi" />
                    <QuickCard title="BioFertil" href="/dashboard/kpp/bio-fertil/produksi" />
                    <QuickCard title="PetroFish" href="/dashboard/kpp/petro-fish/produksi" />
                    <QuickCard title="Phonska Oca" href="/dashboard/kpp/phonska-oca/produksi" />
                </div>
            </div>
        </div>
    );
}

/* ─── Components ─── */

function StatCard({
    title,
    value,
    subtitle,
    color,
}: {
    title: string;
    value: string;
    subtitle: string;
    color: 'emerald' | 'amber' | 'teal' | 'green';
}) {
    const colorMap = {
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        teal: 'bg-teal-50 border-teal-200 text-teal-700',
        green: 'bg-green-50 border-green-200 text-green-700',
    };

    const iconColorMap = {
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        teal: 'bg-teal-500',
        green: 'bg-green-500',
    };

    return (
        <div className={`rounded-xl border p-5 ${colorMap[color]} transition-shadow hover:shadow-md`}>
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium opacity-80">{title}</p>
                <div className={`w-2.5 h-2.5 rounded-full ${iconColorMap[color]}`} />
            </div>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs mt-1 opacity-60">{subtitle}</p>
        </div>
    );
}

function QuickCard({ title, href }: { title: string; href: string }) {
    return (
        <a
            href={href}
            className="group block rounded-xl border border-gray-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all duration-200"
        >
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 3h6" />
                        <path d="M10 9V3" />
                        <path d="M14 9V3" />
                        <path d="M6.864 18.364 10 9h4l3.136 9.364a2 2 0 0 1-1.894 2.636H8.758a2 2 0 0 1-1.894-2.636Z" />
                    </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors">{title}</h3>
            </div>
            <p className="text-xs text-gray-500">Lihat data produksi →</p>
        </a>
    );
}
