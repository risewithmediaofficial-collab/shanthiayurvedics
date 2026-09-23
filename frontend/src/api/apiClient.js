import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true, // sends HTTP-only cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor for attaching Authorization token & Active Branch scope
apiClient.interceptors.request.use(
  (config) => {
    try {
      // 1. Attach Bearer token from localStorage if available
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_access_token') : null;
      if (token) {
        config.headers = config.headers || {};
        if (!config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      // 2. Attach Active Branch scope
      const activeBranch = typeof window !== 'undefined' ? sessionStorage.getItem('active_branch_id') : null;
      if (activeBranch && activeBranch !== 'ALL' && activeBranch !== 'undefined' && activeBranch !== 'null') {
        config.headers = config.headers || {};
        config.headers['x-branch-id'] = activeBranch;
      }
    } catch {
      // Ignore storage access errors in non-browser environments
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor for auto-refreshing expired tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh logic for auth endpoints
    if (
      !originalRequest ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/logout') ||
      originalRequest.url?.includes('/auth/session') ||
      originalRequest.url?.includes('/auth/me')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const rawRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('auth_refresh_token') : null;
        const res = await axios.post(
          `${baseURL}/auth/refresh`,
          { refreshToken: rawRefreshToken },
          { withCredentials: true }
        );

        const newAccessToken = res.data?.data?.accessToken;
        const newRefreshToken = res.data?.data?.refreshToken;

        if (newAccessToken && typeof window !== 'undefined') {
          localStorage.setItem('auth_access_token', newAccessToken);
          if (newRefreshToken) localStorage.setItem('auth_refresh_token', newRefreshToken);
        }

        processQueue(null, newAccessToken);

        if (newAccessToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        try {
          localStorage.removeItem('auth_access_token');
          localStorage.removeItem('auth_refresh_token');
          localStorage.removeItem('auth_user');
        } catch {}
        // If refresh fails, notify listeners so app redirects to /login cleanly
        window.dispatchEvent(new CustomEvent('auth:session_expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
