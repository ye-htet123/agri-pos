import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product, CartItem } from '../types';
import api from '../services/api';

interface CheckoutOptions {
  receivedAmount: number;
  paymentMethod?: string;
  paymentStatus?: 'PAID' | 'UNPAID';
  paymentType?: 'PAID' | 'CREDIT';
  customerName?: string;
  customerPhone?: string;
  customerPlace?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  checkout: (options: CheckoutOptions) => Promise<{ success: boolean; message?: string; order?: any }>;
  totalPrice: number;
  toastMessage: string | null;
  showToast: (message: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3500);
  };

  const addToCart = (product: Product): boolean => {
    if (product.stock <= 0) {
      showToast(`ပစ္စည်း '${product.name}' ပစ္စည်းကုန်နေပါသည်`);
      return false;
    }

    let addedSuccessfully = true;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      const currentQty = existingItem ? existingItem.quantity : 0;

      if (currentQty >= product.stock) {
        addedSuccessfully = false;
        showToast(
          `ပစ္စည်း '${product.name}' ၏ လက်ကျန် ${product.stock} ${product.unit || 'ခု'}ပဲ ရှိပါတော့တယ်`
        );
        return prevCart;
      }

      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });

    return addedSuccessfully;
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === productId);
      if (!existingItem) return prevCart;

      if (quantity > existingItem.product.stock) {
        showToast(
          `ပစ္စည်း '${existingItem.product.name}' ၏ လက်ကျန် ${existingItem.product.stock} ${existingItem.product.unit || 'ခု'}ပဲ ရှိပါတော့တယ်`
        );
        return prevCart.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: existingItem.product.stock }
            : item
        );
      }

      return prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      );
    });
  };

  const clearCart = () => setCart([]);

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const checkout = async (options: CheckoutOptions) => {
    try {
      const {
        receivedAmount,
        paymentMethod = 'CASH',
        paymentStatus = 'PAID',
        paymentType,
        customerName,
        customerPhone,
        customerPlace,
      } = options;

      const payload = {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        receivedAmount,
        paymentMethod,
        paymentStatus,
        // Explicit credit flag — server treats CREDIT === UNPAID
        paymentType: paymentType || (paymentStatus === 'UNPAID' ? 'CREDIT' : 'PAID'),
        customerName: customerName || '',
        customerPhone: (customerPhone || '').trim(),
        customerPlace: customerPlace || '',
      };

      const response = await api.post('/orders', payload);
      if (response.data?.success) {
        // Do NOT call clearCart() here immediately so caller (CheckoutModal) can snapshot the items/totals first
        return { success: true, order: response.data.data };
      }
      return { success: false, message: response.data?.message || 'Checkout failed' };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'ငွေရှင်းရာတွင် အမှားဖြစ်ပွားပါသည်';
      return { success: false, message: errorMsg };
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        checkout,
        totalPrice,
        toastMessage,
        showToast,
      }}
    >
      {children}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast toast-top toast-center z-50 animate-bounce">
          <div className="alert alert-warning shadow-lg text-white font-semibold text-sm border-0 bg-amber-500 py-3 px-5 rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};