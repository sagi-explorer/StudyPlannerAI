import { useEffect, useRef } from 'react';
import {
  AimOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  FileTextOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Badge, Button, Space, notification } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Category } from '@/types';
import { useUIStore } from '@/stores/uiStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useFocusStore } from '@/stores/focusStore';
import { useReviewStore } from '@/stores/reviewStore';
import styles from './TopNav.module.css';

const CATEGORY_COLORS: Record<string, string> = {
  'LLM Lab': 'var(--sp-color-llm-lab)',
  'Work Hub': 'var(--sp-color-work-hub)',
};

const DEFAULT_CATEGORIES: Pick<Category, 'id' | 'name'>[] = [
  { id: 1, name: 'LLM Lab' },
  { id: 2, name: 'Work Hub' },
];

export function TopNav() {
  const { activeCategoryId, setActiveCategoryId, activeNav, setActiveNav } = useUIStore();
  const { chatPanelCollapsed, toggleChatPanel } = useUIStore();
  const storeCategories = useCategoryStore((s) => s.categories);
  const categories = storeCategories.length > 0 ? storeCategories : DEFAULT_CATEGORIES;
  const toggleTimerVisible = useFocusStore((s) => s.toggleTimerVisible);
  const activeSession = useFocusStore((s) => s.activeSession);
  const navigate = useNavigate();
  const location = useLocation();

  const isGoalsActive = activeNav === 'goals' || location.pathname === '/goals';
  const isStatsActive = activeNav === 'stats' || location.pathname === '/stats';

  const { globalUnreadCount, fetchUnreadCount } = useReviewStore();
  const notifiedRef = useRef(false);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (activeCategoryId === null && categories.length > 0) {
      setActiveCategoryId(categories[0].id);
    }
  }, [activeCategoryId, categories, setActiveCategoryId]);

  useEffect(() => {
    if (globalUnreadCount > 0 && !notifiedRef.current) {
      notifiedRef.current = true;
      notification.info({
        title: '未读复盘报告',
        description: `你有 ${globalUnreadCount} 份未读复盘报告，点击查看。`,
        placement: 'topRight',
        duration: 6,
        onClick: () => {
          navigate('/reviews');
          notification.destroy();
        },
        style: { cursor: 'pointer' },
      });
    }
  }, [globalUnreadCount, navigate]);

  const handleNavClick = (nav: 'tasks' | 'goals' | 'insights' | 'reviews' | 'stats' | 'settings') => {
    setActiveNav(nav as any);
    const routes: Record<string, string> = {
      tasks: '/',
      goals: '/goals',
      insights: '/insights',
      reviews: '/reviews',
      stats: '/stats',
      settings: '/settings',
    };
    navigate(routes[nav]);
  };

  return (
    <div className={styles.nav}>
      <div className={styles.left}>
        <span className={styles.logo} onClick={() => handleNavClick('tasks')} style={{ cursor: 'pointer' }}>
          StudyPlannerAI
        </span>
        <div className={styles.tabs}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.tab} ${activeCategoryId === cat.id ? styles.tabActive : ''}`}
              style={{
                '--tab-color': CATEGORY_COLORS[cat.name] ?? 'var(--sp-color-primary)',
              } as React.CSSProperties}
              onClick={() => {
                setActiveCategoryId(cat.id);
                handleNavClick('tasks');
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.right}>
        <Space size={4}>
          <Button
            type="text"
            icon={<AimOutlined />}
            className={`${styles.navBtn} ${isGoalsActive ? styles.navBtnActive : ''}`}
            onClick={() => handleNavClick('goals')}
          >
            目标
          </Button>
          <Button
            type="text"
            icon={<BulbOutlined />}
            className={`${styles.navBtn} ${activeNav === 'insights' ? styles.navBtnActive : ''}`}
            onClick={() => handleNavClick('insights')}
          >
            经验库
          </Button>
          <Button
            type="text"
            icon={<BarChartOutlined />}
            className={`${styles.navBtn} ${isStatsActive ? styles.navBtnActive : ''}`}
            onClick={() => handleNavClick('stats')}
          >
            统计
          </Button>
          <Badge count={globalUnreadCount} size="small" offset={[-4, 4]}>
            <Button
              type="text"
              icon={<FileTextOutlined />}
              className={`${styles.navBtn} ${activeNav === 'reviews' ? styles.navBtnActive : ''}`}
              onClick={() => handleNavClick('reviews')}
            >
              复盘
            </Button>
          </Badge>
          <Button
            type="text"
            icon={<ClockCircleOutlined />}
            className={`${styles.navBtn} ${activeSession ? styles.navBtnActive : ''}`}
            onClick={toggleTimerVisible}
          >
            番茄钟
          </Button>
          <Button
            type="text"
            icon={<SettingOutlined />}
            className={`${styles.navBtn} ${activeNav === 'settings' ? styles.navBtnActive : ''}`}
            onClick={() => handleNavClick('settings')}
          />
          <Button
            type="text"
            icon={chatPanelCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            className={styles.navBtn}
            onClick={toggleChatPanel}
          />
        </Space>
      </div>
    </div>
  );
}
