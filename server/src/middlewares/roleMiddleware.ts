import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { sendError } from '../utils/responseHandler';
import { UserRole } from '../models/User';

export const roleMiddleware = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'အကောင့်ဝင်ရောက်ထားခြင်း မရှိပါ။', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'ဤလုပ်ဆောင်ချက်ကို လုပ်ဆောင်ရန် လုပ်ပိုင်ခွင့် မရှိပါ။ (Forbidden)', 403);
      return;
    }

    next();
  };
};
