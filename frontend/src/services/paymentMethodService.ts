import { api } from './api';

export interface PaymentMethod {
  id: number;
  name: string;
}

export async function getPaymentMethods(): Promise<string[]> {
  const methods = await api.get<PaymentMethod[]>('/payment-methods');
  return methods.map((m) => m.name);
}

export async function createPaymentMethod(name: string): Promise<PaymentMethod> {
  return api.post<PaymentMethod>('/payment-methods', { name });
}

export async function deletePaymentMethod(id: number): Promise<void> {
  return api.delete<void>(`/payment-methods/${id}`);
}
