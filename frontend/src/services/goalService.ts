import type { Goal, GoalCreate, GoalUpdate, GoalStatus } from '@/types';
import { get, post, put, del } from './apiClient';

export interface GoalProgress {
  goal: Goal;
  children: Goal[];
  task_total: number;
  task_done: number;
}

export const goalService = {
  list(params?: { type?: string; status?: string; parent_goal_id?: number }): Promise<Goal[]> {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.status) search.set('status', params.status);
    if (params?.parent_goal_id != null) search.set('parent_goal_id', String(params.parent_goal_id));
    const qs = search.toString();
    return get<Goal[]>(`/goals${qs ? `?${qs}` : ''}`);
  },

  getById(id: number): Promise<Goal> {
    return get<Goal>(`/goals/${id}`);
  },

  create(data: GoalCreate): Promise<Goal> {
    return post<Goal>('/goals', data);
  },

  update(id: number, data: GoalUpdate): Promise<Goal> {
    return put<Goal>(`/goals/${id}`, data);
  },

  updateStatus(id: number, status: GoalStatus): Promise<Goal> {
    return put<Goal>(`/goals/${id}/status`, { status });
  },

  getProgress(id: number): Promise<GoalProgress> {
    return get<GoalProgress>(`/goals/${id}/progress`);
  },

  delete(id: number): Promise<void> {
    return del<void>(`/goals/${id}`);
  },
};
