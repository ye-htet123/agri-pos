import React from 'react';
import { useCart } from '../../context/CartContext';

interface CartListProps {
    onOpenCheckout: () => void;
    onClose?: () => void;
}

export const CartList: React.FC<CartListProps> = ({ onOpenCheckout, onClose }) => {
    const { cart, removeFromCart, updateQuantity, clearCart, totalPrice, showToast } = useCart();

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleIncrement = (productName: string, currentQty: number, stock: number, unit: string, productId: string) => {
        if (currentQty >= stock) {
            showToast(`ပစ္စည်း '${productName}' ၏ လက်ကျန် ${stock} ${unit || 'ခု'}ပဲ ရှိပါတော့တယ်`);
            return;
        }
        updateQuantity(productId, currentQty + 1);
    };

    const handleCheckoutClick = () => {
        if (onClose) onClose();
        onOpenCheckout();
    };

    return (
        <div
            id="pos-cart-container"
            className="bg-base-100 rounded-xl border border-base-200 p-4 flex flex-col h-full justify-between shadow-xs relative"
        >
            {/* 1. Header Area with Target ID for Flying Animation */}
            <div>
                <div className="flex justify-between items-center pb-3 border-b border-base-200 mb-3">
                    <h2 id="desktop-cart-icon" className="font-bold text-lg flex items-center gap-2">
                        🛒 ဈေးဝယ်ခြင်းတောင်း
                        {totalItems > 0 && (
                            <span className="badge badge-success badge-sm text-white">
                                {totalItems}
                            </span>
                        )}
                    </h2>

                    <div className="flex items-center gap-2">
                        {cart.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                title="ခြင်းတောင်းရှင်းမည်"
                            >
                                ရှင်းမည်
                            </button>
                        )}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="btn btn-circle btn-ghost btn-xs text-gray-500 hover:bg-base-300"
                                title="ပိတ်မည်"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. Cart Items List */}
                {cart.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-5xl mb-3">🛒</div>
                        <p className="text-sm font-medium">ခြင်းတောင်းထဲတွင် ပစ္စည်းမရှိသေးပါ</p>
                        <p className="text-xs text-gray-400 mt-1">
                            ဘယ်ဘက်မှ ပစ္စည်းများကို နှိပ်၍ ထည့်သွင်းပါ
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                        {cart.map((item) => {
                            const isMaxStock = item.quantity >= item.product.stock;

                            return (
                                <div
                                    key={item.product.id}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                                        isMaxStock
                                            ? 'bg-amber-50/60 border-amber-200'
                                            : 'bg-base-200/50 border-base-200'
                                    }`}
                                >
                                    {/* Product Info */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-2xl select-none">
                                            {item.product.image || '🌱'}
                                        </span>
                                        <div className="truncate">
                                            <h4 className="font-semibold text-sm truncate">
                                                {item.product.name}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-success font-bold">
                                                    {item.product.price.toLocaleString()} ကျပ်
                                                </span>
                                                {isMaxStock && (
                                                    <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                                                        လက်ကျန်အပြည့် ({item.product.stock} {item.product.unit})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-2">
                                        <div className="join border border-base-300 bg-base-100 rounded-lg">
                                            <button
                                                onClick={() =>
                                                    updateQuantity(item.product.id, item.quantity - 1)
                                                }
                                                className="join-item btn btn-xs btn-ghost px-2 text-base"
                                            >
                                                -
                                            </button>
                                            <span className={`join-item px-2 flex items-center justify-center text-xs font-bold min-w-[28px] ${isMaxStock ? 'text-amber-600' : ''}`}>
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    handleIncrement(
                                                        item.product.name,
                                                        item.quantity,
                                                        item.product.stock,
                                                        item.product.unit,
                                                        item.product.id
                                                    )
                                                }
                                                disabled={isMaxStock}
                                                className="join-item btn btn-xs btn-ghost px-2 text-base disabled:opacity-30 disabled:cursor-not-allowed"
                                                title={isMaxStock ? `လက်ကျန် ${item.product.stock} ခုပဲ ရှိပါတော့သည်` : '၁ ခု ထပ်တိုးမည်'}
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Remove Button */}
                                        <button
                                            onClick={() => removeFromCart(item.product.id)}
                                            className="btn btn-ghost btn-xs text-gray-400 hover:text-error p-1"
                                            title="ဖျက်မည်"
                                        >
                                            ❌
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 3. Footer / Checkout Area */}
            {cart.length > 0 && (
                <div className="pt-4 border-t border-base-200 mt-4 space-y-3">
                    <div className="flex justify-between items-center text-base">
                        <span className="font-semibold text-gray-600">စုစုပေါင်း ကျသင့်ငွေ</span>
                        <span className="font-extrabold text-xl text-success">
                            {totalPrice.toLocaleString()} ကျပ်
                        </span>
                    </div>

                    <button
                        onClick={handleCheckoutClick}
                        className="btn btn-success w-full text-white font-bold text-base shadow-sm hover:shadow-md transition-all"
                    >
                        ငွေရှင်းမည် (Checkout) 💳
                    </button>
                </div>
            )}
        </div>
    );
};