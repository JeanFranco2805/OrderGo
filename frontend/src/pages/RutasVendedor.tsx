import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Mail, Navigation, Calendar, ShoppingCart } from 'lucide-react';
import { customerApi, type Customer } from '../services/customerService';
import { useApiCache } from '../hooks/useApiCache';
import Modal from '../components/Modal';
import '../styles/pages.css';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function RutasVendedor() {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState<string>('Lunes');
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);

  const { data: customers, loading, error } = useApiCache(
    `my-customers-routes`,
    () => customerApi.getMyCustomers()
  );

  // Filter clients whose visitDay includes the selected day
  const clientList = (customers ?? []).filter((c) => {
    const days = (c.visitDay || '').split(',').map((d) => d.trim());
    return days.includes(selectedDay);
  });

  // Group by zone
  const byZone: Record<string, Customer[]> = {};
  for (const c of clientList) {
    const zone = c.zone || 'Sin zona';
    if (!byZone[zone]) byZone[zone] = [];
    byZone[zone].push(c);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Mis rutas de visita</h1>
          <p>Clientes organizados por día y zona</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Day selector */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DIAS_SEMANA.map((d) => (
            <button
              key={d}
              className={selectedDay === d ? 'btn btn-primary' : 'btn btn-outline'}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              onClick={() => setSelectedDay(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Clients by zone */}
      {loading ? (
        <div className="page-placeholder">
          <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Cargando clientes...</p>
        </div>
      ) : clientList.length === 0 ? (
        <div className="page-placeholder">
          <Calendar size={48} strokeWidth={1} color="#d1d5db" />
          <h2>Sin clientes para {selectedDay}</h2>
          <p>No tienes clientes asignados para visitar este día</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(byZone).map(([zone, zoneCustomers]) => (
            <div key={zone} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Navigation size={18} strokeWidth={1.5} color="#4f46e5" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>{zone}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{zoneCustomers.length} cliente(s)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {zoneCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClient(c)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>{c.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      <Phone size={12} strokeWidth={1.5} />
                      {c.phone || '—'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      <Mail size={12} strokeWidth={1.5} />
                      {c.email}
                    </div>
                    {c.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        <MapPin size={12} strokeWidth={1.5} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</span>
                      </div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, backgroundColor: '#f0f9ff', color: '#0ea5e9', fontWeight: 600 }}>
                        {c.visitFrequency || 'Sin frecuencia'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client detail modal */}
      <Modal isOpen={!!selectedClient} onClose={() => setSelectedClient(null)} title={selectedClient?.name || 'Cliente'}>
        {selectedClient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Correo</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedClient.email}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Teléfono</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedClient.phone || '—'}</div>
              </div>
            </div>
            {selectedClient.address && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <strong>Dirección:</strong> {selectedClient.address}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Zona / Barrio</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedClient.zone || '—'}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Días de visita</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, justifyContent: 'center' }}>
                  {selectedClient.visitDay ? (
                    selectedClient.visitDay.split(',').map((d, i) => (
                      <span key={i} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 99, backgroundColor: '#f0f9ff', color: '#0ea5e9', fontWeight: 600 }}>{d.trim()}</span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>—</span>
                  )}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Frecuencia</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedClient.visitFrequency || '—'}</div>
              </div>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                if (!selectedClient) return;
                navigate('/pedidos', { state: { preselectedCustomerId: selectedClient.id } });
              }}
            >
              <ShoppingCart size={16} strokeWidth={1.5} /> Tomar pedido
            </button>
            <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setSelectedClient(null)}>Cerrar</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
