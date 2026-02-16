import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  hydrate: () => void;
}

// 从 localStorage 加载存储的数据
const loadFromStorage = (): Partial<AuthState> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        user: parsed.user || null,
        isAuthenticated: parsed.isAuthenticated || false,
      };
    }
  } catch {
    // ignore
  }
  return {};
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  hydrated: false,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
    // 持久化到 localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'auth-storage',
          JSON.stringify({
            user,
            isAuthenticated: !!user,
          })
        );
      } catch {
        // ignore
      }
    }
  },

  setTokens: (accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
    set({ accessToken });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('auth-storage');
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  hydrate: () => {
    const { hydrated } = get();
    if (hydrated) return;

    const stored = loadFromStorage();
    set({
      ...stored,
      hydrated: true,
    });
  },
}));
