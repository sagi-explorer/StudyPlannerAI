import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewMode = 'timeline' | 'kanban';
type ThemeMode = 'dark' | 'light';

interface UIState {
  activeCategoryId: number | null;
  chatPanelCollapsed: boolean;
  viewMode: ViewMode;
  activeNav: 'tasks' | 'goals' | 'insights' | 'reviews' | 'stats' | 'settings';
  themeMode: ThemeMode;

  setActiveCategoryId: (id: number | null) => void;
  toggleChatPanel: () => void;
  setChatPanelCollapsed: (collapsed: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveNav: (nav: UIState['activeNav']) => void;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeCategoryId: null,
      chatPanelCollapsed: false,
      viewMode: 'timeline',
      activeNav: 'tasks',
      themeMode: 'dark',

      setActiveCategoryId: (id) => set({ activeCategoryId: id }),
      toggleChatPanel: () => set((s) => ({ chatPanelCollapsed: !s.chatPanelCollapsed })),
      setChatPanelCollapsed: (collapsed) => set({ chatPanelCollapsed: collapsed }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setActiveNav: (nav) => set({ activeNav: nav }),
      toggleTheme: () =>
        set((s) => ({ themeMode: s.themeMode === 'dark' ? 'light' : 'dark' })),
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'sp-ui-store',
      partialize: (state) => ({ themeMode: state.themeMode }),
    },
  ),
);
