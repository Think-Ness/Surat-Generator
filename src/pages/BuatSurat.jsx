// src/pages/BuatSurat.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { toast, formatTanggalIndo } from '../lib/utils';
import BarangModal from '../components/BarangModal';
import PerizinanModal from '../components/PerizinanModal';

const JENIS_SURAT = ['Perizinan', 'Undangan', 'Peminjaman'];
const JENIS_MAILING = ['Perseorangan', 'Sekaligus'];
const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
const ROMAWI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// Mapping Bulan Hijriah Sesuai Permintaan User
const BLN_HIJRIAH = [
  'Muharram', 'Safar', "Rabi'ul Awal", "Rabi'ul Akhir",
  'Jumadil Awal', 'Jumadil Akhir', 'Rajab', "Sya'ban",
  'Ramadhan', 'Syawal', "Dzulqa'dah", 'Dzulhijah'
];

// Intl Mapping to Custom Hijriah
function getTodayHijriah() {
  try {
    const parts = new Intl.DateTimeFormat('id-u-ca-islamic-uma', {
      day: 'numeric', month: 'numeric', year: 'numeric'
    }).formatToParts(new Date());
    
    const day = parts.find(p => p.type === 'day').value;
    const monthIdx = parseInt(parts.find(p => p.type === 'month').value) - 1;
    const year = parts.find(p => p.type === 'year').value;
    
    return `${day} ${BLN_HIJRIAH[monthIdx] || 'Ramadhan'} ${year} H`;
  } catch (e) { 
    console.error('Hijriah Error:', e);
    return ''; 
  }
}

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

const EMPTY_FORM = {
  jenisSurat: 'Perizinan', jenisMailing: 'Perseorangan',
  noSurat: '', tglHijriah: getTodayHijriah(), tglSurat: getTodayISO(),
  hal: '', ket: '', hari: '', tanggal: '', tempat: '', waktu: '08.00 WIB', acara: '',
  ID_Panitia: ''
};

// ── Helper UI ──────────────────────────────────────────────────
function RecentInput({ label, value, onChange, placeholder, recentList }) {
  const [show, setShow] = useState(false);
  const ref = useRef();
  const filtered = recentList.filter(r => r && r !== value && r.toLowerCase().includes(value.toLowerCase()));

  useEffect(() => {
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    window.addEventListener('mousedown', click);
    return () => window.removeEventListener('mousedown', click);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label>{label}</label>
      <input
        placeholder={placeholder}
        value={value}
        onFocus={() => setShow(true)}
        onChange={e => onChange(e.target.value)}
      />
      {show && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--card)', border: '1px solid var(--accent)',
          borderRadius: 8, marginTop: 2, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
          maxHeight: 180, overflowY: 'auto',
        }}>
          {filtered.map((r, i) => (
            <div key={i} onMouseDown={() => { onChange(r); setShow(false); }}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >{r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SortTh({ col, label, sort, onSort, style = {} }) {
  const active = sort.col === col;
  return (
    <th onClick={() => onSort(col)} style={{
      padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12,
      cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style
    }}>
      {label}
      <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3 }}>
        {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  );
}

// ── Main Component ──────────────────────────────────────────────
export default function BuatSurat({ seting, onDone }) {
  // Derived constant — must be at component scope so JSX can use it
  const isAdmin = seting?.idPanitia === 'ADMIN';
  const [form, setForm] = useState(EMPTY_FORM);
  const [guru, setGuru] = useState([]);
  const [santri, setSantri] = useState([]);
  const [target, setTarget] = useState('Guru'); // Guru or Santri

  const [panitiaList, setPanitiaList] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [filterBagian, setFilterBagian] = useState('');
  const [filterProdi, setFilterProdi] = useState('');
  const [sort, setSort] = useState({ col: 'Nama', dir: 'asc' });
  const [loading, setLoading] = useState(false);
  const [loadingGuru, setLoadingGuru] = useState(true);

  // States untuk Modal
  const [showBarang, setShowBarang] = useState(false);
  const [noSuratBarang, setNoSuratBarang] = useState(null);
  const [showPerizinan, setShowPerizinan] = useState(false);
  const [noSuratPerizinan, setNoSuratPerizinan] = useState(null);

  const [recentSurat, setRecentSurat] = useState([]);
  const [templateList, setTemplateList] = useState([]);
  const [selTemplate, setSelTemplate] = useState('');

  // Drag-select state
  const isDragging = useRef(false);
  const dragMode = useRef(null);
  const tableRef = useRef(null);

  // Load data awal — re-run whenever active panitia changes
  useEffect(() => {
    if (!seting?.idPanitia) return;
    setLoadingGuru(true);
    const paramsP  = isAdmin ? {} : { panitiaName: seting.namaPanitia };
    const paramsID = isAdmin ? {} : { ID_Panitia: seting.idPanitia };

    Promise.all([
      api.getGuru(paramsP).catch(() => ({ data: [] })),
      api.getSantri().catch(() => ({ data: [] })),
      api.getNextNoSurat(paramsID).catch(() => ({ next: 1 })),
      api.getSurat(paramsID).catch(() => ({ data: [] })),
      api.getPanitia().catch(() => ({ data: [] })),
      api.listTemplates(paramsP).catch(() => ({ data: [] }))
    ])
      .then(([g, sn, n, s, p, t]) => {
        setGuru(g.data || []);
        setSantri(sn.data || []);
        setRecentSurat(s.data || []);
        setPanitiaList(p.data || []);

        // Handle template list — can be array of strings (old) or objects (new)
        const tplData = (t.data || []).map(item =>
          typeof item === 'string' ? { name: item, id: item } : item
        );
        setTemplateList(tplData);
        if (tplData.length > 0) setSelTemplate(tplData[0].name);

        // Auto-select active panitia
        const activePanId = isAdmin ? (p.data?.[0]?.ID || '') : seting.idPanitia;
        setForm(f => ({ ...f, noSurat: n.next, ID_Panitia: activePanId }));
      })
      .catch((err) => {
        console.error(err);
        toast('Gagal memuat data utama', 'error');
      })
      .finally(() => setLoadingGuru(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seting?.idPanitia]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const activeList = target === 'Guru' ? guru : santri;
  const idKey = target === 'Guru' ? 'ID_Guru' : 'ID_Santri';

  // Recent lists
  const recentHal = [...new Set(recentSurat.map(r => r.Hal).filter(Boolean))];
  const recentAcara = [...new Set(recentSurat.map(r => r.Acara).filter(Boolean))];
  const recentTempat = [...new Set(recentSurat.map(r => r.Tempat).filter(Boolean))];
  const recentKet = [...new Set(recentSurat.map(r => r.Ket).filter(Boolean))];

  const bagianOptions = [...new Set(activeList.map(g => g.Kamar_Bagian).filter(Boolean))].sort();
  const prodiOptions = [...new Set(activeList.map(g => g.Prodi).filter(Boolean))].sort();

  const handleSort = (col) => {
    setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const filteredGuru = activeList
    .filter(g =>
      (g.Nama?.toLowerCase().includes(search.toLowerCase()) ||
        g.Kamar_Bagian?.toLowerCase().includes(search.toLowerCase()) ||
        g.Prodi?.toLowerCase().includes(search.toLowerCase())) &&
      (!filterBagian || g.Kamar_Bagian === filterBagian) &&
      (!filterProdi || g.Prodi === filterProdi)
    )
    .sort((a, b) => {
      const va = String(a[sort.col] ?? '').toLowerCase();
      const vb = String(b[sort.col] ?? '').toLowerCase();
      return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const toggleAll = () => {
    if (selected.size === filteredGuru.length && filteredGuru.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredGuru.map(g => g[idKey])));
    }
  };

  const handleRowMouseDown = useCallback((e, id) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = true;
    dragMode.current = selected.has(id) ? 'remove' : 'add';
    setSelected(s => {
      const n = new Set(s);
      dragMode.current === 'add' ? n.add(id) : n.delete(id);
      return n;
    });
  }, [selected]);

  const handleRowMouseEnter = useCallback((id) => {
    if (!isDragging.current) return;
    setSelected(s => {
      const n = new Set(s);
      dragMode.current === 'add' ? n.add(id) : n.delete(id);
      return n;
    });
  }, []);

  useEffect(() => {
    const up = () => { isDragging.current = false; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const handleOpenBarang = () => { setNoSuratBarang(form.noSurat); setShowBarang(true); };
  const handleOpenPerizinan = () => { setNoSuratPerizinan(form.noSurat); setShowPerizinan(true); };

  const validate = () => {
    if (!form.noSurat) { toast('Isi nomor surat', 'error'); return false; }
    if (!form.hal) { toast('Perihal harus diisi', 'error'); return false; }
    if (!form.tanggal) { toast('Tanggal kegiatan harus diisi', 'error'); return false; }
    if (!form.ID_Panitia) { toast('Pilih panitia pengirim', 'error'); return false; }
    if (selected.size === 0) { toast('Pilih minimal 1 nama', 'error'); return false; }
    if (!selTemplate) { toast('Pilih template word dulu', 'error'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // Validasi Barang
    if (form.jenisSurat === 'Peminjaman') {
      try {
        const b = await api.getBarang(form.noSurat);
        if (!b.data || b.data.length === 0) {
          const ok = window.confirm('Belum ada barang pinjaman. Tetap buat surat?');
          if (!ok) { setShowBarang(true); return; }
        }
      } catch (e) { }
    }

    // Validasi Perizinan
    if (form.jenisSurat === 'Perizinan') {
      try {
        const p = await api.getPerizinan(form.noSurat);
        if (!p.data || p.data.length === 0) {
          const ok = window.confirm('Rincian Keperluan & Alasan izin belum diisi. Tetap buat surat?');
          if (!ok) { setShowPerizinan(true); return; }
        }
      } catch (e) { }
    }

    setLoading(true);
    try {
      const batchRes = await api.getNextBatch();
      const idBatch = batchRes.next;
      const selectedGuru = activeList.filter(g => selected.has(g[idKey]));
      const isSekaligus = form.jenisMailing === 'Sekaligus';
      const rows = selectedGuru.map((g, i) => ({
        No_Surat: isSekaligus ? form.noSurat : Number(form.noSurat) + i,
        Tanggal_Hijriah: form.tglHijriah,
        Tanggal_Romawi: form.tglSurat,
        Hal: form.hal,
        Nama: g.Nama,
        Ket: form.ket, 
        Jabatan_Panitia: g.Jabatan_Panitia || '',
        Nama_Kepanitiaan: g.Nama_Kepanitiaan || '',
        Kamar_Bagian: g.Kamar_Bagian,
        Prodi: target === 'Guru' ? g.Prodi : '',
        Semester: target === 'Guru' ? g.Semester : '',
        Tahun_Pengabdian: target === 'Guru' ? g.Tahun_Pengabdian : g.Kelas,
        Hari: form.hari,
        Tanggal: form.tanggal,
        Tempat: form.tempat,
        Waktu: form.waktu,
        Acara: form.acara,
        Jenis_Surat: form.jenisSurat,
        Jenis_Mailing: form.jenisMailing,
        ID_Panitia: form.ID_Panitia,
        Nama_Template: selTemplate,
        ID_Batch: idBatch
      }));
      await api.insertSurat(rows);
      toast('Mailing berhasil dibuat!', 'success');
      setSelected(new Set());
      const paramsID = isAdmin ? {} : { ID_Panitia: seting.idPanitia };
      const n = await api.getNextNoSurat(paramsID);
      setForm(f => ({ ...EMPTY_FORM, noSurat: n.next, ID_Panitia: f.ID_Panitia }));
      onDone(idBatch);
    } catch (e) {
      toast('Gagal: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      {/* ── Jenis Surat + Mailing ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Jenis Surat</div>
        <div className="grid-2">
          <div>
            <label>Pilih Jenis Surat</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {JENIS_SURAT.map(j => (
                <button key={j} className="btn" onClick={() => set('jenisSurat', j)}
                  style={{
                    background: form.jenisSurat === j ? 'var(--accent)' : 'var(--accent-soft)',
                    color: form.jenisSurat === j ? '#fff' : 'var(--accent)', flex: 1,
                  }}>{j}</button>
              ))}
            </div>
          </div>
          <div>
            <label>Mode Mailing</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {JENIS_MAILING.map(j => (
                <button key={j} className="btn" onClick={() => set('jenisMailing', j)}
                  style={{
                    background: form.jenisMailing === j ? 'var(--accent2)' : '#EDF7F1',
                    color: form.jenisMailing === j ? '#fff' : 'var(--accent2)', flex: 1,
                  }}>
                  {j === 'Perseorangan' ? '👤 Perseorangan' : '👥 Sekaligus'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, marginTop: 6, opacity: .6, lineHeight: 1.5 }}>
              {form.jenisMailing === 'Perseorangan'
                ? 'Satu surat per orang, nomor surat bertambah tiap orang'
                : 'Satu surat + lampiran daftar nama semua orang terpilih'}
            </div>
          </div>
        </div>

        {/* Pemilihan Template */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed #e5e7eb' }}>
          <label style={{ fontWeight: 700, color: 'var(--accent)' }}>Pilih Template Word (.docx)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <select value={selTemplate} onChange={e => setSelTemplate(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd' }}>
              {templateList.length === 0 && <option disabled>Upload template dulu di Pengaturan</option>}
              {templateList.map(t => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
            {templateList.length === 0 && (
              <div style={{ fontSize:11, color:'var(--danger)', fontWeight:600 }}>
                ⚠ Belum ada template di Drive. Upload di menu Pengaturan.
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, opacity: .5, marginTop:4 }}>
            * File ini akan digunakan sebagai master desain surat Anda yang sudah diunggah ke Google Drive.
          </div>
        </div>
      </div>

      {/* ── Data Header Surat ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Data Surat</div>

        {/* Baris 0: Pilih Panitia Pengirim */}
        <div style={{ marginBottom: 16, padding: 12, background: 'var(--accent-soft)', borderRadius: 8 }}>
          <label style={{ fontWeight: 700, color: 'var(--accent)' }}>Pilih Panitia Pengirim</label>
          <select 
            value={form.ID_Panitia} 
            onChange={e => set('ID_Panitia', e.target.value)}
            disabled={!isAdmin}
            style={{ marginTop: 4, border: '1px solid var(--accent)', background: !isAdmin ? 'var(--bg)' : '#fff' }}
          >
            <option value="">-- Pilih Panitia --</option>
            {panitiaList.map(p => (
              <option key={p.ID} value={p.ID}>{p.Nama_Panitia} ({p.Nama_Ketua})</option>
            ))}
          </select>
          <div style={{ fontSize: 11, opacity: .6, marginTop: 4 }}>
            * Jika panitia belum ada, tambahkan dulu di menu <b>Pengaturan</b>
          </div>
        </div>

        {/* Baris 1: Nomor, Hijriah, Romawi */}
        <div className="grid-3" style={{ marginBottom: 14 }}>
          <div>
            <label>Nomor Surat</label>
            <input type="number" value={form.noSurat} onChange={e => set('noSurat', e.target.value)} />
          </div>
          <div>
            <label>Tanggal Hijriah</label>
            <input value={form.tglHijriah} onChange={e => set('tglHijriah', e.target.value)} />
          </div>
          <div>
            <label>Tanggal Surat (Masehi)</label>
            <input type="date" value={form.tglSurat} onChange={e => set('tglSurat', e.target.value)} />
          </div>
        </div>

        {/* Baris 2: Hal + Ket */}
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <RecentInput label="Perihal (Hal)" value={form.hal}
            onChange={v => set('hal', v)}
            placeholder="Permohonan Izin Kegiatan"
            recentList={recentHal} />
          <RecentInput label="Keterangan (Kepada)" value={form.ket}
            onChange={v => set('ket', v)}
            placeholder="Al Ustadz ..., S.Pd."
            recentList={recentKet} />
        </div>

        {/* Baris 3: Tanggal, Hari, Waktu */}
        <div className="grid-3" style={{ marginBottom: 14 }}>
          <div>
            <label>Tanggal Kegiatan</label>
            <input type="date" value={form.tanggal} onChange={e => set('tanggal', e.target.value)} />
          </div>
          <div>
            <label>Hari</label>
            <select value={form.hari} onChange={e => set('hari', e.target.value)}>
              <option value="">-- Pilih --</option>
              {HARI.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label>Waktu</label>
            <input value={form.waktu} onChange={e => set('waktu', e.target.value)} placeholder="08.00 WIB" />
          </div>
        </div>

        {/* Baris 4: Tempat, Acara */}
        <div className="grid-2">
          <RecentInput label="Tempat" value={form.tempat}
            onChange={v => set('tempat', v)}
            placeholder="Aula Pondok"
            recentList={recentTempat} />
          <RecentInput label="Acara" value={form.acara}
            onChange={v => set('acara', v)}
            placeholder="Rapat Kepanitiaan ..."
            recentList={recentAcara} />
        </div>

        {form.jenisSurat === 'Peminjaman' && (
          <div style={{
            marginTop: 16, padding: '12px 16px', background: '#FFFBEB',
            borderRadius: 8, border: '1px solid #FDE68A', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: 13 }}>
              <strong>📦 Peminjaman</strong> — Input daftar barang sebelum buat surat
            </div>
            <button className="btn btn-secondary" onClick={handleOpenBarang}>Kelola Barang</button>
          </div>
        )}

        {form.jenisSurat === 'Perizinan' && (
          <div style={{
            marginTop: 16, padding: '12px 16px', background: '#E0F2FE',
            borderRadius: 8, border: '1px solid #7DD3FC', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: 13 }}>
              <strong>📄 Perizinan</strong> — Masukkan Keperluan & Alasan izin
            </div>
            <button className="btn btn-secondary" style={{ background: '#0284C7', color: '#fff' }} onClick={handleOpenPerizinan}>Kelola Izin</button>
          </div>
        )}
      </div>

      {/* ── Tabs Target (Guru / Santri) ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button className={`btn ${target === 'Guru' ? 'btn-primary' : 'btn-ghost'}`}
          style={{
            flex: 1, borderRadius: 12, padding: '14px 20px', fontSize: 14, fontWeight: 700,
            boxShadow: target === 'Guru' ? '0 4px 12px rgba(124, 92, 46, 0.2)' : 'none'
          }}
          onClick={() => setTarget('Guru')}>
          👨‍🏫 Kalangan Guru
        </button>
        <button className={`btn ${target === 'Santri' ? 'btn-primary' : 'btn-ghost'}`}
          style={{
            flex: 1, borderRadius: 12, padding: '14px 20px', fontSize: 14, fontWeight: 700,
            boxShadow: target === 'Santri' ? '0 4px 12px rgba(124, 92, 46, 0.2)' : 'none'
          }}
          onClick={() => setTarget('Santri')}>
          🎓 Kalangan Santri
        </button>
      </div>

      {/* ── Checklist ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10, flexWrap: 'wrap', gap: 8
        }}>
          <div className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            Pilih Nama <span style={{ fontWeight: 400, opacity: .6 }}>({selected.size} dipilih)</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="🔍 Cari..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 150, fontSize: 12 }} />
            <select value={filterBagian} onChange={e => setFilterBagian(e.target.value)}
              style={{ fontSize: 12, width: 130 }}>
              <option value="">Semua Bagian</option>
              {bagianOptions.map(b => <option key={b}>{b}</option>)}
            </select>
            {target === 'Guru' && (
              <select value={filterProdi} onChange={e => setFilterProdi(e.target.value)}
                style={{ fontSize: 12, width: 120 }}>
                <option value="">Semua Prodi</option>
                {prodiOptions.map(p => <option key={p}>{p}</option>)}
              </select>
            )}
            <button className="btn btn-ghost" style={{ fontSize: 12, whiteSpace: 'nowrap' }}
              onClick={toggleAll}>
              {selected.size === filteredGuru.length && filteredGuru.length > 0 ? 'Batal Semua' : 'Pilih Semua'}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 11, opacity: .5, marginBottom: 8 }}>
          💡 Klik untuk memilih, atau <strong>tahan & seret</strong> mouse untuk memilih banyak sekaligus.
        </div>

        {loadingGuru ? (
          <div style={{ padding: 40, textAlign: 'center', opacity: .5 }}>Memuat data {target.toLowerCase()}...</div>
        ) : filteredGuru.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', opacity: .5 }}>
            Tidak ada data {target.toLowerCase()}. Tambahkan di menu Master {target}.
          </div>
        ) : (
          <div style={{
            maxHeight: 360, overflowY: 'auto', border: '1px solid var(--border)',
            borderRadius: 8, userSelect: 'none'
          }}
            onMouseLeave={() => { isDragging.current = false; }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 2 }}>
                  <th style={{ padding: '8px 12px', width: 40, textAlign: 'left', fontSize: 12 }}>
                    <input type="checkbox"
                      checked={selected.size === filteredGuru.length && filteredGuru.length > 0}
                      onChange={toggleAll} />
                  </th>
                  <SortTh col="Nama" label="Nama" sort={sort} onSort={handleSort} />
                  <SortTh col="Jabatan_Panitia" label="Jabatan & Panitia" sort={sort} onSort={handleSort} />
                  <SortTh col="Kamar_Bagian" label="Kamar/Bagian" sort={sort} onSort={handleSort} />
                  {target === 'Guru' && <SortTh col="Prodi" label="Prodi" sort={sort} onSort={handleSort} />}
                  <SortTh col={target === 'Guru' ? 'Tahun_Pengabdian' : 'Kelas'}
                    label={target === 'Guru' ? 'Thn Pengabdian' : 'Kelas'} sort={sort} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {filteredGuru.map(g => {
                  const isSel = selected.has(g[idKey]);
                  return (
                    <tr key={g[idKey]}
                      onMouseDown={e => handleRowMouseDown(e, g[idKey])}
                      onMouseEnter={() => handleRowMouseEnter(g[idKey])}
                      style={{
                        cursor: 'pointer',
                        background: isSel ? 'var(--accent-soft)' : 'transparent',
                        borderTop: '1px solid var(--border)',
                        transition: 'background .1s',
                      }}>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 4,
                          border: `2px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                          background: isSel ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: '#fff', flexShrink: 0,
                        }}>{isSel && '✓'}</div>
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: isSel ? 600 : 400 }}>{g.Nama}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{g.Jabatan_Panitia || '-'}</div>
                        <div style={{ fontSize: 10, opacity: .5 }}>{g.Nama_Kepanitiaan}</div>
                      </td>
                      <td style={{ padding: '8px 12px', opacity: .7 }}>{g.Kamar_Bagian}</td>
                      {target === 'Guru' && <td style={{ padding: '8px 12px', opacity: .7 }}>{g.Prodi}</td>}
                      <td style={{ padding: '8px 12px', opacity: .7 }}>{target === 'Guru' ? g.Tahun_Pengabdian : g.Kelas}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Tombol Submit ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="btn btn-ghost"
          onClick={() => {
            setForm({ ...EMPTY_FORM }); setSelected(new Set());
            setSearch(''); setFilterBagian(''); setFilterProdi('');
          }}>
          Reset Form
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
          style={{ minWidth: 180, justifyContent: 'center' }}>
          {loading ? '⏳ Menyimpan...' : `✉ Buat ${form.jenisSurat} (${selected.size} orang)`}
        </button>
      </div>

      <BarangModal
        show={showBarang}
        onClose={() => setShowBarang(false)}
        noSurat={noSuratBarang}
      />
      <PerizinanModal
        show={showPerizinan}
        onClose={() => setShowPerizinan(false)}
        noSurat={noSuratPerizinan}
      />
    </div>
  );
}
