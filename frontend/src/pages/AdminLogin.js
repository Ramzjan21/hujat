import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function AdminLogin() {
  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Agar allaqachon admin bo'lsa — admin panelga yo'naltir
  React.useEffect(() => {
    if (isAuthenticated && isAdmin) navigate('/admin');
  }, [isAuthenticated, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role !== 'admin') {
        setError('Siz admin emassiz.');
        setLoading(false);
        return;
      }
      toast.success('Admin paneliga xush kelibsiz!');
      navigate('/admin');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login amalga oshmadi.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb orb1" />
        <div className="auth-orb orb2" />
      </div>

      <div className="auth-card fade-in">
        <div className="auth-logo">
          <Shield size={36} color="#6366f1" />
          <h1>SecureDocs</h1>
          <p>Admin Panel Kirish</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Admin Kirish</h2>
          <p className="auth-subtitle">Faqat adminlar uchun</p>

          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label>Email</label>
            <div className="input-wrap">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                placeholder="admin@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Parol</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary w-full auth-btn" disabled={loading}>
            {loading ? <><span className="spinner" /> Kirish...</> : 'Kirish'}
          </button>

          <p className="auth-link" style={{ marginTop: 16 }}>
            <a href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              ← Hujjatlar sahifasiga qaytish
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
