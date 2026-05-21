import { useAuth } from '../context/AuthContext';
import { canCreate, canEdit, canDelete, canForceDelete, canArchive, canManageUsers, canManageSettings, canViewReports, canManageInventory, canManageDiscounts, canManagePaymentMethods } from '../utils/permissions';

export function useRole() {
  const { user } = useAuth();
  const role = user?.role || '';

  return {
    role,
    isAdmin: role === 'ADMIN',
    isVendedor: role === 'VENDEDOR',
    isDomiciliario: role === 'DOMICILIARIO',
    canCreate: () => canCreate(role),
    canEdit: () => canEdit(role),
    canDelete: () => canDelete(role),
    canForceDelete: () => canForceDelete(role),
    canArchive: () => canArchive(role),
    canManageUsers: () => canManageUsers(role),
    canManageSettings: () => canManageSettings(role),
    canViewReports: () => canViewReports(role),
    canManageInventory: () => canManageInventory(role),
    canManageDiscounts: () => canManageDiscounts(role),
    canManagePaymentMethods: () => canManagePaymentMethods(role),
  };
}
