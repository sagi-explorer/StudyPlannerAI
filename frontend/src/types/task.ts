export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: number;
  category_id: number;
  goal_id: number | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  original_due_date: string | null;
  completed_at: string | null;
  postpone_count: number;
  postpone_reason: string | null;
  related_task_ids: number[];
  source_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  category_id: number;
  goal_id?: number | null;
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  goal_id?: number | null;
}

export interface TaskDensityItem {
  date: string;
  task_count: number;
}

export interface RelatedTaskItem {
  id: number;
  title: string;
}

export interface PostponeAnalysis {
  task_id: number;
  current_due_date: string;
  postpone_count: number;
  suggested_new_date: string;
  ai_analysis: string;
  upcoming_task_density: TaskDensityItem[];
  affected_related_tasks: RelatedTaskItem[];
}
