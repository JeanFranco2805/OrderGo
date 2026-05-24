import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Eye, Package, Trash2, Upload, X, Download, DollarSign } from 'lucide-react';
import { formatCOP } from '../utils/currency';
import { getLocalDateString } from '../utils/date';
import { productApi, type Product } from '../services/productService';
import { inventoryApi, type InventoryItem } from '../services/inventoryService';
import { useApiCache, invalidateCache } from '../hooks/useApiCache';
import { useRole } from '../hooks/useRole';
import { exportToExcel } from '../utils/exportExcel';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import '../styles/pages.css';

export default function Productos() {
  const { canCreate: canCreateProduct, canEdit: canEditProduct, canForceDelete: canForceDeleteProduct, isAdmin } = useRole();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const cacheKey = `products-${page}-${search}`;
  const { data, loading, error, refresh } = useApiCache(cacheKey, () =>
    productApi.getAll({ search: search || undefined, page, size: pageSize })
  );
  const products = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState<Partial<Product>>({ name: '', description: '', price: 0, stock: 0, category: '', imageUrl: '', inventoryItemId: undefined, piecesPerUnit: 1 });
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createPreview, setCreatePreview] = useState<string>('');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState('');

  // Debounce search reset to page 0
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

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditForm(p);
    setEditFile(null);
    setEditPreview('');
  };

  const saveEdit = async () => {
    if (!editProduct || !editForm) return;
    try {
      const updated = await productApi.update(editProduct.id, editForm);
      if (editFile) {
        await productApi.uploadImage(updated.id, editFile);
      }
      setEditProduct(null);
      setEditFile(null);
      setEditPreview('');
      invalidateCache('products-');
      refresh();
    } catch (err) {
      setErrorModal('Error al guardar: ' + (err as Error).message);
    }
  };

  const handleCreate = async () => {
    if (!newForm.inventoryItemId) {
      setErrorModal('Debes seleccionar un ítem del inventario');
      return;
    }
    try {
      const created = await productApi.create(newForm as Omit<Product, 'id'>);
      if (createFile) {
        await productApi.uploadImage(created.id, createFile);
      }
      setShowCreate(false);
      setNewForm({ name: '', description: '', price: 0, stock: 0, category: '', imageUrl: '', inventoryItemId: undefined });
      setCreateFile(null);
      setCreatePreview('');
      setSelectedInventoryItem(null);
      invalidateCache('products-');
      refresh();
    } catch (err) {
      setErrorModal('Error al crear: ' + (err as Error).message);
    }
  };

  const openCreate = async () => {
    setShowCreate(true);
    try {
      const res = await inventoryApi.getUnlinked();
      setInventoryItems(res);
    } catch {
      setInventoryItems([]);
    }
  };

  const onSelectInventoryItem = (id: number | undefined) => {
    if (!id) {
      setSelectedInventoryItem(null);
      setNewForm({ ...newForm, inventoryItemId: undefined, name: '', imageUrl: '', stock: 0 });
      setCreatePreview('');
      return;
    }
    const item = inventoryItems.find((i) => i.id === id) || null;
    setSelectedInventoryItem(item);
    setNewForm({
      ...newForm,
      inventoryItemId: id,
      name: item?.name || '',
      imageUrl: item?.imageUrl || '',
      stock: item?.quantity || 0,
    });
    setCreatePreview('');
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await productApi.forceDelete(confirmDelete);
      invalidateCache('products-');
      refresh();
    } catch (err) {
      setErrorModal('Error al eliminar: ' + (err as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleExport = async () => {
    try {
      const all = (await productApi.getAll({ search: search || undefined, size: 1000 })).content;
      const rows = all.map((p) => [
        p.id,
        p.name,
        p.description || '',
        p.price,
        p.stock,
        p.category || '',
        p.piecesPerUnit || 1,
      ]);
      exportToExcel(
        [
          {
            name: 'Productos',
            headers: ['ID', 'Nombre', 'Descripción', 'Precio', 'Stock', 'Categoría', 'Piezas por unidad'],
            rows,
          },
        ],
        `productos_ordergo_${getLocalDateString()}.xlsx`
      );
    } catch {
      setErrorModal('Error exportando productos');
    }
  };

  const renderImageUploader = (preview: string, currentUrl: string | undefined, onFileSelect: (file: File | null) => void, label: string) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 100, height: 100, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0, backgroundColor: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {preview ? (
          <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : currentUrl ? (
          <img src={productApi.getImageUrl(currentUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          <h1>Productos</h1>
          <p>Gestiona tu catálogo de postres</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button className="btn btn-outline" onClick={handleExport}>
              <Download size={18} strokeWidth={1.5} /> Exportar Excel
            </button>
          )}
          {canCreateProduct() && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={18} strokeWidth={1.5} /> Nuevo producto
            </button>
          )}
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
            placeholder="Buscar por nombre o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '360px' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="page-placeholder">
          <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Cargando productos...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="page-placeholder">
          <Package size={48} strokeWidth={1} color="#d1d5db" />
          <h2>Sin resultados</h2>
          <p>No se encontraron productos con ese criterio</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {products.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 200ms ease, box-shadow 200ms ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              <div style={{ position: 'relative', width: '100%', height: 180, overflow: 'hidden' }}>
                <img src={productApi.getImageUrl(p.imageUrl)} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <span className="badge badge-info" style={{ position: 'absolute', top: 12, left: 12 }}>{p.category}</span>
              </div>
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.3 }}>{p.name}</h3>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>{formatCOP(p.price)}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.stock > 5 ? 'var(--color-success)' : 'var(--color-warning)', display: 'inline-block' }} />
                  {p.stock} unidades en stock
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 10, alignItems: 'center' }}>
                  <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', padding: '8px 10px', fontSize: '0.82rem' }} onClick={() => setSelectedProduct(p)}>
                    <Eye size={15} strokeWidth={1.5} /> Ver
                  </button>
                  {canEditProduct() && (
                    <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '8px 10px', fontSize: '0.82rem' }} onClick={() => openEdit(p)}>
                      <Pencil size={15} strokeWidth={1.5} /> Editar
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                    {canForceDeleteProduct() && (
                      <button className="navbar-icon-btn" aria-label="Eliminar" style={{ color: '#dc2626', padding: '8px', backgroundColor: '#fef2f2', borderRadius: 8 }} onClick={() => setConfirmDelete(p.id)}>
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* Modal Ver más */}
      <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title={selectedProduct?.name}>
        {selectedProduct && (
          <div>
            <img src={productApi.getImageUrl(selectedProduct.imageUrl)} alt={selectedProduct.name} style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 20 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span className="badge badge-info">{selectedProduct.category}</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent)' }}>{formatCOP(selectedProduct.price)}</span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.92rem', marginBottom: 16 }}>{selectedProduct.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', fontSize: '0.88rem' }}>
              <Package size={16} strokeWidth={1.5} color="var(--color-text-secondary)" />
              <span style={{ color: 'var(--color-text-secondary)' }}>Stock disponible:</span>
              <strong style={{ color: 'var(--color-text)' }}>{selectedProduct.stock} unidades</strong>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={!!editProduct} onClose={() => setEditProduct(null)} title="Editar producto">
        {editProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {renderImageUploader(editPreview, editForm.imageUrl || editProduct.imageUrl, (f) => onSelectFile(f, { setFile: setEditFile, setPreview: setEditPreview }), 'Imagen del producto')}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nombre</label>
              <input className="form-control" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Precio</label>
                <input type="number" className="form-control" value={editForm.price === 0 ? '' : editForm.price ?? ''} onChange={(e) => setEditForm({ ...editForm, price: e.target.value === '' ? 0 : Number(e.target.value) })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Stock</label>
                <input type="number" className="form-control" value={editForm.stock === 0 ? '' : editForm.stock ?? ''} readOnly style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }} title="El stock se gestiona desde el inventario" />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Se sincroniza automáticamente con el inventario</span>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Piezas por unidad (docenas)</label>
              <input type="number" min={1} className="form-control" value={editForm.piecesPerUnit === undefined || editForm.piecesPerUnit === null ? 1 : editForm.piecesPerUnit} onChange={(e) => setEditForm({ ...editForm, piecesPerUnit: e.target.value === '' ? 1 : Number(e.target.value) })} placeholder="Ej: 12 para una docena" />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Número de piezas individuales que contiene cada unidad vendida. Ej: 12 = 1 docena.</span>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Descripción</label>
              <input className="form-control" value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditProduct(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveEdit}>Guardar cambios</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Eliminar producto"
        message="¿Estás seguro de que deseas eliminar este producto? Se desvinculará de los pedidos históricos pero no se borrarán."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      <Modal isOpen={!!errorModal} onClose={() => setErrorModal('')} title="Error">
        <div style={{ color: '#b91c1c', fontSize: '0.92rem', lineHeight: 1.6 }}>{errorModal}</div>
      </Modal>

      {/* Modal Crear */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo producto">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Ítem del inventario</label>
            <select
              className="form-control"
              value={newForm.inventoryItemId ?? ''}
              onChange={(e) => onSelectInventoryItem(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Selecciona un ítem...</option>
              {inventoryItems.map((i) => (
                <option key={i.id} value={i.id}>{i.name} (Stock: {i.quantity})</option>
              ))}
            </select>
          </div>

          {selectedInventoryItem && (
            <>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={14} strokeWidth={1.5} color="#b45309" />
                <span><strong>Precio de compra:</strong> {formatCOP(selectedInventoryItem.costPrice || 0)}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0, backgroundColor: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {createPreview ? (
                    <img src={createPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : selectedInventoryItem.imageUrl ? (
                    <img src={inventoryApi.getImageUrl(selectedInventoryItem.imageUrl)} alt={selectedInventoryItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Package size={28} strokeWidth={1} color="#d1d5db" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Imagen del producto</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
                        id="file-product"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (f) {
                            setCreateFile(f);
                            const reader = new FileReader();
                            reader.onloadend = () => setCreatePreview(reader.result as string);
                            reader.readAsDataURL(f);
                          } else {
                            setCreateFile(null);
                            setCreatePreview('');
                          }
                        }}
                      />
                      <label htmlFor="file-product" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                        <Upload size={16} strokeWidth={1.5} /> {createPreview || selectedInventoryItem.imageUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Nombre</label>
                <input className="form-control" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Precio de venta (COP)</label>
                  <input type="number" className="form-control" value={newForm.price === 0 ? '' : newForm.price ?? ''} onChange={(e) => setNewForm({ ...newForm, price: e.target.value === '' ? 0 : Number(e.target.value) })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Stock disponible</label>
                  <input type="number" className="form-control" value={newForm.stock === 0 ? '' : newForm.stock ?? ''} readOnly style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }} title="El stock se gestiona desde el inventario" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Se sincroniza automáticamente con el inventario</span>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Piezas por unidad (docenas)</label>
                <input type="number" min={1} className="form-control" value={newForm.piecesPerUnit === undefined || newForm.piecesPerUnit === null ? 1 : newForm.piecesPerUnit} onChange={(e) => setNewForm({ ...newForm, piecesPerUnit: e.target.value === '' ? 1 : Number(e.target.value) })} placeholder="Ej: 12 para una docena" />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Número de piezas individuales que contiene cada unidad vendida. Ej: 12 = 1 docena.</span>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Categoría</label>
                <input className="form-control" value={newForm.category} onChange={(e) => setNewForm({ ...newForm, category: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Descripción</label>
                <input className="form-control" value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCreate} disabled={!selectedInventoryItem}>Crear producto</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
