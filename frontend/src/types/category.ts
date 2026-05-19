export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  default_priority: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  icon?: string;
  color?: string;
  default_priority?: string;
}

export interface CategoryUpdate {
  name?: string;
  icon?: string;
  color?: string;
  default_priority?: string;
  sort_order?: number;
}
