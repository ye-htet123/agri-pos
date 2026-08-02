import jwt from 'jsonwebtoken';
import { Response } from 'express';

export interface TokenPayload {
  userId: string;
  role: 'ADMIN' | 'CASHIER';
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'agri_pos_access_secret_key';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'agri_pos_refresh_secret_key';

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  // Render ပေါ်မှာ NODE_ENV မသတ်မှတ်ရသေးရင်တောင် RENDER=true ပါရင် Production လို့ ယူဆမည်
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction, // Cross-site Cookie ရရှိရန် HTTPS (Production) တွင် true ဖြစ်ရမည်
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax', // ⚠️ Vercel -> Render Cross-site အတွက် 'none' သုံးရပါမည်
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearAuthCookies = (res: Response): void => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};