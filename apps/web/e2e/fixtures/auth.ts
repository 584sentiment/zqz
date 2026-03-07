import { test as base, Page, Route, Request } from '@playwright/test';

/**
 * 测试用户配置
 */
export interface TestUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

/**
 * 认证状态
 */
export interface AuthState {
  user: TestUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * 测试账号凭据
 */
export const testCredentials = {
  email: '1610126460@qq.com',
  password: 'wkk12345',
};

/**
 * 模拟的测试用户
 */
export const mockTestUser: TestUser = {
  id: 'test-user-001',
  email: testCredentials.email,
  name: '测试用户',
  avatarUrl: undefined,
  emailVerified: true,
};

/**
 * 模拟的 JWT token（仅用于测试，不验证签名）
 */
export const mockAccessToken = 'mock-access-token-for-testing';
export const mockRefreshToken = 'mock-refresh-token-for-testing';

/**
 * 模拟认证 API 响应
 */
async function handleAuthRoutes(route: Route, request: Request) {
  const url = request.url();

  // 拦截刷新 token 请求
  if (url.includes('/auth/refresh')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      }),
    });
  }

  // 拦截用户信息请求
  if (url.includes('/auth/me') || url.includes('/users/me')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTestUser),
    });
  }

  // 其他请求继续
  return route.continue();
}

/**
 * 设置认证状态到 localStorage
 */
export async function setAuthState(page: Page, auth: AuthState) {
  // 在页面初始化前设置 localStorage
  await page.addInitScript(
    ({ user, accessToken, refreshToken }) => {
      // 设置 auth-storage（zustand 使用）
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          user,
          isAuthenticated: true,
        })
      );
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    },
    {
      user: auth.user,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    }
  );
}

/**
 * 清除认证状态
 */
export async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  });
}

/**
 * 扩展的测试 fixture，包含认证功能
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Mock 认证相关 API
    await page.route('**/api/v1/auth/**', handleAuthRoutes);

    // 在页面加载前设置认证状态
    await setAuthState(page, {
      user: mockTestUser,
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
    });

    await use(page);

    // 清理路由
    await page.unroute('**/api/v1/auth/**', handleAuthRoutes);
  },
});

export { expect } from '@playwright/test';
