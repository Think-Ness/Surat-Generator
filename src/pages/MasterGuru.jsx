// src/pages/MasterGuru.jsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/utils';

const EMPTY = { Nama:'', Jabatan_Panitia:'', Nama_Kepanitiaan:'', Tahun_Pengabdian:'', Kamar_Bagian:'', Prodi:'', Semester:'' };

export default function MasterGuru({ seting }) {
  const isAdmin = seting.idPanitia === 'ADMIN';
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ ...EMPTY, Nama_Kepanitiaan: seting.namaPanitia });
  const [editing, setEditing] = useState(null); 
  const [search,  setSearch]  = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = () => {
    setLoading(true);
    const params = isAdmin ? {} : { panitiaName: seting.namaPanitia };
    api.getGuru(params)
       .then(r => setList(r.data || []))
       .catch(() => toast('Gagal memuat','error'))
       .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [seting.idPanitia]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.Nama) { toast('Nama harus diisi','error'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.updateGuru({ ...editing, ...form });
        toast('Data diperbarui','success');
      } else {
        await api.addGuru(form);
        toast('Guru ditambahkan','success');
      }
      setForm(EMPTY);
      setEditing(null);
      load();
    } catch(e) {
      toast('Gagal: '+e.message,'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (g) => {
    setEditing(g);
    setForm({
      Nama: g.Nama, 
      Jabatan_Panitia: g.Jabatan_Panitia || '',
      Nama_Kepanitiaan: g.Nama_Kepanitiaan || '',
      Tahun_Pengabdian: g.Tahun_Pengabdian,
      Kamar_Bagian: g.Kamar_Bagian, 
      Prodi: g.Prodi, 
      Semester: g.Semester,
    });
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const handleDelete = async (g) => {
    if (!window.confirm(`Hapus ${g.Nama}?`)) return;
    try {
      await api.deleteGuru({ _row: g._row });
      toast('Dihapus','success');
      load();
    } catch(e) {
      toast('Gagal: '+e.message,'error');
    }
  };

  const filtered = list.filter(g =>
    g.Nama?.toLowerCase().includes(search.toLowerCase()) ||
    g.Kamar_Bagian?.toLowerCase().includes(search.toLowerCase()) ||
    g.Nama_Kepanitiaan?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="card" style={{ marginBottom:16 }}>
        <div className="section-title">
          {editing ? `✏ Edit: ${editing.Nama}` : '➕ Tambah Guru'}
          {!isAdmin && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 10, opacity: .5 }}>(Mode: {seting.namaPanitia})</span>}
        </div>
        {isAdmin && (
          <div style={{ marginBottom: 16, padding: 10, background: '#FFFBEB', borderRadius: 8, fontSize: 12, border: '1px solid #FDE68A' }}>
            💡 <b>Mode Admin:</b> Anda melihat semua data guru dari seluruh kepanitiaan.
          </div>
        )}
        <div className="grid-3" style={{ marginBottom:12 }}>
          <div>
            <label>Nama Lengkap *</label>
            <input value={form.Nama} onChange={e => set('Nama', e.target.value)}
              placeholder="Al Ustadz ..." />
          </div>
          <div>
            <label>Jabatan di Panitia</label>
            <input value={form.Jabatan_Panitia} onChange={e => set('Jabatan_Panitia', e.target.value)}
              placeholder="Sekretaris / Bendahara" />
          </div>
          <div>
            <label>Nama Kepanitiaan</label>
            <input value={form.Nama_Kepanitiaan} onChange={e => set('Nama_Kepanitiaan', e.target.value)}
              disabled={!isAdmin}
              style={{ background: !isAdmin ? 'var(--bg)' : '#fff' }}
              placeholder="Panitia 100 Tahun" />
          </div>
        </div>
        <div className="grid-3" style={{ marginBottom:12 }}>
          <div>
            <label>Tahun Pengabdian</label>
            <input value={form.Tahun_Pengabdian}
              onChange={e => set('Tahun_Pengabdian', e.target.value)}
              placeholder="2024/2025" />
          </div>
          <div>
            <label>Kamar / Bagian</label>
            <input value={form.Kamar_Bagian}
              onChange={e => set('Kamar_Bagian', e.target.value)}
              placeholder="Bagian Keamanan" />
          </div>
          <div>
            <label>Prodi & Semester</label>
            <div style={{ display:'flex', gap:8 }}>
              <input value={form.Prodi} onChange={e => set('Prodi', e.target.value)}
                placeholder="Prodi" style={{ flex:2 }} />
              <input value={form.Semester} onChange={e => set('Semester', e.target.value)}
                placeholder="Sem" style={{ flex:1 }} />
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          {editing && (
            <button className="btn btn-ghost"
              onClick={() => { setEditing(null); setForm(EMPTY); }}>
              Batal
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Menyimpan...' : editing ? '✓ Update' : '➕ Tambah'}
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div className="section-title" style={{ margin:0, border:'none', padding:0 }}>
            Daftar Guru ({filtered.length})
          </div>
          <input placeholder="🔍 Cari nama/panitia..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ width:200, fontSize:12 }} />
        </div>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', opacity:.5 }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', opacity:.5 }}>Belum ada data</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--bg)' }}>
                  {['No.','Nama','Jabatan & Panitia','Bagian','Prodi/Sem','Aksi'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:12,
                                         fontWeight:600, color:'var(--text-muted)',
                                         borderBottom:'1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((g, i) => (
                  <tr key={g.ID_Guru} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'8px 10px', opacity:.5 }}>{i+1}</td>
                    <td style={{ padding:'8px 10px', fontWeight:600 }}>{g.Nama}</td>
                    <td style={{ padding:'8px 10px' }}>
                      <div style={{ color:'var(--primary)', fontWeight:600, fontSize:11 }}>{g.Jabatan_Panitia || '-'}</div>
                      <div style={{ fontSize:10, opacity:.6 }}>{g.Nama_Kepanitiaan}</div>
                    </td>
                    <td style={{ padding:'8px 10px', opacity:.7 }}>{g.Kamar_Bagian}</td>
                    <td style={{ padding:'8px 10px', opacity:.7, fontSize:11 }}>
                      {g.Prodi} {g.Semester ? `(Sem ${g.Semester})` : ''}
                    </td>
                    <td style={{ padding:'8px 10px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-secondary"
                          style={{ padding:'4px 8px', fontSize:11 }}
                          onClick={() => handleEdit(g)}>✏️</button>
                        <button className="btn btn-danger"
                          style={{ padding:'4px 8px', fontSize:11 }}
                          onClick={() => handleDelete(g)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
