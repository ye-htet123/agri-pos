import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
  category?: string;
}

export interface IOrder extends Document {
  orderNo: string;
  items: IOrderItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  receivedAmount: number;
  changeAmount: number;
  paymentMethod: 'CASH' | 'KPAY' | 'WAVEPAY' | 'CARD';
  paymentStatus: 'PAID' | 'UNPAID';
  status: 'COMPLETED' | 'CANCELLED';
  customerName?: string;
  customerPhone?: string;
  customerPlace?: string;
  cultivationDate?: Date | null;
  cultivationStatus: 'NONE' | 'STARTED' | 'COMPLETED';
  cashierId: mongoose.Types.ObjectId;
  cashierName: string;
}

const OrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true },
  category: { type: String, default: '' },
});

const OrderSchema: Schema = new Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    items: [OrderItemSchema],
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    receivedAmount: { type: Number, required: true },
    changeAmount: { type: Number, required: true, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'KPAY', 'WAVEPAY', 'CARD'],
      default: 'CASH',
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'UNPAID'],
      default: 'PAID',
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'CANCELLED'],
      default: 'COMPLETED',
    },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '', trim: true },
    customerPlace: { type: String, default: '' },
    cultivationDate: { type: Date, default: null },
    cultivationStatus: {
      type: String,
      enum: ['NONE', 'STARTED', 'COMPLETED'],
      default: 'NONE',
    },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User' },
    cashierName: { type: String, default: 'Cashier' },
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
