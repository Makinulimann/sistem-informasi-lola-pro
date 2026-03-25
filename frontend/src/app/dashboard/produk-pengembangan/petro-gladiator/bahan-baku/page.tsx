'use client';
import dynamic from 'next/dynamic';
const BahanBakuPage = dynamic(() => import('@/components/dashboard/BahanBakuPage').then(mod => mod.BahanBakuPage), { ssr: false });

export default function PetroGladiatorBahanBakuPage() {
    return (
        <BahanBakuPage
            productCategory="Produk Pengembangan"
            productName="PetroGladiator"
            productSlug="petro-gladiator"
        />
    );
}
