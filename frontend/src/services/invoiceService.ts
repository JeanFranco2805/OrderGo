import { api, type PaginatedResponse } from './api';

export interface Payment {
  id: number;
  invoiceId: number;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  invoiceDate: string;
  subtotal?: number;
  taxAmount?: number;
  amount: number;
  paid: number;
  balance: number;
  status: 'PAGADA' | 'PENDIENTE' | 'PARCIAL';
  orderId?: number;
  orderNumber?: string;
  paymentMethod?: string;
  discountCode?: string;
  payments: Payment[];
}

export const invoiceApi = {
  getAll: (params?: { search?: string; page?: number; size?: number }) => {
    const search = params?.search ? `search=${encodeURIComponent(params.search)}` : '';
    const page = params?.page !== undefined ? `page=${params.page}` : '';
    const size = params?.size !== undefined ? `size=${params.size}` : '';
    const qs = [search, page, size].filter(Boolean).join('&');
    return api.get<PaginatedResponse<Invoice>>(`/invoices${qs ? '?' + qs : ''}`);
  },
  getById: (id: number) => api.get<Invoice>(`/invoices/${id}`),
  create: (invoice: { customerId: number; invoiceDate: string; amount: number; orderId?: number; discountCode?: string }) => api.post<Invoice>('/invoices', invoice),
  addPayment: (id: number, payment: { paymentDate: string; amount: number; paymentMethod: string }) => api.post<Invoice>(`/invoices/${id}/payments`, payment),
  delete: (id: number) => api.delete<void>(`/invoices/${id}`),
  sendWhatsApp: (id: number) => api.post<{ success: boolean; error?: string; phone?: string; message?: string }>(`/invoices/${id}/send-whatsapp`, {}, { timeout: 30000 }),
  getWhatsAppMessage: (id: number) => api.get<{ phone: string; message: string }>(`/invoices/${id}/whatsapp-message`),
  sendWhatsAppBatch: (ids: number[]) => api.post<{ success: boolean; error?: string; total?: number; sent?: number; failed?: number }>(`/invoices/send-whatsapp-batch`, ids),
};
