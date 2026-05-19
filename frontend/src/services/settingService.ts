import type { Setting, SettingUpdate, ApiKeyStatus, ApiKeyTestResult } from '@/types';
import { get, put, post } from './apiClient';

const API_BASE = '/api';

export const settingService = {
  list(): Promise<Setting[]> {
    return get<Setting[]>('/settings');
  },

  getByKey(key: string): Promise<Setting> {
    return get<Setting>(`/settings/${key}`);
  },

  update(key: string, data: SettingUpdate): Promise<Setting> {
    return put<Setting>('/settings', { key, ...data });
  },

  async exportJson(): Promise<void> {
    const res = await fetch(`${API_BASE}/settings/export/json`);
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settings.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  async exportTasksCsv(): Promise<void> {
    const res = await fetch(`${API_BASE}/settings/export/tasks/csv`);
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  getApiKeyStatus(): Promise<ApiKeyStatus> {
    return get<ApiKeyStatus>('/settings/apikey/status');
  },

  updateApiKey(apiKey: string): Promise<Setting> {
    return put<Setting>('/settings/apikey', { api_key: apiKey });
  },

  testApiKey(): Promise<ApiKeyTestResult> {
    return post<ApiKeyTestResult>('/settings/apikey/test', {});
  },

  getModel(): Promise<{ model: string }> {
    return get<{ model: string }>('/settings/model');
  },

  updateModel(model: string): Promise<{ status: string; model: string }> {
    return put<{ status: string; model: string }>('/settings/model', { model });
  },
};
