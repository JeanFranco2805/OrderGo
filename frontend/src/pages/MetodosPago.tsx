import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { getPaymentMethods, savePaymentMethods } from '../services/paymentMethodService';
import '../styles/pages.css';

export default function MetodosPago() {
  const [methods, setMethods] = useState<string[]>([]);
  const [newMethod, setNewMethod] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMethods(getPaymentMethods());
  }, []);

  const addMethod = () => {
    const trimmed = newMethod.trim().toUpperCase();
    if (!trimmed) return;
    if (methods.includes(trimmed)) {
      setError('Este método de pago ya existe.');
      return;
    }
    const updated = [...methods, trimmed];
    setMethods(updated);
    savePaymentMethods(updated);
    setNewMethod('');
    setError('');
  };

  const removeMethod = (m: string) => {
    const updated = methods.filter((x) => x !== m);
    setMethods(updated);
    savePaymentMethods(updated);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Métodos de pago</h1>
          <p>Administra los métodos de pago disponibles para abonos y facturas</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', color: '#b45309', fontSize: '0.88rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} strokeWidth={1.5} />
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Nuevo método de pago</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: BANCOLOMBIA, DAVIPLATA..."
              value={newMethod}
              onChange={(e) => setNewMethod(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addMethod(); }}
            />
          </div>
          <button className="btn btn-primary" onClick={addMethod}>
            <Plus size={18} strokeWidth={1.5} /> Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Método de pago</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ padding: 8, borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', color: '#4f46e5' }}>
                        <CreditCard size={16} strokeWidth={1.5} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>{m}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="navbar-icon-btn" aria-label="Eliminar" onClick={() => removeMethod(m)} style={{ padding: 6, borderRadius: 8, backgroundColor: '#fef2f2', color: '#ef4444' }}>
                      <Trash2 size={15} strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              ))}
              {methods.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 16px' }}>
                    No hay métodos de pago configurados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
