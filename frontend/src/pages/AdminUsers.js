import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { UserCheck, UserX, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './AdminDashboard.css';

export default function AdminUsers() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/admin/users')
      .then(r => setUsers(r.data.users))
      .catch(() => toast.error('Foydalanuvchilarni yuklashda xatolik.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleUser = async (user) => {
    try {
      const { data } = await api.patch(`/admin/users/${user._id}/toggle`);
      toast.success(data.message);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: data.isActive } : u));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Holatni o\'zgartirishda xatolik.');
    }
  };

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1>Foydalanuvchilar</h1>
          <p className="text-muted text-sm mt-1">{users.filter(u => u.role === 'user').length} ta ro'yxatdan o'tgan</p>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Foydalanuvchi</th>
                <th>Rol</th>
                <th>Holat</th>
                <th>So'nggi kirish</th>
                <th>Ro'yxatdan o'tgan</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 30 }}>Foydalanuvchilar topilmadi</td></tr>
              )}
              {users.map(user => (
                <tr key={user._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
                      }}>
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div className="text-muted text-sm">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-success'}`}>
                      {user.role === 'admin' ? <><Shield size={10} /> Admin</> : 'Foydalanuvchi'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {user.isActive ? 'Faol' : 'Bloklangan'}
                    </span>
                  </td>
                  <td className="text-muted text-sm">
                    {user.lastLogin ? format(new Date(user.lastLogin), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td className="text-muted text-sm">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td>
                    {user.role !== 'admin' && (
                      <button
                        className={`btn ${user.isActive ? 'btn-danger' : 'btn-success'}`}
                        style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => toggleUser(user)}
                      >
                        {user.isActive ? <><UserX size={13} /> Bloklash</> : <><UserCheck size={13} /> Faollashtirish</>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
