export type GoalType = 'ultimate' | 'monthly' | 'weekly';
export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface Goal {
  id: number;
  type: GoalType;
  title: string;
  description: string;
  category_id: number | null;
  parent_goal_id: number | null;
  target_date: string | null;
  status: GoalStatus;
  progress: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalCreate {
  type: GoalType;
  title: string;
  description?: string;
  category_id?: number | null;
  parent_goal_id?: number | null;
  target_date?: string | null;
}

export interface GoalUpdate {
  title?: string;
  description?: string;
  status?: GoalStatus;
  progress?: number;
  target_date?: string | null;
}
