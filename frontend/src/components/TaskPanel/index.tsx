import { useEffect, useState, useCallback } from 'react';
import { Spin } from 'antd';
import {
  UnorderedListOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useUIStore } from '@/stores/uiStore';
import { useTaskStore } from '@/stores/taskStore';
import type { Task, TaskStatus, TaskUpdate } from '@/types';
import { KanbanView } from '@/components/KanbanView';
import { TimelineView } from '@/components/TimelineView';
import { TaskDetailModal } from './TaskDetailModal';
import styles from './index.module.css';

export function TaskPanel() {
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const activeCategoryId = useUIStore((s) => s.activeCategoryId);

  const { tasks, loading, error, fetchTasks, updateTask, updateTaskStatus, deleteTask } = useTaskStore();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchTasks(activeCategoryId ?? undefined);
  }, [activeCategoryId, fetchTasks]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setModalOpen(true);
  }, []);

  const handleStatusChange = useCallback(
    async (taskId: number, newStatus: TaskStatus) => {
      await updateTaskStatus(taskId, newStatus);
    },
    [updateTaskStatus],
  );

  const handleUpdate = useCallback(
    async (id: number, data: TaskUpdate) => {
      await updateTask(id, data);
    },
    [updateTask],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteTask(id);
    },
    [deleteTask],
  );

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedTask(null);
  }, []);

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.viewSwitch}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'timeline' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            <UnorderedListOutlined />
            时间线
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'kanban' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('kanban')}
          >
            <AppstoreOutlined />
            看板
          </button>
        </div>
        {/* P6: 目标进度条占位 */}
        <div className={styles.goalPlaceholder} />
      </div>

      <div className={styles.body}>
        {loading ? (
          <div className={styles.loading}><Spin /></div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : viewMode === 'kanban' ? (
          <KanbanView
            tasks={tasks}
            onStatusChange={handleStatusChange}
            onTaskClick={handleTaskClick}
          />
        ) : (
          <TimelineView
            tasks={tasks}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>

      <TaskDetailModal
        task={selectedTask}
        open={modalOpen}
        onClose={handleModalClose}
        onUpdate={handleUpdate}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
    </div>
  );
}
