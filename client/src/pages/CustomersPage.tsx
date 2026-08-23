import React, { useCallback, useEffect, useState } from 'react';
import type { Customer, CustomerDetail, CustomerHistoryItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

const formatDate = (date: string | null): string =>
  date ? new Date(date).toLocaleDateString() : '—';

export const CustomersPage: React.FC = () => {
  const { t } = useLanguage();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Detail modal state
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Edit modal state — add/modify name, phone and address
  const [editingCustomer, setEditingCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
    address: string;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/customers', { params });
      if (res.data?.success) {
        setCustomers(res.data.data || []);
      } else {
        setError(res.data?.message || t('customers.loadError'));
      }
    } catch (e: any) {
      setError(e.response?.data?.message || t('customers.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [search, t]);

  // Debounced server-side search by name or phone; selection resets with it
  useEffect(() => {
    setSelectedIds(new Set());
    const timer = setTimeout(fetchCustomers, 350);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // Selection handlers — same pattern as Sales Records
  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)));
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

  // Bulk delete selected customer profiles
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmDelete = window.confirm(t('customers.deleteConfirm', { count: selectedIds.size }));
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const response = await api.post('/customers/bulk-delete', {
        customerIds: Array.from(selectedIds),
      });

      if (response.data?.success) {
        setSelectedIds(new Set());
        await fetchCustomers();
      }
    } catch (e: any) {
      setError(e.response?.data?.message || t('customers.loadError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const openDetail = async (customer: Customer) => {
    setDetail({ ...customer, history: [] });
    setIsDetailLoading(true);
    try {
      const res = await api.get(`/customers/${customer.id}`);
      if (res.data?.success && res.data?.data) {
        setDetail(res.data.data as CustomerDetail);
      }
    } catch {
      // keep the summary-only view if history fetch fails
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Edit modal handlers — add/modify customer details
  const openEdit = (customer: Customer) => {
    setEditError(null);
    setEditingCustomer({
      id: customer.id,
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer || isSavingEdit) return;

    setIsSavingEdit(true);
    setEditError(null);
    try {
      const res = await api.put(`/customers/${editingCustomer.id}`, {
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        address: editingCustomer.address,
      });
      if (res.data?.success) {
        setEditingCustomer(null);
        await fetchCustomers();
      } else {
        setEditError(res.data?.message || t('customers.editError'));
      }
    } catch (e: any) {
      setEditError(e.response?.data?.message || t('customers.editError'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const totalSpentAll = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-base-content flex items-center gap-2">
          📇 {t('customers.title')}
        </h1>
        <p className="text-sm text-base-content/60 mt-1">{t('customers.subtitle')}</p>
      </div>

      {/* Summary + Search Toolbar */}
      <div className="bg-base-100 rounded-xl p-3 border border-base-200 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="badge badge-success badge-outline font-bold whitespace-nowrap">
            {t('customers.countLabel', { count: customers.length })}
          </span>
          <span className="badge badge-primary badge-outline font-bold whitespace-nowrap">
            {totalSpentAll.toLocaleString()} {t('common.kyat')}
          </span>
        </div>
        <input
          type="text"
          className="input input-bordered input-sm w-full sm:max-w-xs font-semibold"
          placeholder={t('customers.searchPh')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Batch Delete — appears only when rows are selected */}
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="btn btn-error btn-sm text-white font-bold gap-1 sm:ml-auto"
          >
            {isDeleting ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                {t('customers.deleting')}
              </>
            ) : (
              t('customers.deleteBtn', { count: selectedIds.size })
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error text-white text-sm py-2 px-4 rounded-xl">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Customer Table — horizontally scrollable on mobile */}
      <div className="bg-base-100 rounded-xl border border-base-200 shadow-xs overflow-x-auto">
        <table className="table table-sm w-full min-w-[920px]">
          <thead>
            <tr className="bg-base-200/50">
              <th className="w-10">
                <label>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={customers.length > 0 && selectedIds.size === customers.length}
                    onChange={toggleSelectAll}
                  />
                </label>
              </th>
              <th className="font-bold text-xs">{t('customers.colName')}</th>
              <th className="font-bold text-xs">{t('customers.colPhone')}</th>
              <th className="font-bold text-xs">{t('customers.colAddress')}</th>
              <th className="font-bold text-xs text-center">{t('customers.colPurchases')}</th>
              <th className="font-bold text-xs text-right">{t('customers.colSpent')}</th>
              <th className="font-bold text-xs text-right">{t('customers.colDebt')}</th>
              <th className="font-bold text-xs">{t('customers.colLast')}</th>
              <th className="font-bold text-xs text-center">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-12">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                  <p className="mt-2 text-sm text-base-content/60">{t('customers.loading')}</p>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-base-content/40">
                  <div className="text-4xl mb-2">📇</div>
                  <p>{search ? t('customers.emptySearch') : t('customers.empty')}</p>
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-base-200/30 transition-colors">
                  <td>
                    <label>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelectOne(c.id)}
                      />
                    </label>
                  </td>
                  <td className="font-semibold text-sm">
                    {c.name || <span className="text-base-content/30">—</span>}
                  </td>
                  <td className="font-mono text-xs text-primary">📞 {c.phone || '—'}</td>
                  <td className="text-xs max-w-[160px]">
                    {c.address ? (
                      <div className="truncate" title={c.address}>📍 {c.address}</div>
                    ) : (
                      <span className="text-base-content/30">—</span>
                    )}
                  </td>
                  <td className="text-center text-xs font-bold">{c.purchasesCount.toLocaleString()}</td>
                  <td className="text-right font-bold text-sm text-success">
                    {c.totalSpent.toLocaleString()}{' '}
                    <span className="text-xs font-normal">{t('common.kyat')}</span>
                  </td>
                  <td
                    className={`text-right font-bold text-sm ${
                      c.totalDebt > 0 ? 'text-error' : 'text-base-content/30'
                    }`}
                  >
                    {c.totalDebt.toLocaleString()}{' '}
                    <span className="text-xs font-normal">{t('common.kyat')}</span>
                  </td>
                  <td className="text-xs">
                    <div>{formatDate(c.lastPurchaseDate)}</div>
                    {c.lastPurchaseDate && (
                      <div className="text-base-content/40 text-[10px]">
                        {new Date(c.lastPurchaseDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="btn btn-ghost btn-xs text-success font-bold"
                        title={t('customers.editTitle')}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => openDetail(c)}
                        className="btn btn-ghost btn-xs text-primary font-bold"
                      >
                        📜 {t('customers.historyBtn')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Purchase History Modal */}
      {detail && (
        <div className="modal modal-open z-50">
          <div className="modal-box max-w-lg bg-base-100 p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-base-200 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-lg text-success">
                  📜 {t('customers.detailTitle')}
                </h3>
                <p className="text-sm font-semibold mt-0.5">
                  {detail.name || t('checkout.unnamedCustomer')} ·{' '}
                  <span className="font-mono text-primary">📞 {detail.phone}</span>
                </p>
                {detail.address && (
                  <p className="text-xs text-base-content/60 mt-0.5">📍 {detail.address}</p>
                )}
              </div>
              <button onClick={() => setDetail(null)} className="btn btn-ghost btn-sm btn-circle">
                ✕
              </button>
            </div>

            {/* Profile Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
              <div className="bg-base-200/60 rounded-xl p-3 text-center">
                <p className="text-[10px] font-semibold text-base-content/50">{t('customers.totalPurchases')}</p>
                <p className="text-lg font-black text-base-content mt-0.5">{detail.purchasesCount.toLocaleString()}</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] font-semibold text-base-content/50">{t('customers.totalSpent')}</p>
                <p className="text-lg font-black text-success mt-0.5">
                  {detail.totalSpent.toLocaleString()}
                </p>
              </div>
              <div className={`rounded-xl p-3 text-center ${detail.totalDebt > 0 ? 'bg-red-500/10' : 'bg-base-200/60'}`}>
                <p className="text-[10px] font-semibold text-base-content/50">{t('customers.totalDebt')}</p>
                <p className={`text-lg font-black mt-0.5 ${detail.totalDebt > 0 ? 'text-error' : 'text-base-content/30'}`}>
                  {detail.totalDebt.toLocaleString()}
                </p>
              </div>
              <div className="bg-base-200/60 rounded-xl p-3 text-center">
                <p className="text-[10px] font-semibold text-base-content/50">{t('customers.lastPurchase')}</p>
                <p className="text-sm font-black text-base-content mt-1">{formatDate(detail.history[0]?.date ?? null)}</p>
              </div>
            </div>

            {/* History Log */}
            <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2">
              {t('customers.historyLogTitle')}
            </h4>
            {isDetailLoading ? (
              <div className="flex justify-center py-10">
                <span className="loading loading-spinner loading-md text-primary"></span>
              </div>
            ) : detail.history.length === 0 ? (
              <div className="text-center py-10 text-base-content/40">
                <div className="text-3xl mb-2">🗂️</div>
                <p className="text-sm">{t('customers.noHistory')}</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {detail.history.map((h: CustomerHistoryItem) => (
                  <li
                    key={h.orderId}
                    className="border border-base-200 rounded-xl p-3 bg-base-200/30 hover:bg-base-200/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-primary truncate">#{h.orderNo}</p>
                        <p className="text-[11px] text-base-content/50">
                          📅 {formatDate(h.date)}
                          {' · '}
                          {h.date ? new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          {h.cashierName ? ` · 👤 ${h.cashierName}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-success">{h.amount.toLocaleString()} {t('common.kyat')}</p>
                        <span
                          className={`badge badge-xs font-bold ${
                            h.paymentStatus === 'PAID'
                              ? 'badge-success text-white'
                              : 'badge-warning'
                          }`}
                        >
                          {h.paymentStatus === 'PAID' ? `✅ ${t('common.paid')}` : `⏳ ${t('common.unpaid')}`}
                        </span>
                      </div>
                    </div>
                    {h.itemsSummary && (
                      <p className="text-[11px] text-base-content/60 mt-1.5 truncate" title={h.itemsSummary}>
                        🧺 {h.itemsSummary}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="modal-action mt-4">
              <button onClick={() => setDetail(null)} className="btn btn-sm btn-success text-white font-bold w-full">
                {t('common.close')}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDetail(null)}></div>
        </div>
      )}

      {/* Edit Customer Modal — add/modify name, phone, address */}
      {editingCustomer && (
        <div className="modal modal-open z-50">
          <div className="modal-box max-w-sm bg-base-100 p-5">
            <h3 className="font-bold text-lg text-success mb-1">
              ✏️ {t('customers.editTitle')}
            </h3>

            <div className="space-y-2 mt-4">
              <input
                type="tel"
                inputMode="tel"
                placeholder={t('checkout.customerPhonePh')}
                className="input input-bordered input-sm w-full font-mono"
                value={editingCustomer.phone}
                onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
              />
              <input
                type="text"
                placeholder={t('checkout.customerNamePh')}
                className="input input-bordered input-sm w-full"
                value={editingCustomer.name}
                onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
              />
              <input
                type="text"
                placeholder={t('checkout.customerPlacePh')}
                className="input input-bordered input-sm w-full"
                value={editingCustomer.address}
                onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
              />
              {editError && (
                <div className="alert alert-error text-white text-xs py-2">
                  <span>⚠️ {editError}</span>
                </div>
              )}
            </div>

            <div className="modal-action mt-4 gap-2">
              <button
                onClick={() => setEditingCustomer(null)}
                disabled={isSavingEdit}
                className="btn btn-ghost btn-sm flex-1"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="btn btn-success btn-sm text-white font-bold flex-1 gap-2"
              >
                {isSavingEdit ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    {t('common.saving')}
                  </>
                ) : (
                  t('common.save')
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !isSavingEdit && setEditingCustomer(null)}></div>
        </div>
      )}
    </div>
  );
};
