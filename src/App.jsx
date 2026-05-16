// src/App.jsx
import { useState, useEffect } from 'react';
import BuatSurat    from './pages/BuatSurat';
import Mailing     from './pages/Mailing';
import MasterGuru  from './pages/MasterGuru';
import MasterSantri from './pages/MasterSantri';
import TemplateEditor from './pages/TemplateEditor';
import Seting      from './pages/Seting';
import Login       from './pages/Login';
import { api }     from './lib/api';

const NAV = [
  { id: 'buat',   label: 'Buat Surat',      icon: '✉' },
  { id: 'mailing',label: 'Mailing',          icon: '📋' },
  { id: 'editor', label: 'Editor Template',  icon: '📝' },
  { id: 'guru',   label: 'Master Guru',     icon: '👨‍🏫' },
  { id: 'santri', label: 'Master Santri',   icon: '🎓' },
  { id: 'seting', label: 'Pengaturan',      icon: '⚙' },
];

export default function App() {
  const [page, setPage] = useState('buat');
  const [batch, setBatch] = useState(null);
  const [seting, setSeting] = useState({ 
    idPanitia: localStorage.getItem('panitia_id') || '',
    namaPanitia: localStorage.getItem('panitia_nama') || ''
  });
  const [collapsed, setCollapsed] = useState(false);

  // Jika belum pilih panitia, tampilkan halaman Login
  if (!seting.idPanitia) {
    return <Login onSelect={(p) => {
      localStorage.setItem('panitia_id', p.ID);
      localStorage.setItem('panitia_nama', p.Nama_Panitia);
      setSeting({ idPanitia: p.ID, namaPanitia: p.Nama_Panitia });
      setPage(p.ID === 'ADMIN' ? 'seting' : 'buat');
    }} />;
  }

  const goMailing = (idBatch) => {
    setBatch(idBatch);
    setPage('mailing');
  };

  const handleLogout = () => {
    if (window.confirm('Keluar dari kepanitiaan ini?')) {
      localStorage.removeItem('panitia_id');
      localStorage.removeItem('panitia_nama');
      setSeting({ idPanitia: '', namaPanitia: '' });
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Lora', Georgia, serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 80 : 260,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 100
      }}>
        {/* Logo Section */}
        <div style={{ 
          padding: '24px 16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: 10, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, color: 'white'
          }}>✉</div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent)', lineHeight: 1.2 }}>Surat</div>
              <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1.2 }}>Kepanitiaan</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={page === n.id ? 'btn-primary' : 'btn-ghost'}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: page === n.id ? 700 : 500,
                gap: 12,
                border: 'none',
                background: page === n.id ? 'var(--accent-soft)' : 'transparent',
                color: page === n.id ? 'var(--accent)' : 'var(--text-muted)'
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
              {!collapsed && <span>{n.label}</span>}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" 
            onClick={handleLogout}
            style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', color: 'var(--danger)', gap: 12, background: 'transparent', border: '1px solid var(--border)' }}>
            <span style={{ flexShrink: 0 }}>🚪</span>
            {!collapsed && <span>Ganti Panitia</span>}
          </button>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', marginTop: 8, gap: 12, background: 'transparent', border: '1px solid var(--border)' }}
          >
            <span style={{ flexShrink: 0 }}>{collapsed ? '▶' : '◀'}</span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          height: 70,
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 90
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              {NAV.find(n => n.id === page)?.label}
            </div>
            <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 500 }}>
              Pondok Modern Darussalam Gontor
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{seting.namaPanitia}</div>
              <div style={{ fontSize: 10, opacity: .5 }}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              👤
            </div>
          </div>
        </div>

        {/* Page Container */}
        <div style={{ padding: '24px 28px' }}>
          {page === 'buat'    && <BuatSurat  seting={seting} onDone={goMailing} />}
          {page === 'mailing' && <Mailing    seting={seting} initBatch={batch} />}
          {page === 'editor'  && <TemplateEditor seting={seting} />}
          {page === 'guru'    && <MasterGuru seting={seting} />}
          {page === 'santri'  && <MasterSantri seting={seting} />}
          {page === 'seting'  && <Seting     seting={seting} onSave={setSeting} />}
        </div>
      </div>

      <style>{`
        :root {
          --bg:          #F7F5F0;
          --card:        #FFFFFF;
          --sidebar-bg:  #FEFCF8;
          --border:      #E8E4DC;
          --text:        #1C1A17;
          --text-muted:  #7A7569;
          --accent:      #7C5C2E;
          --accent-soft: #F5EDE0;
          --accent2:     #2D6A4F;
          --danger:      #C0392B;
          --danger-soft: #FDECEA;
          --radius:      10px;
        }
        * { box-sizing:border-box; }
        body { margin:0; }
        button:hover { opacity:.85; }
        input, select, textarea {
          font-family: inherit;
          font-size: 13px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 8px 12px;
          background: var(--card);
          color: var(--text);
          outline: none;
          width: 100%;
        }
        input:focus, select:focus, textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(124,92,46,.12);
        }
        label { font-size:12px; font-weight:600; color:var(--text-muted);
                display:block; margin-bottom:4px; letter-spacing:.4px; }
        .card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
        }
        .btn {
          display:inline-flex; align-items:center; gap:6px;
          padding:9px 18px; border-radius:8px; border:none;
          cursor:pointer; font-size:13px; font-weight:600;
          font-family:inherit; transition:all .15s;
        }
        .btn-primary { background:var(--accent); color:#fff; }
        .btn-secondary { background:var(--accent-soft); color:var(--accent); }
        .btn-success { background:var(--accent2); color:#fff; }
        .btn-danger { background:var(--danger-soft); color:var(--danger); }
        .btn-ghost { background:transparent; color:var(--text-muted);
                     border:1px solid var(--border); }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
        .section-title {
          font-size:13px; font-weight:700; letter-spacing:.5px;
          text-transform:uppercase; color:var(--text-muted);
          margin-bottom:14px; padding-bottom:8px;
          border-bottom:1px solid var(--border);
        }
        .badge {
          display:inline-block; padding:2px 8px; border-radius:99px;
          font-size:11px; font-weight:600;
        }
        .badge-green { background:#D1FAE5; color:#065F46; }
        .badge-blue  { background:#DBEAFE; color:#1E40AF; }
        .badge-amber { background:#FEF3C7; color:#92400E; }
        @media (max-width: 768px) {
          .grid-2, .grid-3 { grid-template-columns: 1fr; }
        }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .fade-in { animation: fadeIn .25s ease; }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:none} }
        
        /* Modal additions for backwards compatibility */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          backdrop-filter: blur(4px); display: flex; align-items: center;
          justify-content: center; z-index: 1000; padding: 20px;
          animation: fadeIn 0.15s ease;
        }
        .modal-box {
          background: var(--card); border-radius: 16px;
          box-shadow: 0 10px 32px rgba(0,0,0,.10); width: 100%;
          max-width: 560px; max-height: 85vh; overflow-y: auto;
          animation: fadeIn 0.2s ease;
        }
        .modal-header {
          padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          font-weight: 700; font-size: 15px; color: var(--accent);
          position: sticky; top: 0; background: var(--card); z-index: 1;
        }
        .modal-body { padding: 20px 24px; }
        .modal-footer {
          padding: 16px 24px; border-top: 1px solid var(--border);
          display: flex; gap: 8px; justify-content: flex-end;
        }
        .toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 9999;
          padding: 12px 20px; border-radius: var(--radius);
          font-size: 13px; color: #fff; font-weight: 600;
          max-width: 340px; box-shadow: 0 10px 32px rgba(0,0,0,.10);
          animation: slideIn 0.2s ease;
        }
      `}</style>
    </div>
  );
}
