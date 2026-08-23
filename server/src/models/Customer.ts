import mongoose, { Schema, Document } from 'mongoose';

// One purchase log entry per completed checkout that included customer info
export interface IPurchaseEntry {
  orderId: mongoose.Types.ObjectId;
  orderNo: string;
  amount: number;
  date: Date;
  paymentStatus: 'PAID' | 'UNPAID';
}

export interface ICustomer extends Document {
  name: string;
  phone: string;
  address: string;
  totalSpent: number;
  totalDebt: number;
  purchasesCount: number;
  purchaseDates: IPurchaseEntry[];
}

const PurchaseEntrySchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNo: { type: String, default: '' },
    amount: { type: Number, default: 0, min: 0 },
    date: { type: Date, default: Date.now },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'UNPAID'],
      default: 'PAID',
    },
  },
  { _id: false }
);

const CustomerSchema: Schema = new Schema(
  {
    name: { type: String, default: '', trim: true },
    // Optional identity — a customer may register with a phone OR only a name.
    // Uniqueness is enforced via a partial index (non-empty phones only).
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    totalSpent: { type: Number, default: 0, min: 0 },
    totalDebt: { type: Number, default: 0, min: 0 },
    purchasesCount: { type: Number, default: 0, min: 0 },
    purchaseDates: { type: [PurchaseEntrySchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Unique among non-empty phones so multiple name-only profiles can coexist
CustomerSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $gt: '' } } }
);

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
