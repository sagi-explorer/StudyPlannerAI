import { useState, useCallback } from 'react';
import type { Task, TaskStatus } from '@/types';
import { TaskCard } from '@/components/TaskPanel/TaskCard';
import styles from './index.module.css';

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: '待办', color: 'var(--sp-status-todo)' },
  { status: 'in_progress', label: '进行中', color: 'var(--sp-status-in-progress)' },
  { status: 'done', label: '已完成', color: 'var(--sp-status-done)' },
  { status: 'overdue', label: '已逾期', color: 'var(--sp-status-overdue)' },
];

interface KanbanViewProps {
  tasks: Task[];
  onStatusChange: (taskId: number, newStatus: TaskStatus) => void;
  onTaskClick: (task: Task) => void;
}

export function KanbanView({ tasks, onStatusChange, onTaskClick }: KanbanViewProps) {
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const grouped = COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.status === col.status),
  }));

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('application/x-task-id', String(task.id));
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStatus(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: TaskStatus) => {
      e.preventDefault();
      setDragOverStatus(null);
      const raw = e.dataTransfer.getData('application/x-task-id') || e.dataTransfer.getData('text/plain');
      const taskId = Number(raw);
      if (!isNaN(taskId)) {
        onStatusChange(taskId, targetStatus);
      }
    },
    [onStatusChange],
  );

  const handleDragEnd = useCallback(() => {
    setDragOverStatus(null);
  }, []);

  return (
    <div className={styles.board}>
      {grouped.map((col) => (
        <div key={col.status} className={styles.column}>
          <div className={styles.columnHeader}>
            <span className={styles.columnTitle}>
              <span className={styles.columnDot} style={{ background: col.color }} />
              {col.label}
            </span>
            <span className={styles.columnCount}>{col.tasks.length}</span>
          </div>
          <div
            className={`${styles.columnBody} ${dragOverStatus === col.status ? styles.columnBodyDragOver : ''}`}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            {col.tasks.length === 0 ? (
              <div className={styles.empty}>暂无任务</div>
            ) : (
              col.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={onTaskClick}
                  draggable
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
