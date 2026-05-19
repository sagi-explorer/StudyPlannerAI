import { useEffect, useCallback } from 'react';
import { Spin } from 'antd';
import { useReviewStore } from '@/stores/reviewStore';
import { ReviewDetail } from './ReviewDetail';
import type { ReviewType } from '@/types';
import styles from './index.module.css';

const TYPE_LABELS: Record<ReviewType, string> = {
  daily: '每日',
  weekly: '每周',
  manual: '手动',
};

const TYPE_COLORS: Record<ReviewType, string> = {
  daily: 'var(--sp-color-primary)',
  weekly: 'var(--sp-color-llm-lab, #7c3aed)',
  manual: 'var(--sp-color-work-hub, #06b6d4)',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReviewReport() {
  const {
    reviews, selectedReview, filterType, filterUnread,
    isLoading, isGenerating, error,
    fetchReviews, selectReview, clearSelection, generateReview,
    setFilterType, setFilterUnread,
  } = useReviewStore();

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews, filterType, filterUnread]);

  const handleGenerate = useCallback(async (type: ReviewType = 'manual') => {
    try {
      await generateReview(type);
    } catch {
      // error is set in store
    }
  }, [generateReview]);

  if (selectedReview) {
    return <ReviewDetail review={selectedReview} onBack={clearSelection} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>复盘报告</h2>
        <div className={styles.actions}>
          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filterType === null && !filterUnread ? styles.filterActive : ''}`}
              onClick={() => { setFilterType(null); setFilterUnread(false); }}
            >
              全部
            </button>
            {(['daily', 'weekly', 'manual'] as ReviewType[]).map((t) => (
              <button
                key={t}
                className={`${styles.filterBtn} ${filterType === t ? styles.filterActive : ''}`}
                onClick={() => { setFilterType(t); setFilterUnread(false); }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
            <button
              className={`${styles.filterBtn} ${filterUnread ? styles.filterActive : ''}`}
              onClick={() => { setFilterUnread(!filterUnread); setFilterType(null); }}
            >
              未读
            </button>
          </div>
          <div className={styles.generateBtns}>
            <button
              className={styles.generateBtn}
              disabled={isGenerating}
              onClick={() => handleGenerate('daily')}
            >
              生成每日复盘
            </button>
            <button
              className={styles.generateBtn}
              disabled={isGenerating}
              onClick={() => handleGenerate('weekly')}
            >
              生成每周复盘
            </button>
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {isGenerating && (
        <div className={styles.generating}>
          <Spin size="small" />
          <span>AI 正在生成复盘报告...</span>
        </div>
      )}

      <div className={styles.list}>
        {isLoading ? (
          <div className={styles.loading}><Spin /></div>
        ) : reviews.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📋</span>
            <span>还没有复盘报告</span>
            <span className={styles.emptyHint}>点击上方按钮生成你的第一份复盘</span>
          </div>
        ) : (
          reviews.map((review) => {
            let stats: Record<string, number> | null = null;
            if (review.stats && typeof review.stats === 'object') {
              stats = review.stats as unknown as Record<string, number>;
            } else if (typeof review.stats === 'string') {
              try {
                stats = JSON.parse(review.stats);
              } catch { /* ignore */ }
            }

            return (
              <button
                key={review.id}
                className={`${styles.card} ${!review.is_read ? styles.cardUnread : ''}`}
                onClick={() => selectReview(review.id)}
              >
                <div className={styles.cardLeft}>
                  <span
                    className={styles.typeBadge}
                    style={{ background: TYPE_COLORS[review.type] }}
                  >
                    {TYPE_LABELS[review.type]}
                  </span>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardPeriod}>
                      {formatDate(review.period_start)} — {formatDate(review.period_end)}
                    </span>
                    <span className={styles.cardTime}>
                      {formatCreatedAt(review.created_at)}
                    </span>
                  </div>
                </div>
                <div className={styles.cardRight}>
                  {stats && (
                    <div className={styles.miniStats}>
                      <span className={styles.statItem}>
                        完成率 <strong>{stats.completion_rate ?? 0}%</strong>
                      </span>
                      <span className={styles.statItem}>
                        任务 <strong>{stats.done ?? 0}/{stats.total ?? 0}</strong>
                      </span>
                    </div>
                  )}
                  {!review.is_read && <span className={styles.unreadDot} />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
