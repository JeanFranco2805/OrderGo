import { API_BASE } from './api';

export interface OrderRejection {
  id: number;
  orderId: number;
  orderNumber: string;
  customerName: string;
  productName: string | null;
  sellerUsername: string | null;
  deliveryPersonUsername: string | null;
  quantity: number;
  reason: string | null;
  rejectedAt: string;
}

export const orderRejectionApi = {
  getAll: async (): Promise<OrderRejection[]> => {
    const res = await fetch(`${API_BASE}/order-rejections`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    });
    if (!res.ok) throw new Error('Error cargando rechazos');
    return res.json();
  },

  create: async (payload: { orderId: number; productId?: number; offerId?: number; quantity: number; reason?: string; previousStatus?: string }): Promise<void> => {
    const res = await fetch(`${API_BASE}/seller-loads/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Error registrando rechazo');
    }
  },

  clearByOrderId: async (orderId: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/seller-loads/reject/${orderId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Error limpiando rechazos previos');
    }
  },
};
