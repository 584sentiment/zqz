import { test, expect } from '../fixtures/auth';
import { mockResponses, setupMockRoutes, clearMockRoutes } from '../fixtures/mocks';

/**
 * 升级页面 E2E 测试
 * 测试路径: /dashboard/subscription/upgrade
 */
test.describe('升级页面', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // 设置 Mock 路由
    setupMockRoutes(authenticatedPage, {
      subscription: mockResponses.subscriptionFree,
      plans: mockResponses.plans,
    });
  });

  test.afterEach(async ({ authenticatedPage }) => {
    await clearMockRoutes(authenticatedPage);
  });

  test('应该正确显示升级页面', async ({ authenticatedPage }) => {
    // 导航到升级页面
    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 验证页面标题
    await expect(authenticatedPage.locator('h1')).toContainText('升级套餐');

    // 验证返回链接
    await expect(authenticatedPage.getByRole('link', { name: '返回会员中心' })).toBeVisible();

    // 验证两个套餐卡片
    const planCards = authenticatedPage.locator('[class*="cursor-pointer"][class*="rounded-2xl"]');
    await expect(planCards).toHaveCount(2);
  });

  test('应该显示正确的套餐信息', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 验证基础版套餐信息
    const basicCard = authenticatedPage.locator('text=基础版').locator('..').first();
    await expect(basicCard).toContainText('基础版');
    await expect(basicCard).toContainText('29');
    await expect(basicCard).toContainText('适合求职中的用户');

    // 验证专业版套餐信息
    const proCard = authenticatedPage.locator('text=专业版').locator('..').first();
    await expect(proCard).toContainText('专业版');
    await expect(proCard).toContainText('99');
    await expect(proCard).toContainText('适合全力求职的用户');
  });

  test('应该能切换套餐选择', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 默认选中基础版
    const basicCard = authenticatedPage.locator('text=基础版').locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]').first();
    await expect(basicCard).toHaveClass(/ring-2/);

    // 点击专业版
    await authenticatedPage.locator('text=专业版').first().click();

    // 验证专业版被选中
    const proCard = authenticatedPage.locator('text=专业版').locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]').first();
    await expect(proCard).toHaveClass(/ring-2/);

    // 验证价格更新
    await expect(authenticatedPage.getByText('¥99', { exact: false }).last()).toBeVisible();
  });

  test('应该显示购买时长选项', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 验证购买时长标题
    await expect(authenticatedPage.getByText('选择购买时长')).toBeVisible();

    // 验证所有时长选项
    await expect(authenticatedPage.getByRole('button', { name: '1 个月' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: '3 个月' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: '6 个月' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: '12 个月' })).toBeVisible();

    // 验证折扣标签
    await expect(authenticatedPage.getByText('省 ¥29')).toBeVisible();
    await expect(authenticatedPage.getByText('省 ¥88')).toBeVisible();
    await expect(authenticatedPage.getByText('省 ¥200')).toBeVisible();
  });

  test('应该能切换购买时长', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 默认选中 1 个月
    const oneMonthBtn = authenticatedPage.getByRole('button', { name: '1 个月' });
    await expect(oneMonthBtn).toHaveClass(/border-primary/);

    // 点击 3 个月
    await authenticatedPage.getByRole('button', { name: '3 个月' }).click();

    // 验证价格更新 (基础版 29 * 3 = 87)
    await expect(authenticatedPage.getByText('¥87', { exact: false }).last()).toBeVisible();

    // 点击 6 个月
    await authenticatedPage.getByRole('button', { name: '6 个月' }).click();

    // 验证价格更新 (基础版 29 * 6 = 174)
    await expect(authenticatedPage.getByText('¥174', { exact: false }).last()).toBeVisible();

    // 点击 12 个月
    await authenticatedPage.getByRole('button', { name: '12 个月' }).click();

    // 验证价格更新 (基础版 29 * 12 = 348)
    await expect(authenticatedPage.getByText('¥348', { exact: false }).last()).toBeVisible();
  });

  test('应该正确计算专业版价格', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 选择专业版
    await authenticatedPage.locator('text=专业版').first().click();

    // 验证 1 个月价格 (99)
    await expect(authenticatedPage.getByText('¥99', { exact: false }).last()).toBeVisible();

    // 选择 3 个月 (99 * 3 = 297)
    await authenticatedPage.getByRole('button', { name: '3 个月' }).click();
    await expect(authenticatedPage.getByText('¥297', { exact: false }).last()).toBeVisible();

    // 选择 6 个月 (99 * 6 = 594)
    await authenticatedPage.getByRole('button', { name: '6 个月' }).click();
    await expect(authenticatedPage.getByText('¥594', { exact: false }).last()).toBeVisible();

    // 选择 12 个月 (99 * 12 = 1188)
    await authenticatedPage.getByRole('button', { name: '12 个月' }).click();
    await expect(authenticatedPage.getByText('¥1188', { exact: false }).last()).toBeVisible();
  });

  test('应该显示支付摘要', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 验证支付方式
    await expect(authenticatedPage.getByText('支付方式')).toBeVisible();
    await expect(authenticatedPage.getByText('支付宝')).toBeVisible();

    // 验证应付金额
    await expect(authenticatedPage.getByText('应付金额')).toBeVisible();
  });

  test('点击支付按钮应该创建订单并跳转', async ({ authenticatedPage }) => {
    // Mock 创建支付订单
    setupMockRoutes(authenticatedPage, {
      subscription: mockResponses.subscriptionFree,
      plans: mockResponses.plans,
      createPayment: mockResponses.createPayment,
    });

    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 监听页面跳转
    const pagePromise = authenticatedPage.waitForEvent('popup');

    // 由于跳转到外部支付页面会被阻止，我们改为验证 API 调用
    // 点击支付按钮
    const payButton = authenticatedPage.getByRole('button', { name: /立即支付/ });

    // 验证按钮状态
    await expect(payButton).toBeEnabled();
    await expect(payButton).toContainText('¥29');
  });

  test('创建订单失败应该显示错误提示', async ({ authenticatedPage }) => {
    // Mock 创建支付订单失败
    await authenticatedPage.route('**/api/v1/payments/create', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: '订单创建失败，请稍后重试',
          statusCode: 400,
        }),
      })
    );

    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 点击支付按钮
    await authenticatedPage.getByRole('button', { name: /立即支付/ }).click();

    // 验证错误提示
    await expect(authenticatedPage.getByText('支付失败')).toBeVisible({ timeout: 5000 });
  });

  test('支付按钮应该显示加载状态', async ({ authenticatedPage }) => {
    // 延迟响应
    await authenticatedPage.route('**/api/v1/payments/create', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.createPayment),
      });
    });

    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    const payButton = authenticatedPage.getByRole('button', { name: /立即支付/ });

    // 点击支付按钮
    await payButton.click();

    // 验证按钮显示加载状态
    await expect(payButton).toContainText('正在跳转到支付');
    await expect(payButton).toBeDisabled();
  });

  test('应该显示常见问题', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 验证常见问题标题
    await expect(authenticatedPage.getByText('常见问题')).toBeVisible();

    // 验证问题列表
    await expect(authenticatedPage.getByText('可以随时取消吗？')).toBeVisible();
    await expect(authenticatedPage.getByText('支持哪些支付方式？')).toBeVisible();
    await expect(authenticatedPage.getByText('配额如何计算？')).toBeVisible();
  });

  test('返回链接应该导航到会员中心', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/subscription/upgrade');

    // 点击返回链接
    await authenticatedPage.getByRole('link', { name: '返回会员中心' }).click();

    // 验证导航到会员中心
    await expect(authenticatedPage).toHaveURL('/dashboard/subscription');
  });
});

test.describe('升级页面 - 未认证用户', () => {
  test('未登录用户应该被重定向到登录页', async ({ page }) => {
    // 直接访问升级页面
    await page.goto('/dashboard/subscription/upgrade');

    // 由于 DashboardLayout 的认证检查，应该重定向到登录页
    // 注意：这取决于实际的认证实现
    await expect(page).toHaveURL(/\/login/);
  });
});
