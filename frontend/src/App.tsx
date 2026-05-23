import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { hasRouteAccess } from './utils/permissions'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Pedidos from './pages/Pedidos'
import Clientes from './pages/Clientes'
import Inventario from './pages/Inventario'
import Facturacion from './pages/Facturacion'
import Configuracion from './pages/Configuracion'
import Reportes from './pages/Reportes'
import MapaEntregas from './pages/MapaEntregas'
import RutasVendedor from './pages/RutasVendedor'
import CargueVendedor from './pages/CargueVendedor'
import Descuentos from './pages/Descuentos'
import ControlCargue from './pages/ControlCargue'
import MetodosPago from './pages/MetodosPago'
import Usuarios from './pages/Usuarios'
import Ofertas from './pages/Ofertas'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleRoute({ children, path }: { children: React.ReactNode; path: string }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!hasRouteAccess(user.role, path)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="productos" element={<RoleRoute path="/productos"><Productos /></RoleRoute>} />
        <Route path="pedidos" element={<RoleRoute path="/pedidos"><Pedidos /></RoleRoute>} />
        <Route path="clientes" element={<RoleRoute path="/clientes"><Clientes /></RoleRoute>} />
        <Route path="inventario" element={<RoleRoute path="/inventario"><Inventario /></RoleRoute>} />
        <Route path="facturacion" element={<RoleRoute path="/facturacion"><Facturacion /></RoleRoute>} />
        <Route path="control-cargue" element={<RoleRoute path="/control-cargue"><ControlCargue /></RoleRoute>} />
        <Route path="reportes" element={<RoleRoute path="/reportes"><Reportes /></RoleRoute>} />
        <Route path="mapa" element={<RoleRoute path="/mapa"><MapaEntregas /></RoleRoute>} />
        <Route path="rutas" element={<RoleRoute path="/rutas"><RutasVendedor /></RoleRoute>} />
        <Route path="cargue" element={<RoleRoute path="/cargue"><CargueVendedor /></RoleRoute>} />
        <Route path="descuentos" element={<RoleRoute path="/descuentos"><Descuentos /></RoleRoute>} />
        <Route path="metodos-pago" element={<RoleRoute path="/metodos-pago"><MetodosPago /></RoleRoute>} />
        <Route path="usuarios" element={<RoleRoute path="/usuarios"><Usuarios /></RoleRoute>} />
        <Route path="ofertas" element={<RoleRoute path="/ofertas"><Ofertas /></RoleRoute>} />
        <Route path="configuracion" element={<RoleRoute path="/configuracion"><Configuracion /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App
