import { api } from './api';

export interface DashboardStats {
  // Mes actual
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  // Acumulado
  totalSalesAllTime: number;
  totalOrdersAllTime: number;
  totalCustomers: number;
  // Facturación
  totalReceivable: number;
  pendingInvoices: number;
}

export interface MonthlyTotal {
  month: string;
  amount: number;
}

export interface PaymentMethodTotal {
  paymentMethod: string;
  total: number;
}

export interface VendorStats {
  dozensSold: number;
  totalOrders: number;
  totalCustomers: number;
  averageDozensPerOrder: number;
}

export interface DailySales {
  totalSales: number;
  totalInvoices: number;
  date: string;
}

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
  getMonthlySales: () => api.get<MonthlyTotal[]>('/dashboard/monthly-sales'),
  getMonthlyExpenses: () => api.get<MonthlyTotal[]>('/dashboard/monthly-expenses'),
  getPaymentsByMethod: () => api.get<PaymentMethodTotal[]>('/dashboard/payments-by-method'),
  getVendorStats: () => api.get<VendorStats>('/dashboard/vendor-stats'),
  getDailySales: (date: string) => api.get<DailySales>(`/dashboard/daily-sales?date=${date}`),
};
