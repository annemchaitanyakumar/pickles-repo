import axios from 'axios';
import { toast } from '@/hooks/use-toast';
import { tokenService } from '@/services/tokenService';

export const API_BASE = `${import.meta.env.VITE_API_URL}`;
export const IMAGE_API_BASE = `${import.meta.env.VITE_DJANGO_URL}`;
export const Django_Promo_BASE = `${import.meta.env.VITE_DJANGO_PROMO_URL}`;

// Axios instance (main API)
const instance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // ✅ Crucial for cookies
});

// NOTE: Authorization header is intentionally NOT added here.
// We rely on HTTP-only cookies for authentication. Cookies are sent
// automatically when `withCredentials: true` is set on the instance.

// Request interceptor to add debug info
instance.interceptors.request.use(
  (config) => {
    // If a refresh is currently in progress, queue this request until refresh completes
    if (instance._isRefreshing) {
      console.log('[Axios] Refresh in progress — queuing request to', config.url);
      return new Promise((resolve) => {
        instance._subscribeToken((token) => {
          try {
            config.headers = config.headers || {};
            if (token) config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          } catch (e) {}
          resolve(config);
        });
      });
    }
    // Attach Authorization header from TokenService if available
    try {
      const accessToken = tokenService.getAccessToken();
      if (accessToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
      }
    } catch (e) {
      console.warn('[Axios] Failed to attach access token', e);
    }

    console.log(`[Axios] Making ${config.method?.toUpperCase()} request to ${config.url}`, {
      withCredentials: config.withCredentials,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling auth errors
instance.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config;
    console.log(`[Axios] Error response from ${originalRequest?.url}:`, {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });

    // helper: subscribe/notify implementation attached to instance
    if (!instance._isRefreshing) {
      instance._isRefreshing = false;
      instance._refreshSubscribers = [];
      instance._subscribeToken = function(cb) { this._refreshSubscribers.push(cb); };
      instance._onRefreshed = function(token) {
        this._refreshSubscribers.forEach(cb => cb(token));
        this._refreshSubscribers = [];
      };
    }

    // Handle 401 and refresh token using tokenService (refresh uses HttpOnly cookie)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing, queue this request and retry when done
      if (instance._isRefreshing) {
        return new Promise((resolve, reject) => {
          instance._subscribeToken(async (token) => {
            if (!token) return reject(error);
            try {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
              resolve(instance(originalRequest));
            } catch (e) { reject(e); }
          });
        });
      }

      // Start refresh
      instance._isRefreshing = true;
      console.log('[Axios] Attempting token refresh via tokenService...');
      try {
        const refreshed = await tokenService.refreshToken();
        const newToken = tokenService.getAccessToken();
        instance._isRefreshing = false;
        instance._onRefreshed(newToken);

        if (newToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = newToken.startsWith('Bearer ') ? newToken : `Bearer ${newToken}`;
        }

        console.log('[Axios] Token refresh successful, retrying original request');
        return instance(originalRequest);
      } catch (refreshError) {
        instance._isRefreshing = false;
        instance._onRefreshed(null);
        console.error('[Axios] Token refresh failed:', refreshError);
        toast({
          variant: 'destructive',
          title: 'Session expired',
          description: 'Please log in again.',
        });
        // Clear client-side auth state
        tokenService.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 errors - sometimes backends return 403 for missing/invalid auth
    if (error.response?.status === 403) {
      console.warn('[Axios] Received 403; attempting refresh then retry if not already retried');
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        // If a refresh is already in progress, queue and retry when done
        if (instance._isRefreshing) {
          return new Promise((resolve, reject) => {
            instance._subscribeToken(async (token) => {
              if (!token) return reject(error);
              try {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                resolve(instance(originalRequest));
              } catch (e) { reject(e); }
            });
          });
        }

        try {
          instance._isRefreshing = true;
          const refreshed = await tokenService.refreshToken();
          const newT = tokenService.getAccessToken();
          instance._isRefreshing = false;
          instance._onRefreshed(newT);

          if (newT) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = newT.startsWith('Bearer ') ? newT : `Bearer ${newT}`;
          }
          return instance(originalRequest);
        } catch (e) {
          instance._isRefreshing = false;
          instance._onRefreshed(null);
          console.error('[Axios] Refresh after 403 failed:', e);
        }
      }

      console.error('[Axios] Access denied:', {
        url: originalRequest?.url,
        data: error.response?.data
      });

      if (!originalRequest?.url?.includes('/login')) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: error.response?.data?.message || "You don't have permission to perform this action.",
        });
      }
    }

    return Promise.reject(error);
  }
);


export default instance;
