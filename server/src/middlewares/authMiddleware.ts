import { Request, Response, NextFunction } from 'express';
import 'cookie-parser'; // 👈 Express Request ထဲသို့ cookies property type ထည့်ပေးရန် မဖြစ်မနေ လိုအပ်ပါသည်
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/responseHandler';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    let token = req.cookies?.accessToken;

    const authHeader = req.headers.authorization;
    if (!token && authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      sendError(res, 'အကောင့်ဝင်ရောက်ထားခြင်း မရှိပါ။ (Unauthorized)', 401);
      return;
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    sendError(res, 'Session သက်တမ်းကုန်ဆုံးသွားပါပြီ။ ကျေးဇူးပြု၍ ပြန်လည်ဝင်ရောက်ပါ။ (Invalid or Expired Token)', 401);
  }
};