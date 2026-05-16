// src/pages/MasterSantri.jsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/utils';

const EMPTY = { Nama:'', Jabatan_Panitia:'', Nama_Kepanitiaan:'', Kelas:'', Kamar_Bagian:'' };

export default function MasterSantri({ seting }) {
  const isAdmin = seting.idPanitia === 'ADMIN';
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ ...EMPTY, Nama_Kepanitiaan: seting.namaPanitia });
  const [editing, setEditing] = useState(null); 
  const [search,  setSearch]  = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = () => {
    setLoading(true);
    api.getSantri()
       .then(r => setList(r.data || []))
       .catch(() => toast('Gagal memuat data santri','error'))
       .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.Nama) { toast('Nama harus diisi','error'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.updateSantri({ ...editing, ...form });
        toast('Data santri diperbarui','success');
      } else {
        await api.addSantri(form);
        toast('Santri ditambahkan','success');
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

  const handleEdit = (s) => {
    setEditing(s);
    setForm({
      Nama: s.Nama, 
      Jabatan_Panitia: s.Jabatan_Panitia || '',
      Nama_Kepanitiaan: s.Nama_Kepanitiaan || '',
      Kelas: s.Kelas,
      Kamar_Bagian: s.Kamar_Bagian,
    });
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Hapus ${s.Nama}?`)) return;
    try {
      await api.deleteSantri({ _row: s._row });
      toast('Dihapus','success');
      load();
    } catch(e) {
      toast('Gagal: '+e.message,'error');
    }
  };

  const filtered = list.filter(s =>
    s.Nama?.toLowerCase().includes(search.toLowerCase()) ||
    s.Kamar_Bagian?.toLowerCase().includes(search.toLowerCase()) ||
    s.Nama_Kepanitiaan?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="card" style={{ marginBottom:16 }}>
        <div className="section-title">
          {editing ? `✏ Edit Santri: ${editing.Nama}` : '➕ Tambah Santri Baru'}
        </div>
        <div className="grid-3" style={{ marginBottom:12 }}>
          <div>
            <label>Nama Lengkap Santri *</label>
            <input value={form.Nama} onChange={e => set('Nama', e.target.value)}
              placeholder="Masukkan nama..." />
          </div>
          <div>
            <label>Jabatan di Panitia</label>
            <input value={form.Jabatan_Panitia} onChange={e => set('Jabatan_Panitia', e.target.value)}
              placeholder="Sekretaris / Anggota / dll" />
          </div>
          <div>
            <label>Nama Kepanitiaan</label>
            <input value={form.Nama_Kepanitiaan} onChange={e => set('Nama_Kepanitiaan', e.target.value)}
              placeholder="Panitia Ramadhan" />
          </div>
        </div>
        <div className="grid-3" style={{ marginBottom:12 }}>
          <div>
            <label>Kelas</label>
            <input value={form.Kelas}
              onChange={e => set('Kelas', e.target.value)}
              placeholder="5-B / 6-K" />
          </div>
          <div style={{ gridColumn: '2 / 4' }}>
            <label>Kamar / Gedung</label>
            <input value={form.Kamar_Bagian}
              onChange={e => set('Kamar_Bagian', e.target.value)}
              placeholder="Gedung Al-Azhar 101" />
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
            Daftar Master Santri ({filtered.length})
          </div>
          <input placeholder="🔍 Cari nama/panitia..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ width:220, fontSize:12 }} />
        </div>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', opacity:.5 }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', opacity:.5 }}>Belum ada data santri</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--bg)' }}>
                  {['No.','Nama','Jabatan & Panitia','Kelas','Kamar/Gedung','Aksi'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:12,
                                         fontWeight:600, color:'var(--text-muted)',
                                         borderBottom:'1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.ID_Santri} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'8px 10px', opacity:.5 }}>{i+1}</td>
                    <td style={{ padding:'8px 10px', fontWeight:600 }}>{s.Nama}</td>
                    <td style={{ padding:'8px 10px' }}>
                      <div style={{ color:'var(--primary)', fontWeight:600, fontSize:11 }}>{s.Jabatan_Panitia || '-'}</div>
                      <div style={{ fontSize:10, opacity:.6 }}>{s.Nama_Kepanitiaan}</div>
                    </td>
                    <td style={{ padding:'8px 10px', opacity:.7 }}>{s.Kelas}</td>
                    <td style={{ padding:'8px 10px', opacity:.7 }}>{s.Kamar_Bagian}</td>
                    <td style={{ padding:'8px 10px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-secondary"
                          style={{ padding:'4px 8px', fontSize:11 }}
                          onClick={() => handleEdit(s)}>✏️</button>
                        <button className="btn btn-danger"
                          style={{ padding:'4px 8px', fontSize:11 }}
                          onClick={() => handleDelete(s)}>🗑</button>
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
