import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FileText, Eye, Clock, AlertCircle, Search } from 'lucide-react';
import { format } from 'date-fns';
import './UserDashboard.css';

export default function UserDashboard() {
  const navigate  = useNavigate();
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    api.get('/documents')
      .then(r => setDocs(r.data.documents))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const mimeIcon = (mime) => {
    if (mime === 'application/pdf') return '📄';
    if (mime.startsWith('image/')) return '🖼️';
    return '📃';
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1>Hujjatlar</h1>
          <p className="text-muted text-sm mt-1">Barcha mavjud hujjatlar ro'yxati</p>
        </div>
      </div>

      <div className="search-bar mb-4">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Hujjat qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} color="#4f46e5" />
          <h3>{search ? 'Qidiruv bo\'yicha hujjat topilmadi' : 'Hujjatlar mavjud emas'}</h3>
          <p>{search ? 'Boshqa so\'z bilan qidiring.' : 'Hujjatlar hali yuklanmagan.'}</p>
        </div>
      ) : (
        <div className="doc-grid">
          {filtered.map(doc => (
            <div key={doc._id} className="doc-card card">
              <div className="doc-icon">{mimeIcon(doc.mimeType)}</div>
              <div className="doc-info">
                <h3 className="doc-title">{doc.title}</h3>
                {doc.description && <p className="doc-desc">{doc.description}</p>}
                <div className="doc-meta">
                  <span><FileText size={12} /> {formatSize(doc.fileSize)}</span>
                  <span><Eye size={12} /> {doc.viewCount} marta ko'rilgan</span>
                  {doc.expiresAt && (
                    <span className="expiry">
                      <Clock size={12} />
                      Tugaydi: {format(new Date(doc.expiresAt), 'dd.MM.yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="btn btn-primary view-btn"
                onClick={() => navigate(`/view/${doc._id}`)}
              >
                <Eye size={15} /> Ko'rish
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
