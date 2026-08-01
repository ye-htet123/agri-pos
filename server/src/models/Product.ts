import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  code?: string;
  category: string;
  price: number;
  costPrice?: number;
  stock: number;
  unit: string;
  imageUrl?: string;
}

const ProductSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, default: '', trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    stock: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true, default: 'ခု' },
    imageUrl: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
