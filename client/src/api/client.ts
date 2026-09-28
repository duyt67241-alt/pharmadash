/**
 * HTTP client mỏng bọc fetch: tự gắn JWT, chuẩn hóa lỗi.
 */
const TOKEN_KEY = 'pd_token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* bỏ qua khi trình duyệt chặn storage */
    }
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export type Params = Record<string, string | number | boolean | null | undefined>;

export function buildUrl(path: string, params?: Params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return `/api${path}${s ? `?${s}` : ''}`;
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

export async function request<T>(method: string, path: string, opts: { params?: Params; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(buildUrl(path, opts.params), {
    method,
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401 && path !== '/auth/login') onUnauthorized?.();
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Lỗi ${res.status}`, data?.details);
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  del: <T>(path: string) => request<T>('DELETE', path),
};

/** Tải file (CSV/PDF): mở link kèm token vì trình duyệt không gửi header khi tải trực tiếp. */
export function download(path: string, params?: Params) {
  const a = document.createElement('a');
  a.href = buildUrl(path, { ...params, token: tokenStore.get() });
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
