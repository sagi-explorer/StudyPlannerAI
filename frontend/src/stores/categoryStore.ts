import { create } from 'zustand';
import type { Category } from '@/types';
import { categoryService } from '@/services/categoryService';

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;

  fetchCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const categories = await categoryService.list();
      set({ categories, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },
}));
