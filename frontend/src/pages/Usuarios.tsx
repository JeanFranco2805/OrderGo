import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Shield, UserCheck, Bike } from 'lucide-react';
import { userApi, type User } from '../services/userService';
import { useApiCache, invalidateCache } from '../hooks/useApiCache';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import '../styles/pages.css';

const ROLES = [
  { value: 'ADMIN', label: 'Administrador', icon: Shield },
  { value: 'VENDEDOR', label: 'Vendedor', icon: UserCheck },
  { value: 'DOMICILIARIO', label: 'Domiciliario', icon: Bike },
];

function roleConfig(role: string) {
  switch (role) {
    case 'ADMIN': return { class: 'badge-danger', label: 'Administrador', color: '#ef4444', bg: '#fef2f2' };
    case 'VENDEDOR': return { class: 'badge-success', label: 'Vendedor', color: '#10b981', bg: '#ecfdf5' };
    case 'DOMICILIARIO': return { class: 'badge-warning', label: 'Domiciliario', color: '#f59e0b', bg: '#fffbeb' };
    default: return { class: 'badge-info', label: role, color: '#6366f1', bg: '#eef2ff' };
  }
}

export default function Usuarios() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const cacheKey = `users-${page}-${search}`;
  const { data, loading, error, refresh } = useApiCache(cacheKey, () =>
    userApi.getAll({ page, size: pageSize })
  );
  const users = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const filteredUsers = search
    ? users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()))
    : users;

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User & { password: string }>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ username: '', password: '', role: 'VENDEDOR' });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setPage(0), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreate = async () => {
    if (!newForm.username || !newForm.password) return;
    try {
      await userApi.create(newForm);
      setShowCreate(false);
      setNewForm({ username: '', password: '', role: 'VENDEDOR' });
      invalidateCache('users-');
      refresh();
    } catch (err) {
      setErrorModal('Error al crear: ' + (err as Error).message);
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditForm({ username: u.username, role: u.role, password: '' });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    try {
      const payload: Partial<{ username: string; password: string; role: string }> = {
        username: editForm.username,
        role: editForm.role,
      };
      if (editForm.password && editForm.password.length > 0) {
        payload.password = editForm.password;
      }
      await userApi.update(editUser.id, payload);
      setEditUser(null);
      setEditForm({});
      invalidateCache('users-');
      refresh();
    } catch (err) {
      setErrorModal('Error al guardar: ' + (err as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDelete(id);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await userApi.delete(confirmDelete);
      invalidateCache('users-');
      refresh();
    } catch (err) {
      setErrorModal('Error al eliminar: ' + (err as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Usuarios</h1>
          <p>Gestiona los usuarios del sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} strokeWidth={1.5} /> Nuevo usuario
        </button>
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
            placeholder="Buscar usuario o rol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '360px' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="page-placeholder">
          <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Cargando usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="page-placeholder">
          <UserCheck size={48} strokeWidth={1} color="#d1d5db" />
          <h2>Sin resultados</h2>
          <p>No se encontraron usuarios con ese criterio</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Usuario</th><th>Rol</th><th style={{ width: 120 }}>Acciones</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const rc = roleConfig(u.role);
                  return (
                    <tr key={u.id}>
                      <td><strong>{u.username}</strong></td>
                      <td><span className={`badge ${rc.class}`}>{rc.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="navbar-icon-btn" style={{ color: 'var(--color-accent)' }} onClick={() => openEdit(u)}><Pencil size={16} strokeWidth={1.5} /></button>
                          <button className="navbar-icon-btn" style={{ color: '#ef4444' }} onClick={() => handleDelete(u.id)}><Trash2 size={16} strokeWidth={1.5} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Eliminar usuario"
        message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      <Modal isOpen={!!errorModal} onClose={() => setErrorModal('')} title="Error">
        <div style={{ color: '#b91c1c', fontSize: '0.92rem', lineHeight: 1.6 }}>{errorModal}</div>
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Editar usuario">
        {editUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Usuario</label>
              <input className="form-control" value={editForm.username || ''} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nueva contraseña (dejar vacío para no cambiar)</label>
              <input type="password" className="form-control" value={editForm.password || ''} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Rol</label>
              <select className="form-control" value={editForm.role || ''} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditUser(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveEdit}>Guardar cambios</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Crear */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo usuario">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Usuario</label>
            <input className="form-control" value={newForm.username} onChange={(e) => setNewForm({ ...newForm, username: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Contraseña</label>
            <input type="password" className="form-control" value={newForm.password} onChange={(e) => setNewForm({ ...newForm, password: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Rol</label>
            <select className="form-control" value={newForm.role} onChange={(e) => setNewForm({ ...newForm, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCreate}>Crear usuario</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
