import { create } from 'zustand';
import type { FocusSession, FocusSessionStart, FocusStats, WeeklyCompletionRate } from '@/types/focusSession';
import { focusService } from '@/services/focusService';

interface FocusState {
  activeSession: FocusSession | null;
  todaySessions: FocusSession[];
  stats: FocusStats | null;
  completionRates: WeeklyCompletionRate[];
  timerVisible: boolean;
  timerMinimized: boolean;
  loading: boolean;
  error: string | null;

  startSession: (data: FocusSessionStart) => Promise<void>;
  completeSession: () => Promise<void>;
  abandonSession: () => Promise<void>;
  fetchTodaySessions: () => Promise<void>;
  fetchStats: (period?: string, categoryId?: number) => Promise<void>;
  fetchCompletionRates: (weeks?: number) => Promise<void>;
  restoreActiveSession: () => Promise<void>;

  setTimerVisible: (v: boolean) => void;
  toggleTimerVisible: () => void;
  setTimerMinimized: (v: boolean) => void;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  activeSession: null,
  todaySessions: [],
  stats: null,
  completionRates: [],
  timerVisible: false,
  timerMinimized: false,
  loading: false,
  error: null,

  startSession: async (data) => {
    set({ loading: true, error: null });
    try {
      const session = await focusService.start(data);
      set({ activeSession: session, timerVisible: true, timerMinimized: false });
      await get().fetchTodaySessions();
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  completeSession: async () => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({ loading: true, error: null });
    try {
      await focusService.complete(activeSession.id);
      set({ activeSession: null });
      await get().fetchTodaySessions();
      await get().fetchStats();
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  abandonSession: async () => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({ loading: true, error: null });
    try {
      await focusService.abandon(activeSession.id);
      set({ activeSession: null });
      await get().fetchTodaySessions();
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchTodaySessions: async () => {
    try {
      const sessions = await focusService.getToday();
      set({ todaySessions: sessions });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchStats: async (period, categoryId) => {
    try {
      const stats = await focusService.getStats(period, categoryId);
      set({ stats });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchCompletionRates: async (weeks) => {
    try {
      const rates = await focusService.getCompletionRates(weeks);
      set({ completionRates: rates });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  restoreActiveSession: async () => {
    try {
      const [active, sessions] = await Promise.all([
        focusService.getActive(),
        focusService.getToday(),
      ]);
      set({ todaySessions: sessions });
      if (active) {
        set({ activeSession: active, timerVisible: true });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  setTimerVisible: (v) => set({ timerVisible: v }),
  toggleTimerVisible: () => set((s) => ({ timerVisible: !s.timerVisible, timerMinimized: false })),
  setTimerMinimized: (v) => set({ timerMinimized: v }),
}));
