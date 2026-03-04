/**
 * 简历编辑历史记录 Hook
 * 提供撤销/重做功能
 */

import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseResumeHistoryOptions<T> {
  /** 初始值 */
  initialValue: T;
  /** 值变化回调 */
  onChange?: (value: T) => void;
  /** 最大历史记录数 */
  maxHistory?: number;
}

interface UseResumeHistoryReturn<T> {
  /** 当前值 */
  value: T;
  /** 设置新值（会记录历史） */
  setValue: (value: T | ((prev: T) => T)) => void;
  /** 撤销 */
  undo: () => void;
  /** 重做 */
  redo: () => void;
  /** 是否可撤销 */
  canUndo: boolean;
  /** 是否可重做 */
  canRedo: boolean;
  /** 清空历史 */
  clearHistory: () => void;
  /** 重置到指定值（不清空历史） */
  reset: (value: T) => void;
}

export function useResumeHistory<T>({
  initialValue,
  onChange,
  maxHistory = MAX_HISTORY,
}: UseResumeHistoryOptions<T>): UseResumeHistoryReturn<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialValue,
    future: [],
  });

  // 使用 ref 存储回调，避免依赖变化
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 设置新值
  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setHistory((prev) => {
      const resolvedValue = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev.present)
        : newValue;

      // 如果值没有变化，不记录历史
      if (JSON.stringify(resolvedValue) === JSON.stringify(prev.present)) {
        return prev;
      }

      const newPast = [...prev.past, prev.present].slice(-maxHistory);

      // 异步触发回调
      setTimeout(() => {
        onChangeRef.current?.(resolvedValue);
      }, 0);

      return {
        past: newPast,
        present: resolvedValue,
        future: [], // 新操作清空 future
      };
    });
  }, [maxHistory]);

  // 撤销
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      const newPresent = previous;

      // 异步触发回调
      setTimeout(() => {
        onChangeRef.current?.(newPresent);
      }, 0);

      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  // 重做
  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      // 异步触发回调
      setTimeout(() => {
        onChangeRef.current?.(next);
      }, 0);

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  // 清空历史
  const clearHistory = useCallback(() => {
    setHistory((prev) => ({
      past: [],
      present: prev.present,
      future: [],
    }));
  }, []);

  // 重置
  const reset = useCallback((value: T) => {
    setHistory({
      past: [],
      present: value,
      future: [],
    });
    setTimeout(() => {
      onChangeRef.current?.(value);
    }, 0);
  }, []);

  return {
    value: history.present,
    setValue,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    clearHistory,
    reset,
  };
}

export default useResumeHistory;
