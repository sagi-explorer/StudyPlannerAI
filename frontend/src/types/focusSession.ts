export interface FocusSession {
  id: number;
  task_id: number | null;
  category_id: number | null;
  planned_minutes: number;
  actual_minutes: number | null;
  started_at: string;
  ended_at: string | null;
  completed: boolean;
  note: string | null;
}

export interface FocusSessionStart {
  task_id?: number | null;
  category_id?: number | null;
  planned_minutes?: number;
}

export interface DailyBreakdown {
  date: string;
  minutes: number;
}

export interface CategoryBreakdown {
  category_id: number | null;
  category_name: string;
  minutes: number;
}

export interface FocusStats {
  total_minutes: number;
  total_sessions: number;
  completed_sessions: number;
  daily_breakdown: DailyBreakdown[];
  category_breakdown: CategoryBreakdown[];
  comparison_with_last_week: number;
}

export interface WeeklyCompletionRate {
  week: string;
  rate: number;
  total: number;
  done: number;
}
