import { useState, useCallback } from 'react';
import { DownOutlined, RightOutlined, AimOutlined, PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { Goal, GoalStatus } from '@/types';
import { GoalCard } from './GoalCard';
import styles from './GoalTree.module.css';

interface GoalTreeProps {
  goals: Goal[];
  onEdit: (goal: Goal) => void;
  onStatusChange: (id: number, status: GoalStatus) => void;
  onCreate: (parentGoal?: Goal) => void;
}

export function GoalTree({ goals, onEdit, onStatusChange, onCreate }: GoalTreeProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggle = useCallback((id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const ultimateGoals = goals.filter((g) => g.type === 'ultimate');
  const getChildren = (parentId: number) => goals.filter((g) => g.parent_goal_id === parentId);

  if (ultimateGoals.length === 0) {
    return (
      <div className={styles.empty}>
        <AimOutlined className={styles.emptyIcon} />
        <div className={styles.emptyTitle}>还没有终极目标</div>
        <div className={styles.emptyDesc}>
          设立一个终极目标，将它拆解为月目标和周目标，一步步实现你的愿景。
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => onCreate()}>
          创建第一个终极目标
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.tree}>
      {ultimateGoals.map((ultimate) => {
        const monthlyGoals = getChildren(ultimate.id);
        const isExpanded = expanded[ultimate.id] !== false;

        return (
          <div key={ultimate.id} className={styles.ultimateBlock}>
            <GoalCard
              goal={ultimate}
              childCount={monthlyGoals.length}
              onEdit={onEdit}
              onStatusChange={onStatusChange}
              onClick={() => toggle(ultimate.id)}
            />

            {monthlyGoals.length > 0 && (
              <button className={styles.toggleBtn} onClick={() => toggle(ultimate.id)}>
                {isExpanded ? <DownOutlined /> : <RightOutlined />}
                {isExpanded ? '收起子目标' : `展开 ${monthlyGoals.length} 个月目标`}
              </button>
            )}

            {isExpanded && monthlyGoals.length > 0 && (
              <div className={styles.children}>
                {monthlyGoals.map((monthly) => {
                  const weeklyGoals = getChildren(monthly.id);
                  const isMonthlyExpanded = expanded[monthly.id] !== false;

                  return (
                    <div key={monthly.id} className={styles.monthlyBlock}>
                      <GoalCard
                        goal={monthly}
                        childCount={weeklyGoals.length}
                        onEdit={onEdit}
                        onStatusChange={onStatusChange}
                        onClick={() => toggle(monthly.id)}
                      />

                      {weeklyGoals.length > 0 && (
                        <button className={styles.toggleBtn} onClick={() => toggle(monthly.id)}>
                          {isMonthlyExpanded ? <DownOutlined /> : <RightOutlined />}
                          {isMonthlyExpanded ? '收起' : `${weeklyGoals.length} 个周目标`}
                        </button>
                      )}

                      {isMonthlyExpanded && weeklyGoals.length > 0 && (
                        <div className={styles.weeklyList}>
                          {weeklyGoals.map((weekly) => (
                            <GoalCard
                              key={weekly.id}
                              goal={weekly}
                              onEdit={onEdit}
                              onStatusChange={onStatusChange}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
