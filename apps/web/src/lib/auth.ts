import type { PublicUser } from './types';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function authRequest<T = { user: PublicUser }>(path: string, body?: unknown, accountId?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accountId) headers['X-EH-Account'] = accountId;
  const response = await fetch(`/api/auth${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(result?.message || '요청을 처리하지 못했습니다.', response.status);
  return result as T;
}
