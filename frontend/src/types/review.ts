export type ReviewType = 'daily' | 'weekly' | 'manual';

export interface Review {
  id: number;
  type: ReviewType;
  period_start: string;
  period_end: string;
  content: string;
  stats: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}
