import { Menu, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/layout.css';

interface NavbarProps {
  onToggleSidebar: () => void;
  title: string;
}

export default function Navbar({ onToggleSidebar, title }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onToggleSidebar} aria-label="Abrir menu">
          <Menu size={22} strokeWidth={1.5} />
        </button>
        <div className="navbar-title">{title}</div>
      </div>
      <div className="navbar-right">
        <div className="user-pill">
          <div className="avatar">
            <User size={16} strokeWidth={2} />
          </div>
          <span>{user?.username || 'Admin'}</span>
        </div>
        <button className="navbar-icon-btn" aria-label="Cerrar sesión" onClick={logout} style={{ color: '#ef4444' }}>
          <LogOut size={20} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
