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

// 响应拦截器 - 处理 401 错误
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 如果是 401 错误，清除 token 并重定向到登录页
    if (error.response?.status === 401) {
      console.log('[API] 收到 401 响应，重定向到登录页');
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);
