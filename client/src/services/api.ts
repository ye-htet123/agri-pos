import axios from 'axios';

// Dynamically determine backend API base URL so the mobile device connected via local WiFi works seamlessly
const getDynamicApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  // If explicitly defined in .env and NOT using localhost, use it directly
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // Dynamically resolve network IP hostname from current browser location
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:5000/api/v1`;
  }

  return envUrl || 'http://localhost:5000/api/v1';
};

const API_BASE_URL = getDynamicApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for auto token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt token refresh for login, refresh, or me checks
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
        // If refresh fails, reject error silently so React AuthContext handles unauthenticated state without page reload
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
