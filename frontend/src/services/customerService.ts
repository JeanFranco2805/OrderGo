import { api, type PaginatedResponse } from './api';

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  addressLabel?: string;
  latitude?: number;
  longitude?: number;
  sellerId?: number;
  sellerName?: string;
  visitDay?: string;
  zone?: string;
  visitFrequency?: string;
}

export const customerApi = {
  getAll: (params?: { search?: string; page?: number; size?: number }) => {
    const search = params?.search ? `search=${encodeURIComponent(params.search)}` : '';
    const page = params?.page !== undefined ? `page=${params.page}` : '';
    const size = params?.size !== undefined ? `size=${params.size}` : '';
    const qs = [search, page, size].filter(Boolean).join('&');
    return api.get<PaginatedResponse<Customer>>(`/customers${qs ? '?' + qs : ''}`);
  },
  getById: (id: number) => api.get<Customer>(`/customers/${id}`),
  create: (customer: Omit<Customer, 'id'>) => api.post<Customer>('/customers', customer),
  update: (id: number, customer: Partial<Customer>) => api.put<Customer>(`/customers/${id}`, customer),
  updateLocation: (id: number, location: { latitude: number; longitude: number; address?: string }) => api.patch<Customer>(`/customers/${id}/location`, location),
  delete: (id: number) => api.delete<void>(`/customers/${id}`),
  getMyCustomers: (params?: { visitDay?: string; zone?: string }) => {
    const visitDay = params?.visitDay ? `visitDay=${encodeURIComponent(params.visitDay)}` : '';
    const zone = params?.zone ? `zone=${encodeURIComponent(params.zone)}` : '';
    const qs = [visitDay, zone].filter(Boolean).join('&');
    return api.get<Customer[]>(`/customers/my-customers${qs ? '?' + qs : ''}`);
  },
};
