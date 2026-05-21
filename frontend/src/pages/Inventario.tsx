import { useState, useEffect } from 'react';
import {
  Plus, Search, Warehouse, Pencil, Eye, Trash2,
  DollarSign, Truck, Upload, X, Package
} from 'lucide-react';
import { inventoryApi, type InventoryItem } from '../services/inventoryService';
import { supplierApi, type Supplier } from '../services/supplierService';
import { inventoryExpenseApi, type InventoryExpense } from '../services/inventoryExpenseService';
import { formatCOP } from '../utils/currency';
import { useApiCache, invalidateCache } from '../hooks/useApiCache';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import '../styles/pages.css';

export default function Inventario() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const cacheKey = `inventory-${page}-${search}`;
  const { data, loading, error, refresh } = useApiCache(cacheKey, async () => {
    const [itemsData, suppliersData, expensesData] = await Promise.all([
      inventoryApi.getAll({ search: search || undefined, page, size: pageSize }),
      supplierApi.getAll({ size: 1000 }).catch(() => ({ content: [] as Supplier[], totalPages: 0 })),
      inventoryExpenseApi.getAll({ size: 1000 }).catch(() => ({ content: [] as InventoryExpense[], totalPages: 0 })),
    ]);
    return {
      items: itemsData.content,
      totalPages: itemsData.totalPages,
      suppliers: suppliersData.content,
      expenses: expensesData.content,
    };
  });
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const suppliers = data?.suppliers ?? [];
  const expenses = data?.expenses ?? [];

  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string>('');

  // Modal nuevo ítem
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState<Partial<InventoryItem>>({
    name: '', quantity: 0, costPrice: undefined, supplierId: undefined, imageUrl: ''
  });
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createPreview, setCreatePreview] = useState<string>('');

  // Modal registrar compra
  const [showCompra, setShowCompra] = useState(false);
  const [compraForm, setCompraForm] = useState<Partial<InventoryExpense>>({
    inventoryItemId: undefined, supplierId: undefined, quantity: 0, unitCost: 0,
    expenseDate: new Date().toISOString().split('T')[0], description: ''
  });

  // Modal proveedor
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({ name: '', email: '', phone: '', address: '' });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmDeleteExpense, setConfirmDeleteExpense] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState('');

  // Filtros y paginación para historial de compras
  const [expenseFilterType, setExpenseFilterType] = useState<'all' | 'day' | 'month' | 'year'>('all');
  const [expenseFilterDate, setExpenseFilterDate] = useState('');
  const [expensePage, setExpensePage] = useState(0);
  const expensePageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => setPage(0), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const onSelectFile = (file: File | null, setter: { setFile: (f: File | null) => void; setPreview: (p: string) => void }) => {
    setter.setFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter.setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setter.setPreview('');
    }
  };

  const openEdit = (i: InventoryItem) => {
    setEditItem(i);
    setEditForm(i);
    setEditFile(null);
    setEditPreview('');
  };

  const saveEdit = async () => {
    if (!editItem) return;
    try {
      const updated = await inventoryApi.update(editItem.id, editForm);
      if (editFile) {
        await inventoryApi.uploadImage(updated.id, editFile);
      }
      setEditItem(null);
      setEditFile(null);
      setEditPreview('');
      invalidateCache('inventory-');
      refresh();
    } catch (err) {
      setErrorModal('Error al guardar: ' + (err as Error).message);
    }
  };

  const handleCreate = async () => {
    try {
      const created = await inventoryApi.create(newForm as Omit<InventoryItem, 'id'>);
      if (createFile) {
        await inventoryApi.uploadImage(created.id, createFile);
      }
      setShowCreate(false);
      setNewForm({ name: '', quantity: 0, costPrice: undefined, supplierId: undefined, imageUrl: '' });
      setCreateFile(null);
      setCreatePreview('');
      invalidateCache('inventory-');
      refresh();
    } catch (err) {
      setErrorModal('Error al crear: ' + (err as Error).message);
    }
  };

  const handleRegistrarCompra = async () => {
    if (!compraForm.inventoryItemId || !compraForm.quantity || !compraForm.unitCost || !compraForm.expenseDate) return;
    try {
      await inventoryExpenseApi.create(compraForm as any);
      setShowCompra(false);
      setCompraForm({ inventoryItemId: undefined, supplierId: undefined, quantity: 0, unitCost: 0, expenseDate: new Date().toISOString().split('T')[0] });
      invalidateCache('inventory-');
      refresh();
    } catch (err) {
      setErrorModal('Error al registrar compra: ' + (err as Error).message);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    setConfirmDeleteExpense(id);
  };

  const doDeleteExpense = async () => {
    if (!confirmDeleteExpense) return;
    try {
      await inventoryExpenseApi.delete(confirmDeleteExpense);
      invalidateCache('inventory-');
      refresh();
    } catch (err) {
      setErrorModal('Error al eliminar compra: ' + (err as Error).message);
    } finally {
      setConfirmDeleteExpense(null);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDelete(id);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await inventoryApi.delete(confirmDelete);
      invalidateCache('inventory-');
      refresh();
    } catch (err) {
      setErrorModal('Error al eliminar: ' + (err as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.name) return;
    try {
      await supplierApi.create(newSupplier as Omit<Supplier, 'id'>);
      setShowSupplierModal(false);
      setNewSupplier({ name: '', email: '', phone: '', address: '' });
      invalidateCache('inventory-');
      refresh();
    } catch (err) {
      setErrorModal('Error al crear proveedor: ' + (err as Error).message);
    }
  };

  const renderSupplierSelect = (value: number | undefined, onChange: (id: number | undefined) => void) => (
    <select className="form-control" value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}>
      <option value="">Sin proveedor</option>
      {suppliers.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );

  const renderImageUploader = (preview: string, currentUrl: string | undefined, onFileSelect: (file: File | null) => void, label: string) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 100, height: 100, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0, backgroundColor: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {preview ? (
          <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : currentUrl ? (
          <img src={inventoryApi.getImageUrl(currentUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Warehouse size={28} strokeWidth={1} color="#d1d5db" />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>{label}</label>
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              accept="image/*"
              id={`file-${label}`}
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                onFileSelect(f);
              }}
            />
            <label htmlFor={`file-${label}`} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
              <Upload size={16} strokeWidth={1.5} /> {preview || currentUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}
            </label>
            {(preview || currentUrl) && (
              <button
                type="button"
                className="navbar-icon-btn"
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', color: '#ef4444' }}
                onClick={() => onFileSelect(null)}
              >
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Inventario</h1>
          <p>Control de stock y compras</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => setShowSupplierModal(true)}>
            <Truck size={18} strokeWidth={1.5} /> Nuevo proveedor
          </button>
          <button className="btn btn-outline" onClick={() => setShowCompra(true)}>
            <DollarSign size={18} strokeWidth={1.5} /> Registrar compra
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={18} strokeWidth={1.5} /> Nuevo ítem
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Search size={20} strokeWidth={1.5} color="#8b95a1" />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar ítem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '360px' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="page-placeholder">
          <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Cargando inventario...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="page-placeholder">
          <Warehouse size={48} strokeWidth={1} color="#d1d5db" />
          <h2>Sin resultados</h2>
          <p>No se encontraron ítems con ese criterio</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {items.map((i) => (
            <div key={i.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 200ms ease, box-shadow 200ms ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
              <div style={{ position: 'relative', width: '100%', height: 150, overflow: 'hidden', backgroundColor: '#f8f9fb' }}>
                {i.imageUrl ? (
                  <img src={inventoryApi.getImageUrl(i.imageUrl)} alt={i.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
                    <Package size={40} strokeWidth={1} />
                  </div>
                )}
              </div>
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.3 }}>{i.name}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Proveedor: {i.supplierName || 'N/A'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Stock:</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{i.quantity} uds</span>
                </div>
                {(i.costPrice !== undefined && i.costPrice !== null) && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Costo: <strong style={{ color: 'var(--color-text)' }}>{formatCOP(i.costPrice)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 10, alignItems: 'center' }}>
                  <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', padding: '8px 10px', fontSize: '0.82rem' }} onClick={() => setSelected(i)}><Eye size={15} strokeWidth={1.5} /> Ver</button>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '8px 10px', fontSize: '0.82rem' }} onClick={() => openEdit(i)}><Pencil size={15} strokeWidth={1.5} /> Editar</button>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                    <button className="navbar-icon-btn" aria-label="Eliminar" style={{ color: '#dc2626', padding: '8px', backgroundColor: '#fef2f2', borderRadius: 8 }} onClick={() => handleDelete(i.id)}><Trash2 size={16} strokeWidth={1.5} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* Historial de compras */}
      {!loading && expenses.length > 0 && (
        <div className="card" style={{ marginTop: 32 }}>
          <div className="card-title">Historial de compras</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="form-control" value={expenseFilterType} onChange={(e) => { setExpenseFilterType(e.target.value as any); setExpensePage(0); }} style={{ maxWidth: 140 }}>
              <option value="all">Todas</option>
              <option value="day">Por día</option>
              <option value="month">Por mes</option>
              <option value="year">Por año</option>
            </select>
            {expenseFilterType !== 'all' && (
              <input
                type={expenseFilterType === 'day' ? 'date' : expenseFilterType === 'month' ? 'month' : 'number'}
                className="form-control"
                value={expenseFilterDate}
                onChange={(e) => { setExpenseFilterDate(e.target.value); setExpensePage(0); }}
                placeholder={expenseFilterType === 'year' ? 'Año (ej: 2026)' : ''}
                style={{ maxWidth: 180 }}
              />
            )}
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Ítem</th><th>Proveedor</th><th>Cantidad</th><th>Costo unitario</th><th>Total</th><th>Fecha</th><th style={{ width: 60 }}></th></tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = expenses.filter((e) => {
                    if (expenseFilterType === 'all') return true;
                    const d = e.expenseDate;
                    if (expenseFilterType === 'day') return d === expenseFilterDate;
                    if (expenseFilterType === 'month') return d.startsWith(expenseFilterDate);
                    if (expenseFilterType === 'year') return d.startsWith(expenseFilterDate);
                    return true;
                  });
                  const totalExpensePages = Math.ceil(filtered.length / expensePageSize) || 1;
                  const start = expensePage * expensePageSize;
                  const pageItems = filtered.slice(start, start + expensePageSize);
                  const totalFiltered = filtered.reduce((sum, e) => sum + (e.totalCost || 0), 0);
                  return (
                    <>
                      {pageItems.map((e) => (
                        <tr key={e.id}>
                          <td><strong>{e.inventoryItemName}</strong></td>
                          <td>{e.supplierName || 'N/A'}</td>
                          <td>{e.quantity}</td>
                          <td>{formatCOP(e.unitCost)}</td>
                          <td style={{ fontWeight: 700 }}>{formatCOP(e.totalCost)}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{e.expenseDate}</td>
                          <td>
                            <button className="navbar-icon-btn" style={{ color: '#ef4444' }} onClick={() => handleDeleteExpense(e.id)}>
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: 'var(--color-bg)' }}>
                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Total filtrado:</td>
                        <td style={{ fontWeight: 800, color: 'var(--color-accent)' }}>{formatCOP(totalFiltered)}</td>
                        <td colSpan={2}></td>
                      </tr>
                      {totalExpensePages > 1 && (
                        <tr>
                          <td colSpan={7}>
                            <Pagination page={expensePage} totalPages={totalExpensePages} onChange={setExpensePage} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Eliminar ítem"
        message="¿Estás seguro de que deseas eliminar este ítem? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!confirmDeleteExpense}
        onClose={() => setConfirmDeleteExpense(null)}
        onConfirm={doDeleteExpense}
        title="Eliminar compra"
        message="¿Estás seguro de que deseas eliminar este registro de compra? El stock se revertirá."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      <Modal isOpen={!!errorModal} onClose={() => setErrorModal('')} title="Error">
        <div style={{ color: '#b91c1c', fontSize: '0.92rem', lineHeight: 1.6 }}>{errorModal}</div>
      </Modal>

      {/* Modal Ver más */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div>
            {selected.imageUrl && <img src={inventoryApi.getImageUrl(selected.imageUrl)} alt={selected.name} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 20 }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {selected.category && <span className="badge badge-info">{selected.category}</span>}
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Proveedor: <strong style={{ color: 'var(--color-text)' }}>{selected.supplierName || 'N/A'}</strong></span>
            </div>
            {selected.description && (
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.92rem', marginBottom: 16 }}>{selected.description}</p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Stock</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>{selected.quantity} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>uds</span></div>
              </div>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Costo unitario</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>{selected.costPrice !== undefined && selected.costPrice !== null ? formatCOP(selected.costPrice) : '-'}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Editar ítem">
        {editItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {renderImageUploader(editPreview, editForm.imageUrl || editItem.imageUrl, (f) => onSelectFile(f, { setFile: setEditFile, setPreview: setEditPreview }), 'Imagen')}
            <div className="form-group" style={{ marginBottom: 0 }}><label>Nombre</label><input className="form-control" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}><label>Stock</label><input type="number" className="form-control" value={editForm.quantity === 0 ? '' : editForm.quantity ?? ''} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value === '' ? 0 : Number(e.target.value) })} /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label>Costo unitario (COP)</label><input type="number" className="form-control" value={editForm.costPrice === undefined || editForm.costPrice === null ? '' : editForm.costPrice} onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Proveedor</label>{renderSupplierSelect(editForm.supplierId, (id) => setEditForm({ ...editForm, supplierId: id }))}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditItem(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveEdit}>Guardar cambios</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Crear Ítem */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo ítem">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderImageUploader(createPreview, undefined, (f) => onSelectFile(f, { setFile: setCreateFile, setPreview: setCreatePreview }), 'Imagen')}
          <div className="form-group" style={{ marginBottom: 0 }}><label>Nombre</label><input className="form-control" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Stock inicial</label><input type="number" className="form-control" value={newForm.quantity === 0 ? '' : newForm.quantity ?? ''} onChange={(e) => setNewForm({ ...newForm, quantity: e.target.value === '' ? 0 : Number(e.target.value) })} /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Costo unitario (COP)</label><input type="number" className="form-control" value={newForm.costPrice === undefined || newForm.costPrice === null ? '' : newForm.costPrice} onChange={(e) => setNewForm({ ...newForm, costPrice: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}><label>Proveedor</label>{renderSupplierSelect(newForm.supplierId, (id) => setNewForm({ ...newForm, supplierId: id }))}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCreate}>Crear ítem</button>
          </div>
        </div>
      </Modal>

      {/* Modal Registrar Compra */}
      <Modal isOpen={showCompra} onClose={() => setShowCompra(false)} title="Registrar compra">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Ítem del inventario</label>
            <select className="form-control" value={compraForm.inventoryItemId ?? ''} onChange={(e) => setCompraForm({ ...compraForm, inventoryItemId: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">Selecciona un ítem...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Proveedor (opcional)</label>
            {renderSupplierSelect(compraForm.supplierId, (id) => setCompraForm({ ...compraForm, supplierId: id }))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Cantidad comprada</label><input type="number" className="form-control" value={compraForm.quantity === 0 ? '' : compraForm.quantity ?? ''} onChange={(e) => setCompraForm({ ...compraForm, quantity: e.target.value === '' ? 0 : Number(e.target.value) })} /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Costo unitario (COP)</label><input type="number" className="form-control" value={compraForm.unitCost === 0 ? '' : compraForm.unitCost ?? ''} onChange={(e) => setCompraForm({ ...compraForm, unitCost: e.target.value === '' ? 0 : Number(e.target.value) })} /></div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}><label>Fecha</label><input type="date" className="form-control" value={compraForm.expenseDate} onChange={(e) => setCompraForm({ ...compraForm, expenseDate: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCompra(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleRegistrarCompra}>Registrar compra</button>
          </div>
        </div>
      </Modal>

      {/* Modal Nuevo Proveedor */}
      <Modal isOpen={showSupplierModal} onClose={() => setShowSupplierModal(false)} title="Nuevo proveedor">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label>Nombre</label><input className="form-control" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label>Correo</label><input className="form-control" type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label>Teléfono</label><input className="form-control" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label>Dirección</label><input className="form-control" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowSupplierModal(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCreateSupplier}>Guardar proveedor</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
