'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import {
  User,
  Mail,
  Lock,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  profile?: {
    name: string;
    phone?: string;
    location?: string;
  };
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { setUser: setAuthUser } = useAuthStore();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // 密码修改状态
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 删除账户状态
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<UserProfile>('/users/me');
      const data = response.data;
      setUser(data);
      setName(data.nickname || data.profile?.name || '');
      setAvatarUrl(data.avatarUrl || '');
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载用户信息',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.patch('/users/me', {
        name,
        avatarUrl: avatarUrl || undefined,
      });
      toast({
        title: '保存成功',
        description: '个人信息已更新',
      });
      // 更新本地状态
      if (user) {
        setUser({ ...user, nickname: name, avatarUrl });
      }
      // 同步更新 auth store
      setAuthUser({
        id: user?.id || '',
        email: user?.email || '',
        name,
        avatarUrl: avatarUrl || undefined,
        emailVerified: user?.emailVerified || false,
      });
    } catch (error) {
      toast({
        title: '保存失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // 验证
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: '请填写完整',
        description: '所有密码字段都必须填写',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: '密码太短',
        description: '新密码至少需要8个字符',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: '密码不匹配',
        description: '两次输入的新密码不一致',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast({
        title: '密码修改成功',
        description: '您的密码已更新，请使用新密码登录',
      });
      // 重置表单
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: '修改失败',
        description: err.response?.data?.message || '当前密码错误或服务器异常',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast({
        title: '请输入密码',
        description: '为了安全起见，请输入您的密码以确认删除',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('确定要删除账户吗？此操作不可撤销，所有数据将被永久删除！')) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      await authApi.deleteAccount(deletePassword);

      toast({
        title: '账户已删除',
        description: '您的账户和所有相关数据已被永久删除',
      });

      // 清除本地状态并跳转到首页
      setAuthUser(null);
      window.location.href = '/';
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: '删除失败',
        description: err.response?.data?.message || '密码错误或服务器异常',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // 预设头像列表
  const avatarOptions = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bailey',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Chester',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Dusty',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Eden',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Frankie',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=George',
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">个人设置</h1>
          <p className="text-sm text-gray-500 mt-1">管理您的个人信息和偏好设置</p>
        </div>

        {/* 基本信息卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <User className="w-5 h-5" />
            基本信息
          </h2>

          <div className="space-y-6">
            {/* 头像选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                头像
              </label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={avatarUrl || avatarOptions[0]}
                    alt="头像"
                    className="w-20 h-20 rounded-full bg-gray-100 object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-2">选择一个预设头像：</p>
                  <div className="flex flex-wrap gap-2">
                    {avatarOptions.map((url, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${
                          avatarUrl === url
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img src={url} alt={`头像选项 ${index + 1}`} className="w-full h-full" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 昵称 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                昵称
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入昵称"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                maxLength={50}
              />
              <p className="text-xs text-gray-400 mt-1">{name.length}/50</p>
            </div>

            {/* 邮箱（只读） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                邮箱
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
                {user?.emailVerified ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    已验证
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                    未验证
                  </span>
                )}
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="pt-4 border-t border-gray-100">
              <Button
                onClick={handleSave}
                disabled={isSaving || name === user?.nickname}
                className="shadow-lg shadow-primary/20"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存更改
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 安全设置卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            安全设置
          </h2>

          <div className="space-y-4">
            {/* 修改密码入口 */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">登录密码</h3>
                <p className="text-sm text-gray-500">定期修改密码可以提高账户安全性</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                <Lock className="w-4 h-4 mr-2" />
                修改密码
              </Button>
            </div>

            {/* 修改密码表单 */}
            {showPasswordSection && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    当前密码
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="请输入当前密码"
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    新密码
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="至少8个字符"
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    确认新密码
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        修改中...
                      </>
                    ) : (
                      '确认修改'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 危险区域卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            危险区域
          </h2>

          <div className="space-y-4">
            {/* 删除账户入口 */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">删除账户</h3>
                <p className="text-sm text-gray-500">永久删除您的账户和所有数据，此操作不可撤销</p>
              </div>
              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                onClick={() => setShowDeleteSection(!showDeleteSection)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除账户
              </Button>
            </div>

            {/* 删除账户表单 */}
            {showDeleteSection && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-700">
                      警告：删除账户将永久丢失以下数据
                    </p>
                    <ul className="text-sm text-red-600 mt-1 list-disc list-inside">
                      <li>所有简历和岗位信息</li>
                      <li>面试记录和准备计划</li>
                      <li>个人档案和技能信息</li>
                      <li>订阅和配额信息</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    请输入密码确认删除
                  </label>
                  <div className="relative">
                    <input
                      type={showDeletePassword ? 'text' : 'password'}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="请输入您的密码"
                      className="w-full px-4 py-2.5 pr-10 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteSection(false);
                      setDeletePassword('');
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount || !deletePassword}
                  >
                    {isDeletingAccount ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        删除中...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        确认删除
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
