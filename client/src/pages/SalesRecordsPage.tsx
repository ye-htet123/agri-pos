import React, { useState, useEffect, useCallback } from 'react';
import type { Order, SalesAnalytics, DurationStage } from '../types';
import { OrderEditModal } from '../components/pos/OrderEditModal';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// elapsed_days = current_date - start_date (whole days)
const getElapsedDays = (dateString: string): number =>
  Math.floor((Date.now() - new Date(dateString).getTime()) / MS_PER_DAY);

/**
 * Stage from elapsed days vs a configured duration threshold:
 *  PENDING  : elapsed < duration                         (no highlight)
 *  UNDER    : duration <= elapsed < duration + 5          (yellow)
 *  VALENCE  : duration + 5 <= elapsed <= duration + 10    (green)
 *  OVER     : elapsed > duration + 10                     (red)
 */
const getStageFromElapsed = (elapsedDays: number, durationDays: number): DurationStage => {
  if (elapsedDays < durationDays) return 'PENDING';
  if (elapsedDays < durationDays + 5) return 'UNDER';
  if (elapsedDays <= durationDays + 10) return 'VALENCE';
  return 'OVER';
};

// Payment stage: order date vs unpaid_duration_days (UNPAID orders only)
const getUnpaidStage = (order: Order, unpaidDurationDays: number): DurationStage | null => {
  if (order.paymentStatus === 'PAID') return null;
  return getStageFromElapsed(getElapsedDays(order.createdAt), unpaidDurationDays);
};

// Cultivation stage: cultivation start date vs cultivation_duration_days
const getCultivationStage = (
  order: Order,
  cultivationDurationDays: number
): { stage: DurationStage; elapsedDays: number } | 'DONE' | null => {
  if (order.cultivationStatus === 'COMPLETED') return 'DONE';
  if (!order.cultivationDate || order.cultivationStatus !== 'STARTED') return null;
  const elapsedDays = getElapsedDays(order.cultivationDate);
  return { stage: getStageFromElapsed(elapsedDays, cultivationDurationDays), elapsedDays };
};

// Severity ranking used to pick the row highlight when payment & cultivation
// stages disagree — the most urgent condition wins (OVER > VALENCE > UNDER).
const STAGE_SEVERITY: Record<DurationStage, number> = {
  PENDING: 0,
  UNDER: 1,
  VALENCE: 2,
  OVER: 3,
};

const STAGE_ROW_CLASS: Record<DurationStage, string> = {
  PENDING: 'hover:bg-base-200/30',
  UNDER: 'bg-yellow-100 hover:bg-yellow-200/70 dark:bg-yellow-400/15 dark:hover:bg-yellow-400/25',
  VALENCE: 'bg-green-100 hover:bg-green-200/70 dark:bg-green-400/15 dark:hover:bg-green-400/25',
  OVER: 'bg-red-100 hover:bg-red-200/70 dark:bg-red-400/15 dark:hover:bg-red-400/25',
};

export const SalesRecordsPage: React.FC = () => {
  const { settings } = useSettings();
  const { t } = useLanguage();
  const unpaidDurationDays = settings.unpaidDurationDays ?? 60;
  const cultivationDurationDays = settings.cultivationDurationDays ?? 60;

  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalytics>({ totalRevenue: 0, totalProfit: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [filterCultivation, setFilterCultivation] = useState<'ALL' | 'NOT_STARTED' | 'STARTED'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [markingDoneId, setMarkingDoneId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Server-side date range filter (YYYY-MM-DD, inclusive)
      const params: Record<string, string> = {};
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;

      const [ordersRes, analyticsRes] = await Promise.all([
        api.get('/orders', { params }),
        api.get('/orders/analytics', { params }),
      ]);

      if (ordersRes.data?.success) {
        setOrders(ordersRes.data.data || []);
      }
      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.data || { totalRevenue: 0, totalProfit: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch sales data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered orders — payment status + client-side date range guard
  // (local calendar-day comparison so timezone shifts can't leak rows)
  const isInDateRange = (o: Order): boolean => {
    if (!dateFrom && !dateTo) return true;
    const day = new Date(o.createdAt).toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  };

  const filteredOrders = orders
    .filter((o) => (filterStatus === 'ALL' || o.paymentStatus === filterStatus) && isInDateRange(o))
    .filter((o) => {
      if (filterCultivation === 'ALL') return true;
      const started = o.cultivationStatus === 'STARTED' || o.cultivationStatus === 'COMPLETED';
      if (filterCultivation === 'STARTED') return started;
      // NOT_STARTED: crop-seed orders that have not been planted yet
      return (
        !started &&
        o.items.some(
          (item) => item.category?.includes('မျိုးစေ့') || item.category?.toLowerCase().includes('cropseeds')
        )
      );
    });

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const patchOrderLocal = (id: string, patch: Partial<Order>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  // Payment "Pay" — mark a single order as PAID; row highlight updates instantly
  const handleMarkPaid = async (order: Order) => {
    setMarkingPaidId(order.id);
    setActionError(null);
    try {
      const response = await api.put(`/orders/${order.id}`, { paymentStatus: 'PAID' });
      if (response.data?.success) {
        patchOrderLocal(order.id, { paymentStatus: 'PAID' });
      } else {
        setActionError(response.data?.message || t('sales.markPaidError'));
      }
    } catch (error: any) {
      setActionError(error.response?.data?.message || t('sales.markPaidError'));
    } finally {
      setMarkingPaidId(null);
    }
  };

  // Cultivation "Done" — complete cultivation; row highlight resets instantly
  const handleMarkCultivationDone = async (order: Order) => {
    setMarkingDoneId(order.id);
    setActionError(null);
    try {
      const response = await api.put(`/orders/${order.id}`, { cultivationStatus: 'DONE' });
      if (response.data?.success) {
        patchOrderLocal(order.id, { cultivationStatus: 'COMPLETED' });
      } else {
        setActionError(response.data?.message || t('sales.markDoneError'));
      }
    } catch (error: any) {
      setActionError(error.response?.data?.message || t('sales.markDoneError'));
    } finally {
      setMarkingDoneId(null);
    }
  };

  // Batch delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmDelete = window.confirm(t('sales.deleteConfirm', { count: selectedIds.size }));
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const response = await api.post('/orders/bulk-delete', {
        orderIds: Array.from(selectedIds),
      });

      if (response.data?.success) {
        setSelectedIds(new Set());
        await fetchData();
      }
    } catch (error) {
      console.error('Bulk delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Cultivation status display helper
  const hasCropSeeds = (order: Order) =>
    order.items.some(
      (item) => item.category?.includes('မျိုးစေ့') || item.category?.toLowerCase().includes('cropseeds')
    );

  // Row highlight = the most urgent of the payment / cultivation stages
  const resolveRowStage = (order: Order): DurationStage | null => {
    const candidates: DurationStage[] = [];
    const unpaid = getUnpaidStage(order, unpaidDurationDays);
    if (unpaid) candidates.push(unpaid);
    const cultivation = getCultivationStage(order, cultivationDurationDays);
    if (cultivation && cultivation !== 'DONE') candidates.push(cultivation.stage);
    if (candidates.length === 0) return null;
    return candidates.reduce((worst, s) => (STAGE_SEVERITY[s] > STAGE_SEVERITY[worst] ? s : worst));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-sm text-base-content/60">{t('sales.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-base-content flex items-center gap-2">
          {t('sales.title')}
        </h1>
        <p className="text-sm text-base-content/60 mt-1">{t('sales.subtitle')}</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Revenue Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{t('sales.totalRevenue')}</p>
              <p className="text-3xl font-black mt-1">
                {analytics.totalRevenue.toLocaleString()} <span className="text-lg font-bold">{t('common.kyat')}</span>
              </p>
            </div>
            <div className="text-4xl opacity-80">💰</div>
          </div>
          <p className="text-xs text-white/60 mt-2">{t('sales.revenueNote')}</p>
        </div>

        {/* Total Profit Card */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{t('sales.totalProfit')}</p>
              <p className="text-3xl font-black mt-1">
                {analytics.totalProfit.toLocaleString()} <span className="text-lg font-bold">{t('common.kyat')}</span>
              </p>
            </div>
            <div className="text-4xl opacity-80">📈</div>
          </div>
          <p className="text-xs text-white/60 mt-2">{t('sales.profitNote')}</p>
        </div>
      </div>

      {/* Toolbar: Filter + Batch Delete + Duration Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-base-100 rounded-xl p-3 border border-base-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Buttons */}
          <div className="join">
            {(['ALL', 'PAID', 'UNPAID'] as const).map((status) => (
              <button
                key={status}
                onClick={() => { setFilterStatus(status); setSelectedIds(new Set()); }}
                className={`join-item btn btn-sm font-bold ${
                  filterStatus === status
                    ? status === 'ALL' ? 'btn-primary text-white' : status === 'PAID' ? 'btn-success text-white' : 'btn-warning text-white'
                    : 'btn-ghost'
                }`}
              >
                {status === 'ALL' ? t('sales.filterAll') : status === 'PAID' ? t('sales.filterPaid') : t('sales.filterUnpaid')}
              </button>
            ))}
          </div>
          <span className="text-xs text-base-content/50">
            {t('sales.ordersCount', { count: filteredOrders.length })}
          </span>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-base-content/60">📅 {t('sales.dateRange')}:</span>
          <input
            type="date"
            aria-label={t('sales.fromDate')}
            className="input input-bordered input-sm"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => { setDateFrom(e.target.value); setSelectedIds(new Set()); }}
          />
          <span className="text-xs text-base-content/40">→</span>
          <input
            type="date"
            aria-label={t('sales.toDate')}
            className="input input-bordered input-sm"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => { setDateTo(e.target.value); setSelectedIds(new Set()); }}
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setSelectedIds(new Set()); }}
              className="btn btn-ghost btn-xs text-error hover:bg-error/10 font-bold"
              title={t('sales.clearDates')}
            >
              ✖ {t('sales.clearDates')}
            </button>
          )}
        </div>

        {/* Cultivation Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-base-content/60">🌱 {t('sales.cultivationFilter')}:</span>
          <select
            aria-label={t('sales.cultivationFilter')}
            className="select select-bordered select-sm font-semibold"
            value={filterCultivation}
            onChange={(e) => {
              setFilterCultivation(e.target.value as 'ALL' | 'NOT_STARTED' | 'STARTED');
              setSelectedIds(new Set());
            }}
          >
            <option value="ALL">{t('sales.filterAll')}</option>
            <option value="NOT_STARTED">{t('sales.notStarted')}</option>
            <option value="STARTED">{t('sales.cultStarted')}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Duration Legend */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-base-content/60" title={t('sales.legendTitle')}>
            <span className="font-semibold">{t('sales.legendTitle')}:</span>
            <span className="px-2 py-0.5 rounded-md bg-base-200">{t('common.pending')}</span>
            <span className="px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-800 dark:bg-yellow-400/20 dark:text-yellow-300">
              {t('sales.legendUnder')}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-800 dark:bg-green-400/20 dark:text-green-300">
              {t('sales.legendValence')}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 dark:bg-red-400/20 dark:text-red-300">
              {t('sales.legendOver')}
            </span>
          </div>

          {/* Batch Delete */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="btn btn-error btn-sm text-white font-bold gap-1"
            >
              {isDeleting ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  {t('sales.deleting')}
                </>
              ) : (
                t('sales.deleteBtn', { count: selectedIds.size })
              )}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="alert alert-error text-white text-sm py-2 px-4 rounded-xl">
          <span>⚠️ {actionError}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-base-100 rounded-xl border border-base-200 shadow-xs overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr className="bg-base-200/50">
              <th className="w-10">
                <label>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length}
                    onChange={toggleSelectAll}
                  />
                </label>
              </th>
              <th className="font-bold text-xs">{t('sales.colOrderId')}</th>
              <th className="font-bold text-xs">{t('sales.colDate')}</th>
              <th className="font-bold text-xs">{t('sales.colCustomer')}</th>
              <th className="font-bold text-xs">{t('sales.colItems')}</th>
              <th className="font-bold text-xs text-right">{t('sales.colTotal')}</th>
              <th className="font-bold text-xs text-center">{t('sales.colPayment')}</th>
              <th className="font-bold text-xs text-center">{t('sales.colCultivation')}</th>
              <th className="font-bold text-xs text-center">{t('sales.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-base-content/40">
                  <div className="text-4xl mb-2">📋</div>
                  <p>{t('sales.empty')}</p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const unpaidStage = getUnpaidStage(order, unpaidDurationDays);
                const cultivation = getCultivationStage(order, cultivationDurationDays);
                const rowStage = resolveRowStage(order);
                const isPaying = markingPaidId === order.id;
                const isMarkingDone = markingDoneId === order.id;

                return (
                <tr
                  key={order.id}
                  className={`transition-colors ${rowStage ? STAGE_ROW_CLASS[rowStage] : 'hover:bg-base-200/30'}`}
                >
                  <td>
                    <label>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelectOne(order.id)}
                      />
                    </label>
                  </td>
                  <td className="font-mono text-xs font-bold text-primary">
                    #{order.orderNo}
                  </td>
                  <td className="text-xs">
                    <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                    <div className="text-base-content/40 text-[10px]">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="text-xs">
                    {order.customerName ? (
                      <div>
                        <div className="font-semibold">{order.customerName}</div>
                        {order.customerPlace && (
                          <div className="text-base-content/50 text-[10px]">{order.customerPlace}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-base-content/30">—</span>
                    )}
                  </td>
                  <td className="text-xs max-w-[180px]">
                    <div className="truncate" title={order.items.map(i => `${i.product.name} x${i.quantity}`).join(', ')}>
                      {order.items.map((i) => `${i.product.name} x${i.quantity}`).join(', ')}
                    </div>
                  </td>
                  <td className="text-right font-bold text-sm text-success">
                    {order.totalAmount.toLocaleString()} <span className="text-xs font-normal">{t('common.kyat')}</span>
                  </td>

                  {/* Payment status column */}
                  <td className="text-center">
                    {order.paymentStatus === 'PAID' || unpaidStage === null ? (
                      <span className="badge badge-sm badge-success gap-1">{t('sales.paidBtn')}</span>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <StageBadge stage={unpaidStage} elapsedDays={getElapsedDays(order.createdAt)} />
                      </div>
                    )}
                  </td>

                  {/* Cultivation status column */}
                  <td className="text-center">
                    {cultivation === 'DONE' ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="badge badge-sm badge-success gap-1 text-white">🌱 {t('common.done')}</span>
                        {order.cultivationDate && (
                          <span className="text-[10px] text-base-content/50">
                            {new Date(order.cultivationDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ) : cultivation ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <StageBadge stage={cultivation.stage} elapsedDays={cultivation.elapsedDays} />
                        {/* Completion action only once the duration threshold is
                            reached (UNDER / VALENCE / OVER) — hidden while PENDING */}
                        {cultivation.stage !== 'PENDING' && (
                          <button
                            onClick={() => handleMarkCultivationDone(order)}
                            disabled={isMarkingDone}
                            title={t('sales.markDoneTitle')}
                            className="btn btn-success btn-xs text-white font-bold gap-1"
                          >
                            {isMarkingDone ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              t('sales.doneBtn')
                            )}
                          </button>
                        )}
                      </div>
                    ) : hasCropSeeds(order) ? (
                      <span className="badge badge-sm badge-ghost gap-1">⏳ {t('sales.notStarted')}</span>
                    ) : (
                      <span className="text-base-content/30 text-xs">—</span>
                    )}
                  </td>

                  {/* Actions column */}
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Pay — mark as paid */}
                      <button
                        onClick={() => handleMarkPaid(order)}
                        disabled={order.paymentStatus === 'PAID' || isPaying}
                        title={order.paymentStatus === 'PAID' ? t('sales.alreadyPaidTitle') : t('sales.markPaidTitle')}
                        className={`btn btn-xs font-bold gap-1 ${
                          order.paymentStatus === 'PAID' ? 'btn-ghost btn-disabled' : 'btn-success text-white'
                        }`}
                      >
                        {order.paymentStatus === 'PAID' ? (
                          t('sales.paidBtn')
                        ) : isPaying ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          t('sales.payBtn')
                        )}
                      </button>
                      <button
                        onClick={() => setEditOrder(order)}
                        className="btn btn-ghost btn-xs text-primary font-bold gap-1"
                      >
                        {t('sales.editBtn')}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Order Edit Modal */}
      <OrderEditModal
        isOpen={!!editOrder}
        order={editOrder}
        onClose={() => setEditOrder(null)}
        onUpdated={() => {
          setEditOrder(null);
          fetchData();
        }}
      />
    </div>
  );
};

const StageBadge: React.FC<{ stage: DurationStage; elapsedDays: number }> = ({ stage, elapsedDays }) => {
  const { t } = useLanguage();
  const daysLabel = t('sales.stageDays', { days: elapsedDays });

  switch (stage) {
    case 'UNDER':
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="badge badge-sm badge-warning gap-1 font-bold text-gray-800">🟡 {t('common.under')}</span>
          <span className="text-[10px] text-base-content/50">{daysLabel}</span>
        </div>
      );
    case 'VALENCE':
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="badge badge-sm badge-success gap-1 font-bold text-white">🟢 {t('common.valence')}</span>
          <span className="text-[10px] text-base-content/50">{daysLabel}</span>
        </div>
      );
    case 'OVER':
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="badge badge-sm badge-error gap-1 font-bold text-white">🔴 {t('common.over')}</span>
          <span className="text-[10px] text-base-content/50">{daysLabel}</span>
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="badge badge-sm badge-ghost gap-1">⏳ {t('common.pending')}</span>
          <span className="text-[10px] text-base-content/50">{daysLabel}</span>
        </div>
      );
  }
};
