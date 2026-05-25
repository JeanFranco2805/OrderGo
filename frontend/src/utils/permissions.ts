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
    '/control-cargue',
    '/reportes',
    '/usuarios',
    '/configuracion',
  ],
  VENDEDOR: [
    '/dashboard',
    '/productos',
    '/pedidos',
    '/clientes',
    '/ofertas',
    '/mapa',
    '/rutas',
  ],
  DOMICILIARIO: [
    '/dashboard',
    '/pedidos',
    '/mapa',
    '/cargue',
  ],
};

export function hasRouteAccess(role: string | null | undefined, path: string): boolean {
  if (!role) return false;
  const normalizedRole = role.toUpperCase() as UserRole;
  const routes = ROLE_ROUTES[normalizedRole];
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
