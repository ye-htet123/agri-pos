import { Request, Response } from 'express';
import { User } from '../models/User';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/responseHandler';
import { AuthRequest } from '../middlewares/authMiddleware';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      sendError(res, 'အသုံးပြုသူအမည် နှင့် စကားဝှက် ဖြည့်စွက်ပါ (Username and password required)', 400);
      return;
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() }).select('+password');
    if (!user) {
      sendError(res, 'အသုံးပြုသူအမည် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။', 401);
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, 'အသုံးပြုသူအမည် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။', 401);
      return;
    }

    const payload = { userId: (user._id as any).toString(), role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshTokens.push(refreshToken);
    // Keep max 5 refresh tokens per user
    if (user.refreshTokens.length > 5) {
      user.refreshTokens.shift();
    }
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    const userResponse = {
      id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      phone: user.phone,
    };

    sendSuccess(res, 'အောင်မြင်စွာ အကောင့်ဝင်ရောက်ပြီးပါပြီ။', {
      user: userResponse,
      accessToken,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Login လုပ်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    let token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      sendError(res, 'Refresh Token မရှိပါ။ (Refresh Token missing)', 401);
      return;
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId).select('+password');

    if (!user || !user.refreshTokens.includes(token)) {
      sendError(res, 'Refresh Token သက်တမ်းကုန်ဆုံး သို့မဟုတ် မမှန်ကန်ပါ။', 401);
      return;
    }

    const payload = { userId: (user._id as any).toString(), role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);

    sendSuccess(res, 'Token သက်တမ်း တိုးပြီးပါပြီ။', {
      accessToken: newAccessToken,
    });
  } catch (error: any) {
    sendError(res, 'Refresh Token မမှန်ကန်ပါ သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ။', 401);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (token && req.user) {
      const user = await User.findById(req.user.userId);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
        await user.save();
      }
    }

    clearAuthCookies(res);
    sendSuccess(res, 'အကောင့်ထွက်ခွာပြီးပါပြီ။ (Logged out successfully)');
  } catch (error: any) {
    clearAuthCookies(res);
    sendSuccess(res, 'အကောင့်ထွက်ခွာပြီးပါပြီ။');
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'အကောင့်ဝင်ရောက်ထားခြင်း မရှိပါ။', 401);
      return;
    }

    const user = await User.findById(req.user.userId).select('-password -refreshTokens');
    if (!user) {
      sendError(res, 'အကောင့် မတွေ့ရှိပါ။', 444);
      return;
    }

    sendSuccess(res, 'အကောင့် အချက်အလက်များ', {
      id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      phone: user.phone,
    });
  } catch (error: any) {
    sendError(res, error.message || 'အကောင့်စစ်ဆေးရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};
