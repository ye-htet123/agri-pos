import React from 'react';
import type { Product } from '../../types';

interface ProductTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (productId: string) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
    products,
    onEdit,
    onDelete,
}) => {
    return (
        <div className="overflow-x-auto bg-base-100 rounded-xl border border-base-200 shadow-xs">
            <table className="table table-zebra w-full">
                <thead>
                    <tr className="bg-base-200/60 text-gray-700">
                        <th>ပစ္စည်း</th>
                        <th>အမျိုးအစား</th>
                        <th className="text-right">ရင်းဈေး</th>
                        <th className="text-right">ရောင်းဈေး</th>
                        <th className="text-center">လက်ကျန် စတော့</th>
                        <th className="text-center">လုပ်ဆောင်ချက်</th>
                    </tr>
                </thead>
                <tbody>
                    {products.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-8 text-gray-400">
                                ပစ္စည်းများ မရှိသေးပါ သို့မဟုတ် ရှာဖွေမှု မတွေ့ရှိပါ။
                            </td>
                        </tr>
                    ) : (
                        products.map((product) => {
                            const isLowStock = product.stock <= 5;
                            const isOutOfStock = product.stock <= 0;

                            return (
                                <tr key={product.id} className="hover">
                                    {/* Product Name & Icon */}
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl select-none">
                                                {product.image || '🌱'}
                                            </span>
                                            <div>
                                                <div className="font-bold text-sm">{product.name}</div>
                                                <div className="text-xs text-gray-400">
                                                    ID: {product.id}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Category */}
                                    <td>
                                        <span className="badge badge-sm badge-ghost">
                                            {product.category}
                                        </span>
                                    </td>

                                    {/* Cost Price */}
                                    <td className="text-right font-medium text-gray-500">
                                        {(product.costPrice || 0).toLocaleString()} ကျပ်
                                    </td>

                                    {/* Selling Price */}
                                    <td className="text-right font-bold text-success">
                                        {product.price.toLocaleString()} ကျပ်
                                    </td>

                                    {/* Stock Level */}
                                    <td className="text-center">
                                        <span
                                            className={`badge badge-sm font-semibold ${isOutOfStock
                                                ? 'badge-error text-white'
                                                : isLowStock
                                                    ? 'badge-warning text-gray-800'
                                                    : 'badge-success text-white'
                                                }`}
                                        >
                                            {product.stock} {product.unit}
                                        </span>
                                    </td>

                                    {/* Action Buttons */}
                                    <td className="text-center">
                                        <div className="flex justify-center gap-1">
                                            <button
                                                onClick={() => onEdit(product)}
                                                className="btn btn-ghost btn-xs text-info"
                                                title="ပြင်ဆင်မည်"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            `"${product.name}" ကို ဖျက်ရန် သေချာပါသလား?`
                                                        )
                                                    ) {
                                                        onDelete(product.id);
                                                    }
                                                }}
                                                className="btn btn-ghost btn-xs text-error"
                                                title="ဖျက်မည်"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};