import { create } from 'zustand';
import type { Review, ReviewType } from '@/types';
import { reviewService } from '@/services/reviewService';

interface ReviewState {
  reviews: Review[];
  selectedReview: Review | null;
  filterType: ReviewType | null;
  filterUnread: boolean;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  globalUnreadCount: number;

  fetchReviews: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  selectReview: (id: number) => Promise<void>;
  clearSelection: () => void;
  generateReview: (type?: ReviewType) => Promise<Review>;
  markAsRead: (id: number) => Promise<void>;
  setFilterType: (type: ReviewType | null) => void;
  setFilterUnread: (unread: boolean) => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],
  selectedReview: null,
  filterType: null,
  filterUnread: false,
  isLoading: false,
  isGenerating: false,
  error: null,
  globalUnreadCount: 0,

  fetchReviews: async () => {
    const { filterType, filterUnread } = get();
    set({ isLoading: true, error: null });
    try {
      const reviews = await reviewService.list({
        type: filterType ?? undefined,
        is_read: filterUnread ? false : undefined,
      });
      set({ reviews, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { count } = await reviewService.getUnreadCount();
      set({ globalUnreadCount: count });
    } catch {
      // silently ignore — badge just stays stale
    }
  },

  selectReview: async (id) => {
    try {
      const review = await reviewService.getById(id);
      set({ selectedReview: review });
      if (!review.is_read) {
        await get().markAsRead(id);
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  clearSelection: () => set({ selectedReview: null }),

  generateReview: async (type = 'manual') => {
    set({ isGenerating: true, error: null });
    try {
      const review = await reviewService.generate({ type });
      set({ isGenerating: false, selectedReview: review });
      await get().fetchReviews();
      await get().fetchUnreadCount();
      return review;
    } catch (e) {
      set({ isGenerating: false, error: (e as Error).message });
      throw e;
    }
  },

  markAsRead: async (id) => {
    try {
      const updated = await reviewService.markAsRead(id);
      set({
        reviews: get().reviews.map((r) => (r.id === id ? updated : r)),
        selectedReview: get().selectedReview?.id === id ? updated : get().selectedReview,
        globalUnreadCount: Math.max(0, get().globalUnreadCount - 1),
      });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  setFilterType: (type) => set({ filterType: type }),
  setFilterUnread: (unread) => set({ filterUnread: unread }),
}));
