export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export interface SettingUpdate {
  value: string;
}

export interface ApiKeyStatus {
  configured: boolean;
}

export interface ApiKeyTestResult {
  success: boolean;
  message: string;
}
