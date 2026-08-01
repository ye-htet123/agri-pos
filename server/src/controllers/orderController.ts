import { Response } from 'express';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sendSuccess, sendError } from '../utils/responseHandler';
import { clearCacheByPattern } from '../middlewares/cacheMiddleware';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, receivedAmount, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      sendError(res, 'အရောင်းခြင်းတောင်းထဲတွင် ပစ္စည်းမရှိပါ။', 400);
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
        quantity,
        subtotal,
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

    const recAmount = Number(receivedAmount) || totalAmount;
    const changeAmount = Math.max(0, recAmount - totalAmount);

    let cashierName = 'Cashier';
    if (req.user?.userId) {
      const userObj = await User.findById(req.user.userId);
      if (userObj) cashierName = userObj.name;
    }

    const orderNo = `INV-${Date.now().toString().slice(-6)}`;

    // Phase 3: Create Order with status COMPLETED
    const newOrder = await Order.create({
      orderNo,
      items: orderItems,
      totalAmount,
      receivedAmount: recAmount,
      changeAmount,
      paymentMethod: paymentMethod || 'CASH',
      status: 'COMPLETED',
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
    const orders = await Order.find().sort({ createdAt: -1 }).limit(100);

    const formatted = orders.map((o) => ({
      id: (o._id as any).toString(),
      orderNo: o.orderNo,
      items: o.items.map((i) => ({
        product: { id: i.productId.toString(), name: i.name, price: i.price },
        quantity: i.quantity,
      })),
      totalAmount: o.totalAmount,
      receivedAmount: o.receivedAmount,
      changeAmount: o.changeAmount,
      cashierName: o.cashierName,
      createdAt: (o as any).createdAt,
    }));

    sendSuccess(res, 'အရောင်းမှတ်တမ်းများ ရယူပြီးပါပြီ။', formatted);
  } catch (error: any) {
    sendError(res, error.message || 'အရောင်းမှတ်တမ်း ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
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
