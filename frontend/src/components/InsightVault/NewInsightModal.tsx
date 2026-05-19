import { useState } from 'react';
import type { Insight } from '@/types';
import { useInsightStore } from '@/stores/insightStore';
import styles from './NewInsightModal.module.css';

interface NewInsightModalProps {
  onClose: () => void;
}

type Phase = 'input' | 'loading' | 'preview';

export function NewInsightModal({ onClose }: NewInsightModalProps) {
  const { createInsight, isCreating } = useInsightStore();
  const [rawInput, setRawInput] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [result, setResult] = useState<Insight | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!rawInput.trim()) return;
    setPhase('loading');
    setError(null);
    try {
      const insight = await createInsight(rawInput.trim());
      setResult(insight);
      setPhase('preview');
    } catch (e) {
      setError((e as Error).message);
      setPhase('input');
    }
  };

  const handleConfirm = () => {
    onClose();
  };

  const handleRetry = () => {
    setResult(null);
    setPhase('input');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>记录新经验</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {phase === 'input' && (
          <>
            <textarea
              className={styles.textarea}
              placeholder="写下你的经验、心得或技术总结...&#10;AI 会帮你整理成专业的知识条目"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              autoFocus
            />
            {error && <div className={styles.error}>{error}</div>}
            <button
              className={styles.submitBtn}
              disabled={!rawInput.trim() || isCreating}
              onClick={handleSubmit}
            >
              AI 整理
            </button>
          </>
        )}

        {phase === 'loading' && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>AI 正在整理你的经验...</span>
          </div>
        )}

        {phase === 'preview' && result && (
          <div className={styles.preview}>
            <div className={styles.previewLabel}>整理后的内容</div>
            <div className={styles.previewContent}>{result.content}</div>

            {result.summary && (
              <>
                <div className={styles.previewLabel}>摘要</div>
                <div className={styles.previewSummary}>{result.summary}</div>
              </>
            )}

            {result.tags.length > 0 && (
              <>
                <div className={styles.previewLabel}>标签</div>
                <div className={styles.previewTags}>
                  {result.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className={styles.previewTag}
                      style={{
                        background: `${tag.color ?? '#7c3aed'}18`,
                        color: tag.color ?? '#7c3aed',
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </>
            )}

            <div className={styles.previewActions}>
              <button className={styles.retryBtn} onClick={handleRetry}>重新输入</button>
              <button className={styles.confirmBtn} onClick={handleConfirm}>确认保存</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
