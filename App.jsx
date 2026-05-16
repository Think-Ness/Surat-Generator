// src/App.jsx
import { useState, useEffect } from 'react';
import BuatSurat   from './pages/BuatSurat';
import Mailing     from './pages/Mailing';
import MasterGuru  from './pages/MasterGuru';
import Seting      from './pages/Seting';
import { api }     from './lib/api';

const NAV = [
  { id: 'buat',   label: 'Buat Surat',    icon: '✉' },
  { id: 'mailing',label: 'Mailing',        icon: '📋' },
  { id: 'guru',   label: 'Master Guru',   icon: '👤' },
  { id: 'seting', label: 'Pengaturan',    icon: '⚙' },
];

export default function App() {
  const [page,    setPage]    = useState('buat');
  const [seting,  setSeting]  = useState({});
  const [sidebar, setSidebar] = useState(true);
  const [batch,   setBatch]   = useState(null); // untuk buka Mailing langsung dari BuatSurat

  useEffect(() => {
    api.getSeting().then(r => setSeting(r.data || {})).catch(() => {});
  }, []);

  function goMailing(idBatch) {
    setBatch(idBatch);
    setPage('mailing');
  }

  const instansi = seting?.[0]?.nilai || 'Surat Kepanitiaan';

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:"'Lora', Georgia, serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebar ? 220 : 60,
        background:'var(--sidebar-bg)',
        borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column',
        transition:'width .25s ease',
        flexShrink:0,
        position:'sticky', top:0, height:'100vh',
      }}>
        {/* Logo */}
        <div style={{ padding:'20px 16px 12px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:8,
              background:'var(--accent)', display:'flex',
              alignItems:'center', justifyContent:'center',
              fontSize:18, flexShrink:0,
            }}>✉</div>
            {sidebar && (
              <div>
                <div style={{ fontWeight:700, fontSize:13, lineHeight:1.2 }}>Surat</div>
                <div style={{ fontSize:11, opacity:.6, lineHeight:1.2 }}>Kepanitiaan</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 8px' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              width:'100%', display:'flex', alignItems:'center', gap:12,
              padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer',
              background: page===n.id ? 'var(--accent-soft)' : 'transparent',
              color: page===n.id ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: page===n.id ? 600 : 400,
              fontSize:14, textAlign:'left',
              transition:'all .15s',
              marginBottom:2,
            }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{n.icon}</span>
              {sidebar && <span>{n.label}</span>}
            </button>
          ))}
        </nav>

        {/* Toggle sidebar */}
        <button onClick={() => setSidebar(s => !s)} style={{
          margin:'0 8px 12px', padding:'8px', borderRadius:8,
          border:'1px solid var(--border)', background:'transparent',
          cursor:'pointer', color:'var(--text-muted)', fontSize:14,
        }}>
          {sidebar ? '◀ Collapse' : '▶'}
        </button>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, overflow:'auto' }}>
        {/* Header */}
        <div style={{
          padding:'16px 28px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'var(--card)', position:'sticky', top:0, zIndex:10,
        }}>
          <div>
            <div style={{ fontWeight:700, fontSize:16 }}>
              {NAV.find(n => n.id===page)?.label}
            </div>
            <div style={{ fontSize:12, opacity:.5, marginTop:2 }}>{instansi}</div>
          </div>
          <div style={{ fontSize:12, opacity:.4 }}>
            {new Date().toLocaleDateString('id-ID',{ weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding:'24px 28px' }}>
          {page==='buat'    && <BuatSurat  seting={seting} onDone={goMailing} />}
          {page==='mailing' && <Mailing    seting={seting} initBatch={batch} />}
          {page==='guru'    && <MasterGuru />}
          {page==='seting'  && <Seting     seting={seting} onSave={setSeting} />}
        </div>
      </main>

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
      `}</style>
    </div>
  );
}
