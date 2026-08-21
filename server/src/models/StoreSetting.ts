import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreSetting extends Document {
  shopName: string;
  address: string;
  phone: string;
  receiptHeader?: string;
  receiptFooter: string;
  taxRate: number;
  cultivationDurationDays: number;
  unpaidDurationDays: number;
}

const StoreSettingSchema: Schema = new Schema(
  {
    shopName: { type: String, required: true, default: 'စိုက်ပျိုးရေး ပစ္စည်းဆိုင်' },
    address: { type: String, default: 'ရန်ကုန်မြို့' },
    phone: { type: String, default: '09123456789' },
    receiptHeader: { type: String, default: 'ဝယ်ယူအားပေးမှုကို ကျေးဇူးအထူးတင်ရှိပါသည်' },
    receiptFooter: { type: String, default: 'ဝယ်ယူပြီးပစ္စည်း ပြန်မလဲပါ' },
    taxRate: { type: Number, default: 0 },
    cultivationDurationDays: { type: Number, default: 60, min: 0 },
    unpaidDurationDays: { type: Number, default: 60, min: 0 },
  },
  {
    timestamps: true,
  }
);

export const StoreSetting = mongoose.model<IStoreSetting>('StoreSetting', StoreSettingSchema);
