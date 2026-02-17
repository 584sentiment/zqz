'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={cycleTheme}
      title={
        theme === 'light'
          ? '切换到深色模式'
          : theme === 'dark'
          ? '切换到系统模式'
          : '切换到浅色模式'
      }
    >
      {theme === 'light' ? (
        <Sun className="h-4 w-4 text-yellow-500" />
      ) : theme === 'dark' ? (
        <Moon className="h-4 w-4 text-blue-400" />
      ) : (
        <Monitor className="h-4 w-4" />
      )}
      <span className="sr-only">切换主题</span>
    </Button>
  );
}
