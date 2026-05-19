import { create } from 'zustand';
import type { Goal, GoalCreate, GoalUpdate, GoalStatus } from '@/types';
import { goalService } from '@/services/goalService';

interface GoalState {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  celebratingGoal: Goal | null;
  mutatingGoalIds: Set<number>;

  fetchGoals: (params?: { type?: string; status?: string; parent_goal_id?: number }) => Promise<void>;
  createGoal: (data: GoalCreate) => Promise<Goal>;
  updateGoal: (id: number, data: GoalUpdate) => Promise<void>;
  updateGoalStatus: (id: number, status: GoalStatus) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  setCelebratingGoal: (goal: Goal | null) => void;
  isGoalMutating: (id: number) => boolean;

  getUltimateGoals: () => Goal[];
  getChildGoals: (parentId: number) => Goal[];
}

function addMutating(set: (fn: (s: GoalState) => Partial<GoalState>) => void, id: number) {
  set((s) => ({ mutatingGoalIds: new Set(s.mutatingGoalIds).add(id) }));
}

function removeMutating(set: (fn: (s: GoalState) => Partial<GoalState>) => void, id: number) {
  set((s) => {
    const next = new Set(s.mutatingGoalIds);
    next.delete(id);
    return { mutatingGoalIds: next };
  });
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  loading: false,
  error: null,
  celebratingGoal: null,
  mutatingGoalIds: new Set(),

  fetchGoals: async (params) => {
    set({ loading: true, error: null });
    try {
      const goals = await goalService.list(params);
      set({ goals, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createGoal: async (data) => {
    const goal = await goalService.create(data);
    set({ goals: [...get().goals, goal] });
    return goal;
  },

  updateGoal: async (id, data) => {
    addMutating(set, id);
    try {
      const updated = await goalService.update(id, data);
      set({ goals: get().goals.map((g) => (g.id === id ? updated : g)) });
    } finally {
      removeMutating(set, id);
    }
  },

  updateGoalStatus: async (id, status) => {
    addMutating(set, id);
    try {
      const updated = await goalService.updateStatus(id, status);
      set({ goals: get().goals.map((g) => (g.id === id ? updated : g)) });
      if (status === 'completed') {
        set({ celebratingGoal: updated });
      }
    } finally {
      removeMutating(set, id);
    }
  },

  deleteGoal: async (id) => {
    addMutating(set, id);
    try {
      await goalService.delete(id);
      set({ goals: get().goals.filter((g) => g.id !== id) });
    } finally {
      removeMutating(set, id);
    }
  },

  setCelebratingGoal: (goal) => set({ celebratingGoal: goal }),
  isGoalMutating: (id) => get().mutatingGoalIds.has(id),

  getUltimateGoals: () => get().goals.filter((g) => g.type === 'ultimate'),
  getChildGoals: (parentId) => get().goals.filter((g) => g.parent_goal_id === parentId),
}));
