import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import UserDashboard  from './pages/UserDashboard';
import ViewerPage     from './pages/ViewerPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminDocuments from './pages/AdminDocuments';
import AdminUsers     from './pages/AdminUsers';
import AdminLogs      from './pages/AdminLogs';
import AdminLogin     from './pages/AdminLogin';
import Layout         from './components/Layout';

// Admin route guard — faqat admin login qilgan bo'lsa
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/admin-login" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Ochiq sahifalar — hujjatlar va viewer */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="view/:id"  element={<ViewerPage />} />
      </Route>

      {/* Admin login sahifasi */}
      <Route path="/admin-login" element={<AdminLogin />} />

      {/* Admin panel — faqat admin uchun */}
      <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
        <Route index        element={<AdminDashboard />} />
        <Route path="documents" element={<AdminDocuments />} />
        <Route path="users"     element={<AdminUsers />} />
        <Route path="logs"      element={<AdminLogs />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a3e', color: '#e2e8f0', border: '1px solid #2d2d6b' },
            success: { iconTheme: { primary: '#10b981', secondary: '#1a1a3e' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#1a1a3e' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
