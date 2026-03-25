import dynamic from 'next/dynamic';
const AktivitasHarianPage = dynamic(() => import('@/components/dashboard/AktivitasHarianPage').then(mod => mod.AktivitasHarianPage), { ssr: false });

export default function AktivitasHarianRoute() {
    return (
        <AktivitasHarianPage
            productCategory="Produk Pengembangan"
        />
    );
}
