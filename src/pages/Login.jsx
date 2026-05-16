// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/utils';

export default function Login({ onSelect }) {
  const [panitiaList, setPanitiaList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPanitia()
      .then(res => setPanitiaList(res.data || []))
      .catch(() => toast('Gagal memuat daftar panitia', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>⏳</div>
          <div style={{ fontWeight: 700, color: 'var(--accent)' }}>Memuat Data Kepanitiaan...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 50, marginBottom: 16 }}>📜</div>
          <h1 style={{ color: 'var(--accent)', marginBottom: 8, fontSize: 24 }}>Sistem Surat Kepanitiaan</h1>
          <p style={{ opacity: .6, fontSize: 14 }}>Silakan pilih kepanitiaan untuk melanjutkan</p>
        </div>

        <div className="card" style={{ padding: '30px 20px' }}>
          {panitiaList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ marginBottom: 16, opacity: .5 }}>Belum ada data kepanitiaan.</div>
              <button className="btn btn-primary" onClick={() => onSelect({ ID: 'ADMIN', Nama_Panitia: 'Admin/Setup' })}>
                Lanjut sebagai Admin (Setup)
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {panitiaList.map(p => (
                <button 
                  key={p.ID} 
                  className="btn"
                  onClick={() => onSelect(p)}
                  style={{
                    padding: '20px',
                    textAlign: 'left',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transition: 'all .2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    🏛️
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{p.Nama_Panitia}</div>
                    <div style={{ fontSize: 12, opacity: .6, marginTop: 4 }}>Ketua: {p.Nama_Ketua}</div>
                  </div>
                  <div style={{ opacity: .3 }}>➜</div>
                </button>
              ))}
              
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px dashed var(--border)', textAlign: 'center' }}>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => onSelect({ ID: 'ADMIN', Nama_Panitia: 'Admin/Setup' })}>
                  ⚙️ Masuk sebagai Admin (Kelola Panitia)
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: 30, fontSize: 11, opacity: .4 }}>
          Pondok Modern Darussalam Gontor • © 2026
        </div>
      </div>
    </div>
  );
}
