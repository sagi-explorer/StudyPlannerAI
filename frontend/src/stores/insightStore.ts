import { create } from 'zustand';
import type { Insight, InsightTag, InsightUpdate } from '@/types';
import { insightService, type InsightListParams } from '@/services/insightService';
import type { InsightTagCreate, InsightTagUpdate, InsightTagMerge } from '@/types';

interface InsightState {
  insights: Insight[];
  tags: InsightTag[];
  selectedTagId: number | null;
  searchKeyword: string;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  sortBy: string;
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;

  fetchInsights: () => Promise<void>;
  fetchTags: () => Promise<void>;
  createInsight: (rawInput: string) => Promise<Insight>;
  updateInsight: (id: number, data: InsightUpdate) => Promise<void>;
  deleteInsight: (id: number) => Promise<void>;
  togglePin: (id: number) => Promise<void>;
  rewriteInsight: (id: number) => Promise<Insight>;

  setSelectedTagId: (id: number | null) => void;
  setSearchKeyword: (keyword: string) => void;
  setCurrentPage: (page: number) => void;
  setSortBy: (sort: string) => void;

  createTag: (data: InsightTagCreate) => Promise<InsightTag>;
  updateTag: (id: number, data: InsightTagUpdate) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  mergeTags: (data: InsightTagMerge) => Promise<void>;
}

export const useInsightStore = create<InsightState>((set, get) => ({
  insights: [],
  tags: [],
  selectedTagId: null,
  searchKeyword: '',
  currentPage: 1,
  pageSize: 20,
  totalCount: 0,
  sortBy: 'created_at',
  isLoading: false,
  isCreating: false,
  error: null,

  fetchInsights: async () => {
    const { selectedTagId, searchKeyword, currentPage, pageSize, sortBy } = get();
    set({ isLoading: true, error: null });
    try {
      const params: InsightListParams = {
        page: currentPage,
        page_size: pageSize,
        sort_by: sortBy,
      };
      if (selectedTagId != null) params.tag_id = selectedTagId;
      if (searchKeyword) params.keyword = searchKeyword;

      const res = await insightService.list(params);
      set({ insights: res.items, totalCount: res.total, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  fetchTags: async () => {
    try {
      const tags = await insightService.listTags();
      set({ tags });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  createInsight: async (rawInput) => {
    set({ isCreating: true, error: null });
    try {
      const insight = await insightService.create({ raw_input: rawInput });
      set({ isCreating: false });
      await get().fetchInsights();
      await get().fetchTags();
      return insight;
    } catch (e) {
      set({ isCreating: false, error: (e as Error).message });
      throw e;
    }
  },

  updateInsight: async (id, data) => {
    try {
      const updated = await insightService.update(id, data);
      set({ insights: get().insights.map((i) => (i.id === id ? updated : i)) });
      if (data.tag_ids) await get().fetchTags();
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  deleteInsight: async (id) => {
    try {
      await insightService.delete(id);
      set({ insights: get().insights.filter((i) => i.id !== id) });
      set({ totalCount: get().totalCount - 1 });
      await get().fetchTags();
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  togglePin: async (id) => {
    try {
      const updated = await insightService.togglePin(id);
      set({ insights: get().insights.map((i) => (i.id === id ? updated : i)) });
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  rewriteInsight: async (id) => {
    try {
      const updated = await insightService.rewrite(id);
      set({ insights: get().insights.map((i) => (i.id === id ? updated : i)) });
      await get().fetchTags();
      return updated;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  setSelectedTagId: (id) => {
    set({ selectedTagId: id, currentPage: 1 });
  },

  setSearchKeyword: (keyword) => {
    set({ searchKeyword: keyword, currentPage: 1 });
  },

  setCurrentPage: (page) => {
    set({ currentPage: page });
  },

  setSortBy: (sort) => {
    set({ sortBy: sort, currentPage: 1 });
  },

  createTag: async (data) => {
    const tag = await insightService.createTag(data);
    set({ tags: [...get().tags, tag] });
    return tag;
  },

  updateTag: async (id, data) => {
    const updated = await insightService.updateTag(id, data);
    set({ tags: get().tags.map((t) => (t.id === id ? updated : t)) });
  },

  deleteTag: async (id) => {
    await insightService.deleteTag(id);
    set({ tags: get().tags.filter((t) => t.id !== id) });
    if (get().selectedTagId === id) {
      set({ selectedTagId: null });
    }
    await get().fetchInsights();
  },

  mergeTags: async (data) => {
    await insightService.mergeTags(data);
    await get().fetchTags();
    if (get().selectedTagId === data.source_tag_id) {
      set({ selectedTagId: data.target_tag_id });
    }
    await get().fetchInsights();
  },
}));
