import React, { useState } from 'react';
import type { Order } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import api from '../../services/api';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface OrderEditModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const OrderEditModal: React.FC<OrderEditModalProps> = ({
  isOpen,
  order,
  onClose,
  onUpdated,
}) => {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cultivationDate, setCultivationDate] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  // Check if order has any crop seeds items (မျိုးစေ့ category)
  const hasCropSeeds = order.items.some(
    (item) => item.category?.includes('မျိုးစေ့') || item.category?.toLowerCase().includes('cropseeds')
  );

  const isUnpaid = order.paymentStatus === 'UNPAID';
  const isCultivationActive = order.cultivationStatus === 'STARTED';
  const isCultivationDone = order.cultivationStatus === 'COMPLETED';
  // Completion allowed only once the duration threshold is reached
  // (UNDER / VALENCE / OVER) — hidden while PENDING
  const cultivationElapsedDays = order.cultivationDate
    ? Math.floor((Date.now() - new Date(order.cultivationDate).getTime()) / MS_PER_DAY)
    : 0;
  const canCompleteCultivation =
    cultivationElapsedDays >= (settings.cultivationDurationDays ?? 60);

  const finishWithSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      onUpdated();
      onClose();
    }, 1200);
  };

  const handleMarkAsPaid = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await api.put(`/orders/${order.id}`, {
        paymentStatus: 'PAID',
      });

      if (response.data?.success) {
        finishWithSuccess(t('orderEdit.paidSuccess'));
      } else {
        setErrorMessage(response.data?.message || t('common.error'));
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartCultivation = async () => {
    if (!cultivationDate) {
      setErrorMessage(t('orderEdit.dateRequired'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await api.put(`/orders/${order.id}`, {
        cultivationDate,
        cultivationStatus: 'STARTED',
      });

      if (response.data?.success) {
        finishWithSuccess(t('orderEdit.startSuccess'));
      } else {
        setErrorMessage(response.data?.message || t('common.error'));
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cultivation "Done" — completes the crop cycle for this order
  const handleMarkCultivationDone = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await api.put(`/orders/${order.id}`, {
        cultivationStatus: 'DONE',
      });

      if (response.data?.success) {
        finishWithSuccess(t('orderEdit.doneSuccess'));
      } else {
        setErrorMessage(response.data?.message || t('common.error'));
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCultivationDate('');
    setSuccessMessage(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-lg bg-base-100 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 pb-3 mb-4">
          <h3 className="font-bold text-lg text-primary">
            {t('orderEdit.title', { orderNo: order.orderNo })}
          </h3>
          <button onClick={handleClose} className="btn btn-ghost btn-sm btn-circle">✕</button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="alert alert-success text-white text-sm mb-4 py-2">
            <span>✅ {successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="alert alert-error text-white text-sm mb-4 py-2">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Order Info */}
        <div className="space-y-3 text-sm">
          {/* Customer Info */}
          <div className="bg-base-200/50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-base-content/60">{t('orderEdit.date')}:</span>
              <span className="font-semibold">{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/60">{t('orderEdit.operator')}:</span>
              <span className="font-semibold">{order.cashierName}</span>
            </div>
            {order.customerName && (
              <div className="flex justify-between">
                <span className="text-base-content/60">{t('orderEdit.customer')}:</span>
                <span className="font-semibold">{order.customerName}</span>
              </div>
            )}
            {order.customerPlace && (
              <div className="flex justify-between">
                <span className="text-base-content/60">{t('orderEdit.place')}:</span>
                <span className="font-semibold">{order.customerPlace}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-base-content/60">{t('orderEdit.payment')}:</span>
              <span className={`font-bold ${isUnpaid ? 'text-warning' : 'text-success'}`}>
                {isUnpaid ? t('orderEdit.unpaidStatus') : t('orderEdit.paidStatus')}
              </span>
            </div>
          </div>

          {/* Items List */}
          <div className="bg-base-200/30 rounded-lg p-3">
            <h4 className="font-bold text-xs text-base-content/60 mb-2">{t('orderEdit.itemsTitle')}</h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {item.product.name} (x{item.quantity})
                    {item.category?.includes('မျိုးစေ့') && (
                      <span className="ml-1 badge badge-xs badge-accent">🌱</span>
                    )}
                  </span>
                  <span className="font-semibold">
                    {(item.product.price * item.quantity).toLocaleString()} {t('common.kyat')}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-base-300 mt-2 pt-2 flex justify-between font-bold">
              <span>{t('orderEdit.subtotal')}:</span>
              <span className="text-success">{order.totalAmount.toLocaleString()} {t('common.kyat')}</span>
            </div>
          </div>

          {/* Mark as Paid Section — only for UNPAID orders */}
          {isUnpaid && (
            <div className="border border-warning/30 bg-warning/5 rounded-xl p-4">
              <h4 className="font-bold text-sm text-warning mb-2">{t('orderEdit.paymentSection')}</h4>
              <p className="text-xs text-base-content/60 mb-3">
                {t('orderEdit.paymentSectionDesc')}
              </p>
              <button
                onClick={handleMarkAsPaid}
                disabled={isSubmitting}
                className="btn btn-success btn-sm text-white font-bold w-full gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    {t('orderEdit.recording')}
                  </>
                ) : (
                  t('orderEdit.markPaidBtn')
                )}
              </button>
            </div>
          )}

          {/* Crop Seeds Cultivation Section */}
          {hasCropSeeds && (
            <div className="border border-accent/30 bg-accent/5 rounded-xl p-4">
              <h4 className="font-bold text-sm text-accent mb-2">{t('orderEdit.cultivationSection')}</h4>

              {isCultivationDone ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="badge badge-success badge-sm text-white">🌱 {t('orderEdit.doneBadge')}</span>
                  {order.cultivationDate && (
                    <span className="text-base-content/70">
                      {t('orderEdit.startedDate')}: {new Date(order.cultivationDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ) : isCultivationActive ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="badge badge-accent badge-sm text-white">🌱 {t('orderEdit.startedBadge')}</span>
                    {order.cultivationDate && (
                      <span className="text-base-content/70">
                        {t('orderEdit.startedDate')}: {new Date(order.cultivationDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {canCompleteCultivation && (
                    <button
                      onClick={handleMarkCultivationDone}
                      disabled={isSubmitting}
                      className="btn btn-success btn-sm text-white font-bold w-full gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          {t('orderEdit.recording')}
                        </>
                      ) : (
                        t('orderEdit.markDoneBtn')
                      )}
                    </button>
                  )}
                  {!canCompleteCultivation && (
                    <p className="text-[11px] text-base-content/50 text-center">
                      ⏳ {t('orderEdit.pendingNote')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-base-content/60">
                    {t('orderEdit.notStartedDesc')}
                  </p>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs font-semibold">{t('orderEdit.cultivationDateLabel')}</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered input-sm w-full"
                      value={cultivationDate}
                      onChange={(e) => setCultivationDate(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleStartCultivation}
                    disabled={isSubmitting || !cultivationDate}
                    className="btn btn-accent btn-sm text-white font-bold w-full gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        {t('orderEdit.recording')}
                      </>
                    ) : (
                      t('orderEdit.startBtn')
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-action mt-4">
          <button onClick={handleClose} className="btn btn-ghost btn-sm">
            {t('orderEdit.close')}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  );
};
