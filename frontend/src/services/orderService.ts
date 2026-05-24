import { api, type PaginatedResponse } from './api';

export interface OrderItem {
  id?: number;
  productId?: number;
  productName?: string;
  offerId?: number;
  offerName?: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  sellerId?: number;
  sellerName?: string;
  deliveryPersonId?: number;
  deliveryPersonName?: string;
  status: 'PENDIENTE' | 'EN_PREPARACION' | 'ENTREGADO' | 'CANCELADO' | 'RECHAZADO';
  totalAmount: number;
  deliveryAddress?: string;
  latitude?: number;
  longitude?: number;
  paymentMethod?: string;
  items: OrderItem[];
}

export const orderApi = {
  getAll: (params?: { search?: string; page?: number; size?: number }) => {
    const search = params?.search ? `search=${encodeURIComponent(params.search)}` : '';
    const page = params?.page !== undefined ? `page=${params.page}` : '';
    const size = params?.size !== undefined ? `size=${params.size}` : '';
    const qs = [search, page, size].filter(Boolean).join('&');
    return api.get<PaginatedResponse<Order>>(`/orders${qs ? '?' + qs : ''}`);
  },
  getById: (id: number) => api.get<Order>(`/orders/${id}`),
  getPendingDeliveries: () => api.get<Order[]>('/orders/pending-delivery'),
  create: (order: { customerId: number; deliveryAddress?: string; paymentMethod?: string; items: { productId?: number; offerId?: number; quantity: number }[] }) => api.post<Order>('/orders', order),
  update: (id: number, order: { customerId?: number; deliveryAddress?: string; status?: string; paymentMethod?: string }) => api.put<Order>(`/orders/${id}`, order),
  updateStatus: (id: number, status: string) => api.patch<Order>(`/orders/${id}/status?status=${status}`),
  delete: (id: number) => api.delete<void>(`/orders/${id}`),
  forceDelete: (id: number) => api.delete<void>(`/orders/${id}/force`),
};
