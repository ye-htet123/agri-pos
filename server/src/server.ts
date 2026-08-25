import dotenv from 'dotenv';
dotenv.config();

import os from 'os';
import app from './app';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { startKeepAlive } from './config/keepAlive';
import { User } from './models/User';
import { Product } from './models/Product';
import { StoreSetting } from './models/StoreSetting';

const PORT = process.env.PORT || 5000;

// Utility to get the local IPv4 address of the host machine
const getLocalIpAddress = (): string => {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const netInterface = interfaces[interfaceName];
    if (netInterface) {
      for (const net of netInterface) {
        // Skip internal/loopback and non-IPv4 addresses
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }
  return '192.168.x.x';
};

const seedInitialData = async () => {
  try {
    // Seed Default Users if empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Seed] Seeding initial Admin and Cashier accounts...');
      await User.create([
        {
          name: 'Admin User',
          username: 'admin',
          password: '123',
          role: 'ADMIN',
          phone: '09123456789',
        },
        {
          name: 'မောင်မောင်',
          username: 'cashier',
          password: '123',
          role: 'CASHIER',
          phone: '09987654321',
        },
      ]);
      console.log('[Seed] Admin (admin/123) and Cashier (cashier/123) created.');
    }

    // Seed Store Settings if empty
    const settingCount = await StoreSetting.countDocuments();
    if (settingCount === 0) {
      await StoreSetting.create({
        shopName: 'စိုက်ပျိုးရေး ပစ္စည်းဆိုင်',
        address: 'ရန်ကုန်မြို့',
        phone: '09123456789',
        receiptHeader: 'ဝယ်ယူအားပေးမှုကို ကျေးဇူးအထူးတင်ရှိပါသည်',
        receiptFooter: 'ဝယ်ယူပြီးပစ္စည်း ပြန်မလဲပါ',
        taxRate: 0,
      });
      console.log('[Seed] Store settings initialized.');
    }

    // Seed Sample Products if empty
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('[Seed] Seeding sample agricultural products...');
      await Product.create([
        {
          name: 'ယူရီးယား ဓာတ်မြေဩဇာ (၅၀ ကီလို)',
          code: 'FERT-001',
          category: 'ဓာတ်မြေဩဇာ',
          price: 95000,
          costPrice: 85000,
          stock: 45,
          unit: 'အိတ်',
        },
        {
          name: 'တီဆူပါ ဓာတ်မြေဩဇာ (၅၀ ကီလို)',
          code: 'FERT-002',
          category: 'ဓာတ်မြေဩဇာ',
          price: 88000,
          costPrice: 78000,
          stock: 30,
          unit: 'အိတ်',
        },
        {
          name: 'စပါးမျိုးစေ့ (သီးထပ်ရင်)',
          code: 'SEED-001',
          category: 'မျိုးစေ့',
          price: 35000,
          costPrice: 28000,
          stock: 100,
          unit: 'တင်း',
        },
        {
          name: 'ပိုးသတ်ဆေး (ဆိုက်ပါမီသရင်)',
          code: 'PEST-001',
          category: 'ပိုးသတ်ဆေး',
          price: 18000,
          costPrice: 14000,
          stock: 4, // Low stock for dashboard warning test
          unit: 'ဗူး',
        },
      ]);
      console.log('[Seed] Sample products seeded.');
    }
  } catch (error) {
    console.error('[Seed Error]:', error);
  }
};

const startServer = async () => {
  await connectDB();
  await connectRedis();
  await seedInitialData();

  const localIp = getLocalIpAddress();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`=================================`);
    console.log(`🚀 Agri-POS Backend API running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏠 Local:   http://localhost:${PORT}`);
    console.log(`📡 Network: http://${localIp}:${PORT}`);
    console.log(`=================================`);

    // Prevent the Render free-tier dyno from sleeping (SELF_PING_URL env)
    startKeepAlive();
  });
};

startServer();
