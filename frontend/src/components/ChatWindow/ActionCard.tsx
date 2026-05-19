import { useState } from 'react';
import {
  PlusCircleOutlined,
  EditOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import styles from './ActionCard.module.css';

export type ActionType = 'add' | 'edit' | 'postpone' | 'delete';

export interface TaskAction {
  type: ActionType;
  tasks: {
    title: string;
    category?: string;
    due_date?: string;
    priority?: string;
    [key: string]: unknown;
  }[];
}

interface ActionCardProps {
  action: TaskAction;
  onConfirm: (action: TaskAction) => Promise<void>;
  onCancel: () => void;
}

const ACTION_CONFIG: Record<ActionType, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  add: { label: '新增任务', icon: <PlusCircleOutlined />, badgeClass: styles.badgeAdd },
  edit: { label: '修改任务', icon: <EditOutlined />, badgeClass: styles.badgeEdit },
  postpone: { label: '延期任务', icon: <ClockCircleOutlined />, badgeClass: styles.badgePostpone },
  delete: { label: '删除任务', icon: <DeleteOutlined />, badgeClass: styles.badgeDelete },
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

export function ActionCard({ action, onConfirm, onCancel }: ActionCardProps) {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState<'confirmed' | 'cancelled' | null>(null);

  const config = ACTION_CONFIG[action.type];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(action);
      setResolved('confirmed');
    } catch {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    setResolved('cancelled');
  };

  return (
    <div className={`${styles.card} ${resolved ? styles.resolved : ''}`}>
      <div className={styles.header}>
        <span className={`${styles.badge} ${config.badgeClass}`}>
          {config.icon}
          {config.label}
        </span>
      </div>

      <div className={styles.taskList}>
        {action.tasks.map((task, i) => (
          <div key={i} className={styles.taskItem}>
            <span className={styles.taskTitle}>{task.title}</span>
            <div className={styles.taskMeta}>
              {task.category && <span>{task.category}</span>}
              {task.due_date && <span>截止: {task.due_date}</span>}
              {task.priority && <span>优先级: {PRIORITY_LABELS[task.priority] ?? task.priority}</span>}
            </div>
          </div>
        ))}
      </div>

      {resolved ? (
        <div className={styles.resolvedLabel}>
          {resolved === 'confirmed' ? '已确认' : '已取消'}
        </div>
      ) : (
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={handleCancel} disabled={loading}>
            取消
          </button>
          <button className={styles.confirmBtn} onClick={handleConfirm} disabled={loading}>
            {loading ? '执行中...' : '确认'}
          </button>
        </div>
      )}
    </div>
  );
}
