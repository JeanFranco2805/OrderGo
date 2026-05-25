import { api } from './api';

export interface DeliveryPersonMoneyReport {
  deliveryPersonId: number;
  deliveryPersonName: string;
  deliveredValue: number;
  rejectedValue: number;
  totalValue: number;
  periodLabel: string;
}

export const orderMoneyReportApi = {
  getAll: (params?: { year?: number; month?: number }) => {
    const qs = new URLSearchParams();
    if (params?.year) qs.set('year', String(params.year));
    if (params?.month) qs.set('month', String(params.month));
    const query = qs.toString();
    return api.get<DeliveryPersonMoneyReport[]>(`/orders/money-report${query ? '?' + query : ''}`);
  },
};
