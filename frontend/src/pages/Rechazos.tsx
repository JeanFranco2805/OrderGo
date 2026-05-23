import { useState, useEffect } from 'react';
import { AlertTriangle, Search, RefreshCw } from 'lucide-react';
import { orderRejectionApi, type OrderRejection } from '../services/orderRejectionService';
import '../styles/pages.css';

export default function Rechazos() {
  const [search, setSearch] = useState('');
  const [rejections, setRejections] = useState<OrderRejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRejections = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await orderRejectionApi.getAll();
      setRejections(data);
    } catch (err) {
      setError('Error cargando rechazos: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRejections();
  }, []);

  const filtered = rejections.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.orderNumber || '').toLowerCase().includes(q) ||
      (r.productName || '').toLowerCase().includes(q) ||
      (r.sellerUsername || '').toLowerCase().includes(q) ||
      (r.deliveryPersonUsername || '').toLowerCase().includes(q) ||
      (r.reason || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Seguimiento de Rechazos</h1>
          <p className="page-subtitle">Consulta los rechazos registrados por vendedores</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={16} strokeWidth={1.5} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              className="form-control"
              placeholder="Buscar por cliente, pedido, producto, vendedor, domiciliario o motivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>
          <button className="btn btn-outline" onClick={fetchRejections} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={16} strokeWidth={1.5} /> Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Cargando rechazos...</div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
              <AlertTriangle size={40} strokeWidth={1.5} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p>{search ? 'No hay rechazos que coincidan con la búsqueda.' : 'No hay rechazos registrados.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((r) => (
                <div key={r.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'center', padding: '16px 20px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Pedido</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{r.orderNumber || `#${r.orderId}`}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Cliente</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{r.customerName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Producto</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{r.productName || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Cantidad: {r.quantity}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Vendedor</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{r.sellerUsername || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Domiciliario: {r.deliveryPersonUsername || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Motivo</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{r.reason || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {r.rejectedAt ? new Date(r.rejectedAt).toLocaleDateString('es-CO') : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                      <AlertTriangle size={12} strokeWidth={2} style={{ marginRight: 4 }} />
                      Rechazado
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
