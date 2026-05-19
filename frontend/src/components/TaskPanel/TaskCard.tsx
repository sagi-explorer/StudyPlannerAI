import { CalendarOutlined, HistoryOutlined } from '@ant-design/icons';
import type { Task, TaskStatus } from '@/types';
import styles from './TaskCard.module.css';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: '待办', color: 'var(--sp-status-todo)' },
  in_progress: { label: '进行中', color: 'var(--sp-status-in-progress)' },
  done: { label: '已完成', color: 'var(--sp-status-done)' },
  overdue: { label: '已逾期', color: 'var(--sp-status-overdue)' },
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'var(--sp-priority-urgent)',
  high: 'var(--sp-priority-high)',
  medium: 'var(--sp-priority-medium)',
  low: 'var(--sp-priority-low)',
};

function isOverdue(task: Task): boolean {
  if (task.status === 'overdue') return true;
  if (task.status === 'done' || !task.due_date) return false;
  return new Date(task.due_date) < new Date(new Date().toDateString());
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function TaskCard({ task, onClick, draggable, onDragStart, onDragEnd }: TaskCardProps) {
  const overdue = isOverdue(task);
  const statusCfg = STATUS_CONFIG[task.status];

  return (
    <div
      className={`${styles.card} ${overdue ? styles.overdue : ''}`}
      style={{ '--priority-color': PRIORITY_COLOR[task.priority] } as React.CSSProperties}
      onClick={() => onClick?.(task)}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task)}
      onDragEnd={onDragEnd}
    >
      <div className={styles.title}>{task.title}</div>
      <div className={styles.meta}>
        <span
          className={styles.statusTag}
          style={{ background: statusCfg.color }}
        >
          {statusCfg.label}
        </span>
        {task.due_date && (
          <span className={`${styles.dueDate} ${overdue ? styles.dueDateOverdue : ''}`}>
            <CalendarOutlined />
            {formatDate(task.due_date)}
          </span>
        )}
        {task.postpone_count > 0 && (
          <span className={styles.postponeBadge}>
            <HistoryOutlined />
            延期{task.postpone_count}次
          </span>
        )}
      </div>
    </div>
  );
}
