import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface IOrder extends Document {
  orderNo: string;
  items: IOrderItem[];
  totalAmount: number;
  receivedAmount: number;
  changeAmount: number;
  paymentMethod: 'CASH' | 'KPAY' | 'WAVEPAY' | 'CARD';
  status: 'COMPLETED' | 'CANCELLED';
  cashierId: mongoose.Types.ObjectId;
  cashierName: string;
}

const OrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true },
});

const OrderSchema: Schema = new Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true },
    receivedAmount: { type: Number, required: true },
    changeAmount: { type: Number, required: true, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'KPAY', 'WAVEPAY', 'CARD'],
      default: 'CASH',
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'CANCELLED'],
      default: 'COMPLETED',
    },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User' },
    cashierName: { type: String, default: 'Cashier' },
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
