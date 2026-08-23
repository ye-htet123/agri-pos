import { Request, Response } from 'express';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { sendSuccess, sendError } from '../utils/responseHandler';
import { clearCacheByPattern } from '../middlewares/cacheMiddleware';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/v1/customers?search= — searchable list (by name or phone).
// purchaseDates is stripped server-side so the payload stays small;
// lastPurchaseDate is derived in the pipeline instead.
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const match: Record<string, unknown> = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      match.$or = [{ name: rx }, { phone: rx }];
    }

    const customers = await Customer.aggregate([
      { $match: match },
      {
        $addFields: {
          lastPurchaseDate: { $max: '$purchaseDates.date' },
        },
      },
      { $project: { purchaseDates: 0, __v: 0 } },
      { $sort: { lastPurchaseDate: -1, createdAt: -1 } },
    ]);

    const formatted = customers.map((c: any) => ({
      id: c._id.toString(),
      name: c.name || '',
      phone: c.phone,
      address: c.address || '',
      totalSpent: c.totalSpent || 0,
      totalDebt: c.totalDebt || 0,
      purchasesCount: c.purchasesCount || 0,
      lastPurchaseDate: c.lastPurchaseDate || null,
    }));

    sendSuccess(res, 'ဝယ်ယူသူများ ရယူပြီးပါပြီ။', formatted);
  } catch (error: any) {
    sendError(res, error.message || 'ဝယ်ယူသူများ ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

// GET /api/v1/customers/lookup?phone=9xxxxxxxxx — exact phone match used by
// the checkout modal to auto-fill a returning customer's details.
export const lookupCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const phone = typeof req.query.phone === 'string' ? req.query.phone.trim() : '';
    if (!phone) {
      sendSuccess(res, 'ဖုန်းနံပါတ် မရှိပါ။', null);
      return;
    }

    const customer = await Customer.findOne({ phone }).select('name phone address totalSpent totalDebt purchasesCount').lean();
    if (!customer) {
      sendSuccess(res, 'ဝယ်ယူသူ မတွေ့ရှိပါ။', null);
      return;
    }

    sendSuccess(res, 'ဝယ်ယူသူ တွေ့ရှိပါသည်။', {
      id: (customer._id as any).toString(),
      name: (customer as any).name || '',
      phone: (customer as any).phone,
      address: (customer as any).address || '',
      totalSpent: (customer as any).totalSpent || 0,
      totalDebt: (customer as any).totalDebt || 0,
      purchasesCount: (customer as any).purchasesCount || 0,
    });
  } catch (error: any) {
    sendError(res, error.message || 'ဝယ်ယူသူ ရှာဖွေရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

// GET /api/v1/customers/:id — full profile plus the purchase history log with
// per-order receipt summaries resolved from the Orders collection.
export const getCustomerDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      sendError(res, 'ဝယ်ယူသူ မတွေ့ရှိပါ။', 404);
      return;
    }

    const orderIds = customer.purchaseDates.map((p) => p.orderId);
    const orders = await Order.find({ _id: { $in: orderIds } })
      .sort({ createdAt: -1 })
      .select('orderNo items totalAmount paymentStatus cashierName createdAt');

    const ordersById = new Map(orders.map((o) => [(o._id as any).toString(), o]));

    const history = customer.purchaseDates
      .map((p) => {
        const order = ordersById.get(p.orderId.toString());
        return {
          orderId: p.orderId.toString(),
          orderNo: p.orderNo || order?.orderNo || '',
          amount: p.amount ?? order?.totalAmount ?? 0,
          date: p.date || (order as any)?.createdAt || null,
          paymentStatus: order?.paymentStatus || 'PAID',
          itemsSummary:
            order?.items.map((i) => `${i.name} x${i.quantity}`).join(', ') || '',
          cashierName: order?.cashierName || '',
        };
      })
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    sendSuccess(res, 'ဝယ်ယူသူ အသေးစိတ် အချက်အလက်', {
      id: (customer._id as any).toString(),
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      totalSpent: customer.totalSpent,
      totalDebt: customer.totalDebt,
      purchasesCount: customer.purchasesCount,
      history,
    });
  } catch (error: any) {
    sendError(res, error.message || 'ဝယ်ယူသူ အသေးစိတ် ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

// POST /api/v1/customers/bulk-delete — remove selected customer profiles.
// Orders are left untouched; only the aggregated profiles are deleted.
export const bulkDeleteCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerIds } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      sendError(res, 'ဖျက်ရန် ဝယ်ယူသူများ ရွေးချယ်ပါ။', 400);
      return;
    }

    const result = await Customer.deleteMany({ _id: { $in: customerIds } });
    await clearCacheByPattern('*customers*');

    sendSuccess(res, `ဝယ်ယူသူ ${result.deletedCount} ဦး ဖျက်ပြီးပါပြီ။`, {
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    sendError(res, error.message || 'ဝယ်ယူသူများ ဖျက်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

// PUT /api/v1/customers/:id — add/modify profile details (name, phone, address)
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, address } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      sendError(res, 'ဝယ်ယူသူ မတွေ့ရှိပါ။', 404);
      return;
    }

    if (phone !== undefined) {
      const normalizedPhone = String(phone).trim();
      if (normalizedPhone && normalizedPhone !== customer.phone) {
        const duplicate = await Customer.findOne({
          phone: normalizedPhone,
          _id: { $ne: id },
        });
        if (duplicate) {
          sendError(res, 'ဒီ ဖုန်းနံပါတ်ဖြင့် ဝယ်ယူသူ ရှိပြီးသား ဖြစ်သည်', 400);
          return;
        }
      }
      customer.phone = normalizedPhone;
    }

    if (name !== undefined) customer.name = String(name).trim();
    if (address !== undefined) customer.address = String(address).trim();

    await customer.save();
    await clearCacheByPattern('*customers*');

    sendSuccess(res, 'ဝယ်ယူသူ အချက်အလက် ပြင်ဆင်ပြီးပါပြီ။', {
      id: (customer._id as any).toString(),
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      totalSpent: customer.totalSpent,
      totalDebt: customer.totalDebt,
      purchasesCount: customer.purchasesCount,
    });
  } catch (error: any) {
    sendError(res, error.message || 'ဝယ်ယူသူ ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};
