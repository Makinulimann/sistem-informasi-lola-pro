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
    { label: 'Bahan Baku', href: `${basePath}/bahan-baku` },
    { label: 'Produksi', href: `${basePath}/produksi` },
    { label: 'Analisa', href: `${basePath}/analisa` },
    { label: 'RKAP', href: `${basePath}/rkap` },
];

export const navigation: NavSection[] = [
    {
        label: 'Dashboard',
        icon: 'dashboard',
        href: '/dashboard',
    },
    {
        label: 'Portal Admin',
        icon: 'users',
        children: [
            { label: 'Manajemen User', href: '/dashboard/admin/users' },
            { label: 'Manajemen Sidebar', href: '/dashboard/admin/sidebar' },
        ]
    },
    {
        label: 'Produk Pengembangan',
        icon: 'flask',
        children: [
            { label: 'PetroGladiator', children: subItems('/dashboard/produk-pengembangan/petro-gladiator') },
            { label: 'BioFertil', children: subItems('/dashboard/produk-pengembangan/bio-fertil') },
            { label: 'PetroFish', children: subItems('/dashboard/produk-pengembangan/petro-fish') },
            { label: 'Phonska Oca', children: subItems('/dashboard/produk-pengembangan/phonska-oca') },
            { label: 'Aktivitas Harian', href: '/dashboard/produk-pengembangan/aktivitas-harian' },
            { label: 'Maintenance', href: '/dashboard/produk-pengembangan/maintenance' },
        ],
    },
];
