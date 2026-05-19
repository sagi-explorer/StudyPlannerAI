const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiError(0, '无法连接到服务器，请检查后端是否已启动');
  }
  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed.detail) {
        detail = typeof parsed.detail === 'string'
          ? parsed.detail
          : JSON.stringify(parsed.detail);
      }
    } catch { /* keep raw body */ }

    const friendlyMap: Record<number, string> = {
      401: '未授权，请检查 API Key 配置',
      403: '权限不足',
      404: '请求的资源不存在',
      422: `请求参数有误: ${detail}`,
      500: '服务器内部错误，请稍后重试',
      502: '服务器暂不可用',
      503: '服务器正在维护中',
    };
    throw new ApiError(response.status, friendlyMap[response.status] ?? detail);
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return response.json();
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
