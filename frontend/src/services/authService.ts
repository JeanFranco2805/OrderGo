import { api } from './api';

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { username, password }),
  register: (username: string, password: string, role?: string) =>
    api.post<{ message: string }>('/auth/register', { username, password, role }),
  me: () => api.post<{ username: string; role: string }>('/auth/me', {}),
};

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}

export function getUserRole(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}
