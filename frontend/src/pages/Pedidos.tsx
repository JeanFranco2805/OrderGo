import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Eye, MapPin, FileText, Trash2, X, Pencil, CreditCard, Tag, Truck, Printer, CheckSquare, Square, Download } from 'lucide-react';
import { formatCOP } from '../utils/currency';
import { getLocalDateString } from '../utils/date';
import { orderApi, type Order, type OrderItem } from '../services/orderService';
import { customerApi, type Customer } from '../services/customerService';
import { productApi, type Product } from '../services/productService';
import { offerApi, type Offer } from '../services/offerService';
import { userApi, type User } from '../services/userService';
import { invoiceApi } from '../services/invoiceService';
import { businessSettingsApi } from '../services/businessSettingsService';
import { getPaymentMethods } from '../services/paymentMethodService';
import { useApiCache, invalidateCache } from '../hooks/useApiCache';
import { useRole } from '../hooks/useRole';
import { exportToExcel } from '../utils/exportExcel';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import RejectionModal, { type RejectItem } from '../components/RejectionModal';
import '../styles/pages.css';

function isOrderFromToday(order: Order): boolean {
  if (!order.createdAt) return true;
  const orderDate = order.createdAt.split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  return orderDate === today;
}

function statusDisplay(s: string) {
  switch (s) {
    case 'ENTREGADO': return { label: 'Entregado', class: 'badge-success' };
    case 'EN_PREPARACION': return { label: 'En preparación', class: 'badge-warning' };
    case 'PENDIENTE': return { label: 'Pendiente', class: 'badge-info' };
    case 'RECHAZADO': return { label: 'Rechazado', class: 'badge-danger' };
    case 'CANCELADO': return { label: 'Cancelado', class: 'badge-secondary' };
    default: return { label: s, class: 'badge-info' };
  }
}

export default function Pedidos() {
  const { canCreate: canCreateOrder, canEdit: canEditOrder, canForceDelete: canForceDeleteOrder, isAdmin, isVendedor, isDomiciliario } = useRole();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const cacheKey = `orders-${page}-${search}`;
  const { data, loading, error, refresh } = useApiCache(cacheKey, () =>
    orderApi.getAll({ search: search || undefined, page, size: pageSize })
  );
  const orders = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState('');

  // Create order modal
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [createCustomerId, setCreateCustomerId] = useState<number | ''>('');
  const [createPaymentMethod, setCreatePaymentMethod] = useState('');
  const [createItems, setCreateItems] = useState<{ type: 'product' | 'offer'; id?: number; quantity: number }[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  // Edit order modal
  const [showEdit, setShowEdit] = useState(false);
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const [editCustomerId, setEditCustomerId] = useState<number | ''>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editDeliveryPersonId, setEditDeliveryPersonId] = useState<number | ''>('');
  const [editLoading, setEditLoading] = useState(false);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<number | null>(null);
  const [rejectPreviousStatus, setRejectPreviousStatus] = useState('');
  const [rejectItems, setRejectItems] = useState<RejectItem[]>([]);

  // Invoice from order
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Selected orders for batch print
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());

  const [businessSettings, setBusinessSettings] = useState<{ businessName?: string }>({});

  const location = useLocation();
  const preselectedHandled = useRef(false);

  // Auto-open create modal when navigated from RutasVendedor with preselected customer
  useEffect(() => {
    const preselectedCustomerId = (location.state as any)?.preselectedCustomerId;
    if (preselectedCustomerId && !preselectedHandled.current && canCreateOrder()) {
      preselectedHandled.current = true;
      openCreate().then(() => {
        setCreateCustomerId(preselectedCustomerId);
      });
      // Clear location state so refresh doesn't reopen
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    businessSettingsApi.get()
      .then((s) => setBusinessSettings(s))
      .catch(() => setBusinessSettings({}));
  }, []);

  // Load customers once on mount to avoid blocking the edit modal
  useEffect(() => {
    customerApi.getAll({ size: 1000 })
      .then((cData) => setCustomers(cData.content))
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    getPaymentMethods()
      .then((methods) => setPaymentMethods(methods))
      .catch(() => setPaymentMethods([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setPage(0), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = async () => {
    setShowCreate(true);
    setCreateCustomerId('');
    setCreatePaymentMethod('');
    setCreateItems([]);
    try {
      const [pData, oData] = await Promise.all([
        productApi.getAll({ size: 1000 }),
        offerApi.getAll({ size: 1000 }),
      ]);
      setProducts(pData.content);
      setOffers(oData.content.filter((o) => o.active));
    } catch (err) {
      setErrorModal('Error cargando datos: ' + (err as Error).message);
    }
  };

  const addProductItem = () => setCreateItems((prev) => [...prev, { type: 'product', id: undefined, quantity: 1 }]);
  const addOfferItem = () => setCreateItems((prev) => [...prev, { type: 'offer', id: undefined, quantity: 1 }]);
  const removeItem = (idx: number) => setCreateItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, value: number | undefined) => {
    setCreateItems((prev) => prev.map((it, i) => (i === idx ? { ...it, id: value } : it)));
  };

  const handleCreate = async () => {
    if (!createCustomerId || createItems.length === 0) return;
    try {
      setCreateLoading(true);
      await orderApi.create({
        customerId: Number(createCustomerId),
        paymentMethod: createPaymentMethod || undefined,
        items: createItems.map((it) => ({
          ...(it.type === 'product' && it.id ? { productId: it.id } : {}),
          ...(it.type === 'offer' && it.id ? { offerId: it.id } : {}),
          quantity: it.quantity,
        })),
      });
      setShowCreate(false);
      invalidateCache('orders-');
      refresh();
    } catch (err) {
      setErrorModal('Error creando pedido: ' + (err as Error).message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await orderApi.forceDelete(confirmDelete);
      invalidateCache('orders-');
      refresh();
    } catch (err) {
      setErrorModal('Error eliminando: ' + (err as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const openEdit = (order: Order) => {
    if (isVendedor && !isOrderFromToday(order)) {
      setErrorModal('Solo puedes editar pedidos del día de hoy.');
      return;
    }
    setEditOrderId(order.id);
    setEditCustomerId(order.customerId);
    setEditPaymentMethod(order.paymentMethod || '');
    setEditStatus(order.status);
    setEditDeliveryPersonId(order.deliveryPersonId || '');
    setShowEdit(true);
    // Load users if not already loaded
    if (users.length === 0) {
      userApi.getAll({ size: 1000 })
        .then((uData) => setUsers(uData.content))
        .catch(() => setUsers([]));
    }
  };

  const handleEditSave = async () => {
    if (!editOrderId) return;
    if ((editStatus === 'ENTREGADO' || editStatus === 'RECHAZADO') && editDeliveryPersonId === '') {
      setErrorModal('Debes asignar un domiciliario antes de marcar el pedido como Entregado o Rechazado.');
      return;
    }
    try {
      setEditLoading(true);
      const payload: any = {
        customerId: Number(editCustomerId),
        status: editStatus,
        paymentMethod: editPaymentMethod || undefined,
      };
      if (editDeliveryPersonId !== '') {
        payload.deliveryPersonId = Number(editDeliveryPersonId);
      } else {
        payload.deliveryPersonId = null;
      }
      await orderApi.update(editOrderId, payload);
      setShowEdit(false);
      invalidateCache('orders-');
      invalidateCache('products-');
      invalidateCache('seller-load-');
      refresh();

      // If status changed to RECHAZADO, open rejection modal
      if (editStatus === 'RECHAZADO') {
        const order = orders.find((o) => o.id === editOrderId);
        if (order) {
          setRejectOrderId(editOrderId);
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
        }
      }
    } catch (err) {
      setErrorModal('Error guardando: ' + (err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleInvoice = async () => {
    if (!invoiceOrder) return;
    try {
      await invoiceApi.create({
        customerId: invoiceOrder.customerId,
        invoiceDate: getLocalDateString(),
        amount: invoiceOrder.totalAmount,
        orderId: invoiceOrder.id,
      });
      setInvoiceOrder(null);
      setErrorModal('Factura creada exitosamente.');
    } catch (err) {
      setErrorModal('Error facturando: ' + (err as Error).message);
    }
  };

  const handleTakeOrder = async (order: Order) => {
    try {
      await orderApi.update(order.id, {
        customerId: order.customerId,
        status: 'EN_PREPARACION',
      });
      invalidateCache('orders-');
      refresh();
      setErrorModal('Pedido asignado y agregado a tu cargue exitosamente.');
    } catch (err) {
      setErrorModal('Error tomando pedido: ' + (err as Error).message);
    }
  };

  const printDeliveryNote = (order: Order | null) => {
    if (!order) return;
    const printContent = `
      <html>
        <head><title>Nota de Entrega - ${order.orderNumber}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px;">${businessSettings.businessName || 'Mi Negocio'}</h1>
            <h2 style="margin: 8px 0 0; font-size: 16px; color: #555;">NOTA DE ENTREGA</h2>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p style="margin: 4px 0;"><strong>Pedido:</strong> ${order.orderNumber}</p>
            <p style="margin: 4px 0;"><strong>Cliente:</strong> ${order.customerName}</p>
            <p style="margin: 4px 0;"><strong>Dirección:</strong> ${order.deliveryAddress || '—'}</p>
            <p style="margin: 4px 0;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #ccc; padding: 10px; text-align: left;">Producto</th>
                <th style="border: 1px solid #ccc; padding: 10px; text-align: center;">Cantidad</th>
                <th style="border: 1px solid #ccc; padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item: OrderItem) => `
                <tr>
                  <td style="border: 1px solid #ccc; padding: 10px;">${item.productName || item.offerName || 'Producto'}</td>
                  <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${item.quantity}</td>
                  <td style="border: 1px solid #ccc; padding: 10px; text-align: right;">${formatCOP(item.subtotal || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold; background-color: #f9fafb;">
                <td colspan="2" style="border: 1px solid #ccc; padding: 10px; text-align: right;">TOTAL:</td>
                <td style="border: 1px solid #ccc; padding: 10px; text-align: right;">${formatCOP(order.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
          
          <div style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div style="width: 45%; border-top: 1px solid #333; padding-top: 8px;">
              <p style="text-align: center; font-size: 14px; margin: 0;">Firma del Cliente</p>
              <p style="text-align: center; font-size: 12px; margin: 16px 0 0; color: #666;">C.C. _______________________</p>
            </div>
            <div style="width: 45%; border-top: 1px solid #333; padding-top: 8px;">
              <p style="text-align: center; font-size: 14px; margin: 0;">Firma del Domiciliario</p>
            </div>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background-color: #f9fafb; border-radius: 8px; font-size: 12px; color: #666;">
            <p style="margin: 0;"><strong>Nota:</strong> Por favor verifique que los productos estén en buen estado antes de firmar. Los rechazos deben ser notificados inmediatamente.</p>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(printContent);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const toggleSelectOrder = (orderId: number) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === orders.length && orders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(orders.map((o) => o.id)));
    }
  };

  const handleExport = async () => {
    try {
      const all = (await orderApi.getAll({ search: search || undefined, size: 1000 })).content;
      const rows = all.map((o) => [
        o.orderNumber,
        o.customerName || `Cliente #${o.customerId}`,
        o.deliveryAddress || '',
        o.totalAmount,
        o.paymentMethod || '',
        o.status,
        o.deliveryPersonName || '',
      ]);
      exportToExcel(
        [
          {
            name: 'Pedidos',
            headers: ['Número', 'Cliente', 'Dirección', 'Total', 'Método de pago', 'Estado', 'Domiciliario'],
            rows,
          },
        ],
        `pedidos_ordergo_${getLocalDateString()}.xlsx`
      );
    } catch {
      setErrorModal('Error exportando pedidos');
    }
  };

  const printSelectedDeliveryNotes = () => {
    const selectedOrders = orders.filter((o) => selectedOrderIds.has(o.id));
    if (selectedOrders.length === 0) return;

    const notesHtml = selectedOrders.map((order) => `
      <div style="page-break-after: always; padding: 40px; max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 24px;">${businessSettings.businessName || 'Mi Negocio'}</h1>
          <h2 style="margin: 8px 0 0; font-size: 16px; color: #555;">NOTA DE ENTREGA</h2>
        </div>
        <div style="margin-bottom: 20px;">
          <p style="margin: 4px 0;"><strong>Pedido:</strong> ${order.orderNumber}</p>
          <p style="margin: 4px 0;"><strong>Cliente:</strong> ${order.customerName}</p>
          <p style="margin: 4px 0;"><strong>Dirección:</strong> ${order.deliveryAddress || '—'}</p>
          <p style="margin: 4px 0;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</p>
          ${order.deliveryPersonName ? `<p style="margin: 4px 0;"><strong>Domiciliario:</strong> ${order.deliveryPersonName}</p>` : ''}
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #ccc; padding: 10px; text-align: left;">Producto</th>
              <th style="border: 1px solid #ccc; padding: 10px; text-align: center;">Cantidad</th>
              <th style="border: 1px solid #ccc; padding: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item: OrderItem) => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 10px;">${item.productName || item.offerName || 'Producto'}</td>
                <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${item.quantity}</td>
                <td style="border: 1px solid #ccc; padding: 10px; text-align: right;">${formatCOP(item.subtotal || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background-color: #f9fafb;">
              <td colspan="2" style="border: 1px solid #ccc; padding: 10px; text-align: right;">TOTAL:</td>
              <td style="border: 1px solid #ccc; padding: 10px; text-align: right;">${formatCOP(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
          <div style="width: 45%; border-top: 1px solid #333; padding-top: 8px;">
            <p style="text-align: center; font-size: 14px; margin: 0;">Firma del Cliente</p>
            <p style="text-align: center; font-size: 12px; margin: 16px 0 0; color: #666;">C.C. _______________________</p>
          </div>
          <div style="width: 45%; border-top: 1px solid #333; padding-top: 8px;">
            <p style="text-align: center; font-size: 14px; margin: 0;">Firma del Domiciliario</p>
          </div>
        </div>
        <div style="margin-top: 30px; padding: 15px; background-color: #f9fafb; border-radius: 8px; font-size: 12px; color: #666;">
          <p style="margin: 0;"><strong>Nota:</strong> Por favor verifique que los productos estén en buen estado antes de firmar. Los rechazos deben ser notificados inmediatamente.</p>
        </div>
      </div>
    `).join('');

    const printContent = `
      <html>
        <head><title>Notas de Entrega (${selectedOrders.length})</title>
          <style>@media print { .page-break-after { page-break-after: always; } }</style>
        </head>
        <body style="margin: 0; padding: 0;">
          ${notesHtml}
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(printContent);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Pedidos</h1>
          <p>Administra los pedidos del negocio</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button className="btn btn-outline" onClick={handleExport}>
              <Download size={18} strokeWidth={1.5} /> Exportar Excel
            </button>
          )}
          {canCreateOrder() && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={18} strokeWidth={1.5} /> Nuevo pedido
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Search size={20} strokeWidth={1.5} color="#8b95a1" />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar pedido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: '320px' }}
            />
          </div>
          {selectedOrderIds.size > 0 && (
            <button className="btn btn-primary" onClick={printSelectedDeliveryNotes} style={{ fontSize: '0.85rem' }}>
              <Printer size={16} strokeWidth={1.5} style={{ marginRight: 6 }} />
              Imprimir entregas ({selectedOrderIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <button className="navbar-icon-btn" aria-label="Seleccionar todos" onClick={toggleSelectAll} style={{ padding: 2 }}>
                    {selectedOrderIds.size === orders.length && orders.length > 0 ? (
                      <CheckSquare size={18} strokeWidth={1.5} color="#4f46e5" />
                    ) : (
                      <Square size={18} strokeWidth={1.5} color="#8b95a1" />
                    )}
                  </button>
                </th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Método</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Cargando pedidos...</td></tr>
              ) : orders.map((o) => {
                const st = statusDisplay(o.status);
                const isSelected = selectedOrderIds.has(o.id);
                return (
                  <tr key={o.id}>
                    <td style={{ textAlign: 'center' }}>
                      <button className="navbar-icon-btn" aria-label="Seleccionar" onClick={() => toggleSelectOrder(o.id)} style={{ padding: 2 }}>
                        {isSelected ? (
                          <CheckSquare size={18} strokeWidth={1.5} color="#4f46e5" />
                        ) : (
                          <Square size={18} strokeWidth={1.5} color="#8b95a1" />
                        )}
                      </button>
                    </td>
                    <td><strong>{o.orderNumber}</strong></td>
                    <td>
                      <div>{o.customerName || `Cliente #${o.customerId}`}</div>
                      {o.deliveryAddress && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <MapPin size={11} strokeWidth={1.5} /> {o.deliveryAddress}
                        </div>
                      )}
                      {o.deliveryPersonName && (
                        <div style={{ fontSize: '0.75rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontWeight: 600 }}>
                          <Truck size={11} strokeWidth={1.5} /> {o.deliveryPersonName}
                        </div>
                      )}
                    </td>
                    <td>{formatCOP(o.totalAmount || 0)}</td>
                    <td>
                      {o.paymentMethod ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg)', padding: '4px 8px', borderRadius: 6 }}>{o.paymentMethod}</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td><span className={`badge ${st.class}`}>{st.label}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button className="navbar-icon-btn" aria-label="Ver" onClick={() => setSelectedOrder(o)}><Eye size={16} strokeWidth={1.5} /></button>
                        <button className="navbar-icon-btn" aria-label="Imprimir nota" onClick={() => printDeliveryNote(o)} style={{ color: '#0d9488' }}><Printer size={16} strokeWidth={1.5} /></button>
                        {useRole().isDomiciliario && !o.deliveryPersonId && (o.status === 'PENDIENTE' || o.status === 'EN_PREPARACION') && (
                          <button className="navbar-icon-btn" aria-label="Tomar pedido" onClick={() => handleTakeOrder(o)} style={{ color: '#4f46e5', backgroundColor: '#eef2ff', borderRadius: 8, padding: 6 }}><Truck size={16} strokeWidth={1.5} /></button>
                        )}
                        {canEditOrder() && (!isVendedor || isOrderFromToday(o)) && (
                          <button className="navbar-icon-btn" aria-label="Editar" onClick={() => openEdit(o)}><Pencil size={16} strokeWidth={1.5} /></button>
                        )}
                        {canCreateOrder() && (
                          <button className="navbar-icon-btn" aria-label="Facturar" onClick={() => setInvoiceOrder(o)} style={{ color: '#4f46e5' }}><FileText size={16} strokeWidth={1.5} /></button>
                        )}
                        {canForceDeleteOrder() && (
                          <button className="navbar-icon-btn" aria-label="Eliminar" onClick={() => setConfirmDelete(o.id)} style={{ color: '#dc2626', backgroundColor: '#fef2f2', borderRadius: 8, padding: 6 }}><Trash2 size={16} strokeWidth={1.5} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#8b95a1' }}>No se encontraron pedidos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar pedido"
        message="¿Estás seguro de que deseas eliminar este pedido? Las facturas vinculadas quedarán desvinculadas."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      <Modal isOpen={!!errorModal} onClose={() => setErrorModal('')} title={errorModal.includes('exitosamente') ? 'Éxito' : 'Error'}>
        <div style={{ color: errorModal.includes('exitosamente') ? '#047857' : '#b91c1c', fontSize: '0.92rem', lineHeight: 1.6 }}>{errorModal}</div>
      </Modal>

      {/* Modal Ver detalle */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Pedido ${selectedOrder?.orderNumber}`}>
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Cliente</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginTop: 4 }}>{selectedOrder.customerName}</div>
              </div>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Total</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginTop: 4 }}>{formatCOP(selectedOrder.totalAmount)}</div>
              </div>
            </div>
            {selectedOrder.deliveryAddress && (
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem' }}>
                <MapPin size={16} strokeWidth={1.5} color="#4f46e5" />
                <span style={{ color: 'var(--color-text-secondary)' }}><strong>Dirección de entrega:</strong> {selectedOrder.deliveryAddress}</span>
              </div>
            )}
            {selectedOrder.paymentMethod && (
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem' }}>
                <CreditCard size={16} strokeWidth={1.5} color="#10b981" />
                <span style={{ color: 'var(--color-text-secondary)' }}><strong>Método de pago:</strong> {selectedOrder.paymentMethod}</span>
              </div>
            )}
            {selectedOrder.deliveryPersonName && (
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem' }}>
                <Truck size={16} strokeWidth={1.5} color="#b45309" />
                <span style={{ color: 'var(--color-text-secondary)' }}><strong>Domiciliario:</strong> {selectedOrder.deliveryPersonName}</span>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 10 }}>Productos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedOrder.items.map((item: OrderItem) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.offerName ? <Tag size={12} strokeWidth={1.5} color="#8b5cf6" /> : null}
                      {item.productName || item.offerName} x{item.quantity}
                    </span>
                    <strong style={{ color: 'var(--color-text)', fontFamily: 'ui-monospace, monospace' }}>{formatCOP(item.subtotal || 0)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', minWidth: 120 }} onClick={() => setSelectedOrder(null)}>Cerrar</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', backgroundColor: '#7c3aed', minWidth: 120 }} onClick={() => printDeliveryNote(selectedOrder)}>
                <FileText size={16} strokeWidth={1.5} /> Imprimir entrega
              </button>
              {!isDomiciliario && (
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minWidth: 120 }} onClick={() => { setSelectedOrder(null); setInvoiceOrder(selectedOrder); }}>Facturar pedido</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Crear Pedido */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo pedido">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Cliente</label>
            <select className="form-control" value={createCustomerId} onChange={(e) => setCreateCustomerId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Selecciona un cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {createCustomerId && (
            <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={14} strokeWidth={1.5} color="#4f46e5" />
              <span><strong>Dirección de entrega:</strong> {customers.find((c) => c.id === createCustomerId)?.address || 'Sin dirección registrada'}</span>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Método de pago</label>
            <select className="form-control" value={createPaymentMethod} onChange={(e) => setCreatePaymentMethod(e.target.value)}>
              <option value="">Selecciona método de pago...</option>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ margin: 0 }}>Items del pedido</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={addProductItem}><Plus size={14} strokeWidth={1.5} /> Producto</button>
                <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={addOfferItem}><Plus size={14} strokeWidth={1.5} /> Combo</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {createItems.map((it, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 36px', gap: 8, alignItems: 'center' }}>
                  {it.type === 'product' ? (
                    <select className="form-control" value={it.id || ''} onChange={(e) => updateItem(idx, e.target.value ? Number(e.target.value) : undefined)}>
                      <option value="">Producto...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({formatCOP(p.price)})</option>
                      ))}
                    </select>
                  ) : (
                    <select className="form-control" value={it.id || ''} onChange={(e) => updateItem(idx, e.target.value ? Number(e.target.value) : undefined)}>
                      <option value="">Combo...</option>
                      {offers.map((o) => (
                        <option key={o.id} value={o.id}>{o.name} ({formatCOP(o.price)})</option>
                      ))}
                    </select>
                  )}
                  <input type="number" className="form-control" min={1} value={it.quantity} onChange={(e) => setCreateItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: Number(e.target.value) } : item)))} style={{ textAlign: 'center' }} />
                  <button className="navbar-icon-btn" style={{ color: '#ef4444', padding: 8 }} onClick={() => removeItem(idx)}><X size={16} strokeWidth={1.5} /></button>
                </div>
              ))}
              {createItems.length === 0 && (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '8px 0' }}>Agrega al menos un producto o combo</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCreate} disabled={createLoading || !createCustomerId || createItems.length === 0 || createItems.some((it) => !it.id)}>
              {createLoading ? 'Creando...' : 'Crear pedido'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Pedido */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar pedido">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Cliente</label>
            <select className="form-control" value={editCustomerId} onChange={(e) => setEditCustomerId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Selecciona un cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {editCustomerId && (
            <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={14} strokeWidth={1.5} color="#4f46e5" />
              <span><strong>Dirección de entrega:</strong> {customers.find((c) => c.id === editCustomerId)?.address || 'Sin dirección registrada'}</span>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Método de pago</label>
            <select className="form-control" value={editPaymentMethod} onChange={(e) => setEditPaymentMethod(e.target.value)}>
              <option value="">Selecciona método de pago...</option>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Domiciliario</label>
            <select className="form-control" value={editDeliveryPersonId} onChange={(e) => setEditDeliveryPersonId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Sin asignar</option>
              {users.filter((u) => u.role === 'DOMICILIARIO').map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Estado</label>
            <select className="form-control" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_PREPARACION">En preparación</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowEdit(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleEditSave} disabled={editLoading || !editCustomerId || !editStatus}>
              {editLoading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Facturar pedido */}
      <ConfirmModal
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
        onConfirm={handleInvoice}
        title="Facturar pedido"
        message={`¿Deseas crear una factura para el pedido ${invoiceOrder?.orderNumber} por ${formatCOP(invoiceOrder?.totalAmount || 0)}?`}
        confirmText="Facturar"
        cancelText="Cancelar"
        variant="primary"
      />

      {/* Modal Registrar Rechazo */}
      <RejectionModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        orderId={rejectOrderId}
        previousStatus={rejectPreviousStatus}
        items={rejectItems}
        onItemsChange={setRejectItems}
        onSuccess={(msg) => {
          setErrorModal(msg);
          invalidateCache('orders-');
          invalidateCache('seller-load-');
          refresh();
        }}
        onError={(msg) => setErrorModal(msg)}
      />

    </div>
  );
}
