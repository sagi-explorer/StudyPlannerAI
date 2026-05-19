import { create } from 'zustand';
import type { Task, TaskCreate, TaskUpdate } from '@/types';
import { taskService } from '@/services/taskService';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;

  fetchTasks: (categoryId?: number) => Promise<void>;
  createTask: (data: TaskCreate) => Promise<Task>;
  updateTask: (id: number, data: TaskUpdate) => Promise<void>;
  updateTaskStatus: (id: number, status: string) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  postponeTask: (id: number, newDate: string, reason?: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async (categoryId) => {
    set({ loading: true, error: null });
    try {
      const tasks = await taskService.list(categoryId);
      set({ tasks, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createTask: async (data) => {
    const task = await taskService.create(data);
    set({ tasks: [...get().tasks, task] });
    return task;
  },

  updateTask: async (id, data) => {
    const updated = await taskService.update(id, data);
    set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) });
  },

  updateTaskStatus: async (id, status) => {
    const updated = await taskService.updateStatus(id, status);
    set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) });
  },

  deleteTask: async (id) => {
    await taskService.delete(id);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },

  postponeTask: async (id, newDate, reason) => {
    const updated = await taskService.postpone(id, newDate, reason);
    set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) });
  },
}));
