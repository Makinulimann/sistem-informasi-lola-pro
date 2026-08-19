export interface NavSubItem {
    label: string;
    href: string;
}

export interface NavChild {
    label: string;
    href?: string;
    children?: NavSubItem[];
}

export interface NavSection {
    label: string;
    icon: string;
    href?: string;
    children?: NavChild[];
    roleAccess?: string;
}

const subItems = (basePath: string): NavSubItem[] => [
    { label: 'Produksi', href: `${basePath}/produksi` },
    { label: 'Analisa', href: `${basePath}/analisa` },
];

export const navigation: NavSection[] = [
    {
        label: 'Dashboard',
        icon: 'dashboard',
        href: '/dashboard',
    },
    {
        label: 'Analisa',
        icon: 'flask',
        href: '/dashboard/analisa',
        roleAccess: 'Riset',
    },
    {
        label: 'Portal Admin',
        icon: 'users',
        roleAccess: 'Admin',
        children: [
            { label: 'Manajemen User', href: '/dashboard/admin/users' },
            { label: 'Manajemen Produk', href: '/dashboard/admin/products' },
            { label: 'Manajemen Sidebar', href: '/dashboard/admin/sidebar' },
        ]
    },
    {
        label: 'Produk Pengembangan',
        icon: 'flask',
        children: [
            { label: 'Bahan Baku', href: '/dashboard/produk-pengembangan/bahan-baku' },
            { label: 'PetroGladiator', children: subItems('/dashboard/produk-pengembangan/petro-gladiator') },
            { label: 'BioFertil', children: subItems('/dashboard/produk-pengembangan/bio-fertil') },
            { label: 'PetroFish', children: subItems('/dashboard/produk-pengembangan/petro-fish') },
            { label: 'Phonska Oca', children: subItems('/dashboard/produk-pengembangan/phonska-oca') },
            { label: 'Monitoring Harian', href: '/dashboard/produk-pengembangan/monitoring-harian' },
            { label: 'Aktivitas Harian', href: '/dashboard/produk-pengembangan/aktivitas-harian' },
            { label: 'Maintenance', href: '/dashboard/produk-pengembangan/maintenance' },
            { label: 'RKAP / RKO', href: '/dashboard/rkap' },
            { label: 'Template Laporan', href: '/dashboard/produk-pengembangan/template-laporan' },
        ],
    },
];
