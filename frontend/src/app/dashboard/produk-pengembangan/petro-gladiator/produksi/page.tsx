import dynamic from 'next/dynamic';
const ProduksiPage = dynamic(() => import('@/components/dashboard/ProduksiPage').then(mod => mod.ProduksiPage), { ssr: false });

export default function PetroGladiatorProduksiPage() {
    return (
        <ProduksiPage
            productCategory="Produk Pengembangan"
            productName="PetroGladiator"
            productSlug="petro-gladiator"
        />
    );
}
