import { api, API_BASE, type PaginatedResponse } from './api';

export interface OfferItem {
  id?: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface Offer {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  active: boolean;
  items: OfferItem[];
}

function getImageUrl(path?: string) {
  if (!path) return 'https://via.placeholder.com/400x300?text=No+Image';
  if (path.startsWith('http')) return path;
  return `http://localhost:8080${path}`;
}

export const offerApi = {
  getAll: (params?: { page?: number; size?: number }) => {
    const page = params?.page !== undefined ? `page=${params.page}` : '';
    const size = params?.size !== undefined ? `size=${params.size}` : '';
    const qs = [page, size].filter(Boolean).join('&');
    return api.get<PaginatedResponse<Offer>>(`/offers${qs ? '?' + qs : ''}`);
  },
  getDeleted: () => api.get<Offer[]>('/offers/deleted'),
  getActive: () => api.get<Offer[]>('/offers/active'),
  getById: (id: number) => api.get<Offer>(`/offers/${id}`),
  create: (offer: Omit<Offer, 'id'>) => api.post<Offer>('/offers', offer),
  update: (id: number, offer: Partial<Offer>) => api.put<Offer>(`/offers/${id}`, offer),
  delete: (id: number) => api.delete<void>(`/offers/${id}`),
  forceDelete: (id: number) => api.delete<void>(`/offers/${id}/force`),
  restore: (id: number) => api.post<Offer>(`/offers/${id}/restore`, {}),
  uploadImage: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/offers/${id}/image`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Error ${res.status}`);
    }
    return res.json() as Promise<Offer>;
  },
  getImageUrl,
};
