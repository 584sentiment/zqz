import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// 辅助函数：检查是否在浏览器环境
const isBrowser = () => typeof window !== 'undefined';

// 辅助函数：安全访问 localStorage
const getAccessToken = () => (isBrowser() ? localStorage.getItem('accessToken') : null);
const getRefreshToken = () => (isBrowser() ? localStorage.getItem('refreshToken') : null);
const setTokens = (accessToken: string, refreshToken: string) => {
  if (isBrowser()) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
};
const clearTokens = () => {
  if (isBrowser()) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('auth-storage');
  }
};
const redirectToLogin = () => {
  if (isBrowser()) {
    // 使用 Next.js 路由进行重定向
    window.location.href = '/login?session=expired';
  }
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 防止重复刷新 token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 请求拦截器 - 添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 如果是 401 错误
    if (error.response?.status === 401) {
      // 如果是刷新 token 接口本身返回 401，直接跳转登录
      if (originalRequest.url?.includes('/auth/refresh')) {
        clearTokens();
        redirectToLogin();
        return Promise.reject(error);
      }

      // 如果已经重试过，直接跳转登录
      if (originalRequest._retry) {
        clearTokens();
        redirectToLogin();
        return Promise.reject(error);
      }

      // 如果正在刷新，将请求加入队列
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(() => {
            // 队列中的请求失败时，已经由刷新逻辑处理了重定向
            return Promise.reject(error);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        clearTokens();
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        const { data } = await apiClient.post('/auth/refresh', {
          refreshToken,
        });
        setTokens(data.accessToken, data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        return apiClient(originalRequest);
      } catch {
        processQueue(new Error('Token refresh failed'), null);
        clearTokens();
        redirectToLogin();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
