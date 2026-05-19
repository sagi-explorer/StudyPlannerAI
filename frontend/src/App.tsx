import { useEffect, Component, type ReactNode } from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { antdDarkTheme, antdLightTheme } from '@/theme/antdTheme';
import { darkTheme, lightTheme } from '@/theme/tokens';
import { Layout } from '@/components/Layout';
import { GoalPanel } from '@/components/GoalPanel';
import { StatsPanel } from '@/components/StatsPanel';
import { InsightVault } from '@/components/InsightVault';
import { ReviewReport } from '@/components/ReviewReport';
import { Settings } from '@/components/Settings';
import { useUIStore } from '@/stores/uiStore';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 48, textAlign: 'center', color: '#e2e8f0' }}>
          <h2 style={{ marginBottom: 16, color: '#ef4444' }}>页面出现异常</h2>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>{this.state.error?.message}</p>
          <button
            style={{
              padding: '8px 24px', background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
            }}
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
          >
            返回首页
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function applyThemeVars(tokens: Record<string, string>) {
  const root = document.documentElement;
  root.style.setProperty('--sp-color-bg-base', tokens.colorBgBase);
  root.style.setProperty('--sp-color-bg-container', tokens.colorBgContainer);
  root.style.setProperty('--sp-color-bg-elevated', tokens.colorBgElevated);
  root.style.setProperty('--sp-color-border', tokens.colorBorder);
  root.style.setProperty('--sp-color-primary', tokens.colorPrimary);
  root.style.setProperty('--sp-color-primary-hover', tokens.colorPrimaryHover);
  root.style.setProperty('--sp-color-success', tokens.colorSuccess);
  root.style.setProperty('--sp-color-warning', tokens.colorWarning);
  root.style.setProperty('--sp-color-error', tokens.colorError);
  root.style.setProperty('--sp-color-text', tokens.colorText);
  root.style.setProperty('--sp-color-text-secondary', tokens.colorTextSecondary);
  root.style.setProperty('--sp-color-llm-lab', tokens.llmLabColor);
  root.style.setProperty('--sp-color-work-hub', tokens.workHubColor);

  const glassBg =
    tokens.colorBgBase === '#0a0a0f'
      ? 'rgba(18, 18, 26, 0.8)'
      : 'rgba(255, 255, 255, 0.85)';
  const glassBorder =
    tokens.colorBgBase === '#0a0a0f'
      ? 'rgba(42, 42, 62, 0.6)'
      : 'rgba(226, 228, 233, 0.7)';
  root.style.setProperty('--sp-glass-bg', glassBg);
  root.style.setProperty('--sp-glass-border', glassBorder);
}

function App() {
  const themeMode = useUIStore((s) => s.themeMode);
  const antdTheme = themeMode === 'dark' ? antdDarkTheme : antdLightTheme;
  const tokens = themeMode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    applyThemeVars(tokens as unknown as Record<string, string>);
  }, [tokens]);

  return (
    <ConfigProvider theme={antdTheme}>
      <AntdApp>
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />} />
              <Route path="/goals" element={<Layout mainContent={<GoalPanel />} />} />
              <Route path="/stats" element={<Layout mainContent={<StatsPanel />} />} />
              <Route path="/insights" element={<Layout mainContent={<InsightVault />} />} />
              <Route path="/reviews" element={<Layout mainContent={<ReviewReport />} />} />
              <Route path="/settings" element={<Layout mainContent={<Settings />} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
