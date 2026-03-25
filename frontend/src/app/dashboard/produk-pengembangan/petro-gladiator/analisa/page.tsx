import dynamic from 'next/dynamic';
const AnalisaPage = dynamic(() => import('@/components/dashboard/AnalisaPage').then(mod => mod.AnalisaPage), { ssr: false });

export default function PetroGladiatorAnalisaPage() {
    return (
        <AnalisaPage
            productCategory="Produk Pengembangan"
            productName="PetroGladiator"
            productSlug="petro-gladiator"
        />
    );
}
