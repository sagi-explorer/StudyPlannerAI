import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Review } from '@/types';
import styles from './ReviewDetail.module.css';

interface ReviewDetailProps {
  review: Review;
  onBack: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  daily: '每日复盘',
  weekly: '每周复盘',
  manual: '手动复盘',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function ReviewDetail({ review, onBack }: ReviewDetailProps) {
  let stats: Record<string, number> | null = null;
  if (review.stats && typeof review.stats === 'object') {
    stats = review.stats as unknown as Record<string, number>;
  } else if (typeof review.stats === 'string') {
    try {
      stats = JSON.parse(review.stats);
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={onBack}>
        ← 返回列表
      </button>

      <div className={styles.header}>
        <h2 className={styles.title}>
          {TYPE_LABELS[review.type] ?? '复盘报告'}
        </h2>
        <span className={styles.period}>
          {formatDate(review.period_start)} — {formatDate(review.period_end)}
        </span>
      </div>

      {stats && (
        <div className={styles.statsGrid}>
          <StatCard label="完成率" value={`${stats.completion_rate ?? 0}%`} />
          <StatCard label="总任务" value={`${stats.total ?? 0}`} />
          <StatCard label="已完成" value={`${stats.done ?? 0}`} accent />
          <StatCard label="逾期" value={`${stats.overdue ?? 0}`} warn={!!stats.overdue} />
          <StatCard label="延期率" value={`${stats.postpone_rate ?? 0}%`} />
          <StatCard label="进行中" value={`${stats.in_progress ?? 0}`} />
        </div>
      )}

      <div className={styles.content}>
        {review.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {review.content}
          </ReactMarkdown>
        ) : (
          <div className={styles.noContent}>复盘内容生成失败或为空</div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
  warn = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  const cls = [
    styles.statCard,
    accent ? styles.statAccent : '',
    warn ? styles.statWarn : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
