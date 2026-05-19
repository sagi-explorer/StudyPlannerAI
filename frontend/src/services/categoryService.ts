import type { Category, CategoryCreate, CategoryUpdate } from '@/types';
import { get, post, put, del } from './apiClient';

export const categoryService = {
  list(): Promise<Category[]> {
    return get<Category[]>('/categories');
  },

  getById(id: number): Promise<Category> {
    return get<Category>(`/categories/${id}`);
  },

  create(data: CategoryCreate): Promise<Category> {
    return post<Category>('/categories', data);
  },

  update(id: number, data: CategoryUpdate): Promise<Category> {
    return put<Category>(`/categories/${id}`, data);
  },

  delete(id: number): Promise<void> {
    return del<void>(`/categories/${id}`);
  },
};
