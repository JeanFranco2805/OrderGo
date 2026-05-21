import { api, type PaginatedResponse } from './api';

export interface InventoryExpense {
  id: number;
  inventoryItemId: number;
  inventoryItemName: string;
  supplierId?: number;
  supplierName?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  expenseDate: string;
  description?: string;
}

export const inventoryExpenseApi = {
  getAll: (params?: { page?: number; size?: number }) => {
    const page = params?.page !== undefined ? `page=${params.page}` : '';
    const size = params?.size !== undefined ? `size=${params.size}` : '';
    const qs = [page, size].filter(Boolean).join('&');
    return api.get<PaginatedResponse<InventoryExpense>>(`/inventory-expenses${qs ? '?' + qs : ''}`);
  },
  getByItem: (inventoryItemId: number, params?: { page?: number; size?: number }) => {
    const page = params?.page !== undefined ? `page=${params.page}` : '';
    const size = params?.size !== undefined ? `size=${params.size}` : '';
    const qs = [page, size].filter(Boolean).join('&');
    return api.get<PaginatedResponse<InventoryExpense>>(`/inventory-expenses/item/${inventoryItemId}${qs ? '?' + qs : ''}`);
  },
  create: (expense: Omit<InventoryExpense, 'id' | 'totalCost' | 'inventoryItemName' | 'supplierName'>) => api.post<InventoryExpense>('/inventory-expenses', expense),
  delete: (id: number) => api.delete<void>(`/inventory-expenses/${id}`),
};
