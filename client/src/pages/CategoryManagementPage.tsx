import React, { useState } from 'react';
import { useCategory } from '../context/CategoryContext';
import type { CategoryItem } from '../types';

export const CategoryManagementPage: React.FC = () => {
    const { categories, isLoading, error, fetchCategories, addCategory, updateCategory, deleteCategory } = useCategory();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete confirm modal state
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Search query state
    const [searchQuery, setSearchQuery] = useState('');

    const openAddModal = () => {
        setEditingCategory(null);
        setName('');
        setDescription('');
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (cat: CategoryItem) => {
        setEditingCategory(cat);
        setName(cat.name);
        setDescription(cat.description || '');
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setFormError('အမျိုးအစား အမည် ဖြည့်သွင်းပါ');
            return;
        }

        setIsSubmitting(true);
        setFormError(null);
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, { name: name.trim(), description: description.trim() });
            } else {
                await addCategory({ name: name.trim(), description: description.trim() });
            }
            setIsModalOpen(false);
        } catch (err: any) {
            setFormError(err.message || 'လုပ်ဆောင်မှု မအောင်မြင်ပါ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await deleteCategory(id);
            setDeletingId(null);
        } catch (err: any) {
            setDeleteError(err.message || 'ဖျက်ဆီး၍ မရပါ');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredCategories = categories.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-5 rounded-2xl border border-base-200 shadow-xs">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        🏷️ ပစ္စည်း အမျိုးအစား စီမံခန့်ခွဲမှု (Categories)
                    </h1>
                    <p className="text-xs text-base-content/60 mt-1">
                        စိုက်ပျိုးရေး ပစ္စည်း အမျိုးအစားများကို ထည့်သွင်း၊ ပြင်ဆင်၊ ဖျက်ဆီးနိုင်ပါသည်။
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchCategories}
                        className="btn btn-sm btn-ghost border-base-300"
                        title="ပြန်လည်ရယူမည်"
                    >
                        🔄 ပြန်ယူမည်
                    </button>
                    <button
                        onClick={openAddModal}
                        className="btn btn-sm btn-success text-white font-semibold"
                    >
                        ➕ အမျိုးအစား အသစ်ထည့်မည်
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="alert alert-error text-sm font-semibold shadow-xs">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* Search and Table Container */}
            <div className="bg-base-100 rounded-2xl border border-base-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-base-200">
                    <input
                        type="text"
                        placeholder="🔍 အမျိုးအစား အမည်ဖြင့် ရှာဖွေရန်..."
                        className="input input-bordered input-sm w-full max-w-xs"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full text-sm">
                        <thead>
                            <tr className="bg-base-200/50 text-base-content/70">
                                <th>#</th>
                                <th>အမျိုးအစား အမည်</th>
                                <th>အသေးစိတ် ဖော်ပြချက်</th>
                                <th>အခြေအနေ</th>
                                <th className="text-right">လုပ်ဆောင်ချက်</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-base-content/60">
                                        <span className="loading loading-spinner loading-md text-success"></span>
                                        <p className="mt-2 text-xs">အချက်အလက်များ ရယူနေပါသည်...</p>
                                    </td>
                                </tr>
                            ) : filteredCategories.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-base-content/50">
                                        အမျိုးအစားများ မရှိသေးပါ သို့မဟုတ် ရှာဖွေမှု မတွေ့ရှိပါ။
                                    </td>
                                </tr>
                            ) : (
                                filteredCategories.map((cat, idx) => (
                                    <tr key={cat.id} className="hover:bg-base-200/30">
                                        <td className="font-mono text-xs text-base-content/60">{idx + 1}</td>
                                        <td>
                                            <span className="font-bold text-base-content">{cat.name}</span>
                                        </td>
                                        <td className="text-base-content/70 text-xs">
                                            {cat.description || '-'}
                                        </td>
                                        <td>
                                            <span className="badge badge-success badge-sm text-white font-medium">
                                                အသုံးပြုနိုင်သည်
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEditModal(cat)}
                                                    className="btn btn-ghost btn-xs text-info hover:bg-info/10"
                                                    title="ပြင်ဆင်မည်"
                                                >
                                                    ✏️ ပြင်မည်
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDeletingId(cat.id);
                                                        setDeleteError(null);
                                                    }}
                                                    className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                                    title="ဖျက်မည်"
                                                >
                                                    🗑️ ဖျက်မည်
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Category Modal */}
            {isModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-md">
                        <h3 className="font-bold text-lg mb-4">
                            {editingCategory ? '📝 အမျိုးအစား ပြင်ဆင်ရန်' : '➕ အမျိုးအစား အသစ်ထည့်ရန်'}
                        </h3>

                        {formError && (
                            <div className="alert alert-error text-xs font-semibold mb-3 py-2">
                                <span>⚠️ {formError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="form-control">
                                <label className="label text-xs font-semibold">အမျိုးအစား အမည် *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="ဥပမာ - ရွက်ဖျန်းမြေသြဇာ"
                                    className="input input-bordered input-sm w-full"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label text-xs font-semibold">အသေးစိတ် ဖော်ပြချက် (Optional)</label>
                                <textarea
                                    placeholder="အမျိုးအစား အကြောင်း ဖော်ပြချက်..."
                                    className="textarea textarea-bordered textarea-sm w-full h-20"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="modal-action pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn btn-ghost btn-sm"
                                    disabled={isSubmitting}
                                >
                                    မလုပ်တော့ပါ
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-success btn-sm text-white font-semibold"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-xs"></span>
                                            သိမ်းဆည်းနေသည်...
                                        </>
                                    ) : editingCategory ? (
                                        'ပြင်ဆင်မှု သိမ်းမည်'
                                    ) : (
                                        'သိမ်းဆည်းမည်'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
                </div>
            )}

            {/* Inline Delete Confirmation Modal */}
            {deletingId && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-sm text-center">
                        <div className="text-4xl mb-2">⚠️</div>
                        <h3 className="font-bold text-base mb-2">အမျိုးအစား ဖျက်ရန် သေချာပါသလား။</h3>
                        <p className="text-xs text-base-content/60 mb-4">
                            ဒီ အမျိုးအစားကို ပယ်ဖျက်လိုက်ပါက ပြန်လည် ရယူနိုင်မည် မဟုတ်ပါ။
                        </p>

                        {deleteError && (
                            <div className="alert alert-error text-xs font-semibold mb-4 py-2 text-left">
                                <span>⚠️ {deleteError}</span>
                            </div>
                        )}

                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setDeletingId(null)}
                                className="btn btn-ghost btn-sm"
                                disabled={isDeleting}
                            >
                                မဖျက်တော့ပါ
                            </button>
                            <button
                                onClick={() => handleDelete(deletingId)}
                                className="btn btn-error btn-sm text-white font-semibold"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="loading loading-spinner loading-xs"></span>
                                        ဖျက်နေသည်...
                                    </>
                                ) : (
                                    'သေချာသည် ဖျက်မည်'
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={() => !isDeleting && setDeletingId(null)}></div>
                </div>
            )}
        </div>
    );
};
