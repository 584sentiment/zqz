'use client';

import { useState, useCallback, useRef } from 'react';

interface UseStreamingTextOptions {
  /** 每个字符的延迟（毫秒） */
  charDelay?: number;
  /** 完成回调 */
  onComplete?: () => void;
}

/**
 * 流式文本输出 Hook
 * 用于模拟 AI 响应的逐字显示效果
 */
export function useStreamingText(options: UseStreamingTextOptions = {}) {
  const { charDelay = 30, onComplete } = options;
  const [displayText, setDisplayText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef(false);

  const startStreaming = useCallback((text: string) => {
    // 清除之前的流
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    abortRef.current = false;
    setDisplayText('');
    setIsStreaming(true);

    let currentIndex = 0;

    const streamNextChar = () => {
      if (abortRef.current) {
        setIsStreaming(false);
        return;
      }

      if (currentIndex < text.length) {
        // 处理换行符，一次添加整行
        const remainingText = text.slice(currentIndex);
        const newlineIndex = remainingText.indexOf('\n');

        if (newlineIndex !== -1 && newlineIndex < 10) {
          // 如果在接下来10个字符内有换行符，一起添加
          const chunk = remainingText.slice(0, newlineIndex + 1);
          currentIndex += chunk.length;
          setDisplayText(text.slice(0, currentIndex));
        } else {
          // 添加单个字符
          currentIndex++;
          setDisplayText(text.slice(0, currentIndex));
        }

        // 随机化延迟，模拟真实打字效果
        const delay = charDelay + Math.random() * 20 - 10;
        timeoutRef.current = setTimeout(streamNextChar, delay);
      } else {
        setIsStreaming(false);
        onComplete?.();
      }
    };

    streamNextChar();
  }, [charDelay, onComplete]);

  const stopStreaming = useCallback(() => {
    abortRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsStreaming(false);
  }, []);

  const completeStreaming = useCallback(() => {
    abortRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsStreaming(false);
  }, []);

  const resetDisplayText = useCallback(() => {
    abortRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayText('');
    setIsStreaming(false);
  }, []);

  return {
    displayText,
    isStreaming,
    startStreaming,
    stopStreaming,
    completeStreaming,
    resetDisplayText,
  };
}

/**
 * 流式 SSE 连接 Hook
 * 用于连接后端流式 API
 */
export function useStreamingSSE() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const connect = useCallback(async (
    url: string,
    onMessage: (text: string) => void,
    onComplete?: () => void
  ) => {
    setError(null);
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete?.();
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onMessage(parsed.content);
              }
            } catch {
              // 如果不是 JSON，直接作为文本处理
              onMessage(data);
            }
          }
        }
      }

      onComplete?.();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // 用户取消，不视为错误
        return;
      }
      setError(err instanceof Error ? err.message : '连接失败');
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    isStreaming,
    error,
    connect,
    disconnect,
  };
}
