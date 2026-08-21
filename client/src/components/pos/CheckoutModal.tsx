import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useProducts } from '../../context/ProductContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cashierName: string;
}

interface CompletedOrderSnapshot {
  orderNo: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  totalAmount: number;
  receivedAmount: number;
  changeAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  customerPlace: string;
  cashierName: string;
  createdAt: Date | string;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cashierName,
}) => {
  const { cart, totalPrice, checkout, clearCart } = useCart();
  const { settings } = useSettings();
  const { refreshProducts } = useProducts();

  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID'>('PAID');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPlace, setCustomerPlace] = useState<string>('');
  const [showCustomerPopup, setShowCustomerPopup] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Snapshot state to prevent data loss when cart is cleared
  const [completedOrder, setCompletedOrder] = useState<CompletedOrderSnapshot | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Receipt-${completedOrder?.orderNo || Date.now()}`,
    onAfterPrint: () => {
      clearCart();
      resetForm();
      onSuccess();
      onClose();
    },
  });

  const resetForm = () => {
    setReceivedAmount('');
    setPaymentStatus('PAID');
    setCustomerName('');
    setCustomerPlace('');
    setShowCustomerPopup(false);
    setIsPaid(false);
    setCompletedOrder(null);
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  const numericReceived = parseFloat(receivedAmount) || 0;
  const changeAmount = numericReceived - totalPrice;

  // Validation: PAID requires sufficient received amount; UNPAID can proceed directly
  const isValid = paymentStatus === 'UNPAID'
    ? totalPrice > 0 && !isSubmitting
    : numericReceived >= totalPrice && totalPrice > 0 && !isSubmitting;

  const handleConfirmPayment = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await checkout({
      receivedAmount: paymentStatus === 'UNPAID' ? 0 : numericReceived,
      paymentMethod,
      paymentStatus,
      customerName: customerName.trim(),
      customerPlace: customerPlace.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      // Refresh products stock list in UI
      await refreshProducts();

      const orderData = result.order;
      const snapshot: CompletedOrderSnapshot = {
        orderNo: orderData?.orderNo || `INV-${Date.now().toString().slice(-6)}`,
        items: orderData?.items?.length
          ? orderData.items.map((i: any) => ({
              name: i.name,
              quantity: i.quantity,
              price: i.price,
              subtotal: i.subtotal || i.price * i.quantity,
            }))
          : cart.map((item) => ({
              name: item.product.name,
              quantity: item.quantity,
              price: item.product.price,
              subtotal: item.product.price * item.quantity,
            })),
        totalAmount: orderData?.totalAmount ?? totalPrice,
        receivedAmount: orderData?.receivedAmount ?? (paymentStatus === 'UNPAID' ? 0 : numericReceived),
        changeAmount: orderData?.changeAmount ?? (paymentStatus === 'UNPAID' ? 0 : changeAmount),
        paymentMethod: orderData?.paymentMethod || paymentMethod,
        paymentStatus: orderData?.paymentStatus || paymentStatus,
        customerName: orderData?.customerName || customerName,
        customerPlace: orderData?.customerPlace || customerPlace,
        cashierName: orderData?.cashierName || cashierName,
        createdAt: orderData?.createdAt || new Date(),
      };

      // 1. Save complete order snapshot to state for Receipt Display!
      setCompletedOrder(snapshot);

      // 2. Clear cart AFTER setting the last order snapshot
      clearCart();

      // 3. Open Receipt View
      setIsPaid(true);
    } else {
      setErrorMessage(result.message || 'ငွေရှင်းမှု မအောင်မြင်ပါ');
    }
  };

  const handleCloseAll = () => {
    if (isPaid) {
      clearCart();
      resetForm();
      onSuccess();
    }
    resetForm();
    onClose();
  };

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-md bg-base-100 p-6">
        {/* Step 1: Payment Input Form */}
        {!isPaid ? (
          <div>
            {/* Header with Customer Button */}
            <div className="flex items-center justify-between border-b border-base-200 pb-2 mb-4">
              <h3 className="font-bold text-xl text-success">
                🧾 ငွေရှင်းလွှာ အကျဉ်းချုပ်
              </h3>
              <button
                onClick={() => setShowCustomerPopup(!showCustomerPopup)}
                className={`btn btn-sm btn-circle ${
                  customerName || customerPlace
                    ? 'btn-success text-white'
                    : 'btn-ghost text-base-content/60'
                }`}
                title="ဝယ်ယူသူ အချက်အလက်"
              >
                👤
              </button>
            </div>

            {/* Customer Info Popup */}
            {showCustomerPopup && (
              <div className="bg-base-200/70 rounded-xl p-3 mb-4 space-y-2 border border-base-300 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-base-content/70">👤 ဝယ်ယူသူ အချက်အလက်</span>
                  <button
                    onClick={() => setShowCustomerPopup(false)}
                    className="btn btn-ghost btn-xs btn-circle"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="ဝယ်ယူသူ အမည် (ထည့်ရန် မလိုပါ)"
                  className="input input-bordered input-sm w-full"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="နေရပ်/ဒေသ (ထည့်ရန် မလိုပါ)"
                  className="input input-bordered input-sm w-full"
                  value={customerPlace}
                  onChange={(e) => setCustomerPlace(e.target.value)}
                />
              </div>
            )}

            {errorMessage && (
              <div className="alert alert-error text-white text-sm mb-4 py-2">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            {/* Order Items Preview */}
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto bg-base-200/50 p-3 rounded-lg text-sm">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="flex justify-between">
                  <span>
                    {product.name} (x{quantity})
                  </span>
                  <span className="font-semibold">
                    {(product.price * quantity).toLocaleString()} ကျပ်
                  </span>
                </div>
              ))}
            </div>

            {/* Calculation Details */}
            <div className="space-y-3 border-t border-base-200 pt-3">
              <div className="flex justify-between text-base font-bold">
                <span>ကျသင့်ငွေ:</span>
                <span className="text-success">{totalPrice.toLocaleString()} ကျပ်</span>
              </div>

              {/* Payment Status Toggle (PAID / UNPAID) */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">ငွေပေးချေမှု အခြေအနေ</span>
                </label>
                <div className="join w-full">
                  <button
                    onClick={() => setPaymentStatus('PAID')}
                    className={`join-item btn btn-sm flex-1 font-bold ${
                      paymentStatus === 'PAID'
                        ? 'btn-success text-white'
                        : 'btn-ghost bg-base-200'
                    }`}
                  >
                    ✅ ပေးပြီး (Paid)
                  </button>
                  <button
                    onClick={() => setPaymentStatus('UNPAID')}
                    className={`join-item btn btn-sm flex-1 font-bold ${
                      paymentStatus === 'UNPAID'
                        ? 'btn-warning text-white'
                        : 'btn-ghost bg-base-200'
                    }`}
                  >
                    ⏳ အကြွေးကျန် (Unpaid)
                  </button>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">ငွေပေးချေမှု နည်းလမ်း</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="select select-bordered select-sm w-full font-bold"
                >
                  <option value="CASH">💵 တိုက်ရိုက် ငွေသား (CASH)</option>
                  <option value="KPAY">📱 KPay</option>
                  <option value="WAVEPAY">🌊 Wave Money</option>
                  <option value="CARD">💳 ကတ်ဖြင့် ပေးချေမည် (Card)</option>
                </select>
              </div>

              {/* Conditionally show Amount Received — only for PAID */}
              {paymentStatus === 'PAID' && (
                <>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs font-semibold">လက်ခံရရှိငွေ (ကျပ်)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="input input-bordered input-success text-lg font-bold w-full"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="flex justify-between text-base font-bold pt-2">
                    <span>ပြန်အမ်းငွေ:</span>
                    <span
                      className={
                        changeAmount < 0 ? 'text-error text-sm font-semibold' : 'text-success font-extrabold text-lg'
                      }
                    >
                      {changeAmount < 0
                        ? 'လက်ခံရရှိငွေ မလုံလောက်ပါ။'
                        : `${changeAmount.toLocaleString()} ကျပ်`}
                    </span>
                  </div>
                </>
              )}

              {/* UNPAID info message */}
              {paymentStatus === 'UNPAID' && (
                <div className="alert bg-warning/10 border-warning/30 py-2 text-sm">
                  <span>⏳ အကြွေးအနေဖြင့် မှတ်တမ်းတင်မည်ဖြစ်ပါသည်။</span>
                </div>
              )}

              <p className="text-xs text-base-content/40 mt-2">
                အော်ပရေတာ: <span className="font-semibold text-base-content/60">{cashierName}</span>
              </p>
            </div>

            {/* Actions */}
            <div className="modal-action mt-6">
              <button onClick={handleCloseAll} disabled={isSubmitting} className="btn btn-ghost btn-sm">
                မလုပ်တော့ပါ
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={!isValid}
                className="btn btn-success btn-sm text-white font-bold gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    ငွေရှင်းနေသည်...
                  </>
                ) : (
                  'ငွေရှင်းမှု အတည်ပြုမည်'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Printable Receipt View */
          completedOrder && (
            <div>
              <div className="alert alert-success text-white py-2 text-sm mb-4">
                <span>✅ ငွေရှင်းမှု အောင်မြင်ပါသည်။ ပြေစာ ရိုက်ထုတ်နိုင်ပါပြီ။</span>
              </div>

              {/* Thermal Receipt Area */}
              <div
                ref={contentRef}
                className="printable-receipt text-xs font-mono space-y-3 p-4 border border-dashed border-gray-300 rounded-lg bg-white text-black"
              >
                {/* Store Header */}
                <div className="text-center space-y-1">
                  <h2 className="font-black text-base uppercase leading-normal">{settings.storeName}</h2>
                  <p className="text-[11px] text-base-content/60 leading-normal">{settings.receiptHeader}</p>
                  <p className="text-[10px] text-base-content/50 leading-normal">{settings.address}</p>
                  <p className="text-[10px] text-base-content/50 leading-normal">📞 {settings.phone}</p>
                </div>

                <div className="border-b border-dashed border-gray-400 my-2"></div>

                {/* Transaction Metadata */}
                <div className="text-[10px] space-y-0.5 text-base-content/60">
                  <div className="flex justify-between">
                    <span>ရက်စွဲ: {new Date(completedOrder.createdAt).toLocaleDateString()}</span>
                    <span>
                      အချိန်: {new Date(completedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>အော်ပရေတာ: {completedOrder.cashierName}</span>
                    <span>ပြေစာ: #{completedOrder.orderNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ငွေပေးချေမှု: {completedOrder.paymentMethod}</span>
                    <span className={completedOrder.paymentStatus === 'UNPAID' ? 'text-red-600 font-bold' : ''}>
                      {completedOrder.paymentStatus === 'UNPAID' ? '⏳ အကြွေးကျန်' : '✅ ပေးပြီး'}
                    </span>
                  </div>
                  {/* Customer Info on Receipt */}
                  {(completedOrder.customerName || completedOrder.customerPlace) && (
                    <div className="flex justify-between pt-1">
                      {completedOrder.customerName && <span>ဝယ်ယူသူ: {completedOrder.customerName}</span>}
                      {completedOrder.customerPlace && <span>နေရပ်: {completedOrder.customerPlace}</span>}
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-gray-400 my-2"></div>

                {/* Items List */}
                <div className="space-y-1.5">
                  {completedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-black">
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-[10px] text-base-content/50">
                          {item.quantity} x {item.price.toLocaleString()} ကျပ်
                        </p>
                      </div>
                      <span className="font-bold">
                        {item.subtotal.toLocaleString()} ကျပ်
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-b border-dashed border-gray-400 my-2"></div>

                {/* Calculation Summary */}
                <div className="space-y-1 text-black">
                  <div className="flex justify-between font-bold">
                    <span>စုစုပေါင်း:</span>
                    <span>{completedOrder.totalAmount.toLocaleString()} ကျပ်</span>
                  </div>
                  {completedOrder.paymentStatus === 'PAID' && (
                    <>
                      <div className="flex justify-between text-base-content/60">
                        <span>ပေးငွေ:</span>
                        <span>{completedOrder.receivedAmount.toLocaleString()} ကျပ်</span>
                      </div>
                      <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-200">
                        <span>ပြန်အမ်းငွေ:</span>
                        <span>{completedOrder.changeAmount.toLocaleString()} ကျပ်</span>
                      </div>
                    </>
                  )}
                  {completedOrder.paymentStatus === 'UNPAID' && (
                    <div className="flex justify-between font-bold text-red-600 pt-1 border-t border-gray-200">
                      <span>အကြွေးကျန်:</span>
                      <span>{completedOrder.totalAmount.toLocaleString()} ကျပ်</span>
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-gray-400 my-2"></div>

                {/* Receipt Footer */}
                <div className="text-center text-[10px] text-base-content/60 pt-1">
                  <p className="font-semibold leading-normal">{settings.receiptFooter}</p>
                  <p className="mt-1 text-[9px] text-base-content/40">--- Powered by AgriPOS ---</p>
                </div>
              </div>

              {/* Print & Close Actions */}
              <div className="modal-action flex justify-between gap-2 mt-4">
                <button onClick={handleCloseAll} className="btn btn-ghost btn-sm flex-1">
                  ပြီးပြီ (မရိုက်ထုတ်ပါ)
                </button>
                <button
                  onClick={() => handlePrint()}
                  className="btn btn-success btn-sm text-white flex-1"
                >
                  🖨️ ပြေစာ ရိုက်ထုတ်မည်
                </button>
              </div>
            </div>
          )
        )}
      </div>
      <div className="modal-backdrop" onClick={handleCloseAll}></div>
    </div>
  );
};