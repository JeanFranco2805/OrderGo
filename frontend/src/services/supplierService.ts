import { api, type PaginatedResponse } from './api';

export interface Supplier {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export const supplierApi = {
  getAll: (params?: { search?: string; page?: number; size?: number }) => {
    const search = params?.search ? `search=${encodeURIComponent(params.search)}` : '';
    const page = params?.page !== undefined ? `page=${params.page}` : '';
    const size = params?.size !== undefined ? `size=${params.size}` : '';
    const qs = [search, page, size].filter(Boolean).join('&');
    return api.get<PaginatedResponse<Supplier>>(`/suppliers${qs ? '?' + qs : ''}`);
  },
  create: (supplier: Omit<Supplier, 'id'>) => api.post<Supplier>('/suppliers', supplier),
  update: (id: number, supplier: Partial<Supplier>) => api.put<Supplier>(`/suppliers/${id}`, supplier),
  delete: (id: number) => api.delete<void>(`/suppliers/${id}`),
};
