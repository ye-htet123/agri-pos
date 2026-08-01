import React, { useState, useEffect } from 'react';
import type { Product } from '../../types';
import { useCategory } from '../../context/CategoryContext';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productData: Omit<Product, 'id'>) => void;
    editingProduct?: Product | null;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingProduct,
}) => {
    const { categories } = useCategory();
    const defaultCategoryName = categories[0]?.name || 'ဓာတ်မြေဩဇာ';

    const [formData, setFormData] = useState({
        name: '',
        category: defaultCategoryName,
        price: 0,
        costPrice: 0,
        stock: 0,
        unit: 'အိတ်',
        image: '🌱',
    });

    useEffect(() => {
        if (editingProduct) {
            setFormData({
                name: editingProduct.name,
                category: editingProduct.category,
                price: editingProduct.price,
                costPrice: editingProduct.costPrice || 0,
                stock: editingProduct.stock,
                unit: editingProduct.unit,
                image: editingProduct.image || '🌱',
            });
        } else {
            setFormData({
                name: '',
                category: defaultCategoryName,
                price: 0,
                costPrice: 0,
                stock: 0,
                unit: 'အိတ်',
                image: '🌱',
            });
        }
    }, [editingProduct, isOpen, defaultCategoryName]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        onSave(formData);
        onClose();
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-md">
                <h3 className="font-bold text-lg mb-4">
                    {editingProduct ? '📝 ပစ္စည်းအချက်အလက် ပြင်ဆင်ရန်' : '➕ ပစ္စည်းအသစ် ထည့်သွင်းရန်'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Product Name */}
                    <div className="form-control">
                        <label className="label text-xs font-semibold">ပစ္စည်းအမည်</label>
                        <input
                            type="text"
                            required
                            placeholder="ဥပမာ - ယူရီးယား ဓာတ်မြေဩဇာ"
                            className="input input-bordered input-sm w-full"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {/* Category & Icon */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="form-control">
                            <label className="label text-xs font-semibold">အမျိုးအစား</label>
                            <select
                                className="select select-bordered select-sm w-full"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                {categories.map((cat) => (
                                    <option key={cat.id || cat.name} value={cat.name}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label text-xs font-semibold">အိုင်ကွန် (Emoji)</label>
                            <input
                                type="text"
                                placeholder="🌱"
                                className="input input-bordered input-sm w-full text-center"
                                value={formData.image}
                                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Cost Price & Selling Price */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="form-control">
                            <label className="label text-xs font-semibold">ရင်းဈေး (ကျပ်)</label>
                            <input
                                type="number"
                                min="0"
                                required
                                className="input input-bordered input-sm w-full"
                                value={formData.costPrice}
                                onChange={(e) =>
                                    setFormData({ ...formData, costPrice: Number(e.target.value) })
                                }
                            />
                        </div>

                        <div className="form-control">
                            <label className="label text-xs font-semibold">ရောင်းဈေး (ကျပ်)</label>
                            <input
                                type="number"
                                min="0"
                                required
                                className="input input-bordered input-sm w-full"
                                value={formData.price}
                                onChange={(e) =>
                                    setFormData({ ...formData, price: Number(e.target.value) })
                                }
                            />
                        </div>
                    </div>

                    {/* Stock & Unit */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="form-control">
                            <label className="label text-xs font-semibold">လက်ကျန် အရေအတွက်</label>
                            <input
                                type="number"
                                min="0"
                                required
                                className="input input-bordered input-sm w-full"
                                value={formData.stock}
                                onChange={(e) =>
                                    setFormData({ ...formData, stock: Number(e.target.value) })
                                }
                            />
                        </div>

                        <div className="form-control">
                            <label className="label text-xs font-semibold">ရေတွက်ပုံ ရေတွက်နည်း</label>
                            <input
                                type="text"
                                required
                                placeholder="အိတ် / ဗူး / ထုပ်"
                                className="input input-bordered input-sm w-full"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="modal-action pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-ghost btn-sm"
                        >
                            မလုပ်တော့ပါ
                        </button>
                        <button type="submit" className="btn btn-success btn-sm text-white">
                            {editingProduct ? 'ပြင်ဆင်မှု သိမ်းမည်' : 'သိမ်းဆည်းမည်'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};