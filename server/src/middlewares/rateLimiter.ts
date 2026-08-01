import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: {
    success: false,
    message: 'အကောင့်ဝင်ရောက်မှု အကြိမ်ရေ များလွန်းပါသည်။ ၁၅ မိနစ်အကြာမှ ပြန်လည်ကြိုးစားပါ။ (Too many login attempts)',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
