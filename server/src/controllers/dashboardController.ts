import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { sendSuccess, sendError } from '../utils/responseHandler';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Today's Sales & Orders Count
    const todayOrders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'COMPLETED',
    });

    const todaySales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const todayOrdersCount = todayOrders.length;

    // Total products & low stock items (stock <= 5)
    const totalProductsCount = await Product.countDocuments();
    const lowStockProductsDocs = await Product.find({ stock: { $lte: 5 } }).select('name category stock unit imageUrl');
    const lowStockCount = lowStockProductsDocs.length;

    const lowStockProducts = lowStockProductsDocs.map((p) => ({
      id: (p._id as any).toString(),
      name: p.name,
      category: p.category,
      stock: p.stock,
      unit: p.unit,
      image: p.imageUrl,
    }));

    // Recent orders (latest 10)
    const recentOrdersDocs = await Order.find().sort({ createdAt: -1 }).limit(10);
    const recentOrders = recentOrdersDocs.map((o) => ({
      id: (o._id as any).toString(),
      orderNo: o.orderNo,
      cashierName: o.cashierName,
      totalAmount: o.totalAmount,
      status: o.status,
      createdAt: (o as any).createdAt,
    }));

    // Top selling items query via Mongo aggregate pipeline
    const topSellingItems = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);

    sendSuccess(res, 'Dashboard စာရင်းအင်းများ', {
      todaySales,
      todayOrdersCount,
      totalProductsCount,
      lowStockCount,
      lowStockProducts,
      recentOrders,
      topSellingItems,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Dashboard စာရင်းအင်း ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};
