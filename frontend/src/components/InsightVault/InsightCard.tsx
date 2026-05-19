import { useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import type { Insight, InsightTag } from '@/types';
import { useInsightStore } from '@/stores/insightStore';
import styles from './InsightCard.module.css';

interface InsightCardProps {
  insight: Insight;
  keyword?: string;
}

function highlightText(text: string, keyword: string): ReactNode {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className={styles.highlight}>{part}</mark> : part
  );
}

function tagStyle(tag: InsightTag): React.CSSProperties {
  const color = tag.color ?? '#7c3aed';
  return {
    background: `${color}18`,
    color,
    borderColor: `${color}30`,
  };
}

export function InsightCard({ insight, keyword = '' }: InsightCardProps) {
  const { updateInsight, deleteInsight, togglePin, rewriteInsight, tags: allTags } = useInsightStore();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editTagIds, setEditTagIds] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formattedDate = useMemo(() => {
    return new Date(insight.created_at).toLocaleDateString('zh-CN');
  }, [insight.created_at]);

  const doSave = useCallback(async (
    content: string, summary: string, tagIds: number[]
  ) => {
    setSaving(true);
    try {
      await updateInsight(insight.id, { content, summary, tag_ids: tagIds });
    } finally {
      setSaving(false);
    }
  }, [insight.id, updateInsight]);

  const debouncedSave = useCallback((
    content: string, summary: string, tagIds: number[]
  ) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(content, summary, tagIds), 600);
  }, [doSave]);

  const handleExpand = () => {
    if (!editing) setExpanded(!expanded);
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditContent(insight.content);
    setEditSummary(insight.summary ?? '');
    setEditTagIds(insight.tags.map((t) => t.id));
    setEditing(true);
    setExpanded(true);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditContent(val);
    debouncedSave(val, editSummary, editTagIds);
  };

  const handleSummaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditSummary(val);
    debouncedSave(editContent, val, editTagIds);
  };

  const handleContentBlur = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    doSave(editContent, editSummary, editTagIds);
  };

  const handleSummaryBlur = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    doSave(editContent, editSummary, editTagIds);
  };

  const handleTagToggle = (tagId: number) => {
    const next = editTagIds.includes(tagId)
      ? editTagIds.filter((id) => id !== tagId)
      : [...editTagIds, tagId];
    setEditTagIds(next);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    doSave(editContent, editSummary, next);
  };

  const handleExitEdit = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      doSave(editContent, editSummary, editTagIds);
    }
    setEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleExitEdit();
  };

  const handleDelete = async () => {
    await deleteInsight(insight.id);
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePin(insight.id);
  };

  const handleRewrite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRewriting(true);
    try {
      await rewriteInsight(insight.id);
    } finally {
      setRewriting(false);
    }
  };

  return (
    <div
      className={`${styles.card} ${expanded ? styles.cardExpanded : ''} ${insight.is_pinned ? styles.cardPinned : ''}`}
      onClick={handleExpand}
    >
      <div className={styles.header}>
        {insight.is_pinned && <span className={styles.pinIcon}>📌</span>}
        <div className={styles.headerContent}>
          <div className={`${styles.summary} ${expanded ? styles.summaryExpanded : ''}`}>
            {highlightText(insight.summary ?? insight.content.slice(0, 80), keyword)}
          </div>
        </div>
        <div className={styles.actions}>
          {saving && <span className={styles.savingHint}>保存中...</span>}
          <button className={styles.actionBtn} onClick={handlePin} title={insight.is_pinned ? '取消置顶' : '置顶'}>
            {insight.is_pinned ? '📌' : '📍'}
          </button>
          <button className={styles.actionBtn} onClick={handleStartEdit} title="编辑">
            ✏️
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleRewrite}
            disabled={rewriting}
            title="AI 重新改写"
          >
            {rewriting ? '⏳' : '🤖'}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            title="删除"
          >
            🗑
          </button>
        </div>
      </div>

      <div className={styles.tags}>
        {insight.tags.map((tag) => (
          <span key={tag.id} className={styles.tag} style={tagStyle(tag)}>
            {tag.name}
          </span>
        ))}
      </div>

      <div className={styles.meta}>
        <span>{formattedDate}</span>
        <span>{insight.source === 'chat' ? '来自对话' : '手动录入'}</span>
      </div>

      {confirmDelete && (
        <div className={styles.deleteConfirm} onClick={(e) => e.stopPropagation()}>
          <span>确认删除这条经验？</span>
          <button className={styles.deleteConfirmBtn} onClick={handleDelete}>删除</button>
          <button className={styles.deleteCancelBtn} onClick={() => setConfirmDelete(false)}>取消</button>
        </div>
      )}

      {expanded && (
        <div className={styles.expandedBody} onClick={(e) => e.stopPropagation()}>
          {editing ? (
            <div onKeyDown={handleEditKeyDown}>
              <div className={styles.editLabelRow}>
                <span className={styles.editLabel}>内容</span>
                <button className={styles.exitEditBtn} onClick={handleExitEdit}>完成编辑</button>
              </div>
              <textarea
                className={styles.editTextarea}
                value={editContent}
                onChange={handleContentChange}
                onBlur={handleContentBlur}
              />
              <div className={styles.editLabel}>摘要</div>
              <input
                className={styles.editSummary}
                value={editSummary}
                onChange={handleSummaryChange}
                onBlur={handleSummaryBlur}
              />
              <div className={styles.editLabel}>标签 <span className={styles.editHint}>（点击切换）</span></div>
              <div className={styles.tagSelect}>
                {allTags.map((tag) => (
                  <button
                    key={tag.id}
                    className={`${styles.tagOption} ${editTagIds.includes(tag.id) ? styles.tagOptionSelected : ''}`}
                    style={editTagIds.includes(tag.id) ? tagStyle(tag as any) : undefined}
                    onClick={() => handleTagToggle(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.contentArea}>
              {highlightText(insight.content, keyword)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
