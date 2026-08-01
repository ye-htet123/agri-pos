import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    // Attempt reconnecting up to 3 times with backoff, then stop to prevent continuous error logs
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        return false; // Stop reconnecting after 3 attempts
      }
      return Math.min(retries * 500, 2000);
    },
  },
});

let isRedisConnected = false;
let hasLoggedOfflineWarning = false;

redisClient.on('connect', () => {
  isRedisConnected = true;
  hasLoggedOfflineWarning = false;
  console.log('[Redis] Connected successfully');
});

redisClient.on('error', (err) => {
  isRedisConnected = false;
  if (!hasLoggedOfflineWarning) {
    console.warn('[Redis] Offline - Operating in Database Direct Mode:', err.message);
    hasLoggedOfflineWarning = true;
  }
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.warn('[Redis] Server not detected on startup. Continuing smoothly with MongoDB only.');
  }
};

export const getIsRedisConnected = (): boolean => isRedisConnected;
