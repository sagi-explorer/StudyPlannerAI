export const darkTheme = {
  colorBgBase: '#0a0a0f',
  colorBgContainer: '#12121a',
  colorBgElevated: '#1a1a2e',
  colorBorder: '#2a2a3e',

  colorPrimary: '#7c3aed',
  colorPrimaryHover: '#8b5cf6',

  colorSuccess: '#06b6d4',
  colorWarning: '#f59e0b',
  colorError: '#ef4444',

  colorText: '#e2e8f0',
  colorTextSecondary: '#94a3b8',

  llmLabColor: '#7c3aed',
  workHubColor: '#06b6d4',

  priorityUrgent: '#ef4444',
  priorityHigh: '#f59e0b',
  priorityMedium: '#3b82f6',
  priorityLow: '#6b7280',

  statusTodo: '#6b7280',
  statusInProgress: '#3b82f6',
  statusDone: '#10b981',
  statusOverdue: '#ef4444',
} as const;

export const lightTheme = {
  colorBgBase: '#f8f9fc',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#f0f1f5',
  colorBorder: '#e2e4e9',

  colorPrimary: '#7c3aed',
  colorPrimaryHover: '#6d28d9',

  colorSuccess: '#06b6d4',
  colorWarning: '#f59e0b',
  colorError: '#ef4444',

  colorText: '#1e293b',
  colorTextSecondary: '#64748b',

  llmLabColor: '#7c3aed',
  workHubColor: '#06b6d4',

  priorityUrgent: '#ef4444',
  priorityHigh: '#f59e0b',
  priorityMedium: '#3b82f6',
  priorityLow: '#6b7280',

  statusTodo: '#6b7280',
  statusInProgress: '#3b82f6',
  statusDone: '#10b981',
  statusOverdue: '#ef4444',
} as const;

export type ThemeTokens = typeof darkTheme;
