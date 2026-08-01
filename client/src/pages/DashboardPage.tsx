import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface DashboardData {
  todaySales: number;
  todayOrdersCount: number;
  totalProductsCount: number;
  lowStockCount: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    category: string;
    stock: number;
    unit: string;
    image?: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderNo: string;
    cashierName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/dashboard');
      if (response.data?.success && response.data?.data) {
        setData(response.data.data);
      }
    } catch (err: any) {
      console.error('[Dashboard Error]:', err);
      setError(err.response?.data?.message || 'Dashboard အချက်အလက် ရယူ၍မရပါ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US') + ' ကျပ်';
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-sm text-gray-500 font-medium">Dashboard အချက်အလက်များ ဒေါင်းလုဒ်ဆွဲနေပါသည်...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/30 text-error p-6 rounded-2xl text-center">
        <p className="font-bold text-lg">⚠️ {error}</p>
        <button onClick={fetchDashboardStats} className="btn btn-error btn-sm mt-4 text-white">
          🔄 ပြန်လည် ကြိုးစားမည်
        </button>
      </div>
    );
  }

  const todaySales = data?.todaySales || 0;
  const todayOrdersCount = data?.todayOrdersCount || 0;
  const totalProductsCount = data?.totalProductsCount || 0;
  const lowStockCount = data?.lowStockCount || 0;
  const lowStockProducts = data?.lowStockProducts || [];
  const recentOrders = data?.recentOrders || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">📊 Dashboard အနှစ်ချုပ် စာရင်း</h1>
          <p className="text-sm text-gray-500 mt-1">
            ဆိုင်၏ ယနေ့ အရောင်းနှင့် စတော့ အခြေအနေများကို တိုက်ရိုက် ကြည့်ရှုနိုင်ပါသည်။
          </p>
        </div>
        <button onClick={fetchDashboardStats} className="btn btn-outline btn-sm gap-2">
          🔄 Refresh Data
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Sales */}
        <div className="bg-base-100 p-5 rounded-2xl shadow-xs border border-base-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ယနေ့ အရောင်းရရှိမှု</p>
            <h3 className="text-2xl font-black text-success mt-1">{formatCurrency(todaySales)}</h3>
          </div>
          <div className="w-12 h-12 bg-success/10 text-success rounded-xl flex items-center justify-center text-2xl">
            💰
          </div>
        </div>

        {/* Today Orders */}
        <div className="bg-base-100 p-5 rounded-2xl shadow-xs border border-base-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ယနေ့ အော်ဒါ အရေအတွက်</p>
            <h3 className="text-2xl font-black text-info mt-1">{todayOrdersCount} <span className="text-xs font-normal text-gray-500">စောင်</span></h3>
          </div>
          <div className="w-12 h-12 bg-info/10 text-info rounded-xl flex items-center justify-center text-2xl">
            🧾
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-base-100 p-5 rounded-2xl shadow-xs border border-base-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">စတော့ ပစ္စည်းမျိုးစုံ</p>
            <h3 className="text-2xl font-black text-primary mt-1">{totalProductsCount} <span className="text-xs font-normal text-gray-500">မျိုး</span></h3>
          </div>
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-2xl">
            📦
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-base-100 p-5 rounded-2xl shadow-xs border border-base-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">စတော့ နည်းနေသော ပစ္စည်း</p>
            <h3 className={`text-2xl font-black mt-1 ${lowStockCount > 0 ? 'text-error' : 'text-gray-700'}`}>
              {lowStockCount} <span className="text-xs font-normal text-gray-500">မျိုး</span>
            </h3>
          </div>
          <div className="w-12 h-12 bg-error/10 text-error rounded-xl flex items-center justify-center text-2xl">
            ⚠️
          </div>
        </div>
      </div>

      {/* Main Content Grid (Low Stock Alerts + Recent Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Columns: Recent Orders Table */}
        <div className="lg:col-span-2 bg-base-100 p-6 rounded-2xl shadow-xs border border-base-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">🛍️ လတ်တလော အရောင်းမှတ်တမ်းများ</h3>
            <span className="text-xs text-gray-400">နောက်ဆုံး ရောင်းချမှု ၁၀ ခု</span>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr className="border-b border-base-200 text-gray-500">
                  <th>ပြေစာ အမှတ်</th>
                  <th>အရောင်းဝန်ထမ်း</th>
                  <th>ကျသင့်ငွေ</th>
                  <th>အချိန်</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-gray-400">
                      အရောင်းမှတ်တမ်း မရှိသေးပါ။
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-base-200/50">
                      <td className="font-mono font-bold text-xs">#{order.orderNo}</td>
                      <td>{order.cashierName}</td>
                      <td className="font-semibold text-success">{formatCurrency(order.totalAmount)}</td>
                      <td className="text-xs text-gray-400">{formatTime(order.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Column: Low Stock Alert List */}
        <div className="bg-base-100 p-6 rounded-2xl shadow-xs border border-base-200">
          <h3 className="font-bold text-lg mb-4 text-error flex items-center gap-2">
            <span>⚠️</span> စတော့ ဖြည့်ရန် လိုအပ်သည်များ
          </h3>

          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p>စတော့ ပစ္စည်းအားလုံး လုံလောက်စွာ ရှိပါသည်။</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-error/5 border border-error/20 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{product.image || '🌱'}</span>
                    <div>
                      <p className="font-semibold text-xs text-base-content">{product.name}</p>
                      <p className="text-[10px] text-gray-400">{product.category}</p>
                    </div>
                  </div>
                  <span className="badge badge-error badge-sm text-white font-bold">
                    ကျန် {product.stock} {product.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};