import type { InsightTag } from './insightTag';

export type InsightSource = 'manual' | 'chat';

export interface Insight {
  id: number;
  content: string;
  summary: string | null;
  source: InsightSource;
  is_pinned: boolean;
  tags: InsightTag[];
  created_at: string;
  updated_at: string;
}

export interface InsightCreate {
  raw_input: string;
}

export interface InsightUpdate {
  content?: string;
  summary?: string;
  tag_ids?: number[];
}

export interface InsightListResponse {
  items: Insight[];
  total: number;
  page: number;
  page_size: number;
}
