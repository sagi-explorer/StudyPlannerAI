import { useEffect, useState, useCallback } from 'react';
import { Button, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { Goal, GoalCreate, GoalUpdate, GoalStatus } from '@/types';
import { useGoalStore } from '@/stores/goalStore';
import { GoalTree } from './GoalTree';
import { GoalFormModal } from './GoalFormModal';
import { ProgressAnimation } from '@/components/Celebrations/ProgressAnimation';
import { ConfettiAnimation } from '@/components/Celebrations/ConfettiAnimation';
import { AchievementBadge } from '@/components/Celebrations/AchievementBadge';
import styles from './index.module.css';

type StatusFilter = 'all' | 'active' | 'completed' | 'abandoned';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中' },
  { key: 'completed', label: '已达成' },
  { key: 'abandoned', label: '已放弃' },
];

export function GoalPanel() {
  const {
    goals, loading, error,
    fetchGoals, createGoal, updateGoal, updateGoalStatus, deleteGoal,
    celebratingGoal, setCelebratingGoal,
  } = useGoalStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [parentGoal, setParentGoal] = useState<Goal | null>(null);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const filteredGoals = statusFilter === 'all'
    ? goals
    : goals.filter((g) => g.status === statusFilter);

  const handleCreate = useCallback(async (data: GoalCreate) => {
    await createGoal(data);
  }, [createGoal]);

  const handleUpdate = useCallback(async (id: number, data: GoalUpdate) => {
    await updateGoal(id, data);
  }, [updateGoal]);

  const handleStatusChange = useCallback(async (id: number, status: GoalStatus) => {
    await updateGoalStatus(id, status);
  }, [updateGoalStatus]);

  const handleDelete = useCallback(async (id: number) => {
    await deleteGoal(id);
  }, [deleteGoal]);

  const openCreate = useCallback((parent?: Goal) => {
    setEditGoal(null);
    setParentGoal(parent ?? null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((goal: Goal) => {
    setEditGoal(goal);
    setParentGoal(null);
    setModalOpen(true);
  }, []);

  const childGoalCount = celebratingGoal
    ? goals.filter((g) => g.parent_goal_id === celebratingGoal.id && g.status === 'completed').length
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>目标管理</span>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`${styles.filterBtn} ${statusFilter === f.key ? styles.filterBtnActive : ''}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openCreate()}>
            新建目标
          </Button>
        </div>
      </div>

      <div className={styles.body}>
        {loading && (
          <div className={styles.loading}><Spin /></div>
        )}
        {error && (
          <div className={styles.error}>{error}</div>
        )}
        {!loading && !error && (
          <GoalTree
            goals={filteredGoals}
            onEdit={openEdit}
            onStatusChange={handleStatusChange}
            onCreate={openCreate}
          />
        )}
      </div>

      <GoalFormModal
        open={modalOpen}
        editGoal={editGoal}
        parentGoal={parentGoal}
        allGoals={goals}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {celebratingGoal?.type === 'weekly' && celebratingGoal.status === 'completed' && (
        <ProgressAnimation
          goal={celebratingGoal}
          onClose={() => setCelebratingGoal(null)}
        />
      )}
      {celebratingGoal?.type === 'monthly' && celebratingGoal.status === 'completed' && (
        <ConfettiAnimation
          goal={celebratingGoal}
          onClose={() => setCelebratingGoal(null)}
        />
      )}
      {celebratingGoal?.type === 'ultimate' && celebratingGoal.status === 'completed' && (
        <AchievementBadge
          goal={celebratingGoal}
          childGoalCount={childGoalCount}
          onClose={() => setCelebratingGoal(null)}
        />
      )}
    </div>
  );
}
