import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { useCategory } from '../context/CategoryContext';
import { useProducts } from '../context/ProductContext';
import api from '../services/api';

type RangePreset = 'today' | '7d' | 'month' | 'custom';
type ChartMetric = 'totalSales' | 'quantity';

interface TrendPoint {
  date: string; // YYYY-MM-DD
  totalSales: number;
  quantity: number;
  orderCount: number;
  topItem: { name: string; category?: string; quantity: number } | null;
}

interface TrendKpis {
  totalRevenue: number;
  totalQuantity: number;
  topItem: { name: string; category?: string; quantity: number; sales: number } | null;
}

interface TrendResponse {
  startDate: string;
  endDate: string;
  series: TrendPoint[];
  kpis: TrendKpis;
}

// Local calendar day as YYYY-MM-DD (en-CA locale gives ISO format)
const toLocalYMD = (d: Date): string => d.toLocaleDateString('en-CA');

const addDays = (d: Date, days: number): Date => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const AnalyticsPage: React.FC = () => {
  const { t } = useLanguage();
  const { categories } = useCategory();
  const { products } = useProducts();

  // ── Filter state ─────────────────────────────────────────────
  const [preset, setPreset] = useState<RangePreset>('7d');
  const [startDate, setStartDate] = useState(() => toLocalYMD(addDays(new Date(), -6)));
  const [endDate, setEndDate] = useState(() => toLocalYMD(new Date()));
  const [categoryId, setCategoryId] = useState(''); // '' = all categories
  const [itemId, setItemId] = useState('');         // '' = all items
  const [metric, setMetric] = useState<ChartMetric>('totalSales');

  // ── Data state ───────────────────────────────────────────────
  const [data, setData] = useState<TrendResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    const today = new Date();
    if (p === 'today') {
      setStartDate(toLocalYMD(today));
      setEndDate(toLocalYMD(today));
    } else if (p === '7d') {
      setStartDate(toLocalYMD(addDays(today, -6)));
      setEndDate(toLocalYMD(today));
    } else if (p === 'month') {
      setStartDate(toLocalYMD(new Date(today.getFullYear(), today.getMonth(), 1)));
      setEndDate(toLocalYMD(today));
    }
    // 'custom' keeps current dates; the user edits the pickers
  };

  // Selected category name — products store the category NAME string
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) || null,
    [categories, categoryId]
  );

  // Items dropdown: scoped to the selected category (falls open when "All")
  const itemOptions = useMemo(
    () => (selectedCategory ? products.filter((p) => p.category === selectedCategory.name) : products),
    [products, selectedCategory]
  );

  const selectedItem = useMemo(
    () => products.find((p) => p.id === itemId) || null,
    [products, itemId]
  );

  // Changing category resets an item choice that no longer belongs to it
  const handleCategoryChange = (nextId: string) => {
    setCategoryId(nextId);
    const nextCategory = categories.find((c) => c.id === nextId) || null;
    const stillValid = !itemId || (nextCategory
      ? products.some((p) => p.id === itemId && p.category === nextCategory.name)
      : true);
    if (!stillValid) setItemId('');
  };

  // ── Fetch: every filter change re-queries automatically ──────
  const fetchTrend = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { startDate, endDate };
      if (categoryId) params.categoryId = categoryId;
      if (itemId) params.itemId = itemId;

      const res = await api.get('/orders/sales-trend', { params });
      if (res.data?.success) {
        setData(res.data.data || null);
      } else {
        setError(res.data?.message || t('analytics.loadError'));
      }
    } catch (e: any) {
      setError(e.response?.data?.message || t('analytics.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, categoryId, itemId, t]);

  useEffect(() => {
    if (!startDate || !endDate || startDate > endDate) return;
    fetchTrend();
  }, [fetchTrend, startDate, endDate]);

  // Fill missing days with zero so the x-axis stays continuous for short ranges
  const chartData = useMemo(() => {
    const series = data?.series || [];
    const byDate = new Map(series.map((p) => [p.date, p]));
    const spanDays = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / MS_PER_DAY);

    if (spanDays > 62) {
      return series; // long custom ranges: plot only days that have orders
    }

    const filled: TrendPoint[] = [];
    for (let cursor = new Date(startDate); cursor <= new Date(endDate); cursor = addDays(cursor, 1)) {
      const key = toLocalYMD(cursor);
      const point = byDate.get(key);
      filled.push({
        date: key,
        totalSales: point?.totalSales ?? 0,
        quantity: point?.quantity ?? 0,
        orderCount: point?.orderCount ?? 0,
        topItem: point?.topItem ?? null,
      });
    }
    return filled;
  }, [data, startDate, endDate]);

  const kpis = data?.kpis || { totalRevenue: 0, totalQuantity: 0, topItem: null };

  const presetOptions: Array<{ key: RangePreset; label: string }> = [
    { key: 'today', label: t('analytics.today') },
    { key: '7d', label: t('analytics.last7') },
    { key: 'month', label: t('analytics.thisMonth') },
    { key: 'custom', label: t('analytics.custom') },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-base-content flex items-center gap-2">
          📈 {t('analytics.title')}
        </h1>
        <p className="text-sm text-base-content/60 mt-1">{t('analytics.subtitle')}</p>
      </div>

      {/* Multi-Level Filter Controls */}
      <div className="bg-base-100 rounded-xl p-4 border border-base-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date preset */}
          <div className="form-control">
            <label className="label py-1"><span className="label-text text-xs font-semibold">📅 {t('analytics.filterDate')}</span></label>
            <select
              className="select select-bordered select-sm w-full font-semibold"
              value={preset}
              onChange={(e) => applyPreset(e.target.value as RangePreset)}
            >
              {presetOptions.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="form-control">
            <label className="label py-1"><span className="label-text text-xs font-semibold">🏷️ {t('analytics.filterCategory')}</span></label>
            <select
              className="select select-bordered select-sm w-full font-semibold"
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">{t('analytics.allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Item — scoped to the selected category */}
          <div className="form-control">
            <label className="label py-1"><span className="label-text text-xs font-semibold">🌱 {t('analytics.filterItem')}</span></label>
            <select
              className="select select-bordered select-sm w-full font-semibold"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              <option value="">{t('analytics.allItems')}</option>
              {itemOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Metric toggle */}
          <div className="form-control">
            <label className="label py-1"><span className="label-text text-xs font-semibold">📊 {t('analytics.metricLabel')}</span></label>
            <div className="join w-full">
              <button
                onClick={() => setMetric('totalSales')}
                className={`join-item btn btn-sm flex-1 font-bold ${
                  metric === 'totalSales' ? 'btn-success text-white' : 'btn-ghost bg-base-200/50'
                }`}
              >
                💰 {t('analytics.metricRevenue')}
              </button>
              <button
                onClick={() => setMetric('quantity')}
                className={`join-item btn btn-sm flex-1 font-bold ${
                  metric === 'quantity' ? 'btn-success text-white' : 'btn-ghost bg-base-200/50'
                }`}
              >
                📦 {t('analytics.metricQuantity')}
              </button>
            </div>
          </div>
        </div>

        {/* Custom range pickers — visible when preset is custom */}
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              type="date"
              aria-label={t('sales.fromDate')}
              className="input input-bordered input-sm"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-xs text-base-content/40">→</span>
            <input
              type="date"
              aria-label={t('sales.toDate')}
              className="input input-bordered input-sm"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* KPI Summary Cards — react to active filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl p-5 shadow-lg">
          <p className="text-sm font-medium text-white/80">{t('analytics.kpiRevenue')}</p>
          <p className="text-2xl font-black mt-1">
            {kpis.totalRevenue.toLocaleString()} <span className="text-base font-bold">{t('common.kyat')}</span>
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-5 shadow-lg">
          <p className="text-sm font-medium text-white/80">{t('analytics.kpiQuantity')}</p>
          <p className="text-2xl font-black mt-1">
            {kpis.totalQuantity.toLocaleString()} <span className="text-base font-bold">{t('common.items')}</span>
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-lg">
          <p className="text-sm font-medium text-white/80">{t('analytics.kpiTopItem')}</p>
          {kpis.topItem ? (
            <div className="mt-1">
              <p className="text-xl font-black truncate" title={kpis.topItem.name}>{kpis.topItem.name}</p>
              <p className="text-xs font-medium text-white/75 mt-0.5">
                {kpis.topItem.quantity.toLocaleString()} {t('common.items')}
                {kpis.topItem.category ? ` · ${kpis.topItem.category}` : ''}
              </p>
            </div>
          ) : (
            <p className="text-2xl font-black mt-1 opacity-60">—</p>
          )}
        </div>
      </div>

      {/* Line Chart */}
      <div className="bg-base-100 rounded-xl border border-base-200 shadow-xs p-4">
        <h3 className="font-bold text-base-content mb-4">📉 {t('analytics.chartTitle')}</h3>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-sm text-base-content/60">{t('analytics.loading')}</p>
          </div>
        ) : error ? (
          <div className="alert alert-error text-sm py-3">
            <span>⚠️ {error}</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-16 text-base-content/40">
            <div className="text-4xl mb-2">📉</div>
            <p className="text-sm">{t('analytics.empty')}</p>
          </div>
        ) : (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-base-content/10" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)} // MM-DD
                  stroke="currentColor"
                  className="text-base-content/50"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-base-content/50"
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                  width={48}
                />
                <Tooltip
                  content={(props) => (
                    <ChartTooltip
                      {...props}
                      metric={metric}
                      selectedItem={selectedItem}
                      selectedCategory={selectedCategory}
                    />
                  )}
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom tooltip: Date, Item, Category, Quantity Sold, Total Amount
const ChartTooltip: React.FC<any> = ({ active, payload, metric, selectedItem, selectedCategory }) => {
  const { t } = useLanguage();
  if (!active || !payload || payload.length === 0) return null;

  const point: TrendPoint = payload[0].payload;
  // Item shown: explicit item filter → that item, else the day's best seller
  const itemName = selectedItem ? selectedItem.name : point.topItem?.name || t('common.all');
  const categoryName = selectedItem
    ? String(selectedItem.category || '')
    : selectedCategory ? selectedCategory.name : point.topItem?.category || t('common.all');

  return (
    <div className="bg-base-100 border border-base-300 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1.5">
      <p className="font-bold text-base-content border-b border-base-200 pb-1.5">
        📅 {t('common.date')}: {point.date}
      </p>
      <p className="text-base-content/80">
        🌱 {t('analytics.filterItem')}: <span className="font-semibold">{itemName}</span>
      </p>
      <p className="text-base-content/80">
        🏷️ {t('analytics.filterCategory')}: <span className="font-semibold">{categoryName || t('common.all')}</span>
      </p>
      <p className="text-base-content/80">
        📦 {t('analytics.kpiQuantity')}: <span className="font-semibold">{point.quantity.toLocaleString()}</span>
      </p>
      <p className="text-base-content/80">
        💰 {t('analytics.kpiRevenue')}: <span className="font-bold text-success">{point.totalSales.toLocaleString()} {t('common.kyat')}</span>
      </p>
      {metric === 'quantity' && (
        <p className="text-[10px] text-base-content/40">{t('analytics.metricQuantity')}</p>
      )}
    </div>
  );
};
