import axios from 'axios';

// 动态获取 API URL，支持 IP 访问
const getApiUrl = () => {
  // 优先使用环境变量
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 在浏览器环境中，动态检测当前主机名
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    // 如果是 IP 地址访问，使用相同的 IP 地址访问 API
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3001/api/v1`;
    }
  }

  return 'http://localhost:3001/api/v1';
};

const API_URL = getApiUrl();

// 辅助函数：检查是否在浏览器环境
const isBrowser = () => typeof window !== 'undefined';

// 辅助函数：安全访问 localStorage
const getAccessToken = () => (isBrowser() ? localStorage.getItem('accessToken') : null);
const getRefreshToken = () => (isBrowser() ? localStorage.getItem('refreshToken') : null);

const clearTokens = () => {
  if (isBrowser()) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('auth-storage');
  }
};

const redirectToLogin = () => {
  if (isBrowser()) {
    clearTokens();
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

// 标记是否正在刷新 token
let isRefreshing = false;
// 等待刷新的请求队列
let refreshSubscribers: ((token: string) => void)[] = [];

// 订阅 token 刷新
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// 通知所有等待的请求
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// 刷新 token
const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data.tokens;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);

    return accessToken;
  } catch {
    return null;
  }
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

// 响应拦截器 - 处理 401 错误并尝试刷新 token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 如果是 401 错误且不是刷新 token 的请求
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 如果是刷新 token 的请求失败，直接登出
      if (originalRequest.url?.includes('/auth/refresh')) {
        console.log('[API] Token 刷新失败，重定向到登录页');
        redirectToLogin();
        return Promise.reject(error);
      }

      // 如果正在刷新 token，将请求加入队列等待
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();

        if (newToken) {
          console.log('[API] Token 刷新成功');
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          onTokenRefreshed(newToken);
          isRefreshing = false;
          return apiClient(originalRequest);
        } else {
          console.log('[API] Token 刷新失败，重定向到登录页');
          isRefreshing = false;
          redirectToLogin();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.log('[API] Token 刷新异常，重定向到登录页');
        isRefreshing = false;
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
