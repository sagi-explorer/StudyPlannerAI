import { useEffect } from 'react';
import { Spin, Empty, Progress } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, AimOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { useFocusStore } from '@/stores/focusStore';
import { useGoalStore } from '@/stores/goalStore';
import styles from './index.module.css';

const CHART_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#ef4444',
  '#10b981', '#3b82f6', '#ec4899', '#8b5cf6',
];

const _GOAL_TYPE_LABELS: Record<string, string> = {
  ultimate: '终极目标',
  monthly: '月目标',
  weekly: '周目标',
};

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function weekdayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
}

export function StatsPanel() {
  const { stats, completionRates, fetchStats, fetchCompletionRates } = useFocusStore();
  const { goals, fetchGoals } = useGoalStore();

  useEffect(() => {
    fetchStats();
    fetchCompletionRates(4);
    fetchGoals({ status: 'active' });
  }, [fetchStats, fetchCompletionRates, fetchGoals]);

  if (!stats) {
    return (
      <div className={styles.container}>
        <Spin description="加载统计数据..." />
      </div>
    );
  }

  const dailyData = stats.daily_breakdown.map((d) => ({
    ...d,
    label: weekdayLabel(d.date),
    hours: +(d.minutes / 60).toFixed(1),
  }));

  const compDir = stats.comparison_with_last_week;

  const activeGoals = goals.filter((g) => g.status === 'active');
  const ultimateGoals = activeGoals.filter((g) => g.type === 'ultimate');
  const monthlyGoals = activeGoals.filter((g) => g.type === 'monthly');
  const weeklyGoals = activeGoals.filter((g) => g.type === 'weekly');

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>学习统计</h2>

      {/* Summary cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>本周学习时长</span>
          <span className={styles.summaryValue}>{formatHours(stats.total_minutes)}</span>
          <span className={`${styles.comparison} ${compDir > 0 ? styles.up : compDir < 0 ? styles.down : ''}`}>
            {compDir > 0 ? <ArrowUpOutlined /> : compDir < 0 ? <ArrowDownOutlined /> : <MinusOutlined />}
            {' '}{Math.abs(compDir)}% vs 上周
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>专注次数</span>
          <span className={styles.summaryValue}>{stats.total_sessions}</span>
          <span className={styles.summaryMeta}>完成 {stats.completed_sessions} 次</span>
        </div>
      </div>

      {/* Daily bar chart */}
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>每日学习时长</h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData} barSize={24}>
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, color: '#e2e8f0' }}
                formatter={(v: unknown) => [`${v}h`, '学习时长']}
              />
              <Bar dataKey="hours" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty description="暂无数据" />
        )}
      </div>

      {/* Category pie chart */}
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>分类时间分布</h3>
        {stats.category_breakdown.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.category_breakdown}
                dataKey="minutes"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                label={(entry: Record<string, unknown>) => `${entry.category_name} ${formatHours(entry.minutes as number)}`}
              >
                {stats.category_breakdown.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, color: '#e2e8f0' }}
                formatter={(v: unknown) => [formatHours(v as number), '时长']}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Empty description="暂无数据" />
        )}
      </div>

      {/* Task completion rate trend (weekly) */}
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>任务完成率趋势（按周）</h3>
        {completionRates.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={completionRates}>
              <CartesianGrid stroke="#2a2a3e" strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                unit="%"
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, color: '#e2e8f0' }}
                formatter={(v: unknown, _name: unknown, entry: Record<string, unknown>) => [
                  `${v}%（${(entry as any).payload.done}/${(entry as any).payload.total}）`,
                  '完成率',
                ]}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ fill: '#06b6d4', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Empty description="暂无数据" />
        )}
      </div>

      {/* Goal progress overview */}
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>
          <AimOutlined style={{ marginRight: 6 }} />
          目标完成进度总览
        </h3>
        {activeGoals.length > 0 ? (
          <div className={styles.goalGrid}>
            {[
              { label: '终极目标', items: ultimateGoals, color: '#ef4444' },
              { label: '月目标', items: monthlyGoals, color: '#f59e0b' },
              { label: '周目标', items: weeklyGoals, color: '#10b981' },
            ].map(({ label, items, color }) =>
              items.length > 0 && (
                <div key={label} className={styles.goalGroup}>
                  <span className={styles.goalGroupLabel}>{label}</span>
                  {items.map((g) => (
                    <div key={g.id} className={styles.goalItem}>
                      <div className={styles.goalInfo}>
                        <span className={styles.goalTitle}>{g.title}</span>
                        <span className={styles.goalPercent}>{g.progress}%</span>
                      </div>
                      <Progress
                        percent={g.progress}
                        showInfo={false}
                        strokeColor={color}
                        railColor="var(--sp-color-border)"
                        size="small"
                      />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        ) : (
          <Empty description="暂无活跃目标" />
        )}
      </div>
    </div>
  );
}
