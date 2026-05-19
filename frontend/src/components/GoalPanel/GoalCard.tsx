import { CalendarOutlined, CheckCircleOutlined, CloseCircleOutlined, EditOutlined, LoadingOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import type { Goal, GoalStatus } from '@/types';
import { useGoalStore } from '@/stores/goalStore';
import styles from './GoalCard.module.css';

function formatCountdown(targetDate: string): { text: string; urgent: boolean } {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { text: '已到期', urgent: true };
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 7) return { text: `剩余 ${days} 天`, urgent: true };
  if (days <= 30) return { text: `剩余 ${days} 天`, urgent: false };
  const months = Math.floor(days / 30);
  return { text: `剩余约 ${months} 个月`, urgent: false };
}

const STATUS_LABEL: Record<GoalStatus, { text: string; color: string }> = {
  active: { text: '进行中', color: 'var(--sp-status-in-progress)' },
  completed: { text: '已达成', color: 'var(--sp-status-done)' },
  abandoned: { text: '已放弃', color: 'var(--sp-status-todo)' },
};

interface GoalCardProps {
  goal: Goal;
  childCount?: number;
  onEdit?: (goal: Goal) => void;
  onStatusChange?: (id: number, status: GoalStatus) => void;
  onClick?: (goal: Goal) => void;
}

function RingProgress({ percent, size = 80 }: { percent: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(percent, 100) / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="url(#goalRingGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <defs>
        <linearGradient id="goalRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--sp-color-primary)" />
          <stop offset="100%" stopColor="var(--sp-color-success)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StatusActions({ goal, onStatusChange, onEdit }: {
  goal: Goal;
  onStatusChange?: (id: number, status: GoalStatus) => void;
  onEdit?: (goal: Goal) => void;
}) {
  const isMutating = useGoalStore((s) => s.mutatingGoalIds.has(goal.id));

  if (goal.status !== 'active') return null;

  if (isMutating) {
    return (
      <div className={styles.actions}>
        <LoadingOutlined style={{ color: 'var(--sp-color-text-secondary)', fontSize: 12 }} />
      </div>
    );
  }

  const items = [
    { key: 'edit', label: '编辑', icon: <EditOutlined />, onClick: () => onEdit?.(goal) },
    { key: 'complete', label: '标记完成', icon: <CheckCircleOutlined />, onClick: () => onStatusChange?.(goal.id, 'completed') },
    { key: 'abandon', label: '放弃目标', icon: <CloseCircleOutlined />, danger: true, onClick: () => onStatusChange?.(goal.id, 'abandoned') },
  ];

  return (
    <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
      <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
        <Button type="text" size="small" style={{ color: 'var(--sp-color-text-secondary)', fontSize: 12 }}>
          ···
        </Button>
      </Dropdown>
    </div>
  );
}

export function GoalCard({ goal, childCount = 0, onEdit, onStatusChange, onClick }: GoalCardProps) {
  const statusCfg = STATUS_LABEL[goal.status];
  const statusClass = goal.status === 'completed' ? styles.completed : goal.status === 'abandoned' ? styles.abandoned : '';

  if (goal.type === 'ultimate') {
    const cd = goal.target_date ? formatCountdown(goal.target_date) : null;
    return (
      <div className={`${styles.card} ${styles.ultimate} ${statusClass}`} onClick={() => onClick?.(goal)}>
        {goal.status !== 'active' && (
          <span className={styles.statusBadge} style={{ background: statusCfg.color }}>{statusCfg.text}</span>
        )}
        <div className={styles.ultimateHeader}>
          <div className={styles.ringContainer}>
            <RingProgress percent={goal.progress} />
            <span className={styles.ringCenter}>{goal.progress}%</span>
          </div>
          <div className={styles.ultimateInfo}>
            <div className={styles.ultimateTitle}>{goal.title}</div>
            {goal.description && <div className={styles.ultimateDesc}>{goal.description}</div>}
            {cd && (
              <span className={`${styles.countdown} ${cd.urgent ? styles.countdownUrgent : ''}`}>
                <CalendarOutlined /> {cd.text}
              </span>
            )}
          </div>
        </div>
        {childCount > 0 && (
          <div className={styles.childCount}>包含 {childCount} 个月目标</div>
        )}
        <StatusActions goal={goal} onStatusChange={onStatusChange} onEdit={onEdit} />
      </div>
    );
  }

  if (goal.type === 'monthly') {
    return (
      <div className={`${styles.card} ${styles.monthly} ${statusClass}`} onClick={() => onClick?.(goal)}>
        {goal.status !== 'active' && (
          <span className={styles.statusBadge} style={{ background: statusCfg.color }}>{statusCfg.text}</span>
        )}
        <div className={styles.monthlyTitle}>{goal.title}</div>
        {goal.description && <div className={styles.monthlyDesc}>{goal.description}</div>}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${goal.progress}%` }} />
        </div>
        <div className={styles.monthlyMeta}>
          <span>{goal.progress}% 完成</span>
          {childCount > 0 && <span>{childCount} 个周目标</span>}
          {goal.target_date && (
            <span><CalendarOutlined /> {new Date(goal.target_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
          )}
        </div>
        <StatusActions goal={goal} onStatusChange={onStatusChange} onEdit={onEdit} />
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles.weekly} ${statusClass}`} onClick={() => onClick?.(goal)}>
      {goal.status !== 'active' && (
        <span className={styles.statusBadge} style={{ background: statusCfg.color }}>{statusCfg.text}</span>
      )}
      <div className={styles.weeklyTitle}>{goal.title}</div>
      <div className={styles.weeklyMeta}>
        <span className={styles.weeklyProgress}>
          <span className={styles.miniBar}>
            <span className={styles.miniFill} style={{ width: `${goal.progress}%` }} />
          </span>
          {goal.progress}%
        </span>
        {goal.target_date && (
          <span><CalendarOutlined /> {new Date(goal.target_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
        )}
      </div>
      <StatusActions goal={goal} onStatusChange={onStatusChange} onEdit={onEdit} />
    </div>
  );
}
