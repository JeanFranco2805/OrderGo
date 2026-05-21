import { useState, useEffect } from 'react';
import { Store, Mail, Phone, MapPin, Save } from 'lucide-react';
import { businessSettingsApi, type BusinessSettings } from '../services/businessSettingsService';
import '../styles/pages.css';

export default function Configuracion() {
  const [form, setForm] = useState<BusinessSettings>({
    businessName: '',
    email: '',
    phone: '',
    address: '',
    currency: 'COP',
    tax: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    businessSettingsApi.get()
      .then((res) => setForm(res))
      .catch(() => setMessage('Error cargando configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await businessSettingsApi.save(form);
      setMessage('Configuración guardada exitosamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error guardando: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Cargando configuración...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Configuración</h1>
          <p>Ajustes generales del sistema</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={18} strokeWidth={1.5} /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: message.includes('Error') ? '#fef2f2' : '#ecfdf5', color: message.includes('Error') ? '#b91c1c' : '#047857', fontSize: '0.88rem', marginBottom: 16 }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Store size={20} strokeWidth={1.5} color="#4f46e5" />
            Información del negocio
          </div>
          <div className="form-group">
            <label>Nombre del negocio</label>
            <input name="businessName" className="form-control" value={form.businessName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Correo de contacto</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} strokeWidth={1.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b95a1' }} />
              <input name="email" className="form-control" value={form.email} onChange={handleChange} style={{ paddingLeft: '40px' }} />
            </div>
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} strokeWidth={1.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b95a1' }} />
              <input name="phone" className="form-control" value={form.phone} onChange={handleChange} style={{ paddingLeft: '40px' }} />
            </div>
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} strokeWidth={1.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b95a1' }} />
              <input name="address" className="form-control" value={form.address} onChange={handleChange} style={{ paddingLeft: '40px' }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Store size={20} strokeWidth={1.5} color="#4f46e5" />
            Configuración de facturación
          </div>
          <div className="form-group">
            <label>Moneda</label>
            <select name="currency" className="form-control" value={form.currency} onChange={handleChange}>
              <option value="COP">COP - Peso colombiano</option>
              <option value="USD">USD - Dólar estadounidense</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
          <div className="form-group">
            <label>Impuesto (%)</label>
            <input name="tax" type="number" className="form-control" value={form.tax} onChange={handleChange} />
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#eef2ff', marginTop: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Próximamente</div>
            <div style={{ fontWeight: 600, marginTop: '4px', fontSize: '0.9rem' }}>Integración con facturación electrónica (CFDI)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
