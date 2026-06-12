import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface UIStore {
  assetPanelCollapsed: boolean;
  aiPanelVisible: boolean;
  activeNav: string;
  theme: Theme;
  toggleAssetPanel: () => void;
  setAIPanelVisible: (visible: boolean) => void;
  setActiveNav: (nav: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
  localStorage.setItem('theme', theme);
}

// Apply initial theme immediately
const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useUIStore = create<UIStore>((set) => ({
  assetPanelCollapsed: false,
  aiPanelVisible: true,
  activeNav: 'reports',
  theme: initialTheme,
  toggleAssetPanel: () =>
    set((s) => ({ assetPanelCollapsed: !s.assetPanelCollapsed })),
  setAIPanelVisible: (visible) => set({ aiPanelVisible: visible }),
  setActiveNav: (nav) => set({ activeNav: nav }),
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return { theme: next };
    }),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));
