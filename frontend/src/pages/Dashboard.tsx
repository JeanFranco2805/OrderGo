import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, ShoppingCart, Users, Package, Receipt, BarChart3, Layers,
  MapPin, Clock, CheckCircle2, Truck, Navigation, Eye, Phone, Briefcase, AlertTriangle
} from 'lucide-react';
import { formatCOP } from '../utils/currency';
import { dashboardApi, type VendorStats } from '../services/dashboardService';
import { orderApi, type Order } from '../services/orderService';
import { useApiCache, invalidateCache } from '../hooks/useApiCache';
import { useRole } from '../hooks/useRole';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import RejectionModal, { type RejectItem } from '../components/RejectionModal';
import '../styles/pages.css';

export default function Dashboard() {
  const { isDomiciliario, isVendedor } = useRole();
  const navigate = useNavigate();

  const { data: stats, loading: loadingStats, error: errorStats } = useApiCache('dashboard-stats', () =>
    dashboardApi.getStats()
  );

  const { data: vendorStats, loading: loadingVendorStats, error: errorVendorStats } = useApiCache('vendor-stats', () =>
    isVendedor ? dashboardApi.getVendorStats() : Promise.resolve(null as VendorStats | null)
  );

  const { data: pendingDeliveries, loading: loadingPending, error: errorPending, refresh: refreshPending } = useApiCache(
    'pending-deliveries',
    () => (isDomiciliario ? orderApi.getPendingDeliveries() : Promise.resolve([] as Order[]))
  );

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveringId, setDeliveringId] = useState<number | null>(null);
  const [deliverError, setDeliverError] = useState('');
  const [pendingPage, setPendingPage] = useState(0);
  const pendingPageSize = 10;

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<number | null>(null);
  const [rejectPreviousStatus, setRejectPreviousStatus] = useState('');
  const [rejectItems, setRejectItems] = useState<RejectItem[]>([]);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const handleDeliver = async (id: number) => {
    setDeliveringId(id);
    setDeliverError('');
    try {
      await orderApi.updateStatus(id, 'ENTREGADO');
      invalidateCache('pending-deliveries');
      invalidateCache('dashboard-stats');
      invalidateCache('products-');
      refreshPending();
    } catch (e: any) {
      setDeliverError(e?.response?.data?.message || 'Error al marcar como entregado');
    } finally {
      setDeliveringId(null);
    }
  };

  const handleRejectDelivery = async (order: Order) => {
    setRejectingId(order.id);
    setDeliverError('');
    try {
      await orderApi.updateStatus(order.id, 'RECHAZADO');
      invalidateCache('pending-deliveries');
      invalidateCache('dashboard-stats');
      invalidateCache('products-');
      refreshPending();

      setRejectOrderId(order.id);
      setRejectPreviousStatus(order.status);
      setRejectItems(
        order.items.map((item) => ({
          productId: item.productId,
          offerId: item.offerId,
          productName: item.productName || item.offerName || 'Producto',
          quantity: item.quantity,
          maxQuantity: item.quantity,
          checked: true,
        }))
      );
      setShowRejectModal(true);
    } catch (e: any) {
      setDeliverError(e?.response?.data?.message || 'Error al marcar como rechazado');
    } finally {
      setRejectingId(null);
    }
  };

  const pendingList = pendingDeliveries ?? [];
  const pendienteCount = pendingList.filter((o) => o.status === 'PENDIENTE').length;
  const preparacionCount = pendingList.filter((o) => o.status === 'EN_PREPARACION').length;

  const pendingTotalPages = Math.ceil(pendingList.length / pendingPageSize);
  const pendingPaged = pendingList.slice(pendingPage * pendingPageSize, (pendingPage + 1) * pendingPageSize);

  const adminMonthCards = [
    { label: 'Ventas del mes', value: stats ? formatCOP(stats.totalSales) : '—', icon: DollarSign, color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Pedidos del mes', value: stats ? String(stats.totalOrders) : '—', icon: ShoppingCart, color: '#0ea5e9', bg: '#f0f9ff' },
    { label: 'Promedio por pedido (mes)', value: stats ? formatCOP(stats.averageTicket) : '—', icon: Package, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Clientes registrados', value: stats ? String(stats.totalCustomers) : '—', icon: Users, color: '#10b981', bg: '#ecfdf5' },
  ];

  const vendorTodayCards = [
    { label: 'Docenas vendidas (hoy)', value: vendorStats ? `${vendorStats.dozensSold} docenas` : '—', icon: Layers, color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Pedidos hoy', value: vendorStats ? String(vendorStats.totalOrders) : '—', icon: ShoppingCart, color: '#0ea5e9', bg: '#f0f9ff' },
    { label: 'Promedio por pedido (hoy)', value: vendorStats ? `${vendorStats.averageDozensPerOrder} docenas` : '—', icon: Package, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Clientes atendidos (hoy)', value: vendorStats ? String(vendorStats.totalCustomers) : '—', icon: Users, color: '#10b981', bg: '#ecfdf5' },
    { label: 'Mi cargue', value: 'Ver cargue', icon: Briefcase, color: '#7c3aed', bg: '#f3f0ff', onClick: () => navigate('/cargue'), isAction: true },
  ];

  const allTimeCards = [
    { label: 'Ventas totales (histórico)', value: stats ? formatCOP(stats.totalSalesAllTime) : '—', icon: BarChart3, color: '#7c3aed', bg: '#f3f0ff' },
    { label: 'Pedidos totales (histórico)', value: stats ? String(stats.totalOrdersAllTime) : '—', icon: Receipt, color: '#0891b2', bg: '#ecfeff' },
  ];

  const deliveryCards = [
    { label: 'Por entregar', value: String(pendienteCount), icon: Truck, color: '#ef4444', bg: '#fef2f2' },
    { label: 'En preparación', value: String(preparacionCount), icon: Clock, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Pedidos del mes', value: stats ? String(stats.totalOrders) : '—', icon: ShoppingCart, color: '#0ea5e9', bg: '#f0f9ff' },
    {
      label: 'Mapa de entregas',
      value: 'Ver mapa',
      icon: Navigation,
      color: '#10b981',
      bg: '#ecfdf5',
      onClick: () => navigate('/mapa'),
      isAction: true,
    },
  ];

  const error = errorStats || errorVendorStats || errorPending;

  return (
    <div>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>{isDomiciliario ? 'Panel de entregas y rutas' : 'Resumen general del negocio'}</p>
        </div>
      </div>

      {isVendedor ? (
        <>
          <div className="stats-grid">
            {vendorTodayCards.map((s: any) => (
              <div className="stat-card" key={s.label} style={s.onClick ? { cursor: 'pointer' } : undefined}>
                {s.onClick ? (
                  <button onClick={s.onClick} style={{ all: 'unset', display: 'flex', width: '100%', gap: 16, alignItems: 'center', cursor: 'pointer' }}>
                    <div className="stat-info" style={{ flex: 1 }}>
                      <span className="stat-label">{s.label}</span>
                      <span className="stat-value">{loadingVendorStats ? '...' : s.value}</span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                      <s.icon size={20} strokeWidth={1.5} />
                    </div>
                  </button>
                ) : (
                  <>
                    <div className="stat-info">
                      <span className="stat-label">{s.label}</span>
                      <span className="stat-value">{loadingVendorStats ? '...' : s.value}</span>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                      <s.icon size={20} strokeWidth={1.5} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      ) : !isDomiciliario ? (
        <>
          <div className="stats-grid">
            {adminMonthCards.map((s) => (
              <div className="stat-card" key={s.label}>
                <div className="stat-info">
                  <span className="stat-label">{s.label}</span>
                  <span className="stat-value">{loadingStats ? '...' : s.value}</span>
                </div>
                <div className="stat-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                  <s.icon size={20} strokeWidth={1.5} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 16 }}>Histórico acumulado</h3>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {allTimeCards.map((s) => (
                <div className="stat-card" key={s.label} style={{ opacity: 0.9 }}>
                  <div className="stat-info">
                    <span className="stat-label">{s.label}</span>
                    <span className="stat-value">{loadingStats ? '...' : s.value}</span>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                    <s.icon size={20} strokeWidth={1.5} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="stats-grid">
            {deliveryCards.map((s: any) => (
              <div
                className="stat-card"
                key={s.label}
                onClick={s.onClick}
                style={s.onClick ? { cursor: 'pointer' } : undefined}
              >
                <div className="stat-info">
                  <span className="stat-label">{s.label}</span>
                  <span className="stat-value">{loadingPending || loadingStats ? '...' : s.value}</span>
                </div>
                <div className="stat-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                  <s.icon size={20} strokeWidth={1.5} />
                </div>
              </div>
            ))}
          </div>

          {deliverError && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginTop: 16 }}>
              {deliverError}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 16 }}>
              Próximas entregas
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Dirección</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPending ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Cargando...</td></tr>
                  ) : pendingPaged.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>No hay entregas pendientes</td></tr>
                  ) : (
                    pendingPaged.map((o) => (
                      <tr key={o.id}>
                        <td><span style={{ fontWeight: 700 }}>#{o.orderNumber}</span></td>
                        <td>{o.customerName || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPin size={14} strokeWidth={1.5} color="#8b95a1" />
                            <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.deliveryAddress || '—'}</span>
                          </div>
                        </td>
                        <td>{formatCOP(o.totalAmount)}</td>
                        <td>
                          <span className={`badge ${o.status === 'PENDIENTE' ? 'badge-warning' : 'badge-info'}`}>
                            {o.status === 'PENDIENTE' ? 'Pendiente' : 'En preparación'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button className="navbar-icon-btn" aria-label="Ver" onClick={() => setSelectedOrder(o)}>
                              <Eye size={15} strokeWidth={1.5} />
                            </button>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 10px', fontSize: '0.8rem', gap: 6 }}
                              onClick={() => handleDeliver(o.id)}
                              disabled={deliveringId === o.id}
                            >
                              <CheckCircle2 size={14} strokeWidth={1.5} />
                              {deliveringId === o.id ? 'Entregando...' : 'Entregar'}
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px 10px', fontSize: '0.8rem', gap: 6 }}
                              onClick={() => handleRejectDelivery(o)}
                              disabled={rejectingId === o.id}
                            >
                              <AlertTriangle size={14} strokeWidth={1.5} />
                              {rejectingId === o.id ? 'Rechazando...' : 'Rechazar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {pendingList.length > pendingPageSize && (
              <Pagination page={pendingPage} totalPages={pendingTotalPages} onChange={setPendingPage} />
            )}
          </div>
        </>
      )}

      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Pedido #${selectedOrder?.orderNumber}`}>
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Cliente</span>
                <span style={{ fontWeight: 600 }}>{selectedOrder.customerName || '—'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Teléfono</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={14} strokeWidth={1.5} color="#8b95a1" />
                  <span style={{ fontWeight: 600 }}>{selectedOrder.customerPhone || '—'}</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Estado</span>
                <span className={`badge ${selectedOrder.status === 'PENDIENTE' ? 'badge-warning' : selectedOrder.status === 'ENTREGADO' ? 'badge-success' : 'badge-info'}`}>
                  {selectedOrder.status === 'PENDIENTE' ? 'Pendiente' : selectedOrder.status === 'EN_PREPARACION' ? 'En preparación' : selectedOrder.status === 'ENTREGADO' ? 'Entregado' : selectedOrder.status}
                </span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Dirección</span>
                <span style={{ fontWeight: 600 }}>{selectedOrder.deliveryAddress || '—'}</span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 8 }}>Productos</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--color-bg)', borderRadius: 8 }}>
                    <span>{item.quantity}x {item.productName || item.offerName || 'Producto'}</span>
                    <span style={{ fontWeight: 700 }}>{formatCOP(item.subtotal || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-accent)' }}>{formatCOP(selectedOrder.totalAmount)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Registrar Rechazo */}
      <RejectionModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        orderId={rejectOrderId}
        previousStatus={rejectPreviousStatus}
        items={rejectItems}
        onItemsChange={setRejectItems}
        onSuccess={() => {
          setDeliverError('');
          invalidateCache('pending-deliveries');
          invalidateCache('dashboard-stats');
          invalidateCache('seller-load-');
          refreshPending();
        }}
        onError={(msg) => setDeliverError(msg)}
      />
    </div>
  );
}
