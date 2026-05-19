import type { FocusSession, FocusSessionStart, FocusStats, WeeklyCompletionRate } from '@/types/focusSession';
import { get, post, put } from './apiClient';

export const focusService = {
  start(data: FocusSessionStart): Promise<FocusSession> {
    return post<FocusSession>('/focus/start', data);
  },

  complete(id: number, note?: string): Promise<FocusSession> {
    return put<FocusSession>(`/focus/${id}/complete`, note ? { note } : {});
  },

  abandon(id: number, note?: string): Promise<FocusSession> {
    return put<FocusSession>(`/focus/${id}/abandon`, note ? { note } : {});
  },

  getActive(): Promise<FocusSession | null> {
    return get<FocusSession | null>('/focus/active');
  },

  getStats(period = 'week', categoryId?: number): Promise<FocusStats> {
    const params = new URLSearchParams({ period });
    if (categoryId != null) params.set('category_id', String(categoryId));
    return get<FocusStats>(`/focus/stats?${params}`);
  },

  getToday(): Promise<FocusSession[]> {
    return get<FocusSession[]>('/focus/today');
  },

  getCompletionRates(weeks = 4): Promise<WeeklyCompletionRate[]> {
    return get<WeeklyCompletionRate[]>(`/focus/completion-rates?weeks=${weeks}`);
  },
};
