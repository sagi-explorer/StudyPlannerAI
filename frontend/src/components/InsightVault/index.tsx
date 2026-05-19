import { useEffect, useState, useCallback, useRef } from 'react';
import { Spin } from 'antd';
import { useInsightStore } from '@/stores/insightStore';
import { TagSidebar } from './TagSidebar';
import { InsightCard } from './InsightCard';
import { NewInsightModal } from './NewInsightModal';
import styles from './index.module.css';

export function InsightVault() {
  const {
    insights, tags, totalCount, currentPage, pageSize,
    selectedTagId, searchKeyword, sortBy, isLoading, error,
    fetchInsights, fetchTags,
    setSelectedTagId, setSearchKeyword, setCurrentPage, setSortBy,
  } = useInsightStore();

  const [modalOpen, setModalOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights, selectedTagId, searchKeyword, currentPage, sortBy]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchKeyword(value);
    }, 300);
  }, [setSearchKeyword]);

  const handleTagSelect = useCallback((id: number | null) => {
    setSelectedTagId(id);
  }, [setSelectedTagId]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="🔍 搜索经验..."
          defaultValue={searchKeyword}
          onChange={handleSearchChange}
        />
        <select
          className={styles.sortSelect}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="created_at">最新创建</option>
          <option value="updated_at">最近更新</option>
        </select>
        <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
          ＋ 记录新经验
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.sidebar}>
          <TagSidebar
            tags={tags}
            selectedTagId={selectedTagId}
            totalCount={totalCount}
            onSelectTag={handleTagSelect}
          />
        </div>

        <div className={styles.mainList}>
          {error ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>⚠️</span>
              <span>加载失败: {error}</span>
            </div>
          ) : isLoading ? (
            <div className={styles.loading}><Spin /></div>
          ) : insights.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>💡</span>
              <span>
                {searchKeyword || selectedTagId != null
                  ? '没有找到匹配的经验'
                  : '还没有经验记录，点击"记录新经验"开始吧'}
              </span>
            </div>
          ) : (
            <>
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} keyword={searchKeyword} />
              ))}

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageBtn}
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    上一页
                  </button>
                  <span className={styles.pageInfo}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    className={styles.pageBtn}
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalOpen && <NewInsightModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
