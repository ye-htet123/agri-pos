import { Request, Response } from 'express';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { sendSuccess, sendError } from '../utils/responseHandler';
import { clearCacheByPattern } from '../middlewares/cacheMiddleware';

const DEFAULT_CATEGORIES = [
  { name: 'ဓာတ်မြေဩဇာ', description: 'ဓာတ်မြေဩဇာ အမျိုးအစားများ' },
  { name: 'မြေသြဇာ', description: 'သဘာဝနှင့် အခြား မြေသြဇာများ' },
  { name: 'ပိုးသတ်ဆေး', description: 'ပိုးသတ်ဆေးနှင့် ပေါင်းသတ်ဆေးများ' },
  { name: 'မျိုးစေ့', description: 'စိုက်ပျိုးရေး မျိုးစေ့များ' },
  { name: 'စိုက်ပျိုးရေးသုံးကိရိယာ', description: 'စိုက်ပျိုးရေးသုံး ကိရိယာများနှင့် စက်ပစ္စည်းများ' },
  { name: 'အထွေထွေ', description: 'အထွေထွေ ပစ္စည်းများ' },
  { name: 'အခြား', description: 'အခြား ပစ္စည်းများ' },
];

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    let categories = await Category.find().sort({ createdAt: 1 });

    // Seed default categories if database is empty
    if (categories.length === 0) {
      categories = await Category.insertMany(DEFAULT_CATEGORIES);
    }

    const formatted = categories.map((c) => ({
      id: (c._id as any).toString(),
      name: c.name,
      description: c.description || '',
      isActive: c.isActive,
      createdAt: (c as any).createdAt,
    }));

    sendSuccess(res, 'အမျိုးအစားများ ရယူပြီးပါပြီ။', formatted);
  } catch (error: any) {
    sendError(res, error.message || 'အမျိုးအစားများ ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      sendError(res, 'အမျိုးအစား အမည် ဖြည့်သွင်းပါ', 400);
      return;
    }

    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      sendError(res, 'ဒီ အမျိုးအစား အမည် ရှိပြီးသား ဖြစ်သည်', 400);
      return;
    }

    const category = await Category.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      isActive: true,
    });

    await clearCacheByPattern('*categories*');

    sendSuccess(
      res,
      'အမျိုးအစား အသစ်ထည့်သွင်းပြီးပါပြီ။',
      {
        id: (category._id as any).toString(),
        name: category.name,
        description: category.description,
        isActive: category.isActive,
      },
      201
    );
  } catch (error: any) {
    sendError(res, error.message || 'အမျိုးအစား ထည့်သွင်းရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      sendError(res, 'အမျိုးအစား မတွေ့ရှိပါ။', 404);
      return;
    }

    if (name && name.trim() !== category.name) {
      const duplicate = await Category.findOne({ name: name.trim(), _id: { $ne: id } });
      if (duplicate) {
        sendError(res, 'ဒီ အမျိုးအစား အမည် ရှိပြီးသား ဖြစ်သည်', 400);
        return;
      }
      // If category name changes, update associated products
      const oldName = category.name;
      category.name = name.trim();
      await Product.updateMany({ category: oldName }, { category: name.trim() });
    }

    if (description !== undefined) category.description = description.trim();
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();
    await clearCacheByPattern('*categories*');
    await clearCacheByPattern('*products*');

    sendSuccess(res, 'အမျိုးအစား အချက်အလက် ပြင်ဆင်ပြီးပါပြီ။', {
      id: (category._id as any).toString(),
      name: category.name,
      description: category.description,
      isActive: category.isActive,
    });
  } catch (error: any) {
    sendError(res, error.message || 'အမျိုးအစား ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      sendError(res, 'အမျိုးအစား မတွေ့ရှိပါ။', 404);
      return;
    }

    // Check if products exist in this category before deleting
    const productCount = await Product.countDocuments({ category: category.name });
    if (productCount > 0) {
      sendError(
        res,
        `ဒီ အမျိုးအစားတွင် ပစ္စည်း (${productCount}) ခု ရှိနေသေးသဖြင့် ဖျက်၍ မရပါ`,
        400
      );
      return;
    }

    await Category.findByIdAndDelete(id);
    await clearCacheByPattern('*categories*');

    sendSuccess(res, 'အမျိုးအစား ဖျက်ပြီးပါပြီ။');
  } catch (error: any) {
    sendError(res, error.message || 'အမျိုးအစား ဖျက်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};
