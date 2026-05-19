export interface InsightTag {
  id: number;
  name: string;
  color: string | null;
  insight_count?: number;
  created_at: string;
}

export interface InsightTagCreate {
  name: string;
  color?: string;
}

export interface InsightTagUpdate {
  name?: string;
  color?: string;
}

export interface InsightTagMerge {
  source_tag_id: number;
  target_tag_id: number;
}
