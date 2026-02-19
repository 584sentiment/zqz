'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { subscriptionsApi, SubscriptionInfo } from '@/lib/api/subscriptions';
import { notificationsApi } from '@/lib/api/notifications';
import { useToast } from '@/components/ui/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Settings,
  Bell,
  Search,
  LogOut,
  User,
  ChevronDown,
  Briefcase,
  Menu,
  X,
  Mail,
  Loader2,
  Crown,
  Sparkles,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems: Array<{
  href: '/dashboard' | '/dashboard/jobs' | '/dashboard/profile' | '/dashboard/resumes' | '/dashboard/interviews' | '/dashboard/skills/discovery';
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { href: '/dashboard', label: '首页', icon: LayoutDashboard },
  { href: '/dashboard/jobs', label: '岗位管理', icon: Briefcase },
  { href: '/dashboard/skills/discovery', label: '技能发掘', icon: Sparkles },
  { href: '/dashboard/profile', label: '个人档案', icon: User },
  { href: '/dashboard/resumes', label: '简历管理', icon: FileText },
  { href: '/dashboard/interviews', label: '模拟面试', icon: MessageSquare },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, logout, setUser } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // 检查是否需要显示验证邮件提示
  const showVerificationBanner = user && !user.emailVerified && !emailSent;

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const result = await authApi.resendVerification();
      if (result.success) {
        setEmailSent(true);
        toast({
          title: '验证邮件已发送',
          description: '请检查您的邮箱',
        });
      }
    } catch (error) {
      toast({
        title: '发送失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  // 从 API 获取最新用户信息（仅在需要时）
  useEffect(() => {
    // 在以下情况下获取最新用户信息：
    // 1. 用户信息不完整时
    // 2. 用户尚未验证邮箱时（可能刚验证完，需要刷新状态）
    if (!user || (user.name && user.emailVerified)) {
      return;
    }

    let isMounted = true;

    const fetchUser = async () => {
      try {
        const response = await apiClient.get<{
          id: string;
          email: string;
          nickname?: string;
          avatarUrl?: string;
          emailVerified: boolean;
          profile?: { name?: string };
        }>('/users/me');
        const data = response.data;

        if (isMounted) {
          // 更新 auth store 中的用户信息
          setUser({
            id: data.id,
            email: data.email,
            name: data.nickname || data.profile?.name || '用户',
            avatarUrl: data.avatarUrl,
            emailVerified: data.emailVerified,
          });
        }
      } catch {
        // 静默失败，可能是 token 过期，由 API client 处理
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.name, user?.emailVerified, setUser]);

  // 获取用户订阅信息
  useEffect(() => {
    if (!user) {
      setSubscription(null);
      return;
    }

    let isMounted = true;

    const fetchSubscription = async () => {
      try {
        const data = await subscriptionsApi.getMySubscription();
        if (isMounted) {
          setSubscription(data);
        }
      } catch {
        // 静默失败
      }
    };

    fetchSubscription();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // 获取未读消息数量
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    const fetchUnreadCount = async () => {
      try {
        const result = await notificationsApi.getUnreadCount();
        if (isMounted) {
          setUnreadCount(result.count);
        }
      } catch {
        // 静默失败
      }
    };

    fetchUnreadCount();

    // 每 60 秒刷新一次未读数量
    const interval = setInterval(fetchUnreadCount, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  // 关闭移动菜单当路由变化
  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            {/* Left: Logo + Nav */}
            <div className="flex items-center gap-3 sm:gap-4 md:gap-8 min-w-0 flex-shrink-0">
              <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs sm:text-sm">智</span>
                </div>
                <span className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white hidden sm:inline">智求职</span>
              </Link>

              {/* Desktop Nav - lg 以上显示完整文字 */}
              <div className="hidden lg:flex items-center space-x-1 xl:space-x-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  // 首页使用精确匹配，其他页面使用前缀匹配
                  const isActive = item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Tablet Nav - md 到 lg 只显示图标 */}
              <div className="hidden md:flex lg:hidden items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  // 首页使用精确匹配，其他页面使用前缀匹配
                  const isActive = item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`p-2 rounded-lg transition ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-5 h-5" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: Search + Notifications + User */}
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
              {/* Search - Desktop */}
              <div className="hidden xl:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="搜索职位、公司..."
                  className="w-56 xl:w-64 pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Search - Tablet & Mobile */}
              <button className="xl:hidden p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <Search className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <Link
                href="/dashboard/notifications"
                className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition relative"
              >
                <Bell className="w-5 h-5" />
                {/* 通知红点 */}
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[10px] font-medium text-white flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Theme Toggle - 隐藏在最小屏幕 */}
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 lg:gap-3 lg:pl-4 lg:border-l lg:border-gray-200 dark:lg:border-gray-700"
                >
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[100px]">{user?.name || '用户'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{subscription?.planName || '免费会员'}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden lg:block" />
                </button>

                {showUserMenu && (
                  <>
                    {/* 背景遮罩 */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    {/* 菜单 */}
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                      {/* 移动端显示用户信息 */}
                      <div className="lg:hidden px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || '用户'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                      </div>
                      <Link
                        href="/dashboard/subscription"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Crown className="w-4 h-4" />
                        会员中心
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="w-4 h-4" />
                        设置
                      </Link>
                      {/* 移动端显示主题切换 */}
                      <div className="sm:hidden flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="flex items-center gap-2">
                          <ThemeToggle showLabel />
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                // 首页使用精确匹配，其他页面使用前缀匹配
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Email Verification Banner */}
      {showVerificationBanner && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <span className="font-medium">您的邮箱尚未验证</span>
                  <span className="hidden sm:inline">，验证后可使用全部功能</span>
                </p>
              </div>
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-700 rounded-md transition disabled:opacity-50"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    重新发送验证邮件
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">{children}</main>
    </div>
  );
}
