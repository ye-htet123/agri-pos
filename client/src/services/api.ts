import axios from 'axios';

const getDynamicApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // 1. If VITE_API_BASE_URL is set (e.g. Render backend URL), use it directly
  if (envUrl) {
    return envUrl;
  }

  // 2. Local network dynamic host resolution (Development mode)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    if (window.location.hostname !== 'localhost' && !window.location.hostname.endsWith('.vercel.app')) {
      return `http://${window.location.hostname}:5000/api/v1`;
    }
  }

  return 'http://localhost:5000/api/v1';
};

const API_BASE_URL = getDynamicApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Required for sending cross-site cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // generous enough to survive a Render free-tier cold start
});

// ── Keep-alive / cold-start pre-warm ──────────────────────────────────
// Render free tier sleeps after ~15 min idle and needs ~30-60s to wake.
// Pinging at MODULE LOAD (before React even renders) shaves that wait off
// every first visit. warmUpServer() can be re-invoked safely anywhere.
let isWarmingUp = false;
let isWarm = false;

export const warmUpServer = (): void => {
  if (isWarm || isWarmingUp) return;
  isWarmingUp = true;
  api
    .get('/ping', { timeout: 90000 })
    .then(() => {
      isWarm = true;
    })
    .catch(() => {
      // allow retry on the next call (e.g. login submit)
    })
    .finally(() => {
      isWarmingUp = false;
    });
};

// Wake the dyno as early as physically possible
warmUpServer();

// Response interceptor for auto token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthRoute =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/me');

    if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;