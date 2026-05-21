export const PAYMENT_METHODS_KEY = 'ordergo_payment_methods';

export function getPaymentMethods(): string[] {
  const raw = localStorage.getItem(PAYMENT_METHODS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fall through */ }
  }
  return ['EFECTIVO', 'TRANSFERENCIA', 'NEQUI', 'DAVIPLATA', 'TARJETA', 'OTRO'];
}

export function savePaymentMethods(methods: string[]) {
  localStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(methods));
}
