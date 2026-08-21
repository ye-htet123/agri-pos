import React, { useState } from 'react';
import { ProductList } from '../components/pos/ProductList';
import { CartList } from '../components/pos/CartList';
import { CheckoutModal } from '../components/pos/CheckoutModal';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export const PosPage: React.FC = () => {
    const { user } = useAuth();
    const { cart, totalPrice } = useCart();
    const { t } = useLanguage();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const hasItems = cart.length > 0;

    return (
        <div className="relative min-h-[calc(100vh-100px)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Products Selection Area */}
                <div className="lg:col-span-2 h-full overflow-y-auto pr-1">
                    <ProductList />
                </div>

                {/* Cart Side Panel — Desktop only */}
                <div className="hidden lg:block lg:col-span-1 h-full">
                    <CartList onOpenCheckout={() => setIsCheckoutOpen(true)} />
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────
                MOBILE FLOATING CART CIRCLE (id="mobile-cart-bar")
                ─ ALWAYS mounted so getBoundingClientRect() is reliable
                  even on the very first product click.
                ─ Clicking it opens the slide-up Cart Drawer directly.
                ───────────────────────────────────────────────────────── */}
            <button
                id="mobile-cart-bar"
                onClick={() => setIsMobileCartOpen(true)}
                aria-label={t('pos.viewCart')}
                className={`
                    fixed bottom-6 right-5 z-50 lg:hidden
                    w-16 h-16 rounded-full shadow-2xl
                    flex items-center justify-center
                    transition-all duration-300 ease-out
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/60
                    ${hasItems
                        ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-90 scale-100 opacity-100 cursor-pointer'
                        : 'bg-slate-700 opacity-55 scale-95 cursor-pointer grayscale-[40%]'
                    }
                `}
            >
                {/* Cart Icon */}
                <span className="text-3xl select-none leading-none">🛒</span>

                {/* Item Count Badge — always rendered */}
                <span
                    className={`
                        absolute -top-1 -right-1
                        min-w-[22px] h-[22px] px-1
                        rounded-full border-2 border-white
                        flex items-center justify-center
                        text-[11px] font-black text-white
                        transition-all duration-200
                        ${hasItems ? 'bg-red-500 scale-110' : 'bg-slate-500 scale-90 opacity-60'}
                    `}
                >
                    {totalItems}
                </span>

                {/* Pulse ring — only when items exist */}
                {hasItems && (
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20 pointer-events-none" />
                )}
            </button>

            {/* ─────────────────────────────────────────────────────────
                MOBILE BOTTOM SUMMARY BAR (price + checkout shortcut)
                Appears only when cart has items; sits left of the FAB.
                ───────────────────────────────────────────────────────── */}
            {hasItems && (
                <div
                    onClick={() => setIsMobileCartOpen(true)}
                    className="fixed bottom-4 left-4 right-[5.5rem] z-40 lg:hidden bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700/60 backdrop-blur-sm cursor-pointer active:scale-[0.99] transition-transform"
                >
                    <div className="truncate">
                        <p className="text-[11px] text-slate-400 font-medium leading-tight">
                            {t('pos.mobileCartSummary', { count: totalItems })}
                        </p>
                        <p className="text-base font-extrabold text-emerald-400 truncate leading-tight mt-0.5">
                            {totalPrice.toLocaleString()} {t('common.kyat')}
                        </p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsCheckoutOpen(true); }}
                        className="btn btn-success btn-sm text-white font-bold text-xs px-3 flex-shrink-0 ml-2"
                    >
                        {t('pos.checkout')} 💳
                    </button>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────
                MOBILE CART DRAWER (Slide-Up Bottom Sheet)
                ───────────────────────────────────────────────────────── */}
            {isMobileCartOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileCartOpen(false)}
                    />

                    {/* Drawer */}
                    <div className="relative bg-base-100 rounded-t-3xl shadow-2xl border-t border-base-200 p-4 max-h-[85vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-300">
                        {/* Pull Bar */}
                        <div
                            className="w-12 h-1.5 bg-base-300 rounded-full mx-auto mb-3 cursor-pointer"
                            onClick={() => setIsMobileCartOpen(false)}
                        />

                        <CartList
                            onOpenCheckout={() => {
                                setIsMobileCartOpen(false);
                                setIsCheckoutOpen(true);
                            }}
                            onClose={() => setIsMobileCartOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                onSuccess={() => setIsCheckoutOpen(false)}
                cashierName={user?.name || t('pos.cashierDefault')}
            />
        </div>
    );
};