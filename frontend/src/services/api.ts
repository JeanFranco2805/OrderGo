export const API_BASE = 'http://localhost:8080/api/v1';

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function removeToken() {
  localStorage.removeItem('token');
}

async function request<T>(endpoint: string, options: RequestInit & { timeout?: number } = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 8000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const token = getToken();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      removeToken();
      window.location.href = '/login';
      throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Error ${response.status}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('El servidor no respondió a tiempo. Verifica que el backend esté corriendo en http://localhost:8080');
    }
    throw err;
  }
}

export const api = {
  get: <T>(endpoint: string, opts?: { timeout?: number }) => request<T>(endpoint, { method: 'GET', ...opts }),
  post: <T>(endpoint: string, body: unknown, opts?: { timeout?: number }) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), ...opts }),
  put: <T>(endpoint: string, body: unknown, opts?: { timeout?: number }) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), ...opts }),
  patch: <T>(endpoint: string, body?: unknown, opts?: { timeout?: number }) => request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...opts }),
  delete: <T>(endpoint: string, opts?: { timeout?: number }) => request<T>(endpoint, { method: 'DELETE', ...opts }),
};
