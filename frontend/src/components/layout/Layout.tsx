import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import '../../styles/layout.css';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/productos': 'Productos',
  '/pedidos': 'Pedidos',
  '/clientes': 'Clientes',
  '/inventario': 'Inventario',
  '/facturacion': 'Facturación',
  '/descuentos': 'Descuentos',
  '/mapa': 'Mapa de entregas',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuración',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const title = pageTitles[location.pathname] || 'OrderGo';

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className="main-wrapper">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title={title} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
