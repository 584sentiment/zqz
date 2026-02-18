import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试目录
  testDir: './e2e',

  // 完全并行运行测试
  fullyParallel: true,

  // CI 环境禁止使用 test.only
  forbidOnly: !!process.env.CI,

  // CI 环境重试 2 次
  retries: process.env.CI ? 2 : 0,

  // CI 环境使用 1 个 worker，本地可以并行
  workers: process.env.CI ? 1 : undefined,

  // 测试报告配置
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'],
  ],

  // 全局测试配置
  use: {
    // 基础 URL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // 失败时收集 trace
    trace: 'on-first-retry',

    // 失败时截图
    screenshot: 'only-on-failure',

    // 失败时保留视频
    video: 'retain-on-failure',

    // 操作超时时间
    actionTimeout: 10000,

    // 导航超时时间
    navigationTimeout: 30000,

    // 忽略 HTTPS 错误（用于本地测试）
    ignoreHTTPSErrors: true,
  },

  // 测试项目配置（不同浏览器）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 可选：其他浏览器测试
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // 开发服务器配置
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
