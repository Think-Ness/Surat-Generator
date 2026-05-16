import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/utils';

export default function Seting({ seting, onSave }) {
  const [panitiaList, setPanitiaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    Nama_Panitia: '', Instansi: '', Alamat: '', Nama_Ketua: '', Jabatan: '', Link_TTD: ''
  });
  const [savingTpl, setSavingTpl] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPanitia();
  }, []);

  const fetchPanitia = async () => {
    setLoading(true);
    try {
      const r = await api.getPanitia();
      setPanitiaList(r.data || []);
    } catch (e) {
      toast('Gagal memuat panitia', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePanitia = async () => {
    if (!form.Nama_Panitia) return toast('Nama Panitia wajib diisi', 'error');
    setLoading(true);
    try {
      await api.savePanitia({ ...form, ID: editingId });
      toast('Panitia disimpan', 'success');
      setForm({ Nama_Panitia: '', Instansi: '', Alamat: '', Nama_Ketua: '', Jabatan: '', Link_TTD: '' });
      setEditingId(null);
      fetchPanitia();
    } catch (e) {
      toast('Gagal simpan: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus panitia ini?')) return;
    try {
      await api.deletePanitia(id);
      toast('Terhapus', 'success');
      fetchPanitia();
    } catch (e) { toast('Gagal hapus', 'error'); }
  };

  const [customTplName, setCustomTplName] = useState('Perizinan');

  const handleUploadTemplate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSavingTpl(true);
    try {
      const fileName = (customTplName || 'Template').replace('.docx', '') + '.docx';
      const panitiaName = (seting?.namaPanitia && seting?.idPanitia !== 'ADMIN')
        ? seting.namaPanitia : 'Lainnya';
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target.result.split(',')[1];
          await api.saveTemplate({ base64, fileName, panitiaName });
          toast(`Template "${fileName}" berhasil diunggah ke folder "${panitiaName}"!`, 'success');
        } catch (err) {
          toast('Gagal simpan template: ' + err.message, 'error');
        } finally {
          setSavingTpl(false);
          e.target.value = null;
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast('Gagal simpan template: ' + err.message, 'error');
      setSavingTpl(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
      {/* Form Panitia */}
      {/* ... (panitia form unchanged) ... */}
      <div>
        <div className="card">
          <div className="section-title">{editingId ? 'Edit Panitia' : 'Tambah Panitia Baru'}</div>
          {/* ... (panitia form content) ... */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Nama Panitia</label>
              <input value={form.Nama_Panitia} onChange={e => setForm({ ...form, Nama_Panitia: e.target.value })} placeholder="Contoh: Panitia Ramadhan 1447" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Nama Instansi</label>
              <input value={form.Instansi} onChange={e => setForm({ ...form, Instansi: e.target.value })} placeholder="Pondok Modern Darussalam Gontor" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Alamat</label>
              <input value={form.Alamat} onChange={e => setForm({ ...form, Alamat: e.target.value })} placeholder="Ponorogo, Jawa Timur" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Nama Ketua</label>
              <input value={form.Nama_Ketua} onChange={e => setForm({ ...form, Nama_Ketua: e.target.value })} placeholder="Nama Lengkap & Gelar" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Jabatan</label>
              <input value={form.Jabatan} onChange={e => setForm({ ...form, Jabatan: e.target.value })} placeholder="Ketua Panitia / Direktur" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Link Scan TTD (Google Drive Link)</label>
              <input value={form.Link_TTD} onChange={e => setForm({ ...form, Link_TTD: e.target.value })} placeholder="https://drive.google.com/..." />
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSavePanitia} disabled={loading}>
                {loading ? '⏳' : '💾 Simpan Panitia'}
              </button>
              {editingId && (
                <button className="btn btn-ghost" onClick={() => { setEditingId(null); setForm({ Nama_Panitia: '', Instansi: '', Alamat: '', Nama_Ketua: '', Jabatan: '', Link_TTD: '' }); }}>Batal</button>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-title">Upload Template Baru (.docx)</div>
          {seting?.idPanitia !== 'ADMIN' && (
            <div style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 6, fontSize: 12 }}>
              📁 Template akan diunggah ke folder: <strong>{seting?.namaPanitia || 'Lainnya'}</strong>
            </div>
          )}
          <p style={{ fontSize: 12, opacity: .7, marginBottom: 10 }}>Masukkan nama untuk template baru ini:</p>
          
          <div style={{ marginBottom: 12 }}>
            <div style={{ display:'flex', gap:8 }}>
              <input 
                value={customTplName} 
                onChange={e => setCustomTplName(e.target.value)}
                placeholder="Contoh: Undangan Rapat"
                style={{ flex:1, border:'1px solid var(--primary)' }}
              />
              <div style={{ padding:'8px 0', fontWeight:600 }}>.docx</div>
            </div>
            <small style={{ fontSize:10, color:'#666' }}>* Gunakan nama unik (misal: "Izin Pulang" atau "Undangan Wali")</small>
          </div>

          <input type="file" accept=".docx" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUploadTemplate} />
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => fileInputRef.current.click()} disabled={savingTpl}>
            {savingTpl ? '⏳ Memproses...' : '📤 Upload Template Baru'}
          </button>
          
          <div style={{ marginTop:14, padding:10, background:'#f8fafc', borderRadius:8, fontSize:11, border:'1px solid #e2e8f0' }}>
            💡 <b>Tips:</b> Anda juga bisa upload file .docx secara manual ke folder <b>Surat Kepanitiaan &gt; _TEMPLATES_</b> di Google Drive Anda.
          </div>
        </div>
      </div>

      {/* Daftar Panitia (Dashboard Arsip) */}
      <div className="card">
        <div className="section-title">Daftar Kepanitiaan Terdaftar</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {panitiaList.length === 0 ? <p style={{ textAlign: 'center', opacity: .5 }}>Belum ada panitia.</p> :
            panitiaList.map(p => (
              <div key={p.ID} style={{
                padding: 12, border: '1px solid var(--border)', borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.Nama_Panitia}</div>
                  <div style={{ fontSize: 12, opacity: .7 }}>Ketua: {p.Nama_Ketua}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.Instansi}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setEditingId(p.ID); setForm(p); }}>✏️</button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => handleDelete(p.ID)}>🗑</button>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
