import { useState, useEffect } from 'react';
import { Package, Truck, AlertTriangle, RefreshCw, Users, ClipboardList, Search, Calendar, Trash2, Printer, DollarSign } from 'lucide-react';
import { sellerLoadApi, type AdminLoadReport, type SellerLoadItem } from '../services/sellerLoadService';
import { orderRejectionApi, type OrderRejection } from '../services/orderRejectionService';
import { orderMoneyReportApi, type DeliveryPersonMoneyReport } from '../services/orderMoneyReportService';
import { productApi, type Product } from '../services/productService';
import { formatCOP } from '../utils/currency';
import { getLocalDateString } from '../utils/date';
import Modal from '../components/Modal';
import '../styles/pages.css';
import Pagination from '../components/Pagination';

type TabKey = 'resumen' | 'productos' | 'rechazos';

export default function ControlCargue() {
  const [date, setDate] = useState(getLocalDateString());
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [report, setReport] = useState<AdminLoadReport[]>([]);
  const [rejections, setRejections] = useState<OrderRejection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ sellerId: number; username: string } | null>(null);

  // Money report modal
  const [showMoneyReport, setShowMoneyReport] = useState(false);
  const [moneyReportPeriod, setMoneyReportPeriod] = useState<'general' | 'month'>('general');
  const [moneyReportMonth, setMoneyReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [moneyReport, setMoneyReport] = useState<DeliveryPersonMoneyReport[]>([]);
  const [moneyReportLoading, setMoneyReportLoading] = useState(false);

  const pageSize = 8;
  const [resumenPage, setResumenPage] = useState(0);
  const [productosPage, setProductosPage] = useState(0);
  const [rechazosPage, setRechazosPage] = useState(0);

  // Reset page when tab changes
  useEffect(() => {
    setResumenPage(0);
    setProductosPage(0);
    setRechazosPage(0);
  }, [activeTab, date]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await sellerLoadApi.deleteLoad(confirmDelete.sellerId, date);
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      setError('Error eliminando cargue: ' + (err as Error).message);
      setConfirmDelete(null);
    }
  };

  const fetchMoneyReport = async () => {
    try {
      setMoneyReportLoading(true);
      const params: any = {};
      if (moneyReportPeriod === 'month') {
        const [y, m] = moneyReportMonth.split('-');
        params.year = Number(y);
        params.month = Number(m);
      }
      const data = await orderMoneyReportApi.getAll(params);
      setMoneyReport(data);
    } catch (err) {
      setError('Error cargando reporte: ' + (err as Error).message);
    } finally {
      setMoneyReportLoading(false);
    }
  };

  const printLoad = (r: AdminLoadReport) => {
    const load = r.load;
    const itemsHtml = load && load.items.length > 0
      ? load.items.map((item: SellerLoadItem) => {
          const original = item.originalQuantityLoaded || item.quantityLoaded + item.quantityDelivered + item.quantityRejected;
          return `
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 10px;">${item.productName}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${original}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${item.quantityDelivered}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${item.quantityRejected}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: right; font-weight: 600;">${Math.max(0, original - item.quantityDelivered - item.quantityRejected)}</td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #9ca3af;">No hay productos cargados</td></tr>';

    const printContent = `
      <html>
        <head><title>Cargue - ${r.sellerUsername}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; color: #1f2937;">
          <div style="text-align: center; border-bottom: 2px solid #111827; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px; color: #111827;">Control de Cargue</h1>
            <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">Fecha: ${date}</p>
          </div>

          <div style="margin-bottom: 24px; font-size: 0.95rem;">
            <p style="margin: 2px 0;"><strong>Domiciliario:</strong> ${r.sellerUsername}</p>
            <p style="margin: 2px 0;"><strong>Total cargado:</strong> ${(r.stats?.totalLoaded || 0).toFixed(3)} docenas</p>
            <p style="margin: 2px 0;"><strong>Total entregado:</strong> ${(r.stats?.totalDelivered || 0).toFixed(3)} docenas</p>
            <p style="margin: 2px 0;"><strong>Total rechazado:</strong> ${(r.stats?.totalRejected || 0).toFixed(3)} docenas</p>
            <p style="margin: 2px 0;"><strong>Restante:</strong> ${(r.stats?.totalRemaining || 0).toFixed(3)} docenas</p>
          </div>

          <h3 style="font-size: 1rem; margin: 20px 0 10px; color: #374151;">Detalle de productos</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left;">Producto</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">Cargado</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">Entregado</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">Rechazado</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: right;">Restante</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 60px; display: flex; justify-content: space-between;">
            <div style="width: 45%; border-top: 1px solid #333; padding-top: 8px;">
              <p style="text-align: center; font-size: 14px; margin: 0;">Firma del Domiciliario</p>
            </div>
            <div style="width: 45%; border-top: 1px solid #333; padding-top: 8px;">
              <p style="text-align: center; font-size: 14px; margin: 0;">Firma del Administrador</p>
            </div>
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

  const printProductosLoad = (r: AdminLoadReport) => {
    const load = r.load;
    const getPrice = (productId: number) => products.find((p) => p.id === productId)?.price ?? 0;

    const activeItems = load?.items.filter((it) => it.quantityLoaded > 0) ?? [];
    const historyItems = load?.items ?? [];

    const totalValue = activeItems.reduce((sum, it) => sum + it.quantityLoaded * getPrice(it.productId), 0);
    const totalDeliveredValue = historyItems.reduce((sum, it) => sum + it.quantityDelivered * getPrice(it.productId), 0);
    const totalRejectedValue = historyItems.reduce((sum, it) => sum + it.quantityRejected * getPrice(it.productId), 0);

    const activeHtml = activeItems.length > 0
      ? activeItems.map((item: SellerLoadItem) => {
          const price = getPrice(item.productId);
          const total = item.quantityLoaded * price;
          return `
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 10px;">${item.productName}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${item.quantityLoaded}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${item.unitOfMeasure}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: right;">${formatCOP(price)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: right; font-weight: 600;">${formatCOP(total)}</td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #9ca3af;">No hay productos disponibles</td></tr>';

    const historyHtml = historyItems.length > 0
      ? historyItems.map((item: SellerLoadItem) => {
          const original = item.originalQuantityLoaded || item.quantityLoaded + item.quantityDelivered + item.quantityRejected;
          const hasRemaining = item.quantityLoaded > 0;
          const fullyDelivered = !hasRemaining && item.quantityRejected <= 0 && item.quantityDelivered > 0;
          const estado = hasRemaining ? 'Activo' : fullyDelivered ? 'Entregado' : 'Rechazado';
          return `
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 10px;">${item.productName}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${original}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${item.quantityDelivered}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${item.quantityRejected}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${item.quantityLoaded}</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${estado}</td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="6" style="padding: 16px; text-align: center; color: #9ca3af;">No hay productos</td></tr>';

    const printContent = `
      <html>
        <head><title>Cargue - ${r.sellerUsername}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; color: #1f2937;">
          <div style="text-align: center; border-bottom: 2px solid #111827; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px; color: #111827;">Control de Cargue - Detalle</h1>
            <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">Fecha: ${date}</p>
          </div>

          <div style="margin-bottom: 24px; font-size: 0.95rem;">
            <p style="margin: 2px 0;"><strong>Domiciliario:</strong> ${r.sellerUsername}</p>
            <p style="margin: 2px 0;"><strong>Valor cargue disponible:</strong> ${formatCOP(totalValue)}</p>
            <p style="margin: 2px 0;"><strong>Valor entregado:</strong> ${formatCOP(totalDeliveredValue)}</p>
            <p style="margin: 2px 0;"><strong>Valor rechazado:</strong> ${formatCOP(totalRejectedValue)}</p>
          </div>

          <h3 style="font-size: 1rem; margin: 20px 0 10px; color: #374151;">Cargue actual (disponible)</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left;">Producto</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">Disponible</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">Unidad</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: right;">Precio unit.</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${activeHtml}</tbody>
            <tfoot>
              <tr style="font-weight: bold; background-color: #f9fafb;">
                <td colspan="4" style="border: 1px solid #e5e7eb; padding: 10px; text-align: right;">TOTAL CARGUE:</td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: right;">${formatCOP(totalValue)}</td>
              </tr>
            </tfoot>
          </table>

          <h3 style="font-size: 1rem; margin: 20px 0 10px; color: #374151;">Historial completo</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left;">Producto</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">Total cargado</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">Entregado</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">Rechazado</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">Disponible</th>
                <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>${historyHtml}</tbody>
          </table>

          <div style="margin-top: 60px; display: flex; justify-content: space-between;">
            <div style="width: 45%; border-top: 1px solid #333; padding-top: 8px;">
              <p style="text-align: center; font-size: 14px; margin: 0;">Firma del Domiciliario</p>
            </div>
            <div style="width: 45%; border-top: 1px solid #333; padding-top: 8px;">
              <p style="text-align: center; font-size: 14px; margin: 0;">Firma del Administrador</p>
            </div>
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [rData, rejData, pData] = await Promise.all([
        sellerLoadApi.getAdminReport(date),
        orderRejectionApi.getAll(),
        productApi.getAll({ size: 1000 }).catch(() => ({ content: [] as Product[] })),
      ]);
      setReport(rData);
      setRejections(rejData);
      setProducts(pData.content || []);
    } catch (err) {
      setError('Error cargando reporte: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  const filteredReport = report.filter((r) =>
    r.sellerUsername.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedResumen = filteredReport.slice(resumenPage * pageSize, (resumenPage + 1) * pageSize);
  const totalResumenPages = Math.ceil(filteredReport.length / pageSize) || 1;

  const paginatedProductos = filteredReport.slice(productosPage * pageSize, (productosPage + 1) * pageSize);
  const totalProductosPages = Math.ceil(filteredReport.length / pageSize) || 1;

  const paginatedRechazos = rejections.slice(rechazosPage * pageSize, (rechazosPage + 1) * pageSize);
  const totalRechazosPages = Math.ceil(rejections.length / pageSize) || 1;

  const totalLoaded = report.reduce((s, r) => s + (r.stats?.totalLoaded || 0), 0);
  const totalDelivered = report.reduce((s, r) => s + (r.stats?.totalDelivered || 0), 0);
  const totalRejected = report.reduce((s, r) => s + (r.stats?.totalRejected || 0), 0);
  const totalRemaining = report.reduce((s, r) => s + (r.stats?.totalRemaining || 0), 0);
  const totalDeliveredCustomers = report.reduce((s, r) => s + (r.deliveredCustomers || 0), 0);
  const totalRejectedCustomers = report.reduce((s, r) => s + (r.rejectedCustomers || 0), 0);

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'resumen', label: 'Resumen por domiciliario', icon: ClipboardList },
    { key: 'productos', label: 'Detalle de productos', icon: Package },
    { key: 'rechazos', label: 'Rechazos', icon: AlertTriangle },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Control de Cargue</h1>
          <p className="page-subtitle">Seguimiento de cargas, entregas y rechazos por domiciliario</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} strokeWidth={1.5} color="var(--color-text-muted)" />
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: 160 }}
              />
            </div>
            {activeTab === 'resumen' && (
              <div style={{ position: 'relative', width: 260 }}>
                <Search size={16} strokeWidth={1.5} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  className="form-control"
                  placeholder="Buscar domiciliario..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 38 }}
                />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => { setShowMoneyReport(true); fetchMoneyReport(); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <DollarSign size={16} strokeWidth={1.5} /> Reporte de dinero
            </button>
            <button className="btn btn-outline" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={16} strokeWidth={1.5} /> Actualizar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={20} strokeWidth={1.5} color="#4f46e5" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total cargado</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>{totalLoaded.toFixed(3)} docenas</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={20} strokeWidth={1.5} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total entregado</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>{totalDelivered.toFixed(3)} docenas</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} strokeWidth={1.5} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total rechazado</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>{totalRejected.toFixed(3)} docenas</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={20} strokeWidth={1.5} color="#0ea5e9" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Restante</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>{totalRemaining.toFixed(3)} docenas</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} strokeWidth={1.5} color="#047857" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Clientes atendidos</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>{totalDeliveredCustomers}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} strokeWidth={1.5} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Clientes rechazaron</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>{totalRejectedCustomers}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: isActive ? 'var(--color-bg)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                fontSize: '0.9rem',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: -9,
              }}
            >
              <Icon size={16} strokeWidth={1.5} />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Cargando...</div>
      ) : (
        <>
          {activeTab === 'resumen' && (
            <div>
              <div className="card" style={{ padding: 0, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text)' }}>Domiciliario</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text)' }}>Cargado (dz)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text)' }}>Entregado (dz)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text)' }}>Rechazado (dz)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text)' }}>Restante (dz)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--color-text)' }}>Clientes atendidos</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--color-text)' }}>Clientes rechazaron</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--color-text)' }}>Pedidos</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--color-text)' }}>Entregados</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--color-text)' }}>Rechazados</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--color-text)' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedResumen.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          No hay datos para la fecha seleccionada.
                        </td>
                      </tr>
                    ) : (
                      paginatedResumen.map((r) => (
                        <tr key={r.sellerId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text)' }}>{r.sellerUsername}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{(r.stats?.totalLoaded || 0).toFixed(3)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', color: '#047857' }}>{(r.stats?.totalDelivered || 0).toFixed(3)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', color: '#b91c1c' }}>{(r.stats?.totalRejected || 0).toFixed(3)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', color: '#0ea5e9' }}>{(r.stats?.totalRemaining || 0).toFixed(3)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>{r.deliveredCustomers}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: '#b91c1c' }}>{r.rejectedCustomers}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>{r.totalOrders}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: '#047857' }}>{r.deliveredOrders}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: '#b91c1c' }}>{r.rejectedOrders}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                className="navbar-icon-btn"
                                onClick={() => printLoad(r)}
                                style={{ color: '#4f46e5', backgroundColor: '#eef2ff', borderRadius: 8, padding: 6 }}
                                title="Imprimir cargue"
                              >
                                <Printer size={16} strokeWidth={1.5} />
                              </button>
                              <button
                                className="navbar-icon-btn"
                                onClick={() => setConfirmDelete({ sellerId: r.sellerId, username: r.sellerUsername })}
                                style={{ color: '#dc2626', backgroundColor: '#fef2f2', borderRadius: 8, padding: 6 }}
                                title="Eliminar cargue"
                              >
                                <Trash2 size={16} strokeWidth={1.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalResumenPages > 1 && (
                <div style={{ marginTop: 16 }}>
                  <Pagination page={resumenPage} totalPages={totalResumenPages} onChange={setResumenPage} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'productos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {paginatedProductos.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No hay datos para la fecha seleccionada.</div>
              ) : (
                paginatedProductos.map((r) => {
                  const getPrice = (productId: number) => products.find((p) => p.id === productId)?.price ?? 0;
                  const activeItems = r.load?.items.filter((it) => it.quantityLoaded > 0) ?? [];
                  const allItems = r.load?.items ?? [];
                  const totalValue = activeItems.reduce((sum, it) => sum + it.quantityLoaded * getPrice(it.productId), 0);
                  const totalDeliveredValue = allItems.reduce((sum, it) => sum + it.quantityDelivered * getPrice(it.productId), 0);
                  const totalRejectedValue = allItems.reduce((sum, it) => sum + it.quantityRejected * getPrice(it.productId), 0);
                  return (
                    <div key={r.sellerId} className="card" style={{ padding: 0, overflow: 'auto' }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, color: 'var(--color-text)', backgroundColor: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{r.sellerUsername}</span>
                        <button
                          className="navbar-icon-btn"
                          onClick={() => printProductosLoad(r)}
                          style={{ color: '#4f46e5', backgroundColor: '#eef2ff', borderRadius: 8, padding: 6 }}
                          title="Imprimir cargue"
                        >
                          <Printer size={16} strokeWidth={1.5} />
                        </button>
                      </div>

                      {/* Money summary cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600, textTransform: 'uppercase' }}>Cargue disponible</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4f46e5', marginTop: 4 }}>{formatCOP(totalValue)}</div>
                        </div>
                        <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600, textTransform: 'uppercase' }}>Valor entregado</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#047857', marginTop: 4 }}>{formatCOP(totalDeliveredValue)}</div>
                        </div>
                        <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>Valor rechazado</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#dc2626', marginTop: 4 }}>{formatCOP(totalRejectedValue)}</div>
                        </div>
                      </div>

                      {/* Cargue actual (disponible) */}
                      {activeItems.length > 0 && (
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
                          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Cargue actual
                          </h3>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Producto</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Disponible</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Precio unit.</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Total</th>
                                <th style={{ padding: '10px 16px', textAlign: 'center' }}>Unidad</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeItems.map((item: SellerLoadItem) => {
                                const price = getPrice(item.productId);
                                const total = item.quantityLoaded * price;
                                return (
                                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '10px 16px' }}><strong>{item.productName}</strong></td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{item.quantityLoaded}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>{formatCOP(price)}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{formatCOP(total)}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'center' }}><span className="badge badge-info">{item.unitOfMeasure}</span></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr style={{ backgroundColor: 'var(--color-bg)', fontWeight: 700 }}>
                                <td colSpan={3} style={{ padding: '10px 16px', textAlign: 'right' }}>TOTAL CARGUE:</td>
                                <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-accent)' }}>{formatCOP(totalValue)}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {/* Historial completo */}
                      {r.load && r.load.items.length > 0 ? (
                        <div style={{ padding: '16px' }}>
                          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Historial
                          </h3>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Producto</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Total cargado</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Entregado</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Rechazado</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Disponible</th>
                                <th style={{ padding: '10px 16px', textAlign: 'center' }}>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.load.items.map((item: SellerLoadItem) => {
                                const original = item.originalQuantityLoaded || item.quantityLoaded + item.quantityDelivered + item.quantityRejected;
                                const hasRemaining = item.quantityLoaded > 0;
                                const fullyDelivered = !hasRemaining && item.quantityRejected <= 0 && item.quantityDelivered > 0;
                                return (
                                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '10px 16px' }}><strong>{item.productName}</strong></td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{original}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', color: '#047857' }}>{item.quantityDelivered}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', color: '#b91c1c' }}>{item.quantityRejected}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{item.quantityLoaded}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                      {hasRemaining ? (
                                        <span className="badge badge-info">Activo</span>
                                      ) : fullyDelivered ? (
                                        <span className="badge badge-success">Entregado</span>
                                      ) : (
                                        <span className="badge badge-danger">Rechazado</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                          No tiene carga registrada para esta fecha.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {totalProductosPages > 1 && (
                <div style={{ marginTop: 8 }}>
                  <Pagination page={productosPage} totalPages={totalProductosPages} onChange={setProductosPage} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'rechazos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paginatedRechazos.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                  <AlertTriangle size={40} strokeWidth={1.5} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p>No hay rechazos registrados.</p>
                </div>
              ) : (
                paginatedRechazos.map((rej) => (
                  <div key={rej.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'center', padding: '16px 20px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Pedido</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{rej.orderNumber || `#${rej.orderId}`}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Cliente</div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{rej.customerName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Producto</div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{rej.productName || '—'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Cantidad: {rej.quantity}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Vendedor</div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{rej.sellerUsername || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Domiciliario</div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{rej.deliveryPersonUsername || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Motivo</div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{rej.reason || '—'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {rej.rejectedAt ? new Date(rej.rejectedAt).toLocaleDateString('es-CO') : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                        <AlertTriangle size={12} strokeWidth={2} style={{ marginRight: 4 }} />
                        Rechazado
                      </div>
                    </div>
                  </div>
                ))
              )}
              {totalRechazosPages > 1 && (
                <div style={{ marginTop: 8 }}>
                  <Pagination page={rechazosPage} totalPages={totalRechazosPages} onChange={setRechazosPage} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setConfirmDelete(null)}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: 24, width: '100%', maxWidth: 420,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', margin: 16,
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: 'var(--color-text)' }}>Confirmar eliminación</h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              ¿Estás seguro de eliminar el cargue de <strong>{confirmDelete.username}</strong> para la fecha <strong>{date}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reporte de Dinero */}
      <Modal isOpen={showMoneyReport} onClose={() => setShowMoneyReport(false)} title="Reporte de dinero por domiciliario" wide>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Período:</label>
              <select
                className="form-control"
                value={moneyReportPeriod}
                onChange={(e) => setMoneyReportPeriod(e.target.value as 'general' | 'month')}
                style={{ width: 140 }}
              >
                <option value="general">General (todo)</option>
                <option value="month">Por mes</option>
              </select>
            </div>
            {moneyReportPeriod === 'month' && (
              <input
                type="month"
                className="form-control"
                value={moneyReportMonth}
                onChange={(e) => setMoneyReportMonth(e.target.value)}
                style={{ width: 160 }}
              />
            )}
            <button className="btn btn-primary" onClick={fetchMoneyReport} disabled={moneyReportLoading} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
              {moneyReportLoading ? 'Cargando...' : 'Generar'}
            </button>
          </div>

          {moneyReport.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {moneyReport.map((r) => (
                  <div key={r.deliveryPersonId} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>{r.deliveryPersonName}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#047857', fontWeight: 600 }}>Entregado</span>
                      <span style={{ fontWeight: 700, color: '#047857' }}>{formatCOP(r.deliveredValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#b91c1c', fontWeight: 600 }}>Rechazado</span>
                      <span style={{ fontWeight: 700, color: '#b91c1c' }}>{formatCOP(r.rejectedValue)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                      <span style={{ fontWeight: 700 }}>TOTAL</span>
                      <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{formatCOP(r.totalValue)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 16, backgroundColor: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>TOTAL GENERAL</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                  {formatCOP(moneyReport.reduce((sum, r) => sum + r.totalValue, 0))}
                </span>
              </div>
            </>
          )}

          {moneyReport.length === 0 && !moneyReportLoading && (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>No hay datos para mostrar.</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
