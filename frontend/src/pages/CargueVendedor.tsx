import { useState, useEffect } from 'react';
import { Package, Plus, Loader2, Printer, History } from 'lucide-react';
import { sellerLoadApi, type SellerLoadItemCreate } from '../services/sellerLoadService';
import { productApi } from '../services/productService';
import { businessSettingsApi } from '../services/businessSettingsService';
import { useApiCache, invalidateCache } from '../hooks/useApiCache';
import Modal from '../components/Modal';
import '../styles/pages.css';

const UNIDADES = ['Docena', 'Display', 'Caja', 'Unidad'];

export default function CargueVendedor() {
  const { data: load, loading, error, refresh } = useApiCache('seller-load-today', () =>
    sellerLoadApi.getToday()
  );

  const { data: products } = useApiCache('products-all-cargue', () =>
    productApi.getAll({ size: 1000 })
  );

  const productList = products?.content ?? [];

  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('Docena');
  const [addLoading, setAddLoading] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [businessSettings, setBusinessSettings] = useState<{ businessName?: string }>({});

  useEffect(() => {
    businessSettingsApi.get()
      .then((s) => setBusinessSettings(s))
      .catch(() => setBusinessSettings({}));
  }, []);

  const isNotAvailable = error && (error as any)?.message?.includes('404');

  const handleAddItem = async () => {
    if (!selectedProduct || !quantity) return;
    try {
      setAddLoading(true);
      const item: SellerLoadItemCreate = {
        productId: Number(selectedProduct),
        quantityLoaded: Number(quantity),
        unitOfMeasure: unit,
      };
      await sellerLoadApi.addItems([item]);
      setShowAddItem(false);
      setSelectedProduct('');
      setQuantity('');
      setUnit('Docena');
      invalidateCache('seller-load-');
      refresh();
    } catch (err) {
      setErrorModal('Error: ' + (err as Error).message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleInitLoad = async () => {
    try {
      await sellerLoadApi.addItems([]);
      invalidateCache('seller-load-');
      refresh();
    } catch (err) {
      setErrorModal('Error: ' + (err as Error).message);
    }
  };

  const stats = {
    totalAvailable: load?.items.reduce((sum, it) => sum + it.quantityLoaded, 0) ?? 0,
    activeItems: load?.items.filter((it) => it.quantityLoaded > 0).length ?? 0,
  };

  const statCards = [
    { label: 'Disponible', value: `${stats.totalAvailable.toFixed(2)}`, icon: Package, color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Productos', value: `${stats.activeItems}`, icon: Package, color: '#10b981', bg: '#ecfdf5' },
  ];

  // Print current load (only available items, no prices)
  const handlePrintLoad = () => {
    const activeItems = load?.items.filter((it) => it.quantityLoaded > 0) ?? [];
    if (activeItems.length === 0) return;

    const printContent = `
      <html>
        <head><title>Hoja de Cargue</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30; border-bottom: 2px solid #333; padding-bottom: 20;">
            <h1 style="font-size: 24px; margin: 0 0 8px;">${businessSettings.businessName || 'Mi Negocio'}</h1>
            <h2 style="font-size: 18px; margin: 0; color: #555;">HOJA DE CARGUE DEL DOMICILIARIO</h2>
            <p style="margin: 8px 0 0; color: #777;">
              Fecha: ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #ccc; padding: 10px; text-align: left;">Producto</th>
                <th style="border: 1px solid #ccc; padding: 10px; text-align: center;">Cantidad</th>
                <th style="border: 1px solid #ccc; padding: 10px; text-align: center;">Unidad</th>
              </tr>
            </thead>
            <tbody>
              ${activeItems.map((it) => `
                <tr>
                  <td style="border: 1px solid #ccc; padding: 10px;">${it.productName}</td>
                  <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${it.quantityLoaded.toFixed(2)}</td>
                  <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${it.unitOfMeasure}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="display: flex; justify-content: space-between; margin-top: 60;">
            <div style="width: 45%; border-top: 1px solid #333; padding-top: 8;">
              <p style="text-align: center; font-size: 14px; margin: 0;">Firma del Domiciliario</p>
            </div>
            <div style="width: 45%; border-top: 1px solid #333; padding-top: 8;">
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

  // Print history (all items, no prices)
  const handlePrintHistory = () => {
    if (!load || load.items.length === 0) return;

    const printContent = `
      <html>
        <head><title>Historial de Entregas</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30; border-bottom: 2px solid #333; padding-bottom: 20;">
            <h1 style="font-size: 24px; margin: 0 0 8px;">${businessSettings.businessName || 'Mi Negocio'}</h1>
            <h2 style="font-size: 18px; margin: 0; color: #555;">HISTORIAL DE ENTREGAS Y RECHAZOS</h2>
            <p style="margin: 8px 0 0; color: #777;">
              Fecha: ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #ccc; padding: 10px; text-align: left;">Producto</th>
                <th style="border: 1px solid #ccc; padding: 10px; text-align: center;">Total cargado</th>
                <th style="border: 1px solid #ccc; padding: 10px; text-align: center;">Entregado</th>
                <th style="border: 1px solid #ccc; padding: 10px; text-align: center;">Rechazado</th>
                <th style="border: 1px solid #ccc; padding: 10px; text-align: center;">Disponible</th>
                <th style="border: 1px solid #ccc; padding: 10px; text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${load.items.map((it) => {
                const original = it.originalQuantityLoaded || it.quantityLoaded + it.quantityDelivered + it.quantityRejected;
                const hasRemaining = it.quantityLoaded > 0;
                const fullyDelivered = !hasRemaining && it.quantityRejected <= 0 && it.quantityDelivered > 0;
                const estado = hasRemaining ? 'Activo' : fullyDelivered ? 'Entregado' : 'Rechazado';
                return `
                  <tr>
                    <td style="border: 1px solid #ccc; padding: 10px;">${it.productName}</td>
                    <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${original.toFixed(2)}</td>
                    <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${it.quantityDelivered.toFixed(2)}</td>
                    <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${it.quantityRejected.toFixed(2)}</td>
                    <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${it.quantityLoaded.toFixed(2)}</td>
                    <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">${estado}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
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
          <h1>Mi cargue del día</h1>
          <p>Control de inventario cargado para ventas</p>
        </div>
      </div>

      {/* Backend not available message */}
      {isNotAvailable && (
        <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', color: '#92400e', fontSize: '0.92rem', marginBottom: 16, border: '1px solid #fcd34d' }}>
          <strong>⚠️ Sistema de cargue no disponible</strong><br />
          El módulo de cargue requiere reiniciar el backend para activarse. Guarda tus cambios y ejecuta:
          <code style={{ display: 'block', marginTop: 8, padding: '8px 12px', backgroundColor: '#fef3c7', borderRadius: 6, fontFamily: 'monospace' }}>taskkill /F /IM java.exe &amp;&amp; .\mvnw.cmd spring-boot:run</code>
        </div>
      )}

      {/* Error */}
      {error && !isNotAvailable && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Stats */}
      {!isNotAvailable && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {statCards.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-info">
                <span className="stat-label">{s.label}</span>
                <span className="stat-value">{loading ? '...' : s.value}</span>
              </div>
              <div className="stat-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                <s.icon size={20} strokeWidth={1.5} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No load yet */}
      {!loading && !load && !isNotAvailable && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Package size={48} strokeWidth={1} color="#d1d5db" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Sin cargue iniciado</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>Aún no has iniciado tu cargue de productos para hoy</p>
          <button className="btn btn-primary" onClick={handleInitLoad}>
            <Plus size={18} strokeWidth={1.5} /> Iniciar cargue del día
          </button>
        </div>
      )}

      {/* Productos cargados (solo disponibles) */}
      {load && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Productos cargados</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={handlePrintLoad}>
                <Printer size={16} strokeWidth={1.5} /> Imprimir cargue
              </button>
              <button className="btn btn-primary" onClick={() => setShowAddItem(true)}>
                <Plus size={16} strokeWidth={1.5} /> Agregar producto
              </button>
            </div>
          </div>

          {(() => {
            const activeItems = load.items.filter((it) => it.quantityLoaded > 0);
            return (
              <>
                {activeItems.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No tienes productos disponibles en tu cargue.
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th style={{ textAlign: 'right' }}>Cantidad</th>
                          <th style={{ textAlign: 'center' }}>Unidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeItems.map((it) => (
                          <tr key={it.id}>
                            <td><strong>{it.productName}</strong></td>
                            <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{it.quantityLoaded.toFixed(2)}</td>
                            <td style={{ textAlign: 'center' }}><span className="badge badge-info">{it.unitOfMeasure}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Historial de entregas y rechazos */}
      {load && load.items.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Historial de entregas</h2>
            <button className="btn btn-outline" onClick={handlePrintHistory}>
              <History size={16} strokeWidth={1.5} /> Imprimir historial
            </button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ textAlign: 'right' }}>Total cargado</th>
                  <th style={{ textAlign: 'right' }}>Entregado</th>
                  <th style={{ textAlign: 'right' }}>Rechazado</th>
                  <th style={{ textAlign: 'right' }}>Disponible</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {load.items.map((it) => {
                  const original = it.originalQuantityLoaded || it.quantityLoaded + it.quantityDelivered + it.quantityRejected;
                  const hasRemaining = it.quantityLoaded > 0;
                  const fullyDelivered = !hasRemaining && it.quantityRejected <= 0 && it.quantityDelivered > 0;
                  return (
                    <tr key={it.id}>
                      <td><strong>{it.productName}</strong></td>
                      <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{original.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', color: '#047857' }}>{it.quantityDelivered.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', color: '#b91c1c' }}>{it.quantityRejected.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{it.quantityLoaded.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
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
        </div>
      )}

      {/* Add item modal */}
      <Modal isOpen={showAddItem} onClose={() => setShowAddItem(false)} title="Agregar producto al cargue">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Producto</label>
            <select className="form-control" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Selecciona un producto...</option>
              {productList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Cantidad</label>
              <input type="number" className="form-control" value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ej: 2.5" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Unidad de medida</label>
              <select className="form-control" value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAddItem(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleAddItem} disabled={addLoading || !selectedProduct || !quantity}>
              {addLoading ? <Loader2 size={16} className="spin" /> : 'Agregar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!errorModal} onClose={() => setErrorModal('')} title="Error">
        <div style={{ color: '#b91c1c', fontSize: '0.92rem', lineHeight: 1.6 }}>{errorModal}</div>
      </Modal>
    </div>
  );
}
