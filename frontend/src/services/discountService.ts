import { api, type PaginatedResponse } from './api';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Discount {
  id: number;
  code: string;
  description: string;
  type: DiscountType;
  value: number;
  startDate?: string;
  endDate?: string;
  active: boolean;
  usageLimit?: number;
  usageCount: number;
}

export const discountApi = {
  getAll: (params?: { search?: string; page?: number; size?: number }) => {
    const search = params?.search ? `search=${encodeURIComponent(params.search)}` : '';
    const page = params?.page !== undefined ? `page=${params.page}` : '';
    const size = params?.size !== undefined ? `size=${params.size}` : '';
    const qs = [search, page, size].filter(Boolean).join('&');
    return api.get<PaginatedResponse<Discount>>(`/discounts${qs ? '?' + qs : ''}`);
  },
  getByCode: (code: string) => api.get<Discount>(`/discounts/by-code/${encodeURIComponent(code)}`),
  create: (discount: Omit<Discount, 'id' | 'usageCount'>) => api.post<Discount>('/discounts', discount),
  update: (id: number, discount: Partial<Discount>) => api.put<Discount>(`/discounts/${id}`, discount),
  delete: (id: number) => api.delete<void>(`/discounts/${id}`),
};
