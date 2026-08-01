import React, { useRef } from 'react';
import type { Product } from '../../types';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product) => boolean | void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
    const { cart } = useCart();
    const buttonRef = useRef<HTMLButtonElement>(null);

    const isOutOfStock = product.stock <= 0;
    const cartItem = cart.find((item) => item.product.id === product.id);
    const currentCartQty = cartItem ? cartItem.quantity : 0;
    const isMaxStockInCart = currentCartQty >= product.stock && product.stock > 0;

    const handleAddToCartWithAnimation = () => {
        // 1. Context ထဲ ပစ္စည်းထည့်ခြင်း (Returns boolean status)
        const added = onAddToCart(product);
        if (added === false) return; // Do not trigger animation if blocked by stock limit

        if (!buttonRef.current) return;

        const isMobile = window.innerWidth < 1024;

        // Pick animation target based on screen size:
        //   Mobile  → #mobile-cart-bar  (FAB circle, always in DOM)
        //   Desktop → #desktop-cart-icon (cart panel header, visible in sidebar)
        const cartTarget = isMobile
            ? document.getElementById('mobile-cart-bar')
            : document.getElementById('desktop-cart-icon') ||
              document.getElementById('pos-cart-container');

        // Start Position — centre of the "Add to Cart" button
        const btnRect = buttonRef.current.getBoundingClientRect();
        const startX = btnRect.left + btnRect.width / 2;
        const startY = btnRect.top + btnRect.height / 2;

        // End Position — centre of the cart target element
        // Fallback: bottom-right corner for mobile, top-right for desktop
        let endX = isMobile ? window.innerWidth - 52 : window.innerWidth - 260;
        let endY = isMobile ? window.innerHeight - 52 : 120;

        if (cartTarget) {
            const cartRect = cartTarget.getBoundingClientRect();
            endX = cartRect.left + cartRect.width / 2;
            endY = cartRect.top + cartRect.height / 2;
        }

        // Create the flying emoji element
        const flyingEl = document.createElement('div');
        flyingEl.className = 'animate-fly-to-cart text-3xl select-none';
        flyingEl.innerText = product.image || '🌱';

        flyingEl.style.left = `${startX}px`;
        flyingEl.style.top = `${startY}px`;
        flyingEl.style.setProperty('--start-x', `${startX}px`);
        flyingEl.style.setProperty('--start-y', `${startY}px`);
        flyingEl.style.setProperty('--end-x', `${endX}px`);
        flyingEl.style.setProperty('--end-y', `${endY}px`);

        document.body.appendChild(flyingEl);

        // Remove after animation completes
        setTimeout(() => {
            flyingEl.remove();
        }, 700);
    };

    return (
        <div className={`card bg-base-100 border border-base-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${isOutOfStock ? 'opacity-70 bg-base-200/30' : ''}`}>
            <div className="card-body p-4">
                {/* Category Badge & Stock */}
                <div className="flex justify-between items-center mb-2">
                    <span className="badge badge-sm badge-neutral font-normal">
                        {product.category}
                    </span>
                    {isOutOfStock ? (
                        <span className="badge badge-error badge-sm text-white font-bold">
                            ပစ္စည်းကုန်နေသည်
                        </span>
                    ) : (
                        <span className={`text-xs font-semibold ${isMaxStockInCart ? 'text-amber-600 font-bold' : 'text-gray-500'}`}>
                            လက်ကျန်: {product.stock} {product.unit}
                        </span>
                    )}
                </div>

                {/* Product Icon & Name */}
                <div className="text-center my-2 relative">
                    <div className="text-4xl mb-2">{product.image || '🌱'}</div>
                    <h3 className="font-bold text-base text-base-content line-clamp-1">
                        {product.name}
                    </h3>
                    <p className="text-success font-extrabold text-lg mt-1">
                        {product.price.toLocaleString()} ကျပ်
                    </p>

                    {/* Cart Quantity Badge if item is in cart */}
                    {currentCartQty > 0 && (
                        <div className="mt-1">
                            <span className={`badge badge-xs text-[11px] font-semibold py-1 px-2 ${isMaxStockInCart ? 'badge-warning text-white' : 'badge-ghost border-green-300 text-green-700 bg-green-50'}`}>
                                🛒 ခြင်းထဲတွင် {currentCartQty} {product.unit} {isMaxStockInCart ? '(အများဆုံး)' : ''}
                            </span>
                        </div>
                    )}
                </div>

                {/* Add to Cart Button */}
                <div className="card-actions justify-end mt-3">
                    <button
                        ref={buttonRef}
                        onClick={handleAddToCartWithAnimation}
                        disabled={isOutOfStock || isMaxStockInCart}
                        className={`btn btn-sm w-full font-semibold transition-all ${
                            isOutOfStock
                                ? 'btn-disabled bg-gray-200 text-gray-400 border-gray-200'
                                : isMaxStockInCart
                                ? 'btn-warning text-white cursor-not-allowed opacity-80'
                                : 'btn-success text-white active:scale-95'
                        }`}
                    >
                        {isOutOfStock
                            ? '🚫 ပစ္စည်းကုန်နေသည်'
                            : isMaxStockInCart
                            ? '⚠️ လက်ကျန်ပြည့်ပါပြီ'
                            : '🛒 ခြင်းထဲထည့်မည်'}
                    </button>
                </div>
            </div>
        </div>
    );
};