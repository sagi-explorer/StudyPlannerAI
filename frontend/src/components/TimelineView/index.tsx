import { useMemo } from 'react';
import type { Task } from '@/types';
import { TaskCard } from '@/components/TaskPanel/TaskCard';
import styles from './index.module.css';

interface TimelineViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

function toDateKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateLabel(dateKey: string, todayKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const wd = weekdays[d.getDay()];

  if (dateKey === todayKey) return `${month}月${day}日 ${wd}`;

  const yesterday = new Date(todayKey + 'T00:00:00');
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.getTime() === yesterday.getTime()) return `${month}月${day}日 ${wd} · 昨天`;

  const tomorrow = new Date(todayKey + 'T00:00:00');
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.getTime() === tomorrow.getTime()) return `${month}月${day}日 ${wd} · 明天`;

  return `${month}月${day}日 ${wd}`;
}

interface DateGroup {
  dateKey: string;
  tasks: Task[];
}

export function TimelineView({ tasks, onTaskClick }: TimelineViewProps) {
  const todayKey = useMemo(() => getTodayKey(), []);

  const groups: DateGroup[] = useMemo(() => {
    const map = new Map<string, Task[]>();
    const noDate: Task[] = [];

    for (const task of tasks) {
      if (task.due_date) {
        const key = toDateKey(task.due_date);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);
      } else {
        noDate.push(task);
      }
    }

    const sorted = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, dateTasks]) => ({ dateKey, tasks: dateTasks }));

    if (noDate.length > 0) {
      sorted.push({ dateKey: 'no-date', tasks: noDate });
    }

    return sorted;
  }, [tasks]);

  if (groups.length === 0) {
    return <div className={styles.empty}>暂无任务</div>;
  }

  return (
    <div className={styles.timeline}>
      {groups.map((group) => {
        const isToday = group.dateKey === todayKey;
        const isPast = group.dateKey !== 'no-date' && group.dateKey < todayKey;

        return (
          <div
            key={group.dateKey}
            className={`${styles.group} ${isToday ? styles.groupToday : ''} ${isPast ? styles.groupOverdue : ''}`}
          >
            <div className={styles.groupHeader}>
              <span className={styles.dateLabel}>
                {group.dateKey === 'no-date'
                  ? '未设定日期'
                  : formatDateLabel(group.dateKey, todayKey)}
                {isToday && <span className={styles.todayBadge}>今天</span>}
                {isPast && <span className={styles.overdueBadge}>已过期</span>}
              </span>
              <span className={styles.taskCount}>{group.tasks.length} 项</span>
            </div>
            <div className={styles.groupBody}>
              {group.tasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={onTaskClick} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
