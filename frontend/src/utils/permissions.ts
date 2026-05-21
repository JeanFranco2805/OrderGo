export type UserRole = 'ADMIN' | 'VENDEDOR' | 'DOMICILIARIO';

export const ROLE_ROUTES: Record<UserRole, string[]> = {
  ADMIN: [
    '/dashboard',
    '/productos',
    '/pedidos',
    '/clientes',
    '/inventario',
    '/facturacion',
    '/descuentos',
    '/ofertas',
    '/metodos-pago',
    '/mapa',
    '/reportes',
    '/usuarios',
    '/configuracion',
  ],
  VENDEDOR: [
    '/dashboard',
    '/productos',
    '/pedidos',
    '/clientes',
    '/facturacion',
    '/ofertas',
    '/mapa',
    '/rutas',
  ],
  DOMICILIARIO: [
    '/dashboard',
    '/pedidos',
    '/mapa',
  ],
};

export function hasRouteAccess(role: string | null | undefined, path: string): boolean {
  if (!role) return false;
  const routes = ROLE_ROUTES[role as UserRole];
  if (!routes) return false;
  return routes.some((r) => path === r || path.startsWith(r + '/'));
}

export function canCreate(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'VENDEDOR';
}

export function canEdit(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'VENDEDOR';
}

export function canDelete(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canManageUsers(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canManageSettings(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canViewReports(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canManageInventory(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canManageDiscounts(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canManagePaymentMethods(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canForceDelete(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canArchive(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'VENDEDOR';
}
