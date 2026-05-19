import { useEffect } from 'react';
import { Space } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useFocusStore } from '@/stores/focusStore';
import styles from './StatusBar.module.css';

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = (minutes / 60).toFixed(1);
  return `${h}h`;
}

export function StatusBar() {
  const { todaySessions, stats, fetchTodaySessions, fetchStats, restoreActiveSession } = useFocusStore();

  useEffect(() => {
    restoreActiveSession();
    fetchStats();
  }, [restoreActiveSession, fetchStats]);

  const todayCompleted = todaySessions.filter((s) => s.completed).length;
  const weekMinutes = stats?.total_minutes ?? 0;

  return (
    <div className={styles.bar}>
      <Space size={24}>
        <span className={styles.item}>
          <CheckCircleOutlined style={{ color: 'var(--sp-status-done)' }} />
          <span>今日完成率 —%</span>
        </span>
        <span className={styles.item}>
          <WarningOutlined style={{ color: 'var(--sp-status-overdue)' }} />
          <span>逾期 0</span>
        </span>
        <span className={styles.item}>
          <ClockCircleOutlined style={{ color: 'var(--sp-color-primary)' }} />
          <span>本周学习 {formatHours(weekMinutes)}</span>
        </span>
        <span className={styles.item}>
          <ClockCircleOutlined style={{ color: 'var(--sp-color-success)' }} />
          <span>今日剩余 —</span>
        </span>
        <span className={styles.item}>
          <FireOutlined style={{ color: 'var(--sp-color-warning)' }} />
          <span>番茄钟 {todayCompleted}</span>
        </span>
      </Space>
    </div>
  );
}
