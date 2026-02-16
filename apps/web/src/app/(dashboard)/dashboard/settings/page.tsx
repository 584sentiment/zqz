'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import {
  User,
  Mail,
  Camera,
  Save,
  Loader2,
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/users/me');
      setUser(data);
      setName(data.nickname || '');
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

        {/* 账户安全提示 */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h3 className="font-medium text-blue-900 mb-1">安全提示</h3>
          <p className="text-sm text-blue-700">
            如需修改密码或删除账户，请联系客服处理。
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
