import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield, LayoutDashboard, FileText, Users, Activity,
  LogOut, Menu, X, ChevronRight, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Layout.css';

export default function Layout() {
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Chiqildi');
    navigate('/admin-login');
  };

  const adminNavLinks = [
    { to: '/admin',           icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
    { to: '/admin/documents', icon: <FileText size={18} />,        label: 'Hujjatlar' },
    { to: '/admin/users',     icon: <Users size={18} />,           label: 'Foydalanuvchilar' },
    { to: '/admin/logs',      icon: <Activity size={18} />,        label: 'Faollik loglari' },
  ];

  // Admin panel uchun sidebar bilan, user uchun oddiy layout
  if (isAdmin && isAuthenticated) {
    return (
      <div className="layout">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <Shield size={24} color="#6366f1" />
            <span>SecureDocs</span>
          </div>

          <div className="sidebar-role">
            <span className="badge badge-primary">Admin</span>
            <span className="sidebar-username">{user?.name}</span>
          </div>

          <nav className="sidebar-nav">
            {adminNavLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                {link.icon}
                <span>{link.label}</span>
                <ChevronRight size={14} className="nav-chevron" />
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-email">{user?.email}</div>
            <button className="btn btn-ghost logout-btn" onClick={handleLogout}>
              <LogOut size={16} /> Chiqish
            </button>
          </div>
        </aside>

        <div className="main-wrap">
          <header className="topbar">
            <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="topbar-title">
              <Shield size={18} color="#6366f1" />
              <span>SecureDocs Admin</span>
            </div>
            <div className="topbar-user">
              <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
            </div>
          </header>
          <main className="content">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // Oddiy foydalanuvchi uchun — sidebar yo'q, faqat toza header
  return (
    <div className="layout-simple">
      <header className="simple-header">
        <div className="simple-logo">
          <Shield size={22} color="#6366f1" />
          <span>SecureDocs</span>
        </div>
        <a href="/admin-login" className="admin-link">
          <Settings size={14} /> Admin
        </a>
      </header>
      <main className="simple-content">
        <Outlet />
      </main>
    </div>
  );
}
