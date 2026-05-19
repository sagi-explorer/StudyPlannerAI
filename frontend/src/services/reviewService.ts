import type { Review, ReviewType } from '@/types';
import { get, post, put } from './apiClient';

export interface ReviewListParams {
  type?: ReviewType;
  is_read?: boolean;
}

export interface ReviewGenerateParams {
  type?: ReviewType;
  period_start?: string;
  period_end?: string;
}

function buildQuery(params: ReviewListParams): string {
  const parts: string[] = [];
  if (params.type) parts.push(`type=${params.type}`);
  if (params.is_read !== undefined) parts.push(`is_read=${params.is_read}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const reviewService = {
  list(params: ReviewListParams = {}): Promise<Review[]> {
    return get<Review[]>(`/reviews${buildQuery(params)}`);
  },

  getById(id: number): Promise<Review> {
    return get<Review>(`/reviews/${id}`);
  },

  generate(params: ReviewGenerateParams = {}): Promise<Review> {
    return post<Review>('/reviews/generate', {
      type: params.type ?? 'manual',
      period_start: params.period_start ?? null,
      period_end: params.period_end ?? null,
    });
  },

  markAsRead(id: number): Promise<Review> {
    return put<Review>(`/reviews/${id}/read`, {});
  },

  getUnreadCount(): Promise<{ count: number }> {
    return get<{ count: number }>('/reviews/unread-count');
  },
};
