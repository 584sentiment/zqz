'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { securityApi, SecurityOverview, LoginHistoryItem, ActiveSession } from '@/lib/api/security';
import {
  Shield,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState<string | null>(null);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewData, historyData, sessionsData] = await Promise.all([
        securityApi.getOverview(),
        securityApi.getLoginHistory(50),
        securityApi.getActiveSessions(),
      ]);
      setOverview(overviewData);
      setLoginHistory(historyData);
      setSessions(sessionsData);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载安全信息',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogoutSession = async (sessionId: string) => {
    setIsLoggingOut(sessionId);
    try {
      await securityApi.deleteSession(sessionId);
      toast({
        title: '会话已注销',
        description: '该设备已从您的账户中注销',
      });
      // 刷新会话列表
      const sessionsData = await securityApi.getActiveSessions();
      setSessions(sessionsData);
    } catch (error) {
      toast({
        title: '注销失败',
        description: '无法注销该会话',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(null);
    }
  };

  const handleLogoutAllOtherSessions = async () => {
    if (!confirm('确定要注销所有其他设备吗？')) return;

    setIsLoggingOutAll(true);
    try {
      const result = await securityApi.deleteOtherSessions();
      toast({
        title: '注销成功',
        description: result.message,
      });
      // 刷新会话列表
      const sessionsData = await securityApi.getActiveSessions();
      setSessions(sessionsData);
    } catch (error) {
      toast({
        title: '注销失败',
        description: '无法注销其他设备',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceIcon = (device: string | null) => {
    if (!device) return <Monitor className="w-5 h-5" />;
    if (device.toLowerCase().includes('mobile')) return <Smartphone className="w-5 h-5" />;
    if (device.toLowerCase().includes('tablet')) return <Tablet className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'password':
        return '密码登录';
      case 'github':
        return 'GitHub 登录';
      case 'wechat':
        return '微信登录';
      default:
        return method;
    }
  };

  const displayedHistory = showAllHistory ? loginHistory : loginHistory.slice(0, 5);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">账户安全</h1>
            <p className="text-sm text-gray-500 mt-1">管理您的登录设备和账户安全设置</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>

        {/* 安全概览 */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Monitor className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">活跃会话</p>
                  <p className="text-xl font-bold text-gray-900">{overview.activeSessionsCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">登录次数</p>
                  <p className="text-xl font-bold text-gray-900">{overview.recentLoginsCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${overview.suspiciousActivities > 0 ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                  <Shield className={`w-5 h-5 ${overview.suspiciousActivities > 0 ? 'text-yellow-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">可疑活动</p>
                  <p className={`text-xl font-bold ${overview.suspiciousActivities > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {overview.suspiciousActivities}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 上次登录信息 */}
        {overview?.lastLogin && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">上次登录</p>
                <p className="text-sm text-gray-500">
                  {formatDate(overview.lastLogin.loginAt)}
                  {overview.lastLogin.device && ` · ${overview.lastLogin.device}`}
                  {overview.lastLogin.browser && ` · ${overview.lastLogin.browser}`}
                  {overview.lastLogin.os && ` · ${overview.lastLogin.os}`}
                </p>
              </div>
              {overview.lastLogin.ipAddress && (
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                  IP: {overview.lastLogin.ipAddress}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 活跃会话 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              活跃设备
            </h2>
            {otherSessionsCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={handleLogoutAllOtherSessions}
                disabled={isLoggingOutAll}
              >
                {isLoggingOutAll ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                注销其他 {otherSessionsCount} 个设备
              </Button>
            )}
          </div>

          {sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无活跃会话</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    session.isCurrent ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${session.isCurrent ? 'bg-primary/10' : 'bg-white'}`}>
                      <Monitor className={`w-5 h-5 ${session.isCurrent ? 'text-primary' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {session.deviceName || '未知设备'}
                        </p>
                        {session.isCurrent && (
                          <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">
                            当前设备
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        上次活跃: {formatDate(session.lastActiveAt)}
                        {session.ipAddress && ` · IP: ${session.ipAddress}`}
                      </p>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleLogoutSession(session.id)}
                      disabled={isLoggingOut === session.id}
                    >
                      {isLoggingOut === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 登录历史 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" />
            登录历史
          </h2>

          {loginHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无登录记录</p>
          ) : (
            <>
              <div className="space-y-2">
                {displayedHistory.map((record) => (
                  <div
                    key={record.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      record.success ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${record.success ? 'bg-white' : 'bg-red-100'}`}>
                        {record.success ? (
                          getDeviceIcon(record.device)
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {getMethodLabel(record.loginMethod)}
                          </p>
                          {!record.success && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                              失败
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDate(record.loginAt)}
                          {record.browser && ` · ${record.browser}`}
                          {record.os && ` · ${record.os}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {record.ipAddress && (
                        <p className="text-xs text-gray-400">{record.ipAddress}</p>
                      )}
                      {record.location && (
                        <p className="text-xs text-gray-400 flex items-center justify-end gap-1">
                          <MapPin className="w-3 h-3" />
                          {record.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {loginHistory.length > 5 && (
                <div className="mt-4 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="text-primary"
                  >
                    {showAllHistory ? (
                      <>
                        收起
                        <ChevronUp className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        查看全部 {loginHistory.length} 条记录
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 安全提示 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">安全提示</p>
              <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside space-y-1">
                <li>如果发现可疑登录活动，请立即修改密码</li>
                <li>定期检查活跃设备，注销不认识的设备</li>
                <li>不要在公共电脑上选择"记住我"</li>
                <li>使用强密码并定期更换</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
