import type { Task, TaskCreate, TaskUpdate, PostponeAnalysis } from '@/types';
import { get, post, put, del } from './apiClient';

export const taskService = {
  list(categoryId?: number): Promise<Task[]> {
    const query = categoryId ? `?category_id=${categoryId}` : '';
    return get<Task[]>(`/tasks${query}`);
  },

  getById(id: number): Promise<Task> {
    return get<Task>(`/tasks/${id}`);
  },

  create(data: TaskCreate): Promise<Task> {
    return post<Task>('/tasks', data);
  },

  update(id: number, data: TaskUpdate): Promise<Task> {
    return put<Task>(`/tasks/${id}`, data);
  },

  delete(id: number): Promise<void> {
    return del<void>(`/tasks/${id}`);
  },

  updateStatus(id: number, status: string): Promise<Task> {
    return put<Task>(`/tasks/${id}/status`, { status });
  },

  postpone(id: number, newDate: string, reason?: string): Promise<Task> {
    return put<Task>(`/tasks/${id}/postpone`, { new_due_date: newDate, reason });
  },

  analyzePostpone(id: number, reason?: string): Promise<PostponeAnalysis> {
    return post<PostponeAnalysis>(`/tasks/${id}/postpone/analyze`, { reason: reason ?? null });
  },
};
