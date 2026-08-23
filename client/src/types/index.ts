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

// Order Item with cost price for profit calc
export interface OrderItem {
    product: { id: string; name: string; price: number };
    quantity: number;
    costPrice?: number;
    category?: string;
}

// ငွေရှင်းပြီးစီးသွားသည့် Order/Receipt
export interface Order {
    id: string;
    orderNo: string;
    items: OrderItem[];
    subtotal?: number;
    taxRate?: number;
    taxAmount?: number;
    totalAmount: number;
    receivedAmount: number;
    changeAmount: number;
    paymentMethod?: string;
    paymentStatus: 'PAID' | 'UNPAID';
    customerName?: string;
    customerPhone?: string;
    customerPlace?: string;
    cultivationDate?: string | null;
    cultivationStatus?: 'NONE' | 'STARTED' | 'COMPLETED';
    cashierName: string;
    createdAt: string;
}

// Sales Analytics Summary
export interface SalesAnalytics {
    totalRevenue: number;
    totalProfit: number;
}

// ==========================================
// 4. CUSTOMER TYPES (ဝယ်ယူသူများ)
// ==========================================

// ဝယ်ယူသူ စာရင်း အတန်း (list view — purchaseDates payload မပါဝင်ပါ)
export interface Customer {
    id: string;
    name: string;
    phone: string;
    address: string;
    totalSpent: number;
    totalDebt: number;
    purchasesCount: number;
    lastPurchaseDate: string | null;
}

// Checkout modal မှ ဖုန်းနံပါတ်ဖြင့် ရှာဖွေရာတွင် ပြန်ရရှိသည့် အချက်အလက်
export interface CustomerLookup extends Omit<Customer, 'lastPurchaseDate'> {}
// ဝယ်ယူခဲ့သည့် ရက်စွဲများ မှတ်တမ်း (detail modal)
export interface CustomerHistoryItem {
    orderId: string;
    orderNo: string;
    amount: number;
    date: string | null;
    paymentStatus: 'PAID' | 'UNPAID';
    itemsSummary: string;
    cashierName?: string;
}

export interface CustomerDetail extends Omit<Customer, 'lastPurchaseDate'> {
    history: CustomerHistoryItem[];
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
    cultivationDurationDays: number; // cultivation_duration_days (default: 60)
    unpaidDurationDays: number;      // unpaid_duration_days (default: 60)
}

// အခြေအနေ အဆင့် (duration ကုန်လာမှုအပေါ် မူတည်) — အကြွေးနှင့် စိုက်ပျိုးမှု နှစ်ခုစလုံးအတွက်
export type DurationStage = 'PENDING' | 'UNDER' | 'VALENCE' | 'OVER';

/** @deprecated Use DurationStage instead */
export type UnpaidStage = DurationStage;

// Admin Dashboard အတွက် အနှစ်ချုပ် စာရင်းအင်း Data
export interface DashboardStats {
    todaySales: number;
    todayOrdersCount: number;
    totalProductsCount: number;
    lowStockCount: number;
}