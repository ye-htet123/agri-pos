import { Response } from 'express';
import mongoose from 'mongoose';
import type { PipelineStage } from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { StoreSetting } from '../models/StoreSetting';
import { Category } from '../models/Category';
import { Customer } from '../models/Customer';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sendSuccess, sendError } from '../utils/responseHandler';
import { clearCacheByPattern } from '../middlewares/cacheMiddleware';

// Round a money value to 2 decimal places
const roundMoney = (value: number): number => Math.round(value * 100) / 100;

// Parse ?startDate / ?endDate (YYYY-MM-DD) into an inclusive createdAt range
const parseDateRange = (query: Record<string, unknown>): { $gte?: Date; $lte?: Date } | null => {
  const range: { $gte?: Date; $lte?: Date } = {};

  if (typeof query.startDate === 'string' && query.startDate && !isNaN(Date.parse(query.startDate))) {
    const start = new Date(`${query.startDate}T00:00:00`);
    range.$gte = new Date(start.getTime() - start.getTimezoneOffset() * 60000);
  }
  if (typeof query.endDate === 'string' && query.endDate && !isNaN(Date.parse(query.endDate))) {
    const end = new Date(`${query.endDate}T23:59:59.999`);
    range.$lte = new Date(end.getTime() - end.getTimezoneOffset() * 60000);
  }

  return Object.keys(range).length > 0 ? range : null;
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      items,
      receivedAmount,
      paymentMethod,
      paymentStatus,
      paymentType,
      customerName,
      customerPhone,
      customerPlace,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      sendError(res, 'အရောင်းခြင်းတောင်းထဲတွင် ပစ္စည်းမရှိပါ။', 400);
      return;
    }

    // Credit sale = UNPAID status (paymentType 'CREDIT' maps onto it for
    // backward compatibility with the existing PAID/UNPAID contract)
    const isUnpaid = paymentStatus === 'UNPAID' || paymentType === 'CREDIT';

    // ── Server-side credit validation ─────────────────────────────────
    // A credit sale strictly requires the customer's name AND phone number.
    const trimmedName = typeof customerName === 'string' ? customerName.trim() : '';
    const normalizedPhone = typeof customerPhone === 'string' ? customerPhone.trim() : '';
    if (isUnpaid && (!trimmedName || !normalizedPhone)) {
      sendError(res, 'အကြွေးကျန်ဖြင့် ရောင်းချပါက ဝယ်ယူသူ အချက်အလက် ဖြည့်သွင်းရန် လိုအပ်ပါသည်', 400);
      return;
    }

    let totalAmount = 0;
    const orderItems: any[] = [];
    const productsToUpdate: { productId: string; quantity: number }[] = [];

    // Phase 1: Validate all items exist and have sufficient stock
    for (const item of items) {
      const productId = item.product?.id || item.productId;
      const quantity = Number(item.quantity);

      if (!productId || isNaN(quantity) || quantity <= 0) {
        sendError(res, 'အော်ဒါ ပစ္စည်း အချက်အလက် မမှန်ကန်ပါ။', 400);
        return;
      }

      const product = await Product.findById(productId);
      if (!product) {
        sendError(res, `ပစ္စည်း မတွေ့ရှိပါ (ID: ${productId})`, 404);
        return;
      }

      if (product.stock < quantity) {
        sendError(
          res,
          `ပစ္စည်း "${product.name}" ၏ လက်ကျန်မလုံလောက်ပါ (လက်ကျန်: ${product.stock})`,
          400
        );
        return;
      }

      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : product.price;
      const subtotal = unitPrice * quantity;
      totalAmount += subtotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        price: unitPrice,
        costPrice: product.costPrice || 0,
        quantity,
        subtotal,
        category: product.category || '',
      });

      productsToUpdate.push({
        productId: (product._id as any).toString(),
        quantity,
      });
    }

    // Phase 2: Deduct stock atomically in MongoDB for each product
    for (const p of productsToUpdate) {
      await Product.findByIdAndUpdate(p.productId, {
        $inc: { stock: -p.quantity },
      });
    }

    // Handle received amount based on payment status
    // Tax: read the active rate from store settings (single source of truth)
    const settingsDoc = await StoreSetting.findOne().select('taxRate').lean();
    const taxRate = Number(settingsDoc?.taxRate) || 0;
    const subtotalAmount = roundMoney(totalAmount);
    const taxAmount = roundMoney(subtotalAmount * (taxRate / 100));
    const grandTotal = roundMoney(subtotalAmount + taxAmount);
    totalAmount = grandTotal;

    let recAmount: number;
    let changeAmt: number;

    if (isUnpaid) {
      recAmount = 0;
      changeAmt = 0;
    } else {
      recAmount = Number(receivedAmount) || grandTotal;
      changeAmt = Math.max(0, recAmount - grandTotal);
    }

    let cashierName = 'Cashier';
    if (req.user?.userId) {
      const userObj = await User.findById(req.user.userId);
      if (userObj) cashierName = userObj.name;
    }

    const orderNo = `INV-${Date.now().toString().slice(-6)}`;

    // Phase 3: Create Order
    const newOrder = await Order.create({
      orderNo,
      items: orderItems,
      subtotal: subtotalAmount,
      taxRate,
      taxAmount,
      totalAmount,
      receivedAmount: recAmount,
      changeAmount: changeAmt,
      paymentMethod: paymentMethod || 'CASH',
      paymentStatus: isUnpaid ? 'UNPAID' : 'PAID',
      status: 'COMPLETED',
      customerName: customerName || '',
      customerPhone: normalizedPhone,
      customerPlace: customerPlace || '',
      cashierId: req.user?.userId,
      cashierName,
    });

    // Phase 3b: Register/update the customer profile. Identity is the phone
    // number when provided, otherwise the name (name-only customers are also
    // captured). Failures here must never block the checkout itself.
    if (trimmedName || normalizedPhone) {
      try {
        const purchaseEntry = {
          orderId: newOrder._id,
          orderNo,
          amount: grandTotal,
          date: (newOrder as any).createdAt || new Date(),
          paymentStatus: isUnpaid ? 'UNPAID' : 'PAID',
        };
        const updateOps: Record<string, unknown> = {
          $inc: {
            totalSpent: grandTotal,
            purchasesCount: 1,
            ...(isUnpaid ? { totalDebt: grandTotal } : {}),
          },
          $push: { purchaseDates: purchaseEntry },
        };
        if (trimmedName) updateOps.$set = { name: trimmedName };
        const trimmedPlace = typeof customerPlace === 'string' ? customerPlace.trim() : '';
        if (trimmedPlace) updateOps.$set = { ...(updateOps.$set as object), address: trimmedPlace };

        const identityQuery = normalizedPhone ? { phone: normalizedPhone } : { name: trimmedName };
        await Customer.findOneAndUpdate(identityQuery, updateOps, { upsert: true });
        await clearCacheByPattern('*customers*');
      } catch (customerError) {
        console.error('[Customer Upsert Error]:', customerError);
      }
    }

    // Phase 4: Invalidate Redis caches
    await clearCacheByPattern('*products*');
    await clearCacheByPattern('*orders*');
    await clearCacheByPattern('*dashboard*');

    sendSuccess(
      res,
      'ငွေရှင်းမှု အောင်မြင်ပါသည်။',
      {
        id: (newOrder._id as any).toString(),
        orderNo: newOrder.orderNo,
        items: newOrder.items,
        subtotal: newOrder.subtotal,
        taxRate: newOrder.taxRate,
        taxAmount: newOrder.taxAmount,
        totalAmount: newOrder.totalAmount,
        receivedAmount: newOrder.receivedAmount,
        changeAmount: newOrder.changeAmount,
        paymentStatus: newOrder.paymentStatus,
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone,
        customerPlace: newOrder.customerPlace,
        cashierName: newOrder.cashierName,
        createdAt: (newOrder as any).createdAt,
      },
      201
    );
  } catch (error: any) {
    sendError(res, error.message || 'ငွေရှင်းရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Optional ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD range filter
    const dateRange = parseDateRange(req.query as Record<string, unknown>);
    const orders = await Order.find(dateRange ? { createdAt: dateRange } : {}).sort({ createdAt: -1 });

    const formatted = orders.map((o) => ({
      id: (o._id as any).toString(),
      orderNo: o.orderNo,
      items: o.items.map((i) => ({
        product: { id: i.productId.toString(), name: i.name, price: i.price },
        quantity: i.quantity,
        costPrice: i.costPrice || 0,
        category: i.category || '',
      })),
      subtotal: o.subtotal ?? o.totalAmount,
      taxRate: o.taxRate ?? 0,
      taxAmount: o.taxAmount ?? 0,
      totalAmount: o.totalAmount,
      receivedAmount: o.receivedAmount,
      changeAmount: o.changeAmount,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus || 'PAID',
      customerName: o.customerName || '',
      customerPhone: o.customerPhone || '',
      customerPlace: o.customerPlace || '',
      cultivationDate: o.cultivationDate || null,
      cultivationStatus: o.cultivationStatus || 'NONE',
      cashierName: o.cashierName,
      createdAt: (o as any).createdAt,
    }));

    sendSuccess(res, 'အရောင်းမှတ်တမ်းများ ရယူပြီးပါပြီ။', formatted);
  } catch (error: any) {
    sendError(res, error.message || 'အရောင်းမှတ်တမ်း ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const updateOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus, cultivationDate, cultivationStatus } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      sendError(res, 'အော်ဒါ မတွေ့ရှိပါ။', 404);
      return;
    }

    // Update payment status if provided
    const wasUnpaid = order.paymentStatus === 'UNPAID';
    if (paymentStatus && ['PAID', 'UNPAID'].includes(paymentStatus)) {
      order.paymentStatus = paymentStatus;

      // If marking as paid, set receivedAmount to totalAmount
      if (paymentStatus === 'PAID' && order.receivedAmount === 0) {
        order.receivedAmount = order.totalAmount;
        order.changeAmount = 0;
      }
    }

    // Update cultivation fields if provided
    if (cultivationDate !== undefined) {
      order.cultivationDate = cultivationDate ? new Date(cultivationDate) : null;
    }
    if (cultivationStatus) {
      // 'DONE' from the client is stored as the canonical 'COMPLETED'
      const normalizedStatus = cultivationStatus === 'DONE' ? 'COMPLETED' : cultivationStatus;
      if (['NONE', 'STARTED', 'COMPLETED'].includes(normalizedStatus)) {
        order.cultivationStatus = normalizedStatus;
      }
    }

    await order.save();

    // Invalidate caches
    await clearCacheByPattern('*orders*');
    await clearCacheByPattern('*dashboard*');

    // Credit settled: flip the customer's purchase entry to PAID and clear
    // the matching amount from their outstanding debt total.
    if (wasUnpaid && order.paymentStatus === 'PAID') {
      try {
        const updatedCustomer = await Customer.findOneAndUpdate(
          { 'purchaseDates.orderId': order._id, 'purchaseDates.paymentStatus': 'UNPAID' },
          {
            $set: { 'purchaseDates.$.paymentStatus': 'PAID' },
            $inc: { totalDebt: -(order.totalAmount || 0) },
          }
        );
        if (updatedCustomer) await clearCacheByPattern('*customers*');
      } catch (customerError) {
        console.error('[Customer Debt Sync Error]:', customerError);
      }
    }

    sendSuccess(res, 'အော်ဒါ ပြင်ဆင်မှု အောင်မြင်ပါသည်။', {
      id: (order._id as any).toString(),
      orderNo: order.orderNo,
      paymentStatus: order.paymentStatus,
      cultivationDate: order.cultivationDate,
      cultivationStatus: order.cultivationStatus,
      receivedAmount: order.receivedAmount,
      changeAmount: order.changeAmount,
    });
  } catch (error: any) {
    sendError(res, error.message || 'အော်ဒါ ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const bulkDeleteOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      sendError(res, 'ဖျက်ရန် အော်ဒါများ ရွေးချယ်ပါ။', 400);
      return;
    }

    const result = await Order.deleteMany({ _id: { $in: orderIds } });

    // Invalidate caches
    await clearCacheByPattern('*orders*');
    await clearCacheByPattern('*dashboard*');

    sendSuccess(res, `အော်ဒါ ${result.deletedCount} ခု ဖျက်ပြီးပါပြီ။`, {
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    sendError(res, error.message || 'အော်ဒါများ ဖျက်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const getSalesAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Optional ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD range filter
    const dateRange = parseDateRange(req.query as Record<string, unknown>);
    const match = dateRange
      ? { status: 'COMPLETED', createdAt: dateRange }
      : { status: 'COMPLETED' };

    // Total Revenue: sum of totalAmount for all COMPLETED orders
    const revenueResult = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Total Profit: sum of (price - costPrice) * quantity for each item across all COMPLETED orders
    const profitResult = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalProfit: {
            $sum: {
              $multiply: [
                { $subtract: ['$items.price', { $ifNull: ['$items.costPrice', 0] }] },
                '$items.quantity',
              ],
            },
          },
        },
      },
    ]);

    const totalProfit = profitResult.length > 0 ? profitResult[0].totalProfit : 0;

    sendSuccess(res, 'အရောင်း စာရင်းအင်းများ', {
      totalRevenue,
      totalProfit,
    });
  } catch (error: any) {
    sendError(res, error.message || 'အရောင်း စာရင်းအင်း ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const getTodaySummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayOrders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'COMPLETED',
    });

    const totalSales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = todayOrders.length;

    sendSuccess(res, 'ယနေ့ အရောင်းအနှစ်ချုပ်', {
      totalSales,
      orderCount,
      date: startOfDay.toISOString().split('T')[0],
    });
  } catch (error: any) {
    sendError(res, error.message || 'ယနေ့အရောင်း အနှစ်ချုပ် ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

// Daily sales totals for the Analytics line chart, filterable by date range,
// category and single item. Buckets by calendar day in Myanmar time (UTC+6:30).
// All aggregation happens server-side ($match/$group) so only compact daily
// buckets + KPIs are sent to the client — never raw order data.
export const getSalesTrend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, unknown>;
    const hasStart = typeof query.startDate === 'string' && !!query.startDate && !isNaN(Date.parse(query.startDate));
    const hasEnd = typeof query.endDate === 'string' && !!query.endDate && !isNaN(Date.parse(query.endDate));

    const endRef = hasEnd ? new Date(`${query.endDate}T23:59:59.999`) : new Date();
    const end = new Date(endRef.getTime() - endRef.getTimezoneOffset() * 60000);
    const fallbackStart = new Date(end);
    fallbackStart.setDate(fallbackStart.getDate() - 6);
    fallbackStart.setHours(0, 0, 0, 0);
    const startRef = hasStart ? new Date(`${query.startDate}T00:00:00`) : fallbackStart;
    const start = new Date(startRef.getTime() - startRef.getTimezoneOffset() * 60000);

    // ── Resolve filters ────────────────────────────────────────────────
    // Order items store the category NAME (not id), so resolve it first.
    let categoryName: string | null = null;
    if (typeof query.categoryId === 'string' && query.categoryId) {
      const cat = await Category.findById(query.categoryId).select('name').lean();
      categoryName = cat?.name || null;
    }

    let itemObjectId: mongoose.Types.ObjectId | null = null;
    if (typeof query.itemId === 'string' && query.itemId && mongoose.isValidObjectId(query.itemId)) {
      itemObjectId = new mongoose.Types.ObjectId(query.itemId);
    }

    const baseMatch: Record<string, unknown> = {
      status: 'COMPLETED',
      createdAt: { $gte: start, $lte: end },
    };
    // Pre-unwind narrowing on the array fields keeps $unwind work small
    if (itemObjectId) baseMatch['items.productId'] = itemObjectId;
    if (categoryName) baseMatch['items.category'] = categoryName;

    const afterUnwind: PipelineStage[] = [
      { $match: baseMatch } as PipelineStage.Match,
      { $unwind: '$items' },
    ];
    if (itemObjectId) afterUnwind.push({ $match: { 'items.productId': itemObjectId } } as PipelineStage.Match);
    if (categoryName) afterUnwind.push({ $match: { 'items.category': categoryName } } as PipelineStage.Match);

    const dayId = {
      $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+06:30' },
    };

    // Pipeline 1 — daily buckets (revenue, quantity, distinct orders)
    const dailyResult = await Order.aggregate([
      ...afterUnwind,
      {
        $group: {
          _id: dayId,
          totalSales: { $sum: { $ifNull: ['$items.subtotal', 0] } },
          quantity: { $sum: '$items.quantity' },
          orderIds: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalSales: 1,
          quantity: 1,
          orderCount: { $size: '$orderIds' },
        },
      },
      { $sort: { date: 1 } },
    ]);

    // Pipeline 2 — best-selling item of each day (for chart tooltips)
    const topPerDayResult = await Order.aggregate([
      ...afterUnwind,
      {
        $group: {
          _id: { date: dayId, name: '$items.name', category: '$items.category' },
          quantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { '_id.date': 1, quantity: -1 } },
      {
        $group: {
          _id: '$_id.date',
          topItem: {
            $first: { name: '$_id.name', category: '$_id.category', quantity: '$quantity' },
          },
        },
      },
      { $project: { _id: 0, date: '$_id', topItem: 1 } },
    ]);
    const topByDay = new Map(topPerDayResult.map((d: any) => [d.date, d.topItem]));

    // Pipeline 3 — KPI totals for the active filter
    const kpiResult = await Order.aggregate([
      ...afterUnwind,
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$items.subtotal', 0] } },
          totalQuantity: { $sum: '$items.quantity' },
        },
      },
    ]);
    const kpis = kpiResult[0] || { totalRevenue: 0, totalQuantity: 0 };

    // Pipeline 4 — overall top-selling item within the filter
    const topItemResult = await Order.aggregate([
      ...afterUnwind,
      {
        $group: {
          _id: { name: '$items.name', category: '$items.category' },
          quantity: { $sum: '$items.quantity' },
          sales: { $sum: { $ifNull: ['$items.subtotal', 0] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 1 },
    ]);
    const topItem = topItemResult[0]
      ? {
          name: topItemResult[0]._id.name,
          category: topItemResult[0]._id.category || '',
          quantity: topItemResult[0].quantity,
          sales: topItemResult[0].sales,
        }
      : null;

    sendSuccess(res, 'နေ့စဉ် အရောင်း ခွဲခြမ်းစိတ်ဖြာမှု', {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      series: dailyResult.map((d: any) => ({ ...d, topItem: topByDay.get(d.date) || null })),
      kpis: {
        totalRevenue: kpis.totalRevenue,
        totalQuantity: kpis.totalQuantity,
        topItem,
      },
    });
  } catch (error: any) {
    sendError(res, error.message || 'နေ့စဉ် အရောင်း ခွဲခြမ်းစိတ်ဖြာမှု ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};
