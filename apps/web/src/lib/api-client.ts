import type { ApiResponse, ApiError } from '@repo/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}/api/v1${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    throw json as ApiError;
  }

  return json as T;
}

export const apiClient = {
  get: <T>(path: string, token?: string) =>
    request<ApiResponse<T>>(path, { method: 'GET' }, token),

  post: <T>(path: string, body: unknown, token?: string) =>
    request<ApiResponse<T>>(path, { method: 'POST', body: JSON.stringify(body) }, token),

  patch: <T>(path: string, body: unknown, token?: string) =>
    request<ApiResponse<T>>(path, { method: 'PATCH', body: JSON.stringify(body) }, token),
};
