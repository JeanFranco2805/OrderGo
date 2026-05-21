import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { discountApi, type Discount, type DiscountType } from '../services/discountService';
import { useApiCache, invalidateCache } from '../hooks/useApiCache';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import '../styles/pages.css';

function typeLabel(t: DiscountType) {
  return t === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Valor fijo (COP)';
}

export default function Descuentos() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const cacheKey = `discounts-${page}-${search}`;
  const { data, loading, error, refresh } = useApiCache(cacheKey, () =>
    discountApi.getAll({ search: search || undefined, page, size: pageSize })
  );
  const discounts = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Discount | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState('');
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);

  const [form, setForm] = useState<Partial<Discount>>({
    code: '', description: '', type: 'PERCENTAGE', value: 0, startDate: '', endDate: '', active: true, usageLimit: undefined,
  });

  useEffect(() => {
    const timer = setTimeout(() => setPage(0), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setForm({ code: '', description: '', type: 'PERCENTAGE', value: 0, startDate: '', endDate: '', active: true, usageLimit: undefined });
    setEditItem(null);
    setShowCreate(true);
  };

  const openEdit = (d: Discount) => {
    setEditItem(d);
    setForm({ ...d });
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.type || form.value === undefined) return;
    try {
      const payload = { ...form } as Omit<Discount, 'id' | 'usageCount'>;
      if (editItem) {
        await discountApi.update(editItem.id, payload);
      } else {
        await discountApi.create(payload);
      }
      setShowCreate(false);
      invalidateCache('discounts-');
      refresh();
    } catch (err) {
      setErrorModal('Error guardando: ' + (err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await discountApi.delete(confirmDelete);
      invalidateCache('discounts-');
      refresh();
    } catch (err) {
      setErrorModal('Error eliminando: ' + (err as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Descuentos</h1>
          <p>Gestiona códigos de descuento para pedidos y facturas</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} strokeWidth={1.5} /> Nuevo descuento
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Search size={20} strokeWidth={1.5} color="#8b95a1" />
          <input type="text" className="form-control" placeholder="Buscar por código o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: '360px' }} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Código</th><th>Tipo</th><th>Valor</th><th>Vigencia</th><th>Usos</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Cargando...</td></tr>
              ) : discounts.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.code}</strong><div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{d.description}</div></td>
                  <td>{typeLabel(d.type)}</td>
                  <td>{d.type === 'PERCENTAGE' ? `${d.value}%` : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(d.value)}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    {d.startDate || '—'} <span style={{ color: 'var(--color-text-muted)' }}>→</span> {d.endDate || '—'}
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>
                    {d.usageCount}{d.usageLimit !== undefined && d.usageLimit !== null ? ` / ${d.usageLimit}` : ''}
                  </td>
                  <td>
                    <span className={`badge ${d.active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                      {d.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button className="navbar-icon-btn" onClick={() => setSelectedDiscount(d)} style={{ padding: 6, borderRadius: 8, backgroundColor: 'var(--color-bg)' }}><Eye size={15} strokeWidth={1.5} /></button>
                      <button className="navbar-icon-btn" onClick={() => openEdit(d)} style={{ padding: 6, borderRadius: 8, backgroundColor: '#eef2ff', color: '#4f46e5' }}><Pencil size={15} strokeWidth={1.5} /></button>
                      <button className="navbar-icon-btn" style={{ padding: 6, borderRadius: 8, backgroundColor: '#fef2f2', color: '#ef4444' }} onClick={() => setConfirmDelete(d.id)}><Trash2 size={15} strokeWidth={1.5} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && discounts.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#8b95a1' }}>No se encontraron descuentos</td></tr>
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
        title="Eliminar descuento"
        message="¿Estás seguro de eliminar este descuento?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Modal Ver detalle */}
      <Modal isOpen={!!selectedDiscount} onClose={() => setSelectedDiscount(null)} title={`Descuento ${selectedDiscount?.code}`}>
        {selectedDiscount && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Tipo</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{typeLabel(selectedDiscount.type)}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Valor</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedDiscount.type === 'PERCENTAGE' ? `${selectedDiscount.value}%` : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedDiscount.value)}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Inicio</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedDiscount.startDate || '—'}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Fin</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedDiscount.endDate || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Usos</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedDiscount.usageCount}{selectedDiscount.usageLimit !== undefined && selectedDiscount.usageLimit !== null ? ` / ${selectedDiscount.usageLimit}` : ''}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Estado</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedDiscount.active ? 'Activo' : 'Inactivo'}</div>
              </div>
            </div>
            {selectedDiscount.description && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <strong>Descripción:</strong> {selectedDiscount.description}
              </div>
            )}
            <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setSelectedDiscount(null)}>Cerrar</button>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!errorModal} onClose={() => setErrorModal('')} title="Error">
        <div style={{ color: '#b91c1c', fontSize: '0.92rem', lineHeight: 1.6 }}>{errorModal}</div>
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={editItem ? 'Editar descuento' : 'Nuevo descuento'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Código</label>
            <input className="form-control" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Descripción</label>
            <input className="form-control" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tipo</label>
              <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DiscountType })}>
                <option value="PERCENTAGE">Porcentaje (%)</option>
                <option value="FIXED">Valor fijo (COP)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Valor</label>
              <input type="number" className="form-control" value={form.value === 0 ? '' : form.value ?? ''} onChange={(e) => setForm({ ...form, value: e.target.value === '' ? 0 : Number(e.target.value) })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Inicio (opcional)</label>
              <input type="date" className="form-control" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Fin (opcional)</label>
              <input type="date" className="form-control" value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Límite de usos (opcional)</label>
              <input type="number" className="form-control" value={form.usageLimit ?? ''} onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Activo</label>
              <select className="form-control" value={form.active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSave} disabled={!form.code || form.value === undefined || form.value === null}>
              Guardar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
