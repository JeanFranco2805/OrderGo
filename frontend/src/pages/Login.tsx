import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/authService';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(username, password);
      login(response.username, response.token, response.role);
      navigate('/dashboard');
    } catch (err) {
      setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="login-branding">
        <div className="login-branding-content">
          <div className="login-brand-logo">
            <div className="login-brand-icon">
              <Box size={32} strokeWidth={1.5} />
            </div>
            <div className="login-brand-text">
              <h2>OrderGo</h2>
              <span>SweetFlow</span>
            </div>
          </div>
          <h1 className="login-brand-headline">
            Administra tu negocio de manera fácil y eficiente
          </h1>
          <p className="login-brand-desc">
            Gestión completa de pedidos, facturación, inventario y clientes en una sola plataforma moderna y eficiente.
          </p>
        </div>

        {/* Decorative shapes */}
        <div className="login-shape login-shape-1" />
        <div className="login-shape login-shape-2" />
        <div className="login-shape login-shape-3" />
        <div className="login-dots" />
      </div>

      {/* Right side - Form */}
      <div className="login-form-side">
        <div className="login-form-card">
          {/* Mobile-only logo */}
          <div className="login-form-logo-mobile">
            <div className="login-form-icon-mobile">
              <Box size={28} strokeWidth={1.5} />
            </div>
            <h1>OrderGo</h1>
            <p>Panel administrativo</p>
          </div>

          {error && (
            <div className="login-error">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form-inner">
            <div className="login-form-header">
              <h2>Bienvenido de vuelta</h2>
              <p>Ingresa tus credenciales para continuar</p>
            </div>

            <div className="login-input-group">
              <label htmlFor="username">Usuario</label>
              <div className="login-input-wrap">
                <Mail size={18} strokeWidth={1.5} className="login-input-icon" />
                <input
                  id="username"
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-input-group">
              <label htmlFor="password">Contraseña</label>
              <div className="login-input-wrap">
                <Lock size={18} strokeWidth={1.5} className="login-input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              <span>{loading ? 'Verificando...' : 'Iniciar sesión'}</span>
              {!loading && <ArrowRight size={18} strokeWidth={2} />}
            </button>
          </form>

          <div className="login-footer">
            <p>OrderGo SweetFlow &copy; {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
