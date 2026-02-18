import { test, expect } from '../fixtures/auth';
import { mockResponses, setupMockRoutes, clearMockRoutes } from '../fixtures/mocks';

/**
 * 会员中心页面 E2E 测试
 * 测试路径: /dashboard/subscription
 */
test.describe('会员中心页面', () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await clearMockRoutes(authenticatedPage);
  });

  test.describe('免费用户', () => {
    test('应该显示免费用户信息', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionFree,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistoryEmpty,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证页面标题
      await expect(authenticatedPage.getByRole('heading', { name: '会员中心' })).toBeVisible();

      // 验证套餐名称
      await expect(authenticatedPage.getByText('免费版')).toBeVisible();
    });

    test('应该显示配额使用情况', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionFree,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistoryEmpty,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证配额标题
      await expect(authenticatedPage.getByText('本月配额使用')).toBeVisible();

      // 验证 AI 对话配额
      await expect(authenticatedPage.getByText('AI 对话')).toBeVisible();
      await expect(authenticatedPage.getByText('7/10')).toBeVisible();

      // 验证简历生成配额
      await expect(authenticatedPage.getByText('简历生成')).toBeVisible();
      await expect(authenticatedPage.getByText('2/3')).toBeVisible();

      // 验证模拟面试配额
      await expect(authenticatedPage.getByText('模拟面试')).toBeVisible();
      await expect(authenticatedPage.getByText('2/2')).toBeVisible();
    });

    test('应该显示升级按钮', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionFree,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistoryEmpty,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证升级按钮
      const upgradeButton = authenticatedPage.getByRole('button', { name: '升级套餐' });
      await expect(upgradeButton).toBeVisible();
    });

    test('点击升级按钮应该跳转到升级页面', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionFree,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistoryEmpty,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 点击升级按钮
      await authenticatedPage.getByRole('button', { name: '升级套餐' }).click();

      // 验证跳转
      await expect(authenticatedPage).toHaveURL('/dashboard/subscription/upgrade');
    });

    test('免费用户不应该显示自动续费设置', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionFree,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistoryEmpty,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 等待页面加载
      await expect(authenticatedPage.getByText('免费版')).toBeVisible();

      // 验证不显示自动续费设置
      await expect(authenticatedPage.getByText('自动续费')).not.toBeVisible();
    });

    test('没有支付历史不应该显示订单记录', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionFree,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistoryEmpty,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证不显示订单记录标题
      await expect(authenticatedPage.getByText('订单记录')).not.toBeVisible();
    });
  });

  test.describe('付费用户 - 基础版', () => {
    test('应该显示基础版用户信息', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证套餐名称
      await expect(authenticatedPage.getByText('基础版')).toBeVisible();

      // 验证有效期显示
      await expect(authenticatedPage.getByText(/有效期至/)).toBeVisible();
    });

    test('应该显示配额使用情况', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证 AI 对话配额
      await expect(authenticatedPage.getByText('30/50')).toBeVisible();

      // 验证简历生成配额
      await expect(authenticatedPage.getByText('5/10')).toBeVisible();

      // 验证模拟面试配额
      await expect(authenticatedPage.getByText('3/5')).toBeVisible();
    });

    test('应该显示自动续费设置', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证自动续费设置
      await expect(authenticatedPage.getByText('自动续费')).toBeVisible();
      await expect(
        authenticatedPage.getByText('套餐到期后将自动续费')
      ).toBeVisible();
    });

    test('应该能切换自动续费', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      // Mock 更新自动续费
      await authenticatedPage.route('**/api/v1/subscriptions/auto-renew', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, autoRenew: false }),
        })
      );

      await authenticatedPage.goto('/dashboard/subscription');

      // 找到自动续费开关
      const autoRenewToggle = authenticatedPage.locator('button[class*="rounded-full"]');
      await autoRenewToggle.click();

      // 验证成功提示
      await expect(authenticatedPage.getByText('已关闭自动续费')).toBeVisible({ timeout: 5000 });
    });

    test('应该显示取消订阅按钮', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证取消订阅按钮
      await expect(
        authenticatedPage.getByRole('button', { name: '取消订阅' })
      ).toBeVisible();
    });

    test('点击取消订阅应该显示确认对话框', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 点击取消订阅按钮
      await authenticatedPage.getByRole('button', { name: '取消订阅' }).click();

      // 验证确认对话框
      await expect(authenticatedPage.getByText('确认取消订阅？')).toBeVisible();
      await expect(
        authenticatedPage.getByText(/取消后，您的套餐将在当前计费周期结束后降级为免费版/)
      ).toBeVisible();
    });

    test('确认取消订阅应该调用 API', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      // Mock 取消订阅
      await authenticatedPage.route('**/api/v1/subscriptions/cancel', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.cancelSubscriptionSuccess),
        })
      );

      await authenticatedPage.goto('/dashboard/subscription');

      // 点击取消订阅按钮
      await authenticatedPage.getByRole('button', { name: '取消订阅' }).click();

      // 确认取消
      await authenticatedPage.getByRole('button', { name: '确认取消' }).click();

      // 验证成功提示
      await expect(authenticatedPage.getByText('订阅已取消')).toBeVisible({ timeout: 5000 });
    });

    test('取消确认对话框可以关闭', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 点击取消订阅按钮
      await authenticatedPage.getByRole('button', { name: '取消订阅' }).click();

      // 验证对话框出现
      await expect(authenticatedPage.getByText('确认取消订阅？')).toBeVisible();

      // 点击"再想想"按钮
      await authenticatedPage.getByRole('button', { name: '再想想' }).click();

      // 验证对话框消失
      await expect(authenticatedPage.getByText('确认取消订阅？')).not.toBeVisible();
    });
  });

  test.describe('已取消订阅的用户', () => {
    test('应该显示已取消状态', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionCanceled,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证已取消提示
      await expect(authenticatedPage.getByText('订阅已取消')).toBeVisible();
      await expect(
        authenticatedPage.getByText(/将在.*到期后降级为免费版/)
      ).toBeVisible();
    });

    test('应该显示恢复订阅按钮', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionCanceled,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证恢复订阅按钮
      await expect(
        authenticatedPage.getByRole('button', { name: '恢复订阅' })
      ).toBeVisible();
    });

    test('点击恢复订阅应该调用 API', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionCanceled,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      // Mock 恢复订阅
      await authenticatedPage.route('**/api/v1/subscriptions/resume', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.resumeSubscriptionSuccess),
        })
      );

      await authenticatedPage.goto('/dashboard/subscription');

      // 点击恢复订阅
      await authenticatedPage.getByRole('button', { name: '恢复订阅' }).click();

      // 验证成功提示
      await expect(authenticatedPage.getByText('订阅已恢复')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('订单历史', () => {
    test('应该显示订单记录列表', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证订单记录标题
      await expect(authenticatedPage.getByText('订单记录')).toBeVisible();

      // 验证订单列表
      const orders = authenticatedPage.getByText(/订单号:/);
      await expect(orders.first()).toBeVisible();
    });

    test('应该显示订单状态', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证已支付状态
      await expect(authenticatedPage.getByText('已支付').first()).toBeVisible();

      // 验证待支付状态
      await expect(authenticatedPage.getByText('待支付')).toBeVisible();
    });

    test('应该显示订单金额', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证金额显示 (29 元)
      const amounts = authenticatedPage.getByText('¥29', { exact: false });
      await expect(amounts.first()).toBeVisible();
    });
  });

  test.describe('套餐对比', () => {
    test('应该显示套餐对比卡片', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionFree,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistoryEmpty,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证套餐对比标题
      await expect(authenticatedPage.getByText('套餐对比')).toBeVisible();

      // 验证三个套餐卡片
      await expect(authenticatedPage.getByText('免费版')).toBeVisible();
      await expect(authenticatedPage.getByText('基础版')).toBeVisible();
      await expect(authenticatedPage.getByText('专业版')).toBeVisible();
    });

    test('应该标记当前套餐', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionBasic,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistory,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证当前套餐标签
      await expect(authenticatedPage.getByText('当前套餐')).toBeVisible();
    });

    test('其他套餐应该显示升级按钮', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionFree,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistoryEmpty,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证升级按钮
      await expect(
        authenticatedPage.getByRole('button', { name: '立即升级' })
      ).toBeVisible();
    });
  });

  test.describe('常见问题', () => {
    test('应该显示常见问题', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionFree,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistoryEmpty,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证常见问题标题
      await expect(authenticatedPage.getByText('常见问题')).toBeVisible();

      // 验证问题列表
      await expect(
        authenticatedPage.getByText('配额什么时候重置？')
      ).toBeVisible();
      await expect(
        authenticatedPage.getByText('可以取消订阅吗？')
      ).toBeVisible();
      await expect(
        authenticatedPage.getByText('支持哪些支付方式？')
      ).toBeVisible();
    });

    test('点击问题应该展开答案', async ({ authenticatedPage }) => {
      setupMockRoutes(authenticatedPage, {
        subscription: mockResponses.subscriptionFree,
        plans: mockResponses.plans,
        paymentHistory: mockResponses.paymentHistoryEmpty,
      });

      await authenticatedPage.goto('/dashboard/subscription');

      // 点击第一个问题
      await authenticatedPage.getByText('配额什么时候重置？').click();

      // 验证答案展开
      await expect(
        authenticatedPage.getByText('配额会在每月1日自动重置')
      ).toBeVisible();
    });
  });

  test.describe('加载状态', () => {
    test('应该显示加载状态', async ({ authenticatedPage }) => {
      // 延迟响应
      await authenticatedPage.route('**/api/v1/subscriptions/me', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.subscriptionFree),
        });
      });

      await authenticatedPage.route('**/api/v1/subscriptions/plans', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.plans),
        })
      );

      await authenticatedPage.route('**/api/v1/payments/history', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      );

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证加载状态
      await expect(authenticatedPage.locator('.animate-spin')).toBeVisible();
    });
  });

  test.describe('错误处理', () => {
    test('加载失败应该显示错误提示', async ({ authenticatedPage }) => {
      // Mock 错误响应
      await authenticatedPage.route('**/api/v1/subscriptions/me', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            message: '服务器错误',
            statusCode: 500,
          }),
        })
      );

      await authenticatedPage.goto('/dashboard/subscription');

      // 验证错误提示
      await expect(authenticatedPage.getByText('加载失败')).toBeVisible({ timeout: 5000 });
    });
  });
});
