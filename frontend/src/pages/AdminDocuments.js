import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { Upload, Trash2, Edit2, Users, PlusCircle, X, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminDocuments() {
  const [docs, setDocs]         = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editDoc, setEditDoc]   = useState(null);
  const fileInputRef            = useRef();

  // Upload form state
  const [form, setForm] = useState({
    title: '', description: '', allowedUsers: [], expiresAt: '', file: null,
  });
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const [docsRes, usersRes] = await Promise.all([
        api.get('/admin/documents'),
        api.get('/admin/users'),
      ]);
      setDocs(docsRes.data.documents);
      setUsers(usersRes.data.users.filter(u => u.role === 'user'));
    } catch (err) {
      toast.error('Ma\'lumotlarni yuklashda xatolik.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file) return toast.error('Iltimos fayl tanlang.');
    if (!form.title) return toast.error('Sarlavha kiritish shart.');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', form.file);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('allowedUsers', JSON.stringify(form.allowedUsers));
      if (form.expiresAt) fd.append('expiresAt', form.expiresAt);

      await api.post('/admin/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Hujjat muvaffaqiyatli yuklandi!');
      setShowUpload(false);
      setForm({ title: '', description: '', allowedUsers: [], expiresAt: '', file: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Yuklashda xatolik.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`"${title}" hujjatini o'chirasizmi? Bu amalni qaytarib bo'lmaydi.`)) return;
    try {
      await api.delete(`/admin/documents/${id}`);
      toast.success('Hujjat o\'chirildi.');
      setDocs(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      toast.error('O\'chirishda xatolik.');
    }
  };

  const handleRevoke = async (docId, userId) => {
    try {
      await api.patch(`/admin/documents/${docId}/revoke/${userId}`);
      toast.success('Kirish huquqi olib tashlandi.');
    } catch (err) {
      toast.error('Huquqni olib tashlashda xatolik.');
    }
  };

  const handleToggleActive = async (doc) => {
    try {
      await api.patch(`/admin/documents/${doc._id}`, { isActive: !doc.isActive });
      toast.success(`Hujjat ${doc.isActive ? 'o\'chirildi' : 'faollashtirildi'}.`);
    } catch (err) {
      toast.error('Yangilashda xatolik.');
    }
  };

  const handleEditSave = async () => {
    if (!editDoc) return;
    try {
      await api.patch(`/admin/documents/${editDoc._id}`, {
        title: editDoc.title,
        description: editDoc.description,
        expiresAt: editDoc.expiresAt || null,
        allowedUsers: editDoc.allowedUsers.map(u => u._id || u),
      });
      toast.success('Hujjat yangilandi.');
      setEditDoc(null);
      load();
    } catch (err) {
      toast.error('Yangilashda xatolik.');
    }
  };

  const toggleUserAccess = (userId) => {
    setForm(prev => ({
      ...prev,
      allowedUsers: prev.allowedUsers.includes(userId)
        ? prev.allowedUsers.filter(id => id !== userId)
        : [...prev.allowedUsers, userId],
    }));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1>Hujjatlar</h1>
          <p className="text-muted text-sm mt-1">Jami {docs.length} ta hujjat</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
          <Upload size={16} /> Hujjat yuklash
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowUpload(false)}>
          <div className="modal fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Hujjat yuklash</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setShowUpload(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>Sarlavha *</label>
                <input type="text" placeholder="Hujjat nomi" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} required maxLength={200} />
              </div>

              <div className="form-group">
                <label>Tavsif</label>
                <textarea rows={2} placeholder="Ixtiyoriy tavsif" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} maxLength={1000} />
              </div>

              <div className="form-group">
                <label>Fayl * (PDF, rasm, matn — maks 50MB)</label>
                <input type="file" ref={fileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt"
                  onChange={e => setForm({ ...form, file: e.target.files[0] })} required />
              </div>

              <div className="form-group">
                <label>Muddati tugaydi (ixtiyoriy)</label>
                <input type="datetime-local" value={form.expiresAt}
                  onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Foydalanuvchilarga ruxsat berish</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {users.length === 0 && <p className="text-muted text-sm">Hali foydalanuvchi ro'yxatdan o'tmagan.</p>}
                  {users.map(u => (
                    <button
                      key={u._id}
                      type="button"
                      className={`btn ${form.allowedUsers.includes(u._id) ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => toggleUserAccess(u._id)}
                    >
                      {form.allowedUsers.includes(u._id) && <Check size={12} />}
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? <><span className="spinner" /> Yuklanmoqda...</> : <><Upload size={15} /> Yuklash</>}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowUpload(false)}>Bekor qilish</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editDoc && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditDoc(null)}>
          <div className="modal fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Hujjatni tahrirlash</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setEditDoc(null)}><X size={18} /></button>
            </div>

            <div className="form-group">
              <label>Sarlavha</label>
              <input type="text" value={editDoc.title}
                onChange={e => setEditDoc({ ...editDoc, title: e.target.value })} maxLength={200} />
            </div>

            <div className="form-group">
              <label>Tavsif</label>
              <textarea rows={2} value={editDoc.description}
                onChange={e => setEditDoc({ ...editDoc, description: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Muddat tugash sanasi</label>
              <input type="datetime-local" value={editDoc.expiresAt ? editDoc.expiresAt.slice(0, 16) : ''}
                onChange={e => setEditDoc({ ...editDoc, expiresAt: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Kirish huquqi berilgan foydalanuvchilar</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {editDoc.allowedUsers?.map(u => (
                  <span key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                    padding: '4px 10px', borderRadius: 99, fontSize: 12 }}>
                    {u.name}
                    <button onClick={() => setEditDoc({
                      ...editDoc,
                      allowedUsers: editDoc.allowedUsers.filter(x => x._id !== u._id),
                    })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {users.filter(u => !editDoc.allowedUsers?.find(x => x._id === u._id)).map(u => (
                  <button key={u._id} type="button" className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setEditDoc({ ...editDoc, allowedUsers: [...(editDoc.allowedUsers || []), u] })}>
                    <PlusCircle size={12} /> {u.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button className="btn btn-primary" onClick={handleEditSave}><Check size={15} /> Saqlash</button>
              <button className="btn btn-ghost" onClick={() => setEditDoc(null)}>Bekor qilish</button>
            </div>
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sarlavha</th>
                <th>Turi</th>
                <th>Hajmi</th>
                <th>Ruxsat</th>
                <th>Muddat</th>
                <th>Holat</th>
                <th>Ko'rishlar</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 && (
                <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 30 }}>Hali hujjat yuklanmagan</td></tr>
              )}
              {docs.map(doc => (
                <tr key={doc._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{doc.title}</div>
                    <div className="text-muted text-sm">{doc.originalFilename}</div>
                  </td>
                  <td><span className="badge badge-primary" style={{ fontSize: 10 }}>{doc.mimeType.split('/')[1]?.toUpperCase()}</span></td>
                  <td className="text-muted text-sm">{formatSize(doc.fileSize)}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 200 }}>
                      {doc.allowedUsers?.slice(0, 3).map(u => (
                        <span key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 3,
                          background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                          padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
                          {u.name}
                          <button onClick={() => handleRevoke(doc._id, u._id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      {doc.allowedUsers?.length > 3 && (
                        <span className="text-muted text-sm">+{doc.allowedUsers.length - 3} ta</span>
                      )}
                    </div>
                  </td>
                  <td className="text-sm">
                    {doc.expiresAt ? (
                      <span style={{ color: new Date(doc.expiresAt) < new Date() ? 'var(--danger)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />
                        {format(new Date(doc.expiresAt), 'MMM d, yyyy')}
                      </span>
                    ) : <span className="text-muted">Cheksiz</span>}
                  </td>
                  <td>
                    <span className={`badge ${doc.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {doc.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  </td>
                  <td className="text-muted text-sm">{doc.viewCount}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost" style={{ padding: '6px 10px' }}
                        onClick={() => setEditDoc(doc)} title="Tahrirlash">
                        <Edit2 size={14} />
                      </button>
                      <button className={`btn ${doc.isActive ? 'btn-ghost' : 'btn-success'}`}
                        style={{ padding: '6px 10px', fontSize: 11 }}
                        onClick={() => handleToggleActive(doc)} title={doc.isActive ? 'O\'chirish' : 'Faollashtirish'}>
                        {doc.isActive ? 'O\'chirish' : 'Faollashtirish'}
                      </button>
                      <button className="btn btn-danger" style={{ padding: '6px 10px' }}
                        onClick={() => handleDelete(doc._id, doc.title)} title="O'chirish">
                        <Trash2 size={14} />
                      </button>
                    </div>
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
