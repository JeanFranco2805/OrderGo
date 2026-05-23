import { api } from './api';

export interface SellerLoad {
  id: number;
  sellerId: number;
  sellerName: string;
  loadDate: string;
  status: 'ACTIVO' | 'CERRADO';
  items: SellerLoadItem[];
}

export interface SellerLoadItem {
  id: number;
  productId: number;
  productName: string;
  quantityLoaded: number;
  quantityDelivered: number;
  quantityRejected: number;
  originalQuantityLoaded?: number;
  unitOfMeasure: string;
}

export interface SellerLoadItemCreate {
  productId: number;
  quantityLoaded: number;
  unitOfMeasure: string;
}

export interface VendorLoadStats {
  totalLoaded: number;
  totalDelivered: number;
  totalRemaining: number;
  totalRejected: number;
}

export interface AdminLoadReport {
  sellerId: number;
  sellerUsername: string;
  load: SellerLoad | null;
  stats: VendorLoadStats;
  deliveredCustomers: number;
  rejectedCustomers: number;
  deliveredOrders: number;
  rejectedOrders: number;
  totalOrders: number;
}

export interface RejectOrderPayload {
  orderId: number;
  productId: number;
  quantity: number;
  reason?: string;
}

export const sellerLoadApi = {
  getToday: () => api.get<SellerLoad>('/seller-loads/today'),
  addItems: (items: SellerLoadItemCreate[]) => api.post<SellerLoad>('/seller-loads/items', { items }),
  getStats: () => api.get<VendorLoadStats>('/seller-loads/stats'),
  getHistory: () => api.get<SellerLoad[]>('/seller-loads/history'),
  reject: (payload: RejectOrderPayload) => api.post<void>('/seller-loads/reject', payload),
  getAdminReport: (date?: string) => api.get<AdminLoadReport[]>(`/seller-loads/admin-report${date ? `?date=${date}` : ''}`),
  deleteLoad: (sellerId: number, date?: string) => api.delete<void>(`/seller-loads/${sellerId}${date ? `?date=${date}` : ''}`),
};
