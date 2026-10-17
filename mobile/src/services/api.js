import axios from 'axios';
import { API_BASE_URL } from '../constants/index';
import { getToken, removeToken } from '../utils/storage';

// Registered logout callback — set by AuthContext
let logoutCallback = null;

export function setLogoutCallback(fn) {
  logoutCallback = fn;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Storage error — proceed without token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 ───────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await removeToken();
      if (typeof logoutCallback === 'function') {
        logoutCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
