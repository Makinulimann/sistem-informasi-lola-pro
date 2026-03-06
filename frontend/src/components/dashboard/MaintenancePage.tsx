import React from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card/Card';

export function MaintenancePage({
    productCategory,
}: {
    productCategory: string;
}) {
    return (
        <div className="p-6 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">{productCategory}</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Maintenance</span>
            </div>

            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {productCategory} / Maintenance
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Pengelolaan Maintenance operasional
                    </p>
                </div>
            </div>

            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100 dark:border-slate-800 pb-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Data Maintenance
                    </h2>
                </CardHeader>
                <CardBody className="pt-6">
                    <div className="flex items-center justify-center p-12 text-gray-500">
                        <p>Halaman Maintenance sedang dalam pengembangan.</p>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
