import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Select, InputNumber, Space, message } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
  ShrinkOutlined,
} from '@ant-design/icons';
import { useFocusStore } from '@/stores/focusStore';
import { useCategoryStore } from '@/stores/categoryStore';
import styles from './index.module.css';

const CIRCLE_RADIUS = 54;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function playCompletionSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    /* Web Audio not available */
  }
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FocusTimer() {
  const {
    activeSession,
    timerVisible,
    timerMinimized,
    loading,
    startSession,
    completeSession,
    abandonSession,
    setTimerVisible,
    setTimerMinimized,
  } = useFocusStore();

  const categories = useCategoryStore((s) => s.categories);

  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [plannedMinutes, setPlannedMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const completedRef = useRef(false);
  const pausedAtRef = useRef<number | null>(null);
  const pauseOffsetRef = useRef(0);
  const rafRef = useRef<number>(0);

  const totalSeconds = activeSession ? activeSession.planned_minutes * 60 : plannedMinutes * 60;

  const tick = useCallback(() => {
    if (!activeSession) return;
    const startedAt = new Date(activeSession.started_at).getTime();
    const effectiveNow = pausedAtRef.current ?? Date.now();
    const endTime = startedAt + activeSession.planned_minutes * 60 * 1000 + pauseOffsetRef.current;
    const remaining = Math.max(0, Math.ceil((endTime - effectiveNow) / 1000));
    setRemainingSeconds(remaining);

    if (remaining <= 0 && !completedRef.current) {
      completedRef.current = true;
      setCompleted(true);
      playCompletionSound();
      completeSession();
      message.success('专注完成！');
      return;
    }

    if (!pausedAtRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [activeSession, completeSession]);

  useEffect(() => {
    if (activeSession && !activeSession.ended_at) {
      completedRef.current = false;
      setCompleted(false);
      setPaused(false);
      pausedAtRef.current = null;
      pauseOffsetRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeSession, tick]);

  const handlePause = () => {
    if (paused) {
      const pauseDuration = Date.now() - (pausedAtRef.current ?? Date.now());
      pauseOffsetRef.current += pauseDuration;
      pausedAtRef.current = null;
      setPaused(false);
      rafRef.current = requestAnimationFrame(tick);
    } else {
      pausedAtRef.current = Date.now();
      setPaused(true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  };

  if (!timerVisible) return null;

  if (timerMinimized) {
    const progress = activeSession && !activeSession.ended_at
      ? 1 - remainingSeconds / totalSeconds
      : 0;
    return (
      <button
        className={styles.minimized}
        onClick={() => setTimerMinimized(false)}
        title="展开番茄钟"
      >
        <svg width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="var(--sp-color-border)" strokeWidth="2" />
          <circle
            cx="16" cy="16" r="14"
            fill="none"
            stroke={paused ? 'var(--sp-color-warning)' : 'var(--sp-color-primary)'}
            strokeWidth="2"
            strokeDasharray={`${2 * Math.PI * 14}`}
            strokeDashoffset={`${2 * Math.PI * 14 * (1 - progress)}`}
            strokeLinecap="round"
            transform="rotate(-90 16 16)"
          />
        </svg>
      </button>
    );
  }

  const progress = activeSession && !activeSession.ended_at
    ? 1 - remainingSeconds / totalSeconds
    : 0;
  const strokeOffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  const handleStart = async () => {
    await startSession({
      category_id: categoryId ?? null,
      planned_minutes: plannedMinutes,
    });
  };

  const handleAbandon = async () => {
    await abandonSession();
    completedRef.current = false;
    setPaused(false);
    pausedAtRef.current = null;
    pauseOffsetRef.current = 0;
    message.info('已放弃本次专注');
  };

  const isRunning = activeSession && !activeSession.ended_at;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>
            专注计时
            {paused && <span className={styles.pausedBadge}>已暂停</span>}
          </span>
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<ShrinkOutlined />}
              onClick={() => setTimerMinimized(true)}
              className={styles.controlBtn}
            />
            <Button
              type="text"
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => {
                if (isRunning) {
                  setTimerMinimized(true);
                } else {
                  setTimerVisible(false);
                }
              }}
              className={styles.controlBtn}
            />
          </Space>
        </div>

        <div className={styles.timerRing}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle
              cx="70" cy="70" r={CIRCLE_RADIUS}
              fill="none"
              stroke="var(--sp-color-border)"
              strokeWidth="6"
            />
            <circle
              cx="70" cy="70" r={CIRCLE_RADIUS}
              fill="none"
              stroke={
                completed
                  ? 'var(--sp-status-done)'
                  : paused
                    ? 'var(--sp-color-warning)'
                    : 'var(--sp-color-primary)'
              }
              strokeWidth="6"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              className={styles.progressRing}
            />
          </svg>
          <div className={styles.timerText}>
            {isRunning ? formatTime(remainingSeconds) : formatTime(plannedMinutes * 60)}
          </div>
        </div>

        {completed && !isRunning && (
          <div className={styles.completedBanner}>专注完成！</div>
        )}

        {!isRunning ? (
          <div className={styles.setupArea}>
            <div className={styles.field}>
              <label className={styles.label}>分类</label>
              <Select
                allowClear
                placeholder="选择分类"
                value={categoryId}
                onChange={(v) => setCategoryId(v)}
                className={styles.select}
                options={categories.map((c) => ({ label: c.name, value: c.id }))}
                classNames={{ popup: { root: styles.selectPopup } }}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>时长（分钟）</label>
              <InputNumber
                min={1}
                max={120}
                value={plannedMinutes}
                onChange={(v) => v && setPlannedMinutes(v)}
                className={styles.input}
              />
            </div>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
              loading={loading}
              block
              className={styles.startBtn}
            >
              开始专注
            </Button>
          </div>
        ) : (
          <div className={styles.runningActions}>
            <Button
              type={paused ? 'primary' : 'default'}
              icon={paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              onClick={handlePause}
              block
            >
              {paused ? '继续' : '暂停'}
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={handleAbandon}
              loading={loading}
              block
            >
              放弃
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
