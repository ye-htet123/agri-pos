import { Response } from 'express';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sendSuccess, sendError } from '../utils/responseHandler';
import { clearCacheByPattern } from '../middlewares/cacheMiddleware';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, receivedAmount, paymentMethod, paymentStatus, customerName, customerPlace } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      sendError(res, 'အရောင်းခြင်းတောင်းထဲတွင် ပစ္စည်းမရှိပါ။', 400);
      return;
    }

    const isUnpaid = paymentStatus === 'UNPAID';

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
    let recAmount: number;
    let changeAmt: number;

    if (isUnpaid) {
      recAmount = 0;
      changeAmt = 0;
    } else {
      recAmount = Number(receivedAmount) || totalAmount;
      changeAmt = Math.max(0, recAmount - totalAmount);
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
      totalAmount,
      receivedAmount: recAmount,
      changeAmount: changeAmt,
      paymentMethod: paymentMethod || 'CASH',
      paymentStatus: isUnpaid ? 'UNPAID' : 'PAID',
      status: 'COMPLETED',
      customerName: customerName || '',
      customerPlace: customerPlace || '',
      cashierId: req.user?.userId,
      cashierName,
    });

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
        totalAmount: newOrder.totalAmount,
        receivedAmount: newOrder.receivedAmount,
        changeAmount: newOrder.changeAmount,
        paymentStatus: newOrder.paymentStatus,
        customerName: newOrder.customerName,
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
    const orders = await Order.find().sort({ createdAt: -1 });

    const formatted = orders.map((o) => ({
      id: (o._id as any).toString(),
      orderNo: o.orderNo,
      items: o.items.map((i) => ({
        product: { id: i.productId.toString(), name: i.name, price: i.price },
        quantity: i.quantity,
        costPrice: i.costPrice || 0,
        category: i.category || '',
      })),
      totalAmount: o.totalAmount,
      receivedAmount: o.receivedAmount,
      changeAmount: o.changeAmount,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus || 'PAID',
      customerName: o.customerName || '',
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
    // Total Revenue: sum of totalAmount for all COMPLETED orders
    const revenueResult = await Order.aggregate([
      { $match: { status: 'COMPLETED' } },
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
      { $match: { status: 'COMPLETED' } },
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
