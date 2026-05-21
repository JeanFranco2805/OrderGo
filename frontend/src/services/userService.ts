import { api, type PaginatedResponse } from './api';

export interface User {
  id: number;
  username: string;
  role: 'ADMIN' | 'VENDEDOR' | 'DOMICILIARIO';
}

export const userApi = {
  getAll: (params?: { page?: number; size?: number }) => {
    const page = params?.page !== undefined ? `page=${params.page}` : '';
    const size = params?.size !== undefined ? `size=${params.size}` : '';
    const qs = [page, size].filter(Boolean).join('&');
    return api.get<PaginatedResponse<User>>(`/users${qs ? '?' + qs : ''}`);
  },
  getById: (id: number) => api.get<User>(`/users/${id}`),
  create: (user: { username: string; password: string; role: string }) => api.post<User>('/users', user),
  update: (id: number, user: Partial<{ username: string; password: string; role: string }>) => api.put<User>(`/users/${id}`, user),
  delete: (id: number) => api.delete<void>(`/users/${id}`),
};
