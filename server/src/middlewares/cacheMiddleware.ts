import { Request, Response, NextFunction } from 'express';
import { redisClient, getIsRedisConnected } from '../config/redis';

export const cacheMiddleware = (ttlSeconds: number = 60) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!getIsRedisConnected()) {
      return next();
    }

    const key = `cache:${req.originalUrl || req.url}`;

    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.status(200).json(JSON.parse(cachedData));
        return;
      }

      res.setHeader('X-Cache', 'MISS');

      // Intercept res.json to save response into Redis cache
      const originalJson = res.json.bind(res);
      res.json = ((body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setEx(key, ttlSeconds, JSON.stringify(body)).catch((err) => {
            console.error('[Redis Cache Set Error]:', err);
          });
        }
        return originalJson(body);
      }) as any;

      next();
    } catch (error) {
      console.error('[Cache Middleware Error]:', error);
      next();
    }
  };
};

export const clearCacheByPattern = async (pattern: string): Promise<void> => {
  if (!getIsRedisConnected()) return;

  try {
    const keys = await redisClient.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`[Redis Cache Cleared] Pattern: cache:${pattern}, Keys removed: ${keys.length}`);
    }
  } catch (error) {
    console.error('[Clear Cache Error]:', error);
  }
};
