// src/components/BarangModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/utils';

const EMPTY_ITEM = { Nama_Barang:'', Jumlah_Barang:'', Satuan:'', Keterangan:'' };
const SATUAN_OPT = ['unit','buah','set','lembar','pak','kotak','meter','liter'];

export default function BarangModal({ show, noSurat, onClose }) {
  if (!show) return null;
  const [list,   setList]   = useState([]);
  const [form,   setForm]   = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const [loading,setLoading]= useState(true);

  const load = () => {
    setLoading(true);
    api.getBarang(noSurat)
       .then(r => setList(r.data || []))
       .catch(() => toast('Gagal memuat barang','error'))
       .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [noSurat]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.Nama_Barang)    { toast('Nama barang harus diisi','error'); return; }
    if (!form.Jumlah_Barang)  { toast('Jumlah harus diisi','error'); return; }
    setSaving(true);
    try {
      await api.insertBarang([{ ...form, No_Surat: noSurat }]);
      toast('Barang ditambahkan','success');
      setForm(EMPTY_ITEM);
      load();
    } catch(e) {
      toast('Gagal: '+e.message,'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus ${item.Nama_Barang}?`)) return;
    try {
      await api.deleteBarang(item.ID_Peminjaman);
      toast('Dihapus','success');
      load();
    } catch(e) {
      toast('Gagal: '+e.message,'error');
    }
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:1000, padding:16,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background:'var(--card)', borderRadius:14, width:'100%', maxWidth:580,
        maxHeight:'85vh', display:'flex', flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,.2)',
        animation:'fadeIn .2s ease',
      }}>
        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)',
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:700 }}>📦 Daftar Barang Pinjaman</div>
            <div style={{ fontSize:12, opacity:.5 }}>No. Surat: {noSurat}</div>
          </div>
          <button onClick={onClose} style={{
            background:'var(--bg)', border:'1px solid var(--border)',
            borderRadius:8, width:32, height:32, cursor:'pointer',
            fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflow:'auto', padding:'16px 20px' }}>
          {/* Form tambah */}
          <div style={{ marginBottom:16, padding:14, background:'var(--bg)',
                        borderRadius:10, border:'1px solid var(--border)' }}>
            <div style={{ fontWeight:600, fontSize:12, marginBottom:10,
                          textTransform:'uppercase', letterSpacing:.4,
                          color:'var(--text-muted)' }}>Tambah Barang</div>
            <div style={{ marginBottom:10 }}>
              <label>Nama Barang *</label>
              <input value={form.Nama_Barang}
                onChange={e => set('Nama_Barang', e.target.value)}
                placeholder="Meja, Kursi, Proyektor..." />
            </div>
            <div className="grid-3" style={{ marginBottom:10 }}>
              <div>
                <label>Jumlah *</label>
                <input type="number" min="1" value={form.Jumlah_Barang}
                  onChange={e => set('Jumlah_Barang', e.target.value)} />
              </div>
              <div>
                <label>Satuan</label>
                <select value={form.Satuan} onChange={e => set('Satuan', e.target.value)}>
                  <option value="">-- Pilih --</option>
                  {SATUAN_OPT.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>Keterangan</label>
                <input value={form.Keterangan}
                  onChange={e => set('Keterangan', e.target.value)}
                  placeholder="Opsional" />
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}
                style={{ fontSize:12 }}>
                {saving ? '⏳' : '➕ Tambah Barang'}
              </button>
            </div>
          </div>

          {/* Daftar barang */}
          {loading ? (
            <div style={{ textAlign:'center', opacity:.5, padding:20 }}>Memuat...</div>
          ) : list.length === 0 ? (
            <div style={{ textAlign:'center', opacity:.5, padding:20, fontSize:13 }}>
              Belum ada barang. Tambahkan di atas.
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--bg)' }}>
                  {['No.','Nama Barang','Jml','Satuan','Ket',''].map(h => (
                    <th key={h} style={{ padding:'7px 8px', textAlign:'left', fontSize:11,
                                         fontWeight:600, color:'var(--text-muted)',
                                         borderBottom:'1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((b, i) => (
                  <tr key={b.ID_Peminjaman} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'7px 8px', opacity:.5 }}>{i+1}</td>
                    <td style={{ padding:'7px 8px', fontWeight:600 }}>{b.Nama_Barang}</td>
                    <td style={{ padding:'7px 8px' }}>{b.Jumlah_Barang}</td>
                    <td style={{ padding:'7px 8px', opacity:.7 }}>{b.Satuan}</td>
                    <td style={{ padding:'7px 8px', opacity:.7 }}>{b.Keterangan}</td>
                    <td style={{ padding:'7px 8px' }}>
                      <button className="btn btn-danger"
                        style={{ padding:'3px 8px', fontSize:11 }}
                        onClick={() => handleDelete(b)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:'var(--accent-soft)' }}>
                  <td colSpan={2} style={{ padding:'8px', fontWeight:600, fontSize:12 }}>
                    Total: {list.length} item
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)',
                      display:'flex', justifyContent:'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            ✓ Selesai ({list.length} barang)
          </button>
        </div>
      </div>
    </div>
  );
}
