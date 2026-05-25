import { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, Trash2, Eye, Pencil, MapPin, Download, Crosshair } from 'lucide-react';
import { customerApi, type Customer } from '../services/customerService';
import { userApi, type User } from '../services/userService';
import { useApiCache, invalidateCache } from '../hooks/useApiCache';
import { useRole } from '../hooks/useRole';
import { getLocalDateString } from '../utils/date';
import { exportToExcel } from '../utils/exportExcel';
import { reverseGeocode } from '../services/geocodeService';
import { getPrimaryKey } from '../services/maptilerKeys';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import 'leaflet/dist/leaflet.css';
import '../styles/pages.css';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultPin = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const FRECUENCIAS = ['Semanal', 'Quincenal', 'Mensual'];

export default function Clientes() {
  const { canCreate: canCreateClient, canEdit: canEditClient, canForceDelete: canForceDeleteClient, isVendedor, isAdmin } = useRole();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const cacheKey = isVendedor ? `my-customers-${search}` : `customers-${page}-${search}`;
  const { data, loading, error, refresh } = useApiCache(cacheKey, () =>
    isVendedor
      ? customerApi.getMyCustomers({}).then((res) => ({
          content: res.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase())),
          totalPages: 1,
          totalElements: res.length,
          number: 0,
          size: res.length,
        }))
      : customerApi.getAll({ search: search || undefined, page, size: pageSize })
  );
  const clients = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Customer>>({ name: '', email: '', phone: '', addressLabel: '', visitDay: '', zone: '', visitFrequency: '' });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState('');

  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editClient, setEditClient] = useState<Partial<Customer>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [sellers, setSellers] = useState<User[]>([]);

  // Map pin modal state
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapClient, setMapClient] = useState<Customer | null>(null);
  const [mapLat, setMapLat] = useState<number>(10.9685);
  const [mapLng, setMapLng] = useState<number>(-74.7813);
  const [mapAddress, setMapAddress] = useState('');
  const [mapLoading, setMapLoading] = useState(false);

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

  const handleExport = async () => {
    try {
      const all = isVendedor
        ? await customerApi.getMyCustomers({})
        : (await customerApi.getAll({ size: 1000 })).content;
      const rows = all.map((c) => [
        c.id,
        c.name,
        c.email,
        c.phone || '',
        c.addressLabel || c.address || '',
        c.zone || '',
        c.visitDay || '',
        c.visitFrequency || '',
        c.sellerName || '',
      ]);
      exportToExcel(
        [
          {
            name: 'Clientes',
            headers: ['ID', 'Nombre', 'Email', 'Teléfono', 'Dirección', 'Zona / Barrio', 'Días de visita', 'Frecuencia', 'Vendedor'],
            rows,
          },
        ],
        `clientes_ordergo_${getLocalDateString()}.xlsx`
      );
    } catch {
      setErrorModal('Error exportando clientes');
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
      setConfirmDelete(null);
      invalidateCache('customers-');
      refresh();
    } catch {
      setErrorModal('Error al eliminar cliente');
    }
  };

  const openMapModal = (c: Customer) => {
    setMapClient(c);
    setMapLat(c.latitude ?? 10.9685);
    setMapLng(c.longitude ?? -74.7813);
    setMapAddress(c.address || '');
    setShowMapModal(true);
  };

  const handleMapSave = async () => {
    if (!mapClient) return;
    try {
      setMapLoading(true);
      await customerApi.updateLocation(mapClient.id, {
        latitude: mapLat,
        longitude: mapLng,
        address: mapAddress || mapClient.address,
      });
      setShowMapModal(false);
      invalidateCache('customers-');
      refresh();
    } catch (err) {
      setErrorModal('Error guardando ubicación: ' + (err as Error).message);
    } finally {
      setMapLoading(false);
    }
  };

  function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
    useMapEvents({
      click(e) {
        onClick(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>Gestiona tu base de clientes</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button className="btn btn-outline" onClick={handleExport}>
              <Download size={18} strokeWidth={1.5} /> Exportar Excel
            </button>
          )}
          {canCreateClient() && (
            <button className="btn btn-primary" onClick={() => { loadSellers(); setShowModal(true); }}>
              <Plus size={18} strokeWidth={1.5} /> Nuevo cliente
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
                      {canEditClient() && !isVendedor && (
                        <button className="navbar-icon-btn" aria-label="Editar" onClick={() => openEdit(c)} style={{ padding: 6, borderRadius: 8, backgroundColor: '#eef2ff', color: '#4f46e5' }}><Pencil size={15} strokeWidth={1.5} /></button>
                      )}
                      {canEditClient() && (
                        <button className="navbar-icon-btn" aria-label="Ubicar en mapa" onClick={() => openMapModal(c)} style={{ padding: 6, borderRadius: 8, backgroundColor: '#ecfdf5', color: '#10b981' }}><Crosshair size={15} strokeWidth={1.5} /></button>
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
            {selectedClient.addressLabel && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <strong>Dirección para el domiciliario:</strong> {selectedClient.addressLabel}
              </div>
            )}
            {(selectedClient.latitude !== undefined && selectedClient.longitude !== undefined) && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <strong>Ubicación GPS:</strong> {selectedClient.latitude.toFixed(6)}, {selectedClient.longitude.toFixed(6)}
              </div>
            )}
            {selectedClient.address && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: '#f8fafc', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                <strong>Dirección del mapa:</strong> {selectedClient.address}
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
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Dirección para el domiciliario <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>(esta es la que verá el repartidor)</span></label>
            <textarea
              className="form-control"
              rows={2}
              value={editClient.addressLabel || ''}
              onChange={(e) => setEditClient({ ...editClient, addressLabel: e.target.value })}
              placeholder="Ej: Cl. 25 # 48-102, Boston, Barranquilla"
            />
          </div>
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
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Dirección para el domiciliario <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>(esta es la que verá el repartidor)</span></label>
            <textarea
              className="form-control"
              rows={2}
              value={newClient.addressLabel || ''}
              onChange={(e) => setNewClient({ ...newClient, addressLabel: e.target.value })}
              placeholder="Ej: Cl. 25 # 48-102, Boston, Barranquilla"
            />
          </div>
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

      {/* Modal Ubicar en mapa */}
      <Modal isOpen={showMapModal} onClose={() => setShowMapModal(false)} title={`Ubicar cliente: ${mapClient?.name || ''}`} wide>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5, flex: 1 }}>
              <strong>Instrucciones:</strong> Haz clic o toca en el mapa para colocar el pin exactamente donde vive el cliente. Puedes arrastrar el mapa y usar la rueda del ratón para acercar/alejar. La dirección se actualiza automáticamente y puedes editarla antes de guardar.
            </div>
            <button
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
              onClick={() => {
                if (!navigator.geolocation) {
                  setErrorModal('Tu navegador no soporta geolocalización.');
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setMapLat(lat);
                    setMapLng(lng);
                    setMapAddress('Cargando dirección...');
                    const addr = await reverseGeocode(lat, lng);
                    setMapAddress(addr || 'Dirección no encontrada');
                  },
                  () => setErrorModal('No se pudo obtener tu ubicación. Verifica los permisos.'),
                  { enableHighAccuracy: true, timeout: 10000 }
                );
              }}
            >
              <Crosshair size={14} strokeWidth={1.5} /> Mi ubicación
            </button>
          </div>

          <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0 }}>
            <MapContainer
              center={[mapLat, mapLng]}
              zoom={16}
              style={{ height: 'clamp(300px, 55vh, 520px)', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
                url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${getPrimaryKey()}`}
              />
              <MapClickHandler
                onClick={async (lat, lng) => {
                  setMapLat(lat);
                  setMapLng(lng);
                  setMapAddress('Cargando dirección...');
                  const addr = await reverseGeocode(lat, lng);
                  setMapAddress(addr || 'Dirección no encontrada');
                }}
              />
              <Marker position={[mapLat, mapLng]} icon={DefaultPin} />
            </MapContainer>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
              alignItems: 'start',
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Dirección (puedes editarla)</label>
              <textarea
                className="form-control"
                rows={3}
                value={mapAddress}
                onChange={(e) => setMapAddress(e.target.value)}
                placeholder="Dirección exacta del cliente..."
                style={{ resize: 'vertical', minHeight: 72 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', fontSize: '0.85rem', border: '1px solid var(--color-border)' }}>
                <strong>Latitud:</strong> {mapLat.toFixed(6)}
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', fontSize: '0.85rem', border: '1px solid var(--color-border)' }}>
                <strong>Longitud:</strong> {mapLng.toFixed(6)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" style={{ flex: '1 1 140px', justifyContent: 'center' }} onClick={() => setShowMapModal(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: '2 1 200px', justifyContent: 'center' }} onClick={handleMapSave} disabled={mapLoading}>
              {mapLoading ? 'Guardando...' : 'Guardar ubicación'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
