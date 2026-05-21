import { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, Trash2, Eye, Pencil, MapPin } from 'lucide-react';
import { customerApi, type Customer } from '../services/customerService';
import { userApi, type User } from '../services/userService';
import { useApiCache, invalidateCache } from '../hooks/useApiCache';
import { useRole } from '../hooks/useRole';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import AddressInput from '../components/AddressInput';
import '../styles/pages.css';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const FRECUENCIAS = ['Semanal', 'Quincenal', 'Mensual'];

export default function Clientes() {
  const { canCreate: canCreateClient, canEdit: canEditClient, canForceDelete: canForceDeleteClient } = useRole();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const cacheKey = `customers-${page}-${search}`;
  const { data, loading, error, refresh } = useApiCache(cacheKey, () =>
    customerApi.getAll({ search: search || undefined, page, size: pageSize })
  );
  const clients = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Customer>>({ name: '', email: '', phone: '', address: '', visitDay: '', zone: '', visitFrequency: '' });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState('');

  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editClient, setEditClient] = useState<Partial<Customer>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [sellers, setSellers] = useState<User[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(0), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadSellers = async () => {
    try {
      const data = await userApi.getAll({ size: 1000 });
      setSellers(data.content.filter((u) => u.role === 'VENDEDOR'));
    } catch {
      // silent
    }
  };

  const handleCreate = async () => {
    if (!newClient.name || !newClient.email) return;
    try {
      await customerApi.create(newClient as Omit<Customer, 'id'>);
      setShowModal(false);
      setNewClient({ name: '', email: '', phone: '', address: '', visitDay: '', zone: '', visitFrequency: '' });
      invalidateCache('customers-');
      refresh();
    } catch (err) {
      setErrorModal('Error: ' + (err as Error).message);
    }
  };

  const openEdit = (c: Customer) => {
    setEditClient({ ...c });
    setShowEdit(true);
    loadSellers();
  };

  const handleEditSave = async () => {
    if (!editClient.id || !editClient.name || !editClient.email) return;
    try {
      setEditLoading(true);
      await customerApi.update(editClient.id, editClient as Omit<Customer, 'id'>);
      setShowEdit(false);
      invalidateCache('customers-');
      invalidateCache('orders-');
      refresh();
    } catch (err) {
      setErrorModal('Error: ' + (err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDelete(id);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await customerApi.delete(confirmDelete);
      invalidateCache('customers-');
      refresh();
    } catch (err) {
      setErrorModal('Error: ' + (err as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>Gestiona tu base de clientes</p>
        </div>
        {canCreateClient() && (
          <button className="btn btn-primary" onClick={() => { loadSellers(); setShowModal(true); }}>
            <Plus size={18} strokeWidth={1.5} /> Nuevo cliente
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Search size={20} strokeWidth={1.5} color="#8b95a1" />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '320px' }}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Zona / Barrio</th>
                <th>Día de visita</th>
                <th>Vendedor</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Cargando clientes...</td></tr>
              ) : clients.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} strokeWidth={1.5} color="#8b95a1" />
                        <span style={{ fontSize: '0.85rem' }}>{c.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} strokeWidth={1.5} color="#8b95a1" />
                        <span style={{ fontSize: '0.85rem' }}>{c.phone || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} strokeWidth={1.5} color="#8b95a1" />
                      <span style={{ fontSize: '0.85rem' }}>{c.zone || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                      {c.visitDay ? (
                        c.visitDay.split(',').map((d, i) => (
                          <span key={i} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 99, backgroundColor: '#f0f9ff', color: '#0ea5e9', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {d.trim()}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#8b95a1' }}>—</span>
                      )}
                      {c.visitFrequency && (
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, backgroundColor: '#ecfdf5', color: '#10b981', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.visitFrequency}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem' }}>{c.sellerName || '—'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button className="navbar-icon-btn" aria-label="Ver" onClick={() => setSelectedClient(c)} style={{ padding: 6, borderRadius: 8, backgroundColor: 'var(--color-bg)' }}><Eye size={15} strokeWidth={1.5} /></button>
                      {canEditClient() && (
                        <button className="navbar-icon-btn" aria-label="Editar" onClick={() => openEdit(c)} style={{ padding: 6, borderRadius: 8, backgroundColor: '#eef2ff', color: '#4f46e5' }}><Pencil size={15} strokeWidth={1.5} /></button>
                      )}
                      {canForceDeleteClient() && (
                        <button className="navbar-icon-btn" aria-label="Eliminar" onClick={() => handleDelete(c.id)} style={{ padding: 6, borderRadius: 8, backgroundColor: '#fef2f2', color: '#ef4444' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && clients.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#8b95a1' }}>No se encontraron clientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Eliminar cliente"
        message="¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      <Modal isOpen={!!errorModal} onClose={() => setErrorModal('')} title="Error">
        <div style={{ color: '#b91c1c', fontSize: '0.92rem', lineHeight: 1.6 }}>{errorModal}</div>
      </Modal>

      {/* Modal Ver detalle */}
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
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Día de visita</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedClient.visitDay || '—'}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Frecuencia</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedClient.visitFrequency || '—'}</div>
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Vendedor encargado</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedClient.sellerName || '—'}</div>
            </div>
            <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setSelectedClient(null)}>Cerrar</button>
          </div>
        )}
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar cliente">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Nombre</label>
            <input className="form-control" value={editClient.name || ''} onChange={(e) => setEditClient({ ...editClient, name: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Correo electrónico</label>
            <input className="form-control" type="email" value={editClient.email || ''} onChange={(e) => setEditClient({ ...editClient, email: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Teléfono</label>
            <input className="form-control" value={editClient.phone || ''} onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })} />
          </div>
          <AddressInput value={editClient.address || ''} onChange={(addr) => setEditClient({ ...editClient, address: addr })} label="Dirección" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Zona / Barrio</label>
              <input className="form-control" value={editClient.zone || ''} onChange={(e) => setEditClient({ ...editClient, zone: e.target.value })} placeholder="Ej: Boston, Las Moras" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Frecuencia de visita</label>
              <select className="form-control" value={editClient.visitFrequency || ''} onChange={(e) => setEditClient({ ...editClient, visitFrequency: e.target.value })}>
                <option value="">Selecciona...</option>
                {FRECUENCIAS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Días de visita (selecciona todos los que apliquen)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 6 }}>
              {DIAS_SEMANA.map((d) => {
                const selected = (editClient.visitDay || '').split(',').filter(Boolean).map((x) => x.trim());
                const isChecked = selected.includes(d);
                return (
                  <label
                    key={d}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isChecked ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      backgroundColor: isChecked ? '#eef2ff' : 'var(--color-surface)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = isChecked
                          ? selected.filter((s) => s !== d)
                          : [...selected, d];
                        setEditClient({ ...editClient, visitDay: next.join(',') });
                      }}
                      style={{ width: 16, height: 16, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                    />
                    {d}
                  </label>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Frecuencia de visita</label>
              <select className="form-control" value={editClient.visitFrequency || ''} onChange={(e) => setEditClient({ ...editClient, visitFrequency: e.target.value })}>
                <option value="">Selecciona...</option>
                {FRECUENCIAS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Vendedor encargado</label>
              <select className="form-control" value={editClient.sellerId ?? ''} onChange={(e) => setEditClient({ ...editClient, sellerId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Sin asignar</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>{s.username}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowEdit(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleEditSave} disabled={editLoading}>Guardar cambios</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo cliente">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Nombre</label>
            <input className="form-control" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Correo electrónico</label>
            <input className="form-control" type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Teléfono</label>
            <input className="form-control" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
          </div>
          <AddressInput value={newClient.address || ''} onChange={(addr) => setNewClient({ ...newClient, address: addr })} label="Dirección" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Zona / Barrio</label>
              <input className="form-control" value={newClient.zone || ''} onChange={(e) => setNewClient({ ...newClient, zone: e.target.value })} placeholder="Ej: Boston, Las Moras" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Frecuencia de visita</label>
              <select className="form-control" value={newClient.visitFrequency || ''} onChange={(e) => setNewClient({ ...newClient, visitFrequency: e.target.value })}>
                <option value="">Selecciona...</option>
                {FRECUENCIAS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Días de visita (selecciona todos los que apliquen)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 6 }}>
              {DIAS_SEMANA.map((d) => {
                const selected = (newClient.visitDay || '').split(',').filter(Boolean).map((x) => x.trim());
                const isChecked = selected.includes(d);
                return (
                  <label
                    key={d}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isChecked ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      backgroundColor: isChecked ? '#eef2ff' : 'var(--color-surface)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = isChecked
                          ? selected.filter((s) => s !== d)
                          : [...selected, d];
                        setNewClient({ ...newClient, visitDay: next.join(',') });
                      }}
                      style={{ width: 16, height: 16, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                    />
                    {d}
                  </label>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Vendedor encargado</label>
              <select className="form-control" value={newClient.sellerId ?? ''} onChange={(e) => setNewClient({ ...newClient, sellerId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Sin asignar</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>{s.username}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCreate}>Guardar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
