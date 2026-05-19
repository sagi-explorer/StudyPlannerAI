import { useState, useRef, useEffect } from 'react';
import { useInsightStore } from '@/stores/insightStore';
import styles from './TagManager.module.css';

interface TagManagerProps {
  onClose: () => void;
}

export function TagManager({ onClose }: TagManagerProps) {
  const { tags, updateTag, deleteTag, mergeTags } = useInsightStore();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [mergingId, setMergingId] = useState<number | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (id: number, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveEdit = async (id: number) => {
    if (editName.trim()) {
      await updateTag(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleColorChange = async (id: number, color: string) => {
    await updateTag(id, { color });
  };

  const handleDelete = async (id: number) => {
    await deleteTag(id);
    setDeletingId(null);
  };

  const handleMerge = async (sourceId: number) => {
    if (mergeTargetId == null) return;
    await mergeTags({ source_tag_id: sourceId, target_tag_id: mergeTargetId });
    setMergingId(null);
    setMergeTargetId(null);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>管理标签</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {tags.length === 0 ? (
          <div className={styles.emptyTags}>暂无标签</div>
        ) : (
          <ul className={styles.tagList}>
            {tags.map((tag) => (
              <li key={tag.id}>
                <div className={styles.tagItem}>
                  <input
                    type="color"
                    className={styles.colorPicker}
                    value={tag.color ?? '#7c3aed'}
                    onChange={(e) => handleColorChange(tag.id, e.target.value)}
                  />

                  {editingId === tag.id ? (
                    <input
                      ref={inputRef}
                      className={styles.tagNameInput}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleSaveEdit(tag.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(tag.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    <input
                      className={styles.tagNameInput}
                      value={tag.name}
                      readOnly
                      onDoubleClick={() => handleStartEdit(tag.id, tag.name)}
                    />
                  )}

                  <span className={styles.tagCount}>{tag.insight_count ?? 0}</span>

                  <div className={styles.tagActions}>
                    <button
                      className={styles.tagActionBtn}
                      title="改名"
                      onClick={() => handleStartEdit(tag.id, tag.name)}
                    >
                      ✏
                    </button>
                    <button
                      className={styles.tagActionBtn}
                      title="合并"
                      onClick={() => {
                        setMergingId(tag.id);
                        setMergeTargetId(null);
                      }}
                    >
                      ⤵
                    </button>
                    {deletingId === tag.id ? (
                      <div className={styles.deleteConfirm}>
                        <button className={styles.deleteConfirmBtn} onClick={() => handleDelete(tag.id)}>
                          确认
                        </button>
                        <button className={styles.deleteCancelBtn} onClick={() => setDeletingId(null)}>
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        className={`${styles.tagActionBtn} ${styles.tagActionBtnDanger}`}
                        title="删除"
                        onClick={() => setDeletingId(tag.id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {mergingId === tag.id && (
                  <div className={styles.mergeRow}>
                    <span>合并到：</span>
                    <select
                      className={styles.mergeSelect}
                      value={mergeTargetId ?? ''}
                      onChange={(e) => setMergeTargetId(Number(e.target.value) || null)}
                    >
                      <option value="">选择目标标签</option>
                      {tags
                        .filter((t) => t.id !== tag.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <button
                      className={styles.mergeConfirmBtn}
                      disabled={mergeTargetId == null}
                      onClick={() => handleMerge(tag.id)}
                    >
                      确认
                    </button>
                    <button className={styles.mergeCancelBtn} onClick={() => setMergingId(null)}>
                      取消
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
