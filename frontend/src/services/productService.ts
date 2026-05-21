import { api, API_BASE, type PaginatedResponse } from './api';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  piecesPerUnit?: number;
  imageUrl: string;
  inventoryItemId?: number;
}

function getImageUrl(path?: string) {
  if (!path) return 'https://via.placeholder.com/400x300?text=No+Image';
  if (path.startsWith('http')) return path;
  return `http://localhost:8080${path}`;
}

export const productApi = {
  getAll: (params?: { search?: string; page?: number; size?: number }) => {
    const search = params?.search ? `search=${encodeURIComponent(params.search)}` : '';
    const page = params?.page !== undefined ? `page=${params.page}` : '';
    const size = params?.size !== undefined ? `size=${params.size}` : '';
    const qs = [search, page, size].filter(Boolean).join('&');
    return api.get<PaginatedResponse<Product>>(`/products${qs ? '?' + qs : ''}`);
  },
  getById: (id: number) => api.get<Product>(`/products/${id}`),
  create: (product: Omit<Product, 'id'>) => api.post<Product>('/products', product),
  update: (id: number, product: Partial<Product>) => api.put<Product>(`/products/${id}`, product),
  delete: (id: number) => api.delete<void>(`/products/${id}`),
  forceDelete: (id: number) => api.delete<void>(`/products/${id}/force`),
  uploadImage: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/products/${id}/image`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Error ${res.status}`);
    }
    return res.json() as Promise<Product>;
  },
  getImageUrl,
};
