import { useCallback, useEffect, useRef, useState } from 'react';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers:
        method === 'GET'
          ? undefined
          : { 'Content-Type': 'application/json', 'X-Playbook-Request': '1' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError('Could not reach playbook. Check your connection and try again.', 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !['/api/login', '/api/session'].includes(path))
      window.dispatchEvent(new Event('playbook:signed-out'));
    throw new ApiError(data.error ?? 'Something went wrong. Please try again.', response.status);
  }
  return data as T;
}

export function useData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!path);
  const revision = useRef(0);
  const reload = useCallback(async () => {
    if (!path) return;
    const request = ++revision.current;
    try {
      const result = await api<T>(path);
      if (request === revision.current) {
        setData(result);
        setError('');
      }
    } catch (e) {
      if (request === revision.current) setError(message(e));
    } finally {
      if (request === revision.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(null);
    setLoading(!!path);
    setError('');
    void reload();
    return () => {
      revision.current++;
    };
  }, [reload, path]);
  const replace = useCallback((value: T) => {
    revision.current++;
    setData(value);
    setError('');
  }, []);
  const invalidate = useCallback(() => {
    revision.current++;
  }, []);
  return { data, error, loading, reload, replace, invalidate };
}
export function message(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
