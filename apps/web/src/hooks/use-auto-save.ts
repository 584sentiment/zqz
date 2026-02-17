import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  /** 数据 */
  data: T;
  /** 保存函数 */
  onSave: (data: T) => Promise<void>;
  /** 防抖延迟时间（毫秒），默认 2000ms */
  debounceMs?: number;
  /** 是否启用自动保存，默认 true */
  enabled?: boolean;
}

interface UseAutoSaveResult {
  /** 是否正在保存 */
  isSaving: boolean;
  /** 上次保存时间 */
  lastSavedAt: Date | null;
  /** 是否有未保存的更改 */
  hasUnsavedChanges: boolean;
  /** 手动保存 */
  save: () => Promise<void>;
  /** 保存状态文本 */
  saveStatusText: string;
}

/**
 * 自动保存 Hook
 * 在数据变化后自动触发保存，使用防抖机制避免频繁保存
 */
export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveResult {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 使用 ref 存储最新的数据和回调，避免闭包问题
  const dataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialRenderRef = useRef(true);

  // 更新 ref
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // 实际执行保存
  const performSave = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onSaveRef.current(dataRef.current);
      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('自动保存失败:', error);
      // 保存失败时保持未保存状态
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  // 手动保存
  const save = useCallback(async () => {
    // 清除待执行的自动保存
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await performSave();
  }, [performSave]);

  // 监听数据变化，触发防抖保存
  useEffect(() => {
    // 跳过初始渲染
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    if (!enabled) return;

    // 标记有未保存的更改
    setHasUnsavedChanges(true);

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    // 清理
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, debounceMs, performSave]);

  // 页面离开前保存
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isSaving) {
        // 立即保存
        performSave();

        // 提示用户
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isSaving, performSave]);

  // 生成保存状态文本
  const saveStatusText = (() => {
    if (isSaving) return '保存中...';
    if (hasUnsavedChanges) return '有未保存的更改';
    if (lastSavedAt) {
      const now = new Date();
      const diffMs = now.getTime() - lastSavedAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return '刚刚已保存';
      if (diffMins < 60) return `${diffMins} 分钟前已保存`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} 小时前已保存`;

      return lastSavedAt.toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return '';
  })();

  return {
    isSaving,
    lastSavedAt,
    hasUnsavedChanges,
    save,
    saveStatusText,
  };
}
