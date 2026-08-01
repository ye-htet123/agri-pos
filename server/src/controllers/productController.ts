import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { sendSuccess, sendError } from '../utils/responseHandler';
import { clearCacheByPattern } from '../middlewares/cacheMiddleware';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    const formatted = products.map((p) => ({
      id: (p._id as any).toString(),
      name: p.name,
      code: p.code,
      category: p.category,
      price: p.price,
      costPrice: p.costPrice,
      stock: p.stock,
      unit: p.unit,
      image: p.imageUrl,
    }));
    sendSuccess(res, 'ပစ္စည်းစာရင်း ရယူပြီးပါပြီ။', formatted);
  } catch (error: any) {
    sendError(res, error.message || 'ပစ္စည်းစာရင်း ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      sendError(res, 'ပစ္စည်း မတွေ့ရှိပါ။', 404);
      return;
    }

    sendSuccess(res, 'ပစ္စည်း အချက်အလက်', {
      id: (product._id as any).toString(),
      name: product.name,
      code: product.code,
      category: product.category,
      price: product.price,
      costPrice: product.costPrice,
      stock: product.stock,
      unit: product.unit,
      image: product.imageUrl,
    });
  } catch (error: any) {
    sendError(res, error.message || 'ပစ္စည်း အချက်အလက် ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, category, price, costPrice, stock, unit, image } = req.body;

    if (!name || price === undefined || stock === undefined) {
      sendError(res, 'ပစ္စည်းအမည်၊ ဈေးနှုန်း နှင့် လက်ကျန်အရေအတွက် ဖြည့်သွင်းပါ', 400);
      return;
    }

    const newProduct = await Product.create({
      name,
      code: code || '',
      category: category || 'အထွေထွေ',
      price: Number(price),
      costPrice: costPrice !== undefined ? Number(costPrice) : 0,
      stock: Number(stock),
      unit: unit || 'ထုတ်',
      imageUrl: image || '',
    });

    // Invalidate Redis product cache & dashboard cache
    await clearCacheByPattern('*products*');
    await clearCacheByPattern('*dashboard*');

    sendSuccess(
      res,
      'ပစ္စည်း သစ်ထည့်သွင်းပြီးပါပြီ။',
      {
        id: (newProduct._id as any).toString(),
        name: newProduct.name,
        code: newProduct.code,
        category: newProduct.category,
        price: newProduct.price,
        costPrice: newProduct.costPrice,
        stock: newProduct.stock,
        unit: newProduct.unit,
        image: newProduct.imageUrl,
      },
      201
    );
  } catch (error: any) {
    sendError(res, error.message || 'ပစ္စည်း သစ်ထည့်သွင်းရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, category, price, costPrice, stock, unit, image } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      sendError(res, 'ပစ္စည်း မတွေ့ရှိပါ။', 404);
      return;
    }

    if (name) product.name = name;
    if (code !== undefined) product.code = code;
    if (category) product.category = category;
    if (price !== undefined) product.price = Number(price);
    if (costPrice !== undefined) product.costPrice = Number(costPrice);
    if (stock !== undefined) product.stock = Number(stock);
    if (unit) product.unit = unit;
    if (image !== undefined) product.imageUrl = image;

    await product.save();

    // Invalidate Redis cache
    await clearCacheByPattern('*products*');
    await clearCacheByPattern('*dashboard*');

    sendSuccess(res, 'ပစ္စည်း အချက်အလက် ပြင်ဆင်ပြီးပါပြီ။', {
      id: (product._id as any).toString(),
      name: product.name,
      code: product.code,
      category: product.category,
      price: product.price,
      costPrice: product.costPrice,
      stock: product.stock,
      unit: product.unit,
      image: product.imageUrl,
    });
  } catch (error: any) {
    sendError(res, error.message || 'ပစ္စည်း အချက်အလက် ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      sendError(res, 'ပစ္စည်း မတွေ့ရှိပါ။', 404);
      return;
    }

    // Invalidate Redis cache
    await clearCacheByPattern('*products*');
    await clearCacheByPattern('*dashboard*');

    sendSuccess(res, 'ပစ္စည်း ပယ်ဖျက်ပြီးပါပြီ။');
  } catch (error: any) {
    sendError(res, error.message || 'ပစ္စည်း ပယ်ဖျက်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};
