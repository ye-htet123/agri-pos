// ==========================================
// 1. USER & AUTHENTICATION TYPES (အကောင့်နှင့် Role များ)
// ==========================================

// ဝန်ထမ်း Role အဆင့်များ
export type UserRole = 'ADMIN' | 'CASHIER';

// အကောင့်/ဝန်ထမ်း အချက်အလက်
export interface User {
    id: string;
    name: string;
    username: string;
    role: UserRole;
    phone?: string;
    createdAt?: string;
}

// Login ပြုလုပ်ရာတွင် သုံးမည့် Data Structure
export interface LoginCredentials {
    username: string;
    password?: string;
}


// ==========================================
// 2. PRODUCT & INVENTORY TYPES (စိုက်ပျိုးရေး ပစ္စည်းများ)
// ==========================================

// အမျိုးအစား အချက်အလက် Data Structure
export interface CategoryItem {
    id: string;
    name: string;
    description?: string;
    isActive?: boolean;
    createdAt?: string;
}

// စိုက်ပျိုးရေး ပစ္စည်း အမျိုးအစားများ
export type Category =
    | 'မျိုးစေ့'
    | 'မြေသြဇာ'
    | 'ဓာတ်မြေဩဇာ'
    | 'ပိုးသတ်ဆေး'
    | 'စိုက်ပျိုးရေးသုံးကိရိယာ'
    | 'အထွေထွေ'
    | 'အခြား';

// ပစ္စည်း အချက်အလက် Data Structure
export interface Product {
    id: string;
    name: string;
    category: Category | string; // 👈 ဒီနေရာမှာ string ပါ လက်ခံနိုင်အောင် ထည့်ပေးလိုက်ပါ
    price: number;       // ရောင်းဈေး
    costPrice?: number;  // 👈 ရင်းဈေး (အတည်ပြုပြီး)
    stock: number;
    unit: string;        // ဥပမာ - 'ထုတ်'၊ 'အိတ်'၊ 'ဗူး'
    image?: string;
}


// ==========================================
// 3. CART & TRANSACTION TYPES (ခြင်းတောင်းနှင့် အရောင်း)
// ==========================================

// Cart ထဲရောက်သွားသည့် ပစ္စည်း
export interface CartItem {
    product: Product;
    quantity: number;
}

// ငွေရှင်းပြီးစီးသွားသည့် Order/Receipt
export interface Order {
    id: string;
    items: CartItem[];
    totalAmount: number;
    receivedAmount: number;
    changeAmount: number;
    cashierName: string;
    createdAt: string;
}


// ==========================================
// 4. ADMIN & SYSTEM SETTINGS TYPES (စနစ် ဆက်တင်များ)
// ==========================================

// ဆိုင်အချက်အလက်နှင့် ပြေစာ ဆက်တင်များ
export interface ShopSettings {
    shopName: string;
    address: string;
    phone: string;
    receiptFooter: string;
    taxRate: number; // Percentage (%)
}

// Admin Dashboard အတွက် အနှစ်ချုပ် စာရင်းအင်း Data
export interface DashboardStats {
    todaySales: number;
    todayOrdersCount: number;
    totalProductsCount: number;
    lowStockCount: number;
}