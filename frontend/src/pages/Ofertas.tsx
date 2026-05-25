import { useState, useEffect } from 'react';
import {
  Plus, Search, Pencil, Eye, Trash2, Package,
  Tag, Minus, Upload, X
} from 'lucide-react';
import { offerApi, type Offer, type OfferItem } from '../services/offerService';
import { productApi, type Product } from '../services/productService';
import { formatCOP } from '../utils/currency';
import { useApiCache, invalidateCache } from '../hooks/useApiCache';
import { useRole } from '../hooks/useRole';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import '../styles/pages.css';

export default function Ofertas() {
  const { canCreate: canCreateOffer, canForceDelete: canForceDeleteOffer, isAdmin } = useRole();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const cacheKey = `offers-${page}-${search}`;
  const { data, loading, error, refresh } = useApiCache(cacheKey, () =>
    offerApi.getAll({ page, size: pageSize })
  );
  const offers = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const [newForm, setNewForm] = useState<Partial<Offer>>({
    name: '', description: '', price: 0, imageUrl: '', active: true, items: []
  });
  const [newItems, setNewItems] = useState<OfferItem[]>([]);
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createPreview, setCreatePreview] = useState<string>('');

  const [editForm, setEditForm] = useState<Partial<Offer>>({});
  const [editItems, setEditItems] = useState<OfferItem[]>([]);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string>('');

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedOffers, setDeletedOffers] = useState<Offer[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPage(0), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (showDeleted) {
      setLoadingDeleted(true);
      offerApi.getDeleted()
        .then((res) => setDeletedOffers(res))
        .catch((err) => setErrorModal('Error cargando archivadas: ' + (err as Error).message))
        .finally(() => setLoadingDeleted(false));
    }
  }, [showDeleted]);

  const loadProducts = async () => {
    try {
      const res = await productApi.getAll({ size: 1000 });
      setProducts(res.content);
    } catch {
      setProducts([]);
    }
  };

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

  const openCreate = () => {
    setShowCreate(true);
    loadProducts();
    setNewForm({ name: '', description: '', price: 0, imageUrl: '', active: true, items: [] });
    setNewItems([]);
    setCreateFile(null);
    setCreatePreview('');
  };

  const openEdit = (o: Offer) => {
    setEditOffer(o);
    setEditForm({ ...o });
    setEditItems(o.items.map((i) => ({ ...i })));
    setEditFile(null);
    setEditPreview('');
    loadProducts();
  };

  const addItem = (setter: { items: OfferItem[]; setItems: (i: OfferItem[]) => void }, productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setter.setItems([...setter.items, { productId, productName: product.name, quantity: 1, unitPrice: product.price, subtotal: product.price }]);
  };

  const removeItem = (setter: { items: OfferItem[]; setItems: (i: OfferItem[]) => void }, index: number) => {
    setter.setItems(setter.items.filter((_, i) => i !== index));
  };

  const updateItemQty = (setter: { items: OfferItem[]; setItems: (i: OfferItem[]) => void }, index: number, qty: number) => {
    const updated = setter.items.map((item, i) => {
      if (i !== index) return item;
      const subtotal = (item.unitPrice || 0) * qty;
      return { ...item, quantity: qty, subtotal };
    });
    setter.setItems(updated);
  };

  const calculateOriginalTotal = (items: OfferItem[]) => {
    return items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
  };

  const handleCreate = async () => {
    if (!newForm.name || !newForm.price || newItems.length === 0) return;
    try {
      const payload = { ...newForm, items: newItems } as Omit<Offer, 'id'>;
      const created = await offerApi.create(payload);
      if (createFile) {
        await offerApi.uploadImage(created.id, createFile);
      }
      setShowCreate(false);
      setCreateFile(null);
      setCreatePreview('');
      invalidateCache('offers-');
      refresh();
    } catch (err) {
      setErrorModal('Error al crear: ' + (err as Error).message);
    }
  };

  const saveEdit = async () => {
    if (!editOffer) return;
    try {
      const updated = await offerApi.update(editOffer.id, { ...editForm, items: editItems });
      if (editFile) {
        await offerApi.uploadImage(updated.id, editFile);
      }
      setEditOffer(null);
      setEditFile(null);
      setEditPreview('');
      invalidateCache('offers-');
      refresh();
    } catch (err) {
      setErrorModal('Error al guardar: ' + (err as Error).message);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await offerApi.forceDelete(confirmDelete);
      invalidateCache('offers-');
      refresh();
    } catch (err) {
      setErrorModal('Error al eliminar: ' + (err as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await offerApi.restore(id);
      setDeletedOffers((prev) => prev.filter((o) => o.id !== id));
      invalidateCache('offers-');
      refresh();
    } catch (err) {
      setErrorModal('Error al restaurar: ' + (err as Error).message);
    }
  };

  const renderImageUploader = (
    preview: string,
    currentUrl: string | undefined,
    onFileSelect: (file: File | null) => void,
    label: string
  ) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 100, height: 100, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0, backgroundColor: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {preview ? (
          <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : currentUrl ? (
          <img src={offerApi.getImageUrl(currentUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Package size={28} strokeWidth={1} color="#d1d5db" />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>{label}</label>
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
              id={`file-offer-${label}`}
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                onFileSelect(f);
              }}
            />
            <label htmlFor={`file-offer-${label}`} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
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

  const renderItemSelector = (
    items: OfferItem[],
    setter: { items: OfferItem[]; setItems: (i: OfferItem[]) => void }
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>Agregar producto al combo</label>
        <select
          className="form-control"
          onChange={(e) => {
            const id = Number(e.target.value);
            if (id) addItem(setter, id);
            e.target.value = '';
          }}
        >
          <option value="">Selecciona un producto...</option>
          {products
            .filter((p) => !items.some((i) => i.productId === p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>{p.name} - {formatCOP(p.price)}</option>
            ))}
        </select>
      </div>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)' }}>
              <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{item.productName}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Cant:</span>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItemQty(setter, idx, Number(e.target.value))}
                  style={{ width: 60, textAlign: 'center', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-secondary)', minWidth: 80, textAlign: 'right' }}>{formatCOP(item.subtotal || 0)}</span>
              <button className="navbar-icon-btn" style={{ color: '#ef4444' }} onClick={() => removeItem(setter, idx)}>
                <Minus size={16} strokeWidth={1.5} />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            <span>Valor original:</span>
            <span style={{ textDecoration: 'line-through' }}>{formatCOP(calculateOriginalTotal(items))}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Ofertas / Combos</h1>
          <p>Crea combos y ofertas especiales</p>
        </div>
        {canCreateOffer() && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} strokeWidth={1.5} /> Nueva oferta
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Search size={20} strokeWidth={1.5} color="#8b95a1" />
            <input type="text" className="form-control" placeholder="Buscar oferta..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: '360px' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
            Ver archivadas
          </label>
        </div>
      </div>

      {showDeleted ? (
        loadingDeleted ? (
          <div className="page-placeholder">
            <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p>Cargando archivadas...</p>
          </div>
        ) : deletedOffers.length === 0 ? (
          <div className="page-placeholder">
            <Tag size={48} strokeWidth={1} color="#d1d5db" />
            <h2>Sin resultados</h2>
            <p>No hay ofertas archivadas</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {deletedOffers.map((o) => (
              <div key={o.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: 0.5 }}>
                <div style={{ position: 'relative', width: '100%', height: 150, overflow: 'hidden', backgroundColor: '#f8f9fb' }}>
                  {o.imageUrl ? (
                    <img src={offerApi.getImageUrl(o.imageUrl)} alt={o.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
                      <Package size={40} strokeWidth={1} />
                    </div>
                  )}
                  <span className="badge badge-danger" style={{ position: 'absolute', top: 12, right: 12 }}>Archivada</span>
                </div>
                <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.3 }}>{o.name}</h3>
                    {o.description && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '4px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.description}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Productos:</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{o.items.length}</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                    {formatCOP(o.price)}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                    <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '0.82rem' }} onClick={() => handleRestore(o.id)}>Restaurar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : loading ? (
        <div className="page-placeholder">
          <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Cargando ofertas...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="page-placeholder">
          <Tag size={48} strokeWidth={1} color="#d1d5db" />
          <h2>Sin resultados</h2>
          <p>No se encontraron ofertas</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {offers.map((o) => (
            <div key={o.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 200ms ease, box-shadow 200ms ease', opacity: o.active ? 1 : 0.6 }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
              <div style={{ position: 'relative', width: '100%', height: 150, overflow: 'hidden', backgroundColor: '#f8f9fb' }}>
                {o.imageUrl ? (
                  <img src={offerApi.getImageUrl(o.imageUrl)} alt={o.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
                    <Package size={40} strokeWidth={1} />
                  </div>
                )}
                <span className={`badge ${o.active ? 'badge-success' : 'badge-danger'}`} style={{ position: 'absolute', top: 12, right: 12 }}>
                  {o.active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.3 }}>{o.name}</h3>
                  {o.description && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '4px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.description}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Productos:</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{o.items.length}</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                  {formatCOP(o.price)}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 10, alignItems: 'center' }}>
                  <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', padding: '8px 10px', fontSize: '0.82rem' }} onClick={() => setSelectedOffer(o)}><Eye size={15} strokeWidth={1.5} /> Ver</button>
                  {isAdmin && (
                    <button className="navbar-icon-btn" onClick={() => openEdit(o)} style={{ color: '#4f46e5', backgroundColor: '#eef2ff', borderRadius: 8, padding: 6 }}><Pencil size={16} strokeWidth={1.5} /></button>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                    {canForceDeleteOffer() && (
                      <button className="navbar-icon-btn" aria-label="Eliminar" style={{ color: '#dc2626', padding: '8px', backgroundColor: '#fef2f2', borderRadius: 8 }} onClick={() => setConfirmDelete(o.id)}><Trash2 size={16} strokeWidth={1.5} /></button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Eliminar oferta"
        message="¿Estás seguro de que deseas eliminar esta oferta? Se desvinculará de los pedidos históricos pero no se borrarán."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      <Modal isOpen={!!errorModal} onClose={() => setErrorModal('')} title="Error">
        <div style={{ color: '#b91c1c', fontSize: '0.92rem', lineHeight: 1.6 }}>{errorModal}</div>
      </Modal>

      {/* Modal Ver más */}
      <Modal isOpen={!!selectedOffer} onClose={() => setSelectedOffer(null)} title={selectedOffer?.name}>
        {selectedOffer && (
          <div>
            {selectedOffer.imageUrl && <img src={offerApi.getImageUrl(selectedOffer.imageUrl)} alt={selectedOffer.name} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 20 }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span className={`badge ${selectedOffer.active ? 'badge-success' : 'badge-danger'}`}>{selectedOffer.active ? 'Activa' : 'Inactiva'}</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent)' }}>{formatCOP(selectedOffer.price)}</span>
            </div>
            {selectedOffer.description && (
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.92rem', marginBottom: 16 }}>{selectedOffer.description}</p>
            )}
            <div className="card-title" style={{ marginBottom: 12 }}>Productos incluidos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedOffer.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.productName}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    <span>x{item.quantity}</span>
                    <span style={{ textDecoration: 'line-through' }}>{formatCOP(item.subtotal || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Valor original:</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>{formatCOP(calculateOriginalTotal(selectedOffer.items))}</span>
            </div>
            <div style={{ marginTop: 8, padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>Precio oferta:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-accent)' }}>{formatCOP(selectedOffer.price)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={!!editOffer} onClose={() => setEditOffer(null)} title="Editar oferta">
        {editOffer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {renderImageUploader(editPreview, editForm.imageUrl || editOffer.imageUrl, (f) => onSelectFile(f, { setFile: setEditFile, setPreview: setEditPreview }), 'Imagen del combo')}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nombre</label>
              <input className="form-control" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Descripción</label>
              <input className="form-control" value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Precio oferta (COP)</label>
              <input type="number" className="form-control" value={editForm.price === 0 ? '' : editForm.price ?? ''} onChange={(e) => setEditForm({ ...editForm, price: e.target.value === '' ? 0 : Number(e.target.value) })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', cursor: 'pointer' }} onClick={() => setEditForm({ ...editForm, active: !(editForm.active ?? true) })}>
              <input type="checkbox" checked={editForm.active ?? true} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} style={{ cursor: 'pointer' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>Oferta activa</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{(editForm.active ?? true) ? 'Visible en catálogo' : 'Oculta temporalmente'}</span>
            </div>
            {renderItemSelector(editItems, { items: editItems, setItems: setEditItems })}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditOffer(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveEdit}>Guardar cambios</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Crear */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva oferta / combo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderImageUploader(createPreview, undefined, (f) => onSelectFile(f, { setFile: setCreateFile, setPreview: setCreatePreview }), 'Imagen del combo')}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Nombre</label>
            <input className="form-control" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Descripción</label>
            <input className="form-control" value={newForm.description || ''} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Precio oferta (COP)</label>
            <input type="number" className="form-control" value={newForm.price === 0 ? '' : newForm.price ?? ''} onChange={(e) => setNewForm({ ...newForm, price: e.target.value === '' ? 0 : Number(e.target.value) })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', cursor: 'pointer' }} onClick={() => setNewForm({ ...newForm, active: !(newForm.active ?? true) })}>
            <input type="checkbox" checked={newForm.active ?? true} onChange={(e) => setNewForm({ ...newForm, active: e.target.checked })} style={{ cursor: 'pointer' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>Oferta activa</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{(newForm.active ?? true) ? 'Visible en catálogo' : 'Oculta temporalmente'}</span>
          </div>
          {renderItemSelector(newItems, { items: newItems, setItems: setNewItems })}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCreate} disabled={newItems.length === 0}>Crear oferta</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
