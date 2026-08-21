import { Request, Response } from 'express';
import { StoreSetting } from '../models/StoreSetting';
import { sendSuccess, sendError } from '../utils/responseHandler';

export const getStoreSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await StoreSetting.findOne();
    if (!settings) {
      settings = await StoreSetting.create({
        shopName: 'စိုက်ပျိုးရေး ပစ္စည်းဆိုင်',
        address: 'ရန်ကုန်မြို့',
        phone: '09123456789',
        receiptHeader: 'ဝယ်ယူအားပေးမှုကို ကျေးဇူးအထူးတင်ရှိပါသည်',
        receiptFooter: 'ဝယ်ယူပြီးပစ္စည်း ပြန်မလဲပါ',
        taxRate: 0,
      });
    }

    sendSuccess(res, 'ဆိုင်အချက်အလက် ဆက်တင်များ', {
      shopName: settings.shopName,
      address: settings.address,
      phone: settings.phone,
      receiptHeader: settings.receiptHeader,
      receiptFooter: settings.receiptFooter,
      taxRate: settings.taxRate,
      cultivationDurationDays: settings.cultivationDurationDays ?? 60,
      unpaidDurationDays: settings.unpaidDurationDays ?? 60,
    });
  } catch (error: any) {
    sendError(res, error.message || 'ဆိုင်ဆက်တင်များ ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const updateStoreSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopName, address, phone, receiptHeader, receiptFooter, taxRate, cultivationDurationDays, unpaidDurationDays } = req.body;

    let settings = await StoreSetting.findOne();
    if (!settings) {
      settings = new StoreSetting();
    }

    if (shopName) settings.shopName = shopName;
    if (address) settings.address = address;
    if (phone) settings.phone = phone;
    if (receiptHeader !== undefined) settings.receiptHeader = receiptHeader;
    if (receiptFooter !== undefined) settings.receiptFooter = receiptFooter;
    if (taxRate !== undefined) settings.taxRate = Number(taxRate);
    if (cultivationDurationDays !== undefined) {
      settings.cultivationDurationDays = Math.max(0, Number(cultivationDurationDays) || 0);
    }
    if (unpaidDurationDays !== undefined) {
      settings.unpaidDurationDays = Math.max(0, Number(unpaidDurationDays) || 0);
    }

    await settings.save();

    sendSuccess(res, 'ဆိုင်အချက်အလက် ပြင်ဆင်ပြီးပါပြီ။', {
      shopName: settings.shopName,
      address: settings.address,
      phone: settings.phone,
      receiptHeader: settings.receiptHeader,
      receiptFooter: settings.receiptFooter,
      taxRate: settings.taxRate,
      cultivationDurationDays: settings.cultivationDurationDays,
      unpaidDurationDays: settings.unpaidDurationDays,
    });
  } catch (error: any) {
    sendError(res, error.message || 'ဆိုင်ဆက်တင် ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};
