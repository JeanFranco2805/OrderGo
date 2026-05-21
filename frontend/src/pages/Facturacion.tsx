import { useState, useEffect } from 'react';
import { Plus, Search, Eye, DollarSign, ArrowDownCircle, CheckCircle2, Clock, AlertCircle, FileText, Trash2, Send, Printer } from 'lucide-react';
import { formatCOP } from '../utils/currency';
import { invoiceApi, type Invoice, type Payment } from '../services/invoiceService';
import { customerApi, type Customer } from '../services/customerService';
import { orderApi, type Order } from '../services/orderService';
import { discountApi, type Discount } from '../services/discountService';
import { getPaymentMethods } from '../services/paymentMethodService';
import { useApiCache, invalidateCache } from '../hooks/useApiCache';
import { useRole } from '../hooks/useRole';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import '../styles/pages.css';

function statusConfig(s: string) {
  switch (s) {
    case 'PAGADA': return { color: '#047857', bg: '#ecfdf5', icon: CheckCircle2, label: 'Pagada' };
    case 'PARCIAL': return { color: '#b45309', bg: '#fffbeb', icon: Clock, label: 'Parcial' };
    case 'PENDIENTE': return { color: '#4f46e5', bg: '#eef2ff', icon: AlertCircle, label: 'Pendiente' };
    default: return { color: '#4f46e5', bg: '#eef2ff', icon: AlertCircle, label: s };
  }
}

export default function Facturacion() {
  const { canCreate: canCreateInvoice, canForceDelete: canForceDeleteInvoice } = useRole();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const cacheKey = `invoices-${page}-${search}`;
  const { data, loading, error, refresh } = useApiCache(cacheKey, () =>
    invoiceApi.getAll({ search: search || undefined, page, size: pageSize })
  );
  const invoices = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [abonoModal, setAbonoModal] = useState<Invoice | null>(null);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [abonoMethod, setAbonoMethod] = useState('EFECTIVO');
  const [errorModal, setErrorModal] = useState('');

  // Create invoice modal
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [activeDiscounts, setActiveDiscounts] = useState<Discount[]>([]);
  const [createCustomerId, setCreateCustomerId] = useState<number | ''>('');
  const [createOrderId, setCreateOrderId] = useState<number | ''>('');
  const [createDate, setCreateDate] = useState(new Date().toISOString().split('T')[0]);
  const [createDiscountCode, setCreateDiscountCode] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Payment status on create
  const [paymentStatus, setPaymentStatus] = useState<'none' | 'full' | 'partial'>('none');
  const [partialAmount, setPartialAmount] = useState('');
  const [partialMethod, setPartialMethod] = useState('EFECTIVO');

  // Delete
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const [sendingIds, setSendingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setPage(0), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPending = invoices.filter((i) => i.status !== 'PAGADA').reduce((sum, i) => sum + i.balance, 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0);

  const openCreate = async () => {
    setShowCreate(true);
    setCreateCustomerId('');
    setCreateOrderId('');
    setCreateDate(new Date().toISOString().split('T')[0]);
    setCreateDiscountCode('');
    setPaymentStatus('none');
    setPartialAmount('');
    setPartialMethod('EFECTIVO');
    try {
      const [cData, dData, oData, iData] = await Promise.all([
        customerApi.getAll({ size: 1000 }),
        discountApi.getAll({ size: 1000 }),
        orderApi.getAll({ size: 1000 }),
        invoiceApi.getAll({ size: 10000 }),
      ]);
      setCustomers(cData.content);
      setActiveDiscounts(dData.content.filter((d) => d.active));
      setOrders(oData.content);
      setAllInvoices(iData.content);
    } catch (err) {
      setErrorModal('Error cargando datos: ' + (err as Error).message);
    }
  };

  const selectedOrder = orders.find((o) => o.id === createOrderId);
  const invoicedOrderIds = new Set(allInvoices.map((i) => i.orderId).filter(Boolean));
  const customerOrders = orders.filter((o) => o.customerId === createCustomerId && o.status !== 'CANCELADO' && !invoicedOrderIds.has(o.id));

  const handleCreate = async () => {
    if (!createCustomerId || !createOrderId) return;
    try {
      setCreateLoading(true);
      const invoice = await invoiceApi.create({
        customerId: Number(createCustomerId),
        invoiceDate: createDate,
        amount: 0,
        orderId: Number(createOrderId),
        discountCode: createDiscountCode || undefined,
      });

      if (paymentStatus === 'full' && invoice.id) {
        await invoiceApi.addPayment(invoice.id, {
          paymentDate: createDate,
          amount: invoice.amount,
          paymentMethod: partialMethod,
        });
      } else if (paymentStatus === 'partial' && invoice.id && partialAmount) {
        const amt = parseFloat(partialAmount);
        if (!isNaN(amt) && amt > 0 && amt <= invoice.amount) {
          await invoiceApi.addPayment(invoice.id, {
            paymentDate: createDate,
            amount: amt,
            paymentMethod: partialMethod,
          });
        }
      }

      setShowCreate(false);
      invalidateCache('invoices-');
      refresh();
    } catch (err) {
      setErrorModal('Error creando factura: ' + (err as Error).message);
    } finally {
      setCreateLoading(false);
    }
  };

  const invoicePayments = selectedInvoice?.payments || [];

  const handleAbono = async () => {
    if (!abonoModal || !abonoAmount) return;
    const amount = parseFloat(abonoAmount);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await invoiceApi.addPayment(abonoModal.id, { paymentDate: new Date().toISOString().split('T')[0], amount, paymentMethod: abonoMethod });
      invalidateCache('invoices-');
      refresh();
      setAbonoModal(null);
      setAbonoAmount('');
      setAbonoMethod('EFECTIVO');
    } catch (err) {
      setErrorModal('Error al registrar abono: ' + (err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await invoiceApi.delete(confirmDelete);
      invalidateCache('invoices-');
      refresh();
    } catch (err) {
      setErrorModal('Error eliminando factura: ' + (err as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const handleSendWhatsAppAuto = async (inv: Invoice) => {
    try {
      setSendingIds((prev) => new Set(prev).add(inv.id));

      if (isMobileDevice()) {
        // En móvil: abrir WhatsApp nativo con wa.me
        const preview = await invoiceApi.getWhatsAppMessage(inv.id);
        let phone = preview.phone.replace(/\D/g, '');
        if (!phone.startsWith('57') && phone.length === 10) {
          phone = '57' + phone;
        }
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(preview.message)}`;
        window.open(url, '_blank');
        setErrorModal('WhatsApp abierto. Revisa la app para enviar el mensaje.');
      } else {
        // En PC: envío automático vía bridge
        const res = await invoiceApi.sendWhatsApp(inv.id);
        if (res.success) {
          setErrorModal('Mensaje enviado exitosamente a ' + inv.customerName);
        } else {
          setErrorModal('Error enviando mensaje: ' + (res.error || 'Desconocido'));
        }
      }
    } catch (err) {
      setErrorModal('Error enviando mensaje: ' + (err as Error).message);
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(inv.id);
        return next;
      });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Facturación</h1>
          <p>Gestión de facturas, pagos y cuentas por cobrar</p>
        </div>
        {canCreateInvoice() && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} strokeWidth={1.5} /> Nueva factura
          </button>
        )}
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Total por cobrar</span>
            <span className="stat-value">{formatCOP(totalPending)}</span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
            <DollarSign size={20} strokeWidth={1.5} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Facturas pendientes</span>
            <span className="stat-value">{invoices.filter((i) => i.status !== 'PAGADA').length}</span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}>
            <ArrowDownCircle size={20} strokeWidth={1.5} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Total facturado (mes)</span>
            <span className="stat-value">{formatCOP(totalInvoiced)}</span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
            <DollarSign size={20} strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Search size={20} strokeWidth={1.5} color="#8b95a1" />
          <input type="text" className="form-control" placeholder="Buscar factura..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: '360px' }} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="invoice-table">
            <colgroup>
              <col className="col-id" /><col className="col-client" /><col className="col-date" />
              <col className="col-amount" /><col className="col-paid" /><col className="col-balance" />
              <col className="col-status" /><col className="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Factura</th><th>Cliente</th><th>Fecha</th>
                <th style={{ textAlign: 'right' }}>Monto total</th>
                <th style={{ textAlign: 'right' }}>Pagado</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-muted)' }}>Cargando facturas...</td></tr>
              ) : invoices.map((f) => {
                const st = statusConfig(f.status);
                const StatusIcon = st.icon;
                const progress = f.amount > 0 ? (f.paid / f.amount) * 100 : 0;
                return (
                  <tr key={f.id}>
                    <td>
                      <strong style={{ fontSize: '0.86rem', letterSpacing: '-0.2px' }}>{f.invoiceNumber}</strong>
                      {f.orderNumber && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FileText size={10} strokeWidth={1.5} /> Pedido: {f.orderNumber}
                        </div>
                      )}
                      {f.discountCode && (
                        <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: 2 }}>Descuento: {f.discountCode}</div>
                      )}
                      {f.paymentMethod && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <DollarSign size={10} strokeWidth={1.5} /> {f.paymentMethod}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 500, fontSize: '0.88rem' }}>{f.customerName}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{f.invoiceDate}</td>
                    <td className="num">{formatCOP(f.amount)}</td>
                    <td className="num">
                      <div>{formatCOP(f.paid)}</div>
                      {f.status !== 'PAGADA' && (
                        <div className="progress-mini"><div style={{ width: `${progress}%`, backgroundColor: progress > 50 ? '#10b981' : '#f59e0b' }} /></div>
                      )}
                    </td>
                    <td className="num" style={{ fontWeight: 700, color: f.status === 'PAGADA' ? '#047857' : '#b91c1c' }}>{formatCOP(f.balance)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', backgroundColor: st.bg, color: st.color }}>
                        <StatusIcon size={12} strokeWidth={2.5} />{st.label}
                      </span>
                    </td>
                    <td className="actions">
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button className="navbar-icon-btn" aria-label="Ver detalle" onClick={() => setSelectedInvoice(f)} style={{ padding: 6, borderRadius: 8, backgroundColor: 'var(--color-bg)' }}>
                          <Eye size={15} strokeWidth={1.5} />
                        </button>
                        {f.status !== 'PAGADA' && canCreateInvoice() && (
                          <button className="navbar-icon-btn" aria-label="Abonar" onClick={() => setAbonoModal(f)} style={{ padding: 6, borderRadius: 8, backgroundColor: '#ecfdf5', color: '#047857' }}>
                            <ArrowDownCircle size={15} strokeWidth={1.5} />
                          </button>
                        )}
                        {canForceDeleteInvoice() && (
                          <button className="navbar-icon-btn" aria-label="Eliminar" onClick={() => setConfirmDelete(f.id)} style={{ padding: 6, borderRadius: 8, backgroundColor: '#fef2f2', color: '#ef4444' }}>
                            <Trash2 size={15} strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && invoices.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 16px' }}>No se encontraron facturas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal isOpen={!!errorModal} onClose={() => setErrorModal('')} title={errorModal.includes('exitosamente') ? 'Éxito' : 'Error'}>
        <div style={{ color: errorModal.includes('exitosamente') ? '#047857' : '#b91c1c', fontSize: '0.92rem', lineHeight: 1.6 }}>{errorModal}</div>
      </Modal>

      {/* Modal Crear Factura */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva factura">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Cliente</label>
            <select className="form-control" value={createCustomerId} onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : '';
              setCreateCustomerId(id);
              setCreateOrderId('');
            }}>
              <option value="">Selecciona un cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {createCustomerId && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Pedido</label>
              <select className="form-control" value={createOrderId} onChange={(e) => setCreateOrderId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Selecciona un pedido...</option>
                {customerOrders.map((o) => (
                  <option key={o.id} value={o.id}>{o.orderNumber} — {formatCOP(o.totalAmount)}</option>
                ))}
              </select>
              {customerOrders.length === 0 && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Este cliente no tiene pedidos pendientes por facturar</div>}
            </div>
          )}

          {selectedOrder && (
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={16} strokeWidth={1.5} color="#4f46e5" />
              <span style={{ color: 'var(--color-text-secondary)' }}>Monto del pedido: <strong>{formatCOP(selectedOrder.totalAmount)}</strong></span>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fecha</label>
            <input type="date" className="form-control" value={createDate} onChange={(e) => setCreateDate(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Estado de pago</label>
            <select className="form-control" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as any)}>
              <option value="none">No pagado (saldo total)</option>
              <option value="full">Pagada (total)</option>
              <option value="partial">Parcial</option>
            </select>
          </div>

          {paymentStatus === 'partial' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Monto pagado</label>
                <input type="number" className="form-control" placeholder="0" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Método de pago</label>
                <select className="form-control" value={partialMethod} onChange={(e) => setPartialMethod(e.target.value)}>
                  {getPaymentMethods().map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {paymentStatus === 'full' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Método de pago</label>
              <select className="form-control" value={partialMethod} onChange={(e) => setPartialMethod(e.target.value)}>
                {getPaymentMethods().map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Descuento (opcional)</label>
            <select className="form-control" value={createDiscountCode} onChange={(e) => setCreateDiscountCode(e.target.value)}>
              <option value="">Sin descuento</option>
              {activeDiscounts.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.code} — {d.type === 'PERCENTAGE' ? `${d.value}%` : formatCOP(d.value)} {d.description ? `(${d.description})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCreate} disabled={createLoading || !createCustomerId || !createOrderId}>
              {createLoading ? 'Creando...' : 'Crear factura'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Ver detalle */}
      <Modal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title={`Factura ${selectedInvoice?.invoiceNumber}`}>
        {selectedInvoice && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Monto total</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text)', marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>{formatCOP(selectedInvoice.amount)}</div>
              </div>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Saldo pendiente</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: selectedInvoice.status === 'PAGADA' ? '#047857' : '#b91c1c', marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>{formatCOP(selectedInvoice.balance)}</div>
              </div>
            </div>
            {(selectedInvoice.taxAmount && selectedInvoice.taxAmount > 0) && (
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', marginBottom: 16, fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
                  <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{formatCOP(selectedInvoice.subtotal || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Impuesto</span>
                  <strong style={{ fontFamily: 'ui-monospace, monospace', color: '#f59e0b' }}>{formatCOP(selectedInvoice.taxAmount)}</strong>
                </div>
              </div>
            )}
            {selectedInvoice.orderNumber && (
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', marginBottom: 16, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} strokeWidth={1.5} color="#4f46e5" />
                <span style={{ color: 'var(--color-text-secondary)' }}>Pedido vinculado: <strong>{selectedInvoice.orderNumber}</strong></span>
              </div>
            )}
            {selectedInvoice.paymentMethod && (
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', marginBottom: 16, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={16} strokeWidth={1.5} color="#10b981" />
                <span style={{ color: 'var(--color-text-secondary)' }}>Método de pago del pedido: <strong>{selectedInvoice.paymentMethod}</strong></span>
              </div>
            )}

            {/* Actions inside detail modal */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', minWidth: 120 }} onClick={() => setSelectedInvoice(null)}>Cerrar</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minWidth: 120, backgroundColor: '#7c3aed' }} onClick={() => window.print()}>
                <Printer size={16} strokeWidth={1.5} /> Imprimir
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minWidth: 120, backgroundColor: '#10b981' }} onClick={() => selectedInvoice && handleSendWhatsAppAuto(selectedInvoice)} disabled={!!selectedInvoice && sendingIds.has(selectedInvoice.id)}>
                <Send size={16} strokeWidth={1.5} /> {selectedInvoice && sendingIds.has(selectedInvoice.id) ? 'Enviando...' : 'WhatsApp'}
              </button>
              {selectedInvoice.status !== 'PAGADA' && (
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minWidth: 120 }} onClick={() => { setSelectedInvoice(null); setAbonoModal(selectedInvoice); }}>
                  <DollarSign size={16} strokeWidth={1.5} /> Abonar
                </button>
              )}
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', minWidth: 120, backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => { setSelectedInvoice(null); setConfirmDelete(selectedInvoice.id); }}>
                <Trash2 size={16} strokeWidth={1.5} /> Eliminar
              </button>
            </div>

            <div style={{ marginBottom: 12, fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text)' }}>Historial de abonos</div>
            {invoicePayments.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No hay abonos registrados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {invoicePayments.map((p: Payment) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ArrowDownCircle size={16} strokeWidth={1.5} color="#10b981" />
                      <div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>{p.paymentDate}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{p.paymentMethod}</div>
                      </div>
                    </div>
                    <strong style={{ color: '#047857', fontFamily: 'ui-monospace, monospace' }}>+{formatCOP(p.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Abonar (used from detail) */}
      <Modal isOpen={!!abonoModal} onClose={() => { setAbonoModal(null); setAbonoAmount(''); setAbonoMethod('EFECTIVO'); }} title="Registrar abono">
        {abonoModal && (
          <div>
            <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', marginBottom: 20 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Factura: <strong style={{ color: 'var(--color-text)' }}>{abonoModal.invoiceNumber}</strong></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>Cliente: <strong style={{ color: 'var(--color-text)' }}>{abonoModal.customerName}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Monto total:</span><strong style={{ fontFamily: 'ui-monospace, monospace' }}>{formatCOP(abonoModal.amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Pagado:</span><strong style={{ color: '#047857', fontFamily: 'ui-monospace, monospace' }}>{formatCOP(abonoModal.paid)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Saldo pendiente:</span><strong style={{ color: '#b91c1c', fontFamily: 'ui-monospace, monospace' }}>{formatCOP(abonoModal.balance)}</strong>
              </div>
            </div>
            <div className="form-group">
              <label>Monto del abono</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={18} strokeWidth={1.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b95a1' }} />
                <input type="number" className="form-control" placeholder="0" value={abonoAmount} onChange={(e) => setAbonoAmount(e.target.value)} style={{ paddingLeft: '40px' }} min={1} step={1} max={abonoModal.balance} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 6 }}>Máximo permitido: {formatCOP(abonoModal.balance)}</div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Método de pago</label>
              <select className="form-control" value={abonoMethod} onChange={(e) => setAbonoMethod(e.target.value)}>
                {getPaymentMethods().map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setAbonoModal(null); setAbonoAmount(''); setAbonoMethod('EFECTIVO'); }}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleAbono}>Registrar abono</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar factura"
        message="¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
