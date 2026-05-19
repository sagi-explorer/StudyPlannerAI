import { useState } from 'react';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  WarningOutlined,
  LinkOutlined,
  EditOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PostponeAnalysis } from '@/types';
import { taskService } from '@/services/taskService';
import styles from './PostponeCard.module.css';

interface PostponeCardProps {
  analysis: PostponeAnalysis;
  onPostponed: () => void;
  onCancel: () => void;
}

export function PostponeCard({ analysis, onPostponed, onCancel }: PostponeCardProps) {
  const [selectedDate, setSelectedDate] = useState(analysis.suggested_new_date);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState<'confirmed' | 'cancelled' | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await taskService.postpone(analysis.task_id, selectedDate);
      setResolved('confirmed');
      onPostponed();
    } catch {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setResolved('cancelled');
    onCancel();
  };

  const maxDensity = Math.max(...analysis.upcoming_task_density.map((d) => d.task_count), 1);

  return (
    <div className={`${styles.card} ${resolved ? styles.resolved : ''}`}>
      <div className={styles.header}>
        <span className={styles.badge}>
          <ClockCircleOutlined />
          延期分析
        </span>
        {analysis.postpone_count > 0 && (
          <span className={styles.warnBadge}>
            <WarningOutlined />
            已延期 {analysis.postpone_count} 次
          </span>
        )}
      </div>

      <div className={styles.aiAnalysis}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.ai_analysis}</ReactMarkdown>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoBlock}>
          <div className={styles.infoLabel}>
            <CalendarOutlined /> 建议日期
          </div>
          <div className={styles.dateRow}>
            {editing ? (
              <input
                type="date"
                className={styles.dateInput}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            ) : (
              <span className={styles.dateValue}>{selectedDate}</span>
            )}
            {!resolved && (
              <button
                className={styles.editBtn}
                onClick={() => setEditing(!editing)}
                title={editing ? '完成' : '修改日期'}
              >
                <EditOutlined />
              </button>
            )}
          </div>
        </div>

        <div className={styles.infoBlock}>
          <div className={styles.infoLabel}>后续任务密度</div>
          <div className={styles.densityChart}>
            {analysis.upcoming_task_density.map((d) => (
              <div key={d.date} className={styles.densityBar}>
                <div
                  className={styles.densityFill}
                  style={{ height: `${(d.task_count / maxDensity) * 100}%` }}
                />
                <span className={styles.densityLabel}>
                  {d.date.slice(5)}
                </span>
                <span className={styles.densityCount}>{d.task_count}</span>
              </div>
            ))}
          </div>
        </div>

        {analysis.affected_related_tasks.length > 0 && (
          <div className={styles.infoBlock}>
            <div className={styles.infoLabel}>
              <LinkOutlined /> 受影响的关联任务
            </div>
            <ul className={styles.relatedList}>
              {analysis.affected_related_tasks.map((rt) => (
                <li key={rt.id}>{rt.title}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {resolved ? (
        <div className={styles.resolvedLabel}>
          {resolved === 'confirmed' ? '已确认延期' : '已取消'}
        </div>
      ) : (
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={handleCancel} disabled={loading}>
            取消
          </button>
          <button className={styles.confirmBtn} onClick={handleConfirm} disabled={loading}>
            {loading ? '执行中...' : `确认延期到 ${selectedDate}`}
          </button>
        </div>
      )}
    </div>
  );
}
