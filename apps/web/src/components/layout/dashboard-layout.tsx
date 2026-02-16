'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { apiClient } from '@/lib/api/client';
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
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/dashboard', label: '首页', icon: LayoutDashboard },
  { href: '/dashboard/jobs', label: '岗位管理', icon: Briefcase },
  { href: '/dashboard/profile', label: '个人档案', icon: User },
  { href: '/dashboard/resumes', label: '简历管理', icon: FileText },
  { href: '/dashboard/interviews', label: '模拟面试', icon: MessageSquare },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, logout, setUser } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // 从 API 获取最新用户信息
  useEffect(() => {
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
        // 更新 auth store 中的用户信息
        setUser({
          id: data.id,
          email: data.email,
          name: data.nickname || data.profile?.name || '用户',
          avatarUrl: data.avatarUrl,
          emailVerified: data.emailVerified,
        });
      } catch (error) {
        // 静默失败，可能是 token 过期，由 API client 处理
      }
    };

    // 只在用户信息不完整时获取
    if (!user?.name) {
      fetchUser();
    }
  }, [user?.name, setUser]);

  // 关闭移动菜单当路由变化
  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Logo + Nav */}
            <div className="flex items-center gap-4 md:gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">智</span>
                </div>
                <span className="font-bold text-xl text-gray-900">智求职</span>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center space-x-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 text-sm font-medium transition ${
                        isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: Search + Notifications + User */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Search - Desktop */}
              <div className="hidden lg:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="搜索职位、公司..."
                  className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Search - Mobile */}
              <button className="lg:hidden p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition">
                <Search className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition">
                <Bell className="w-5 h-5" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 sm:gap-3 sm:pl-4 sm:border-l sm:border-gray-200"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{user?.name || '用户'}</p>
                    <p className="text-xs text-gray-500">免费会员</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      设置
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">{children}</main>
    </div>
  );
}
