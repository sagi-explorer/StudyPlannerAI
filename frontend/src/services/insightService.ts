import type {
  Insight,
  InsightCreate,
  InsightUpdate,
  InsightListResponse,
  InsightTag,
  InsightTagCreate,
  InsightTagUpdate,
  InsightTagMerge,
} from '@/types';
import { get, post, put, del } from './apiClient';

export interface InsightListParams {
  tag_id?: number;
  keyword?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
}

function buildQuery(params: InsightListParams): string {
  const parts: string[] = [];
  if (params.tag_id != null) parts.push(`tag_id=${params.tag_id}`);
  if (params.keyword) parts.push(`keyword=${encodeURIComponent(params.keyword)}`);
  if (params.page != null) parts.push(`page=${params.page}`);
  if (params.page_size != null) parts.push(`page_size=${params.page_size}`);
  if (params.sort_by) parts.push(`sort_by=${params.sort_by}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const insightService = {
  list(params: InsightListParams = {}): Promise<InsightListResponse> {
    return get<InsightListResponse>(`/insights${buildQuery(params)}`);
  },

  getById(id: number): Promise<Insight> {
    return get<Insight>(`/insights/${id}`);
  },

  create(data: InsightCreate): Promise<Insight> {
    return post<Insight>('/insights', data);
  },

  update(id: number, data: InsightUpdate): Promise<Insight> {
    return put<Insight>(`/insights/${id}`, data);
  },

  delete(id: number): Promise<void> {
    return del<void>(`/insights/${id}`);
  },

  togglePin(id: number): Promise<Insight> {
    return put<Insight>(`/insights/${id}/pin`, {});
  },

  rewrite(id: number): Promise<Insight> {
    return post<Insight>(`/insights/${id}/rewrite`, {});
  },

  listTags(): Promise<InsightTag[]> {
    return get<InsightTag[]>('/insight-tags');
  },

  createTag(data: InsightTagCreate): Promise<InsightTag> {
    return post<InsightTag>('/insight-tags', data);
  },

  updateTag(id: number, data: InsightTagUpdate): Promise<InsightTag> {
    return put<InsightTag>(`/insight-tags/${id}`, data);
  },

  deleteTag(id: number): Promise<void> {
    return del<void>(`/insight-tags/${id}`);
  },

  mergeTags(data: InsightTagMerge): Promise<InsightTag> {
    return post<InsightTag>('/insight-tags/merge', data);
  },
};
