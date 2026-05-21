import { api, API_BASE, type PaginatedResponse } from './api';

export interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  costPrice?: number;
  salePrice?: number;
  supplierId?: number;
  supplierName?: string;
  imageUrl: string;
}

function getImageUrl(path?: string) {
  if (!path) return 'https://via.placeholder.com/400x300?text=No+Image';
  if (path.startsWith('http')) return path;
  return `http://localhost:8080${path}`;
}

export const inventoryApi = {
  getAll: (params?: { search?: string; page?: number; size?: number }) => {
    const search = params?.search ? `search=${encodeURIComponent(params.search)}` : '';
    const page = params?.page !== undefined ? `page=${params.page}` : '';
    const size = params?.size !== undefined ? `size=${params.size}` : '';
    const qs = [search, page, size].filter(Boolean).join('&');
    return api.get<PaginatedResponse<InventoryItem>>(`/inventory${qs ? '?' + qs : ''}`);
  },
  getById: (id: number) => api.get<InventoryItem>(`/inventory/${id}`),
  create: (item: Omit<InventoryItem, 'id'>) => api.post<InventoryItem>('/inventory', item),
  update: (id: number, item: Partial<InventoryItem>) => api.put<InventoryItem>(`/inventory/${id}`, item),
  delete: (id: number) => api.delete<void>(`/inventory/${id}`),
  uploadImage: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/inventory/${id}/image`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Error ${res.status}`);
    }
    return res.json() as Promise<InventoryItem>;
  },
  getImageUrl,
};
