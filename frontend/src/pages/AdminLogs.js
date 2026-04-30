import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Filter, Clock, AlertTriangle } from 'lucide-react';
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

const ACTIONS = [
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
  'DOCUMENT_VIEW_START', 'DOCUMENT_VIEW_END',
  'COPY_ATTEMPT', 'PRINT_ATTEMPT', 'SAVE_ATTEMPT',
  'DEVTOOLS_DETECTED', 'TAB_BLUR',
  'UNAUTHORIZED_ACCESS_ATTEMPT', 'DOWNLOAD_ATTEMPT',
];

const ACTION_UZ = {
  LOGIN:                       'Kirdi',
  LOGOUT:                      'Chiqdi',
  LOGIN_FAILED:                'Kirish muvaffaqiyatsiz',
  DOCUMENT_VIEW_START:         'Hujjat ochildi',
  DOCUMENT_VIEW_END:           'Hujjat yopildi',
  COPY_ATTEMPT:                'Nusxa olishga urinish',
  PRINT_ATTEMPT:               'Chop etishga urinish',
  SAVE_ATTEMPT:                'Saqlashga urinish',
  DEVTOOLS_DETECTED:           'DevTools aniqlandi',
  TAB_BLUR:                    'Tab almashtirildi',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'Ruxsatsiz kirish urinishi',
  DOWNLOAD_ATTEMPT:            'Yuklashga urinish',
};

export default function AdminLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (p = 1, action = filter) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 30 };
      if (action) params.action = action;
      const { data } = await api.get('/logs', { params });
      setLogs(data.logs);
      setTotalPages(data.pages);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1, ''); }, []);

  const handleFilter = (action) => {
    setFilter(action);
    load(1, action);
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1>Faollik yozuvlari</h1>
          <p className="text-muted text-sm mt-1">Barcha foydalanuvchi harakatlari va xavfsizlik hodisalari</p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${!filter ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '6px 14px', fontSize: 12 }}
          onClick={() => handleFilter('')}
        >
          Barchasi
        </button>
        {ACTIONS.map(action => (
          <button
            key={action}
            className={`btn ${filter === action ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', fontSize: 11 }}
            onClick={() => handleFilter(action)}
          >
            {ACTION_UZ[action] || action.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vaqt</th>
                    <th>Foydalanuvchi</th>
                    <th>Harakat</th>
                    <th>Hujjat</th>
                    <th>IP manzil</th>
                    <th>Tafsilot</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 30 }}>Yozuvlar topilmadi</td></tr>
                  )}
                  {logs.map(log => (
                    <tr key={log._id}>
                      <td className="text-sm" style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        <Clock size={11} style={{ marginRight: 4 }} />
                        {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{log.user?.name || '—'}</div>
                        <div className="text-muted text-sm">{log.user?.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${ACTION_COLORS[log.action] || 'badge-primary'}`}>
                          {ACTION_UZ[log.action] || log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="text-muted text-sm">{log.document?.title || '—'}</td>
                      <td className="text-muted text-sm" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {log.ipAddress || '—'}
                      </td>
                      <td className="text-sm text-muted">
                        {log.metadata && Object.keys(log.metadata).length > 0
                          ? JSON.stringify(log.metadata)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <button className="btn btn-ghost" disabled={page <= 1} onClick={() => load(page - 1)}>← Oldingi</button>
                <span className="text-muted text-sm" style={{ display: 'flex', alignItems: 'center' }}>
                  {page} / {totalPages} sahifa
                </span>
                <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => load(page + 1)}>Keyingi →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
