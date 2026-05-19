import { Button } from 'antd';
import type { Goal } from '@/types';
import styles from './AchievementBadge.module.css';

interface AchievementBadgeProps {
  goal: Goal;
  childGoalCount?: number;
  onClose: () => void;
}

function getDuration(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} 天`;
  const months = Math.floor(days / 30);
  return `${months} 个月`;
}

export function AchievementBadge({ goal, childGoalCount = 0, onClose }: AchievementBadgeProps) {
  const duration = getDuration(goal.created_at);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.shimmer} />
        <div className={styles.badge}>🏆</div>
        <div className={styles.title}>终极目标达成！</div>
        <div className={styles.goalName}>{goal.title}</div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{duration}</div>
            <div className={styles.statLabel}>坚持时长</div>
          </div>
          {childGoalCount > 0 && (
            <div className={styles.stat}>
              <div className={styles.statValue}>{childGoalCount}</div>
              <div className={styles.statLabel}>完成子目标</div>
            </div>
          )}
        </div>
        <div className={styles.message}>
          了不起的成就！从设立目标到最终达成，你展现了非凡的毅力和执行力。这段旅程中的每一步努力都值得铭记。
        </div>
        <Button type="primary" size="large" onClick={onClose}>
          开启新征程
        </Button>
      </div>
    </div>
  );
}
