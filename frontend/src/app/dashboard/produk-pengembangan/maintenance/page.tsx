import dynamic from 'next/dynamic';
const MaintenancePage = dynamic(() => import('@/components/dashboard/MaintenancePage').then(mod => mod.MaintenancePage), { ssr: false });

export default function MaintenanceRoute() {
    return (
        <MaintenancePage
            productCategory="Produk Pengembangan"
        />
    );
}
