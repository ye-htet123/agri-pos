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
  withCredentials: true, // ⚠️ Required for sending cross-site cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

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