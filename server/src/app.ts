import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import settingRoutes from './routes/settingRoutes';
import categoryRoutes from './routes/categoryRoutes';
import customerRoutes from './routes/customerRoutes';
import { errorHandlerMiddleware } from './middlewares/errorHandlerMiddleware';

const app: Application = express();

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Dynamic CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile native apps, curl, postman)
      if (!origin) return callback(null, true);

      // Regex matching localhost, private local IPs, and Vercel domains
      const isAllowedOrigin =
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin) ||
        origin.endsWith('.vercel.app') ||
        origin === process.env.CLIENT_URL;

      if (isAllowedOrigin) {
        return callback(null, true);
      }

      callback(null, true);
    },
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Ultra-lightweight keep-alive ping (no DB/Redis access).
// Used by the client on app mount to wake a sleeping Render free-tier dyno
// before the user submits the login form.
app.get(['/api/ping', '/api/v1/ping'], (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Base Route Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Agri-POS API Server is running smoothly' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/settings', settingRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/customers', customerRoutes);

// Global Error Handler
app.use(errorHandlerMiddleware);

export default app;