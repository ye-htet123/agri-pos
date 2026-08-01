import { Request, Response } from 'express';
import { User } from '../models/User';
import { sendSuccess, sendError } from '../utils/responseHandler';

const safeUser = (u: any) => ({
  id: u._id,
  name: u.name,
  username: u.username,
  role: u.role,
  phone: u.phone,
  createdAt: u.createdAt,
});

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find()
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 });
    sendSuccess(res, 'ဝန်ထမ်းစာရင်း', users.map(safeUser));
  } catch (error: any) {
    sendError(res, error.message || 'ဝန်ထမ်းစာရင်း ရယူရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, password, role, phone } = req.body;

    if (!name || !name.trim()) {
      sendError(res, 'ဝန်ထမ်းအမည် ထည့်သွင်းရန် လိုအပ်ပါသည်။', 400);
      return;
    }
    if (!username || !username.trim()) {
      sendError(res, 'Username ထည့်သွင်းရန် လိုအပ်ပါသည်။', 400);
      return;
    }
    if (!password) {
      sendError(res, 'စကားဝှက် ထည့်သွင်းရန် လိုအပ်ပါသည်။', 400);
      return;
    }
    if (password.length < 6) {
      sendError(res, 'စကားဝှက် အနည်းဆုံး ၆ လုံး ရှိရပါမည်။', 400);
      return;
    }

    const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingUser) {
      sendError(res, 'ဤ Username ဖြင့် အကောင့်ရှိပြီးသားဖြစ်ပါသည်။', 400);
      return;
    }

    const newUser = await User.create({
      name: name.trim(),
      username: username.toLowerCase().trim(),
      password,
      role: role || 'CASHIER',
      phone: phone?.trim() || '',
    });

    sendSuccess(
      res,
      'ဝန်ထမ်းအကောင့်အသစ် ဖန်တီးပြီးပါပြီ။',
      safeUser(newUser),
      201
    );
  } catch (error: any) {
    sendError(res, error.message || 'ဝန်ထမ်းအကောင့် ဖန်တီးရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, role, phone, password } = req.body;

    // Must use +password to explicitly fetch it (select:false)
    const user = await User.findById(id).select('+password');
    if (!user) {
      sendError(res, 'ဝန်ထမ်းအကောင့် မတွေ့ရှိပါ။', 404);
      return;
    }

    if (name) user.name = name.trim();
    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone.trim();

    if (password) {
      if (password.length < 6) {
        sendError(res, 'စကားဝှက်အသစ် အနည်းဆုံး ၆ လုံး ရှိရပါမည်။', 400);
        return;
      }
      user.password = password; // pre-save hook will hash it
    }

    await user.save();

    sendSuccess(res, 'ဝန်ထမ်းအချက်အလက် ပြင်ဆင်ပြီးပါပြီ။', safeUser(user));
  } catch (error: any) {
    sendError(res, error.message || 'ဝန်ထမ်းအချက်အလက် ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      sendError(res, 'ဝန်ထမ်းအကောင့် မတွေ့ရှိပါ။', 404);
      return;
    }

    sendSuccess(res, 'ဝန်ထမ်းအကောင့် ပယ်ဖျက်ပြီးပါပြီ။');
  } catch (error: any) {
    sendError(res, error.message || 'ဝန်ထမ်းအကောင့် ပယ်ဖျက်ရာတွင် အမှားဖြစ်ပွားပါသည်', 500);
  }
};
