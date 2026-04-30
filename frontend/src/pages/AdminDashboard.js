import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Users, FileText, Activity, Eye, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import './AdminDashboard.css';

const ACTION_COLORS = {
  LOGIN:                     'badge-success',
  LOGOUT:                    'badge-primary',
  LOGIN_FAILED:              'badge-danger',
  DOCUMENT_VIEW_START:       'badge-primary',
  DOCUMENT_VIEW_END:         'badge-primary',
  COPY_ATTEMPT:              'badge-warning',
  PRINT_ATTEMPT:             'badge-warning',
  SAVE_ATTEMPT:              'badge-warning',
  DEVTOOLS_DETECTED:         'badge-danger',
  TAB_BLUR:                  'badge-primary',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'badge-danger',
  DOWNLOAD_ATTEMPT:          'badge-danger',
};

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;

  const statCards = [
    { icon: <Users size={22} />,    label: 'Foydalanuvchilar', value: stats?.totalUsers, color: '#6366f1' },
    { icon: <FileText size={22} />, label: 'Faol hujjatlar',   value: stats?.totalDocs,  color: '#10b981' },
    { icon: <Activity size={22} />, label: 'Faollik yozuvlari',value: stats?.totalLogs,  color: '#f59e0b' },
  ];

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1>Bosh sahifa</h1>
          <p className="text-muted text-sm mt-1">Tizim umumiy ko'rinishi va so'nggi faollik</p>
        </div>
      </div>

      <div className="stat-grid">
        {statCards.map(s => (
          <div key={s.label} className="stat-card card">
            <div className="stat-icon" style={{ background: s.color + '22', color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div className="stat-value">{s.value?.toLocaleString() ?? '—'}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-4">
        <h2 className="section-title">
          <Activity size={18} color="#6366f1" /> So'nggi faollik
        </h2>
        <div className="table-wrap mt-3">
          <table>
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Foydalanuvchi</th>
                <th>Harakat</th>
                <th>Hujjat</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentLogs?.map(log => (
                <tr key={log._id}>
                  <td className="text-muted text-sm" style={{ whiteSpace: 'nowrap' }}>
                    <Clock size={12} style={{ marginRight: 4 }} />
                    {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                  </td>
                  <td>
                    <div>{log.user?.name || '—'}</div>
                    <div className="text-muted text-sm">{log.user?.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${ACTION_COLORS[log.action] || 'badge-primary'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="text-muted text-sm">{log.document?.title || '—'}</td>
                </tr>
              ))}
              {!stats?.recentLogs?.length && (
                <tr><td colSpan={4} className="text-center text-muted" style={{ padding: '30px' }}>Hali faollik yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
