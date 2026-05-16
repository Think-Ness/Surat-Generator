// src/pages/TemplateEditor.jsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/utils';

export default function TemplateEditor({ seting }) {
  const isAdmin = seting.idPanitia === 'ADMIN';
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [seting.idPanitia]);

  const load = async () => {
    setLoading(true);
    try {
      const params = isAdmin ? {} : { panitiaName: seting.namaPanitia };
      const res = await api.listTemplates(params);
      setList(res.data || []);
      if (res.data?.length > 0) {
        const first = res.data[0];
        if (typeof first === 'string') {
          toast('Backend belum di-update. Silakan New Deployment di Apps Script!', 'error');
          return;
        }
        setSelected(first);
      }
    } catch (e) {
      toast('Gagal memuat daftar template', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Google Docs editor URL for docx files
  // We use the webViewLink or just the edit URL
  const getEditorUrl = (item) => {
    if (!item) return '';
    // Format URL untuk Google Docs Editor (Office Editing)
    return `https://docs.google.com/document/d/${item.id}/edit?rm=minimal`;
  };

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div className="card" style={{ marginBottom: 16, padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 20 }}>📝</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Template Editor</div>
              <div style={{ fontSize: 11, opacity: .6 }}>Edit file .docx langsung di Google Drive</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 400 }}>
            <label style={{ margin: 0, whiteSpace: 'nowrap' }}>Pilih File:</label>
            <select 
              value={selected?.id || ''} 
              onChange={e => setSelected(list.find(t => t.id === e.target.value))}
              style={{ flex: 1 }}
            >
              {list.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button className="btn btn-ghost" onClick={load} style={{ padding: '8px 12px' }}>🔄</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', background: '#fff', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', zIndex: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>⏳</div>
              <div style={{ fontSize: 13, opacity: .6 }}>Menyiapkan Editor...</div>
            </div>
          </div>
        ) : !selected ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', opacity: .5 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
              <div>Belum ada template. Silakan unggah di menu Pengaturan.</div>
            </div>
          </div>
        ) : (
          <iframe
            src={getEditorUrl(selected)}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Word Template Editor"
            allow="autoplay"
          />
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>💡</span>
        <span>Perubahan akan disimpan otomatis ke Google Drive. Anda harus login ke akun Google yang memiliki akses ke folder template.</span>
      </div>
    </div>
  );
}
