import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { AddProductModal } from '../components/inventory/AddProductModal';
import type { Product } from '../types';

const CATEGORIES = ['ဓာတ်မြေဩဇာ', 'ပိုးသတ်ဆေး', 'မျိုးစေ့', 'စိုက်ပျိုးရေးသုံးကိရိယာ', 'အထွေထွေ', 'အခြား'];

export const InventoryPage: React.FC = () => {
    const { products, isLoading, error, refreshProducts, addProduct, updateProduct, deleteProduct } = useProducts();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    const lowStockCount = products.filter((p) => p.stock <= 10).length;

    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        await deleteProduct(id);
        setDeleteConfirmId(null);
    };

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-base-100 p-4 rounded-xl border border-base-200">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        📦 စတော့ ပစ္စည်းများ စီမံခန့်ခွဲမှု
                    </h1>
                    <p className="text-xs text-base-content/50 mt-1">
                        ပစ္စည်း {products.length} မျိုး
                        {lowStockCount > 0 && (
                            <span className="ml-2 badge badge-warning badge-xs font-semibold">
                                ⚠️ လက်ကျန် နည်းနေ {lowStockCount} မျိုး
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={refreshProducts} className="btn btn-ghost btn-sm" title="refresh">
                        🔄
                    </button>
                    <button onClick={handleOpenAddModal} className="btn btn-success btn-sm text-white gap-2">
                        ➕ ပစ္စည်းအသစ်ထည့်မည်
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="alert alert-error text-white text-sm py-2 px-4 rounded-xl">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="form-control flex-1">
                    <input
                        type="text"
                        placeholder="🔍 ပစ္စည်းအမည်ဖြင့် ရှာဖွေပါ..."
                        className="input input-bordered input-sm w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <select
                    className="select select-bordered select-sm w-full sm:w-52"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="All">အမျိုးအစား အားလုံး</option>
                    {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* Product Table */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20 bg-base-100 rounded-xl border border-base-200">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                    <span className="ml-3 text-sm text-base-content/40">ပစ္စည်းစာရင်း ရယူနေပါသည်...</span>
                </div>
            ) : (
                <div className="bg-base-100 rounded-xl border border-base-200 overflow-hidden">
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-16 text-base-content/40">
                            <div className="text-4xl mb-2">📭</div>
                            <p className="text-sm">{searchQuery || selectedCategory !== 'All' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်း မတွေ့ရှိပါ' : 'ပစ္စည်းစာရင်း မရှိသေးပါ'}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                    <tr className="bg-base-200/50 text-base-content/60 text-sm">
                                        <th>ပစ္စည်းအမည်</th>
                                        <th>အမျိုးအစား</th>
                                        <th className="text-right">ရင်းဈေး</th>
                                        <th className="text-right">ရောင်းဈေး</th>
                                        <th className="text-center">လက်ကျန်</th>
                                        <th className="text-right">လုပ်ဆောင်ချက်</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className={`hover:bg-base-200/30 ${product.stock <= 5 ? 'bg-red-50/40' : product.stock <= 10 ? 'bg-yellow-50/40' : ''}`}>
                                            <td className="font-semibold">
                                                <span className="mr-2">{product.image || '📦'}</span>
                                                {product.name}
                                            </td>
                                            <td>
                                                <span className="badge badge-ghost badge-sm">{product.category}</span>
                                            </td>
                                            <td className="text-right text-xs text-base-content/50">
                                                {product.costPrice?.toLocaleString() || 0} ကျပ်
                                            </td>
                                            <td className="text-right font-bold text-green-700">
                                                {product.price?.toLocaleString()} ကျပ်
                                            </td>
                                            <td className="text-center">
                                                <span className={`font-bold text-sm ${product.stock <= 5 ? 'text-error' : product.stock <= 10 ? 'text-warning' : 'text-base-content/70'}`}>
                                                    {product.stock}
                                                </span>
                                                <span className="text-xs text-base-content/40 ml-1">{product.unit}</span>
                                            </td>
                                            <td className="text-right space-x-1">
                                                <button
                                                    onClick={() => handleOpenEditModal(product)}
                                                    className="btn btn-ghost btn-xs text-info"
                                                >✏️ ပြင်</button>
                                                {deleteConfirmId === product.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleDelete(product.id)}
                                                            className="btn btn-error btn-xs text-white"
                                                        >✔ သေချာ</button>
                                                        <button
                                                            onClick={() => setDeleteConfirmId(null)}
                                                            className="btn btn-ghost btn-xs"
                                                        >မဖျက်</button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirmId(product.id)}
                                                        className="btn btn-ghost btn-xs text-error"
                                                    >🗑️ ဖျက်</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Add / Edit Modal */}
            <AddProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={editingProduct ? (d) => updateProduct(editingProduct.id, d) : addProduct}
                editingProduct={editingProduct}
            />
        </div>
    );
};