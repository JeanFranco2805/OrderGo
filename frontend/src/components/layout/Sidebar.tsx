import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Warehouse,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Box,
  Map,
  Tag,
  CreditCard,
  Shield,
  Gift,
  Navigation,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasRouteAccess } from '../../utils/permissions';
import '../../styles/layout.css';

const menuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/inventario', label: 'Inventario', icon: Warehouse },
  { to: '/facturacion', label: 'Facturación', icon: Receipt },
  { to: '/descuentos', label: 'Descuentos', icon: Tag },
  { to: '/ofertas', label: 'Ofertas', icon: Gift },
  { to: '/metodos-pago', label: 'Métodos de pago', icon: CreditCard },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/rutas', label: 'Mis rutas', icon: Navigation },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/usuarios', label: 'Usuarios', icon: Shield },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const role = user?.role;

  const visibleItems = menuItems.filter((item) => hasRouteAccess(role, item.to));

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box size={18} strokeWidth={2} color="#fff" />
        </div>
        <span>OrderGo</span>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={isActive ? 'active' : ''}
                  onClick={() => {
                    if (window.innerWidth <= 900) {
                      // Close sidebar on mobile navigation
                      document.querySelector('.sidebar')?.classList.remove('open');
                    }
                  }}
                >
                  <Icon strokeWidth={1.5} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <button
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', width: '100%' }}
        >
          <LogOut size={16} strokeWidth={1.5} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
