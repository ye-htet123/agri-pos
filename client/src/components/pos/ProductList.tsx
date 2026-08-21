import React, { useState, useMemo } from 'react';
import { useProducts } from '../../context/ProductContext';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { ProductCard } from './ProductCard';

export const ProductList: React.FC = () => {
    const { products } = useProducts();
    const { addToCart } = useCart();
    const { t } = useLanguage();

    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const categories = ['All', 'မြေသြဇာ', 'ဓာတ်မြေဩဇာ', 'ပိုးသတ်ဆေး', 'မျိုးစေ့', 'စိုက်ပျိုးရေးသုံးကိရိယာ', 'အထွေထွေ', 'အခြား'];

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [products, selectedCategory, searchQuery]);

    return (
        <div className="space-y-4 pb-28 lg:pb-4">
            {/* Search Bar & Category Filter Buttons */}
            <div className="space-y-3">
                <input
                    type="text"
                    placeholder={t('pos.searchPlaceholder')}
                    className="input input-bordered w-full bg-base-100"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`btn btn-sm text-xs whitespace-nowrap ${selectedCategory === cat ? 'btn-success text-white' : 'btn-ghost bg-base-100'
                                }`}
                        >
                            {cat === 'All' ? t('common.all') : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Cards Grid */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-base-content/40">
                    <p className="text-sm">{t('pos.noProducts')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={addToCart} // 👈 ဒီလိုင်းလေး ထည့်ပေးလိုက်ပါ (ts(2741) Error ပျောက်သွားပါမည်)
                        />
                    ))}
                </div>
            )}
        </div>
    );
};