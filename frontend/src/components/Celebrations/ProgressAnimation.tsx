import { useEffect } from 'react';
import { Button } from 'antd';
import type { Goal } from '@/types';
import styles from './ProgressAnimation.module.css';

interface ProgressAnimationProps {
  goal: Goal;
  onClose: () => void;
}

export function ProgressAnimation({ goal, onClose }: ProgressAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.emoji}>🎯</div>
        <div className={styles.title}>周目标达成！</div>
        <div className={styles.goalName}>{goal.title}</div>
        <div className={styles.progressRow}>
          <div className={styles.bar}>
            <div className={styles.fill} style={{ width: '100%' }} />
          </div>
          <span className={styles.percent}>100%</span>
        </div>
        <div className={styles.message}>
          恭喜！你又向终极目标迈进了一步，继续保持！
        </div>
        <Button type="primary" onClick={onClose} style={{ marginTop: 16 }}>
          太棒了
        </Button>
      </div>
    </div>
  );
}
