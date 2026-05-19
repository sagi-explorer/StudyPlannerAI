import { useState } from 'react';
import type { InsightTag } from '@/types';
import { TagManager } from './TagManager';
import styles from './TagSidebar.module.css';

interface TagSidebarProps {
  tags: InsightTag[];
  selectedTagId: number | null;
  totalCount: number;
  onSelectTag: (id: number | null) => void;
}

export function TagSidebar({ tags, selectedTagId, totalCount, onSelectTag }: TagSidebarProps) {
  const [managerOpen, setManagerOpen] = useState(false);

  return (
    <>
      <nav className={styles.list}>
        <div
          className={`${styles.item} ${selectedTagId === null ? styles.itemActive : ''}`}
          onClick={() => onSelectTag(null)}
        >
          <span className={styles.name}>全部</span>
          <span className={styles.count}>{totalCount}</span>
        </div>

        {tags.map((tag) => (
          <div
            key={tag.id}
            className={`${styles.item} ${selectedTagId === tag.id ? styles.itemActive : ''}`}
            onClick={() => onSelectTag(tag.id)}
          >
            <span
              className={styles.dot}
              style={{ background: tag.color ?? 'var(--sp-color-primary)' }}
            />
            <span className={styles.name}>{tag.name}</span>
            <span className={styles.count}>{tag.insight_count ?? 0}</span>
          </div>
        ))}

        <div className={styles.divider} />

        <button className={styles.manageBtn} onClick={() => setManagerOpen(true)}>
          ⚙ 管理标签
        </button>
      </nav>

      {managerOpen && <TagManager onClose={() => setManagerOpen(false)} />}
    </>
  );
}
