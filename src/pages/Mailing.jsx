// src/pages/Mailing.jsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { buildSuratHTML, printSurat, exportPDF, exportWord,
         downloadPDFLokal, formatTanggalIndo, formatWaktu, toast } from '../lib/utils';
import { generateDocxFromTemplate, generatePDFFromTemplate } from '../lib/docxGenerator';
import { useRef } from 'react';

export default function Mailing({ seting, initBatch }) {
  const [allSurat,  setAllSurat]  = useState([]);
  const [batches,   setBatches]   = useState([]);
  const [panitiaList, setPanitiaList] = useState([]);
  const [selBatch,  setSelBatch]  = useState(initBatch || null);
  const [rows,      setRows]      = useState([]);
  const [barang,    setBarang]    = useState([]);
  const [perizinan, setPerizinan] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [driveLinks, setDriveLinks] = useState([]); // [{name, url}]
  const fileInputRef    = useRef(null);
  const pdfTplInputRef  = useRef(null);
  const draggedIndex    = useRef(null);

  // States for adding a new recipient
  const [showAddModal, setShowAddModal] = useState(false);
  const [masterGuru, setMasterGuru] = useState([]);
  const [masterSantri, setMasterSantri] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [addType, setAddType] = useState('guru'); // 'guru' or 'santri'
  const [searchVal, setSearchVal] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [formNama, setFormNama] = useState('');
  const [formKet, setFormKet] = useState('');
  const [formKamar, setFormKamar] = useState('');
  const [formProdi, setFormProdi] = useState('');
  const [formSemester, setFormSemester] = useState('');
  const [formThnPengabdian, setFormThnPengabdian] = useState('');

  // Load semua surat & panitia
  useEffect(() => {
    setLoading(true);
    const isAdmin = seting.idPanitia === 'ADMIN';
    const params = isAdmin ? {} : { ID_Panitia: seting.idPanitia };

    Promise.all([api.getSurat(params), api.getPanitia()])
      .then(([r, p]) => {
        const data = r.data || [];
        setAllSurat(data);
        setPanitiaList(p.data || []);
        // Kelompokkan per batch
        const bMap = {};
        data.forEach(d => {
          if (!bMap[d.ID_Batch]) {
            bMap[d.ID_Batch] = {
              id: d.ID_Batch,
              jenisSurat:   d.Jenis_Surat,
              jenisMailing: d.Jenis_Mailing,
              tanggal:      d.Tanggal,
              acara:        d.Acara,
              count:        0,
            };
          }
          bMap[d.ID_Batch].count++;
        });
        const bl = Object.values(bMap).sort((a,b) => b.id - a.id);
        setBatches(bl);
        if (initBatch) {
          setSelBatch(initBatch);
        } else if (bl.length > 0 && !selBatch) {
          setSelBatch(bl[0].id);
        }
      })
      .catch(() => toast('Gagal memuat mailing','error'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seting?.idPanitia]);

  // Load rows + barang ketika batch berubah
  useEffect(() => {
    if (!selBatch) return;
    const filtered = allSurat.filter(d => Number(d.ID_Batch) === Number(selBatch));
    setRows(filtered);

    // Ambil barang jika ada Peminjaman
    const isPinjam = filtered[0]?.Jenis_Surat === 'Peminjaman';
    if (isPinjam && filtered[0]?.No_Surat) {
      api.getBarang(filtered[0].No_Surat)
         .then(r => setBarang(r.data || []))
         .catch(() => {});
    } else {
      setBarang([]);
    }

    // Ambil perizinan jika ada
    const isIzin = filtered[0]?.Jenis_Surat === 'Perizinan';
    if (isIzin && filtered[0]?.No_Surat) {
      api.getPerizinan(filtered[0].No_Surat)
         .then(r => setPerizinan(r.data && r.data.length > 0 ? r.data[0] : null))
         .catch(() => {});
    } else {
      setPerizinan(null);
    }
  }, [selBatch, allSurat]);

  // Lazy-load Guru & Santri master data when "+ Tambah Penerima" modal is opened
  useEffect(() => {
    if (showAddModal && masterGuru.length === 0 && masterSantri.length === 0) {
      setLoadingMaster(true);
      Promise.all([
        api.getGuru().catch(() => ({ data: [] })),
        api.getSantri().catch(() => ({ data: [] }))
      ]).then(([g, s]) => {
        setMasterGuru(g.data || []);
        setMasterSantri(s.data || []);
      }).catch(err => {
        toast('Gagal memuat database guru/santri: ' + err.message, 'error');
      }).finally(() => {
        setLoadingMaster(false);
      });
    }
  }, [showAddModal, masterGuru.length, masterSantri.length]);

  const getActivePanitia = () =>
    panitiaList.find(p => String(p.ID) === String(rows[0]?.ID_Panitia)) || {};

  const selBatchInfo = batches.find(b => Number(b.id) === Number(selBatch));

  const handleGenerate = (mode) => {
    if (!rows.length) { toast('Tidak ada data','error'); return; }
    const panitia = getActivePanitia();

    // Jika mode PDF dan sudah ada Link_PDF di Drive, langsung buka saja
    if (mode === 'pdf' && rows[0].Link_PDF) {
      window.open(rows[0].Link_PDF, '_blank');
      toast('Membuka PDF dari Drive...', 'success');
      return;
    }

    if (rows[0]?.Jenis_Mailing === 'Sekaligus') {
      // Satu dokumen untuk semua
      const html     = buildSuratHTML(rows, rows[0].Jenis_Surat, 'Sekaligus', panitia, barang);
      const filename = `${rows[0].Jenis_Surat}_Sekaligus_Batch${selBatch}`;
      if (mode==='print') printSurat(html);
      if (mode==='pdf')   exportPDF(html, filename);
      if (mode==='word')  exportWord(html, filename);
    } else {
      // Satu dokumen per orang
      rows.forEach(r => {
        // Jika perseorangan dan ada link per orang
        if (mode === 'pdf' && r.Link_PDF) {
          window.open(r.Link_PDF, '_blank');
        } else {
          const html     = buildSuratHTML([r], r.Jenis_Surat, 'Perseorangan', panitia, barang);
          const filename = `${r.Jenis_Surat}_${r.Nama}_${r.No_Surat}`;
          if (mode==='print') printSurat(html);
          if (mode==='pdf')   exportPDF(html, filename);
          if (mode==='word')  exportWord(html, filename);
        }
      });
    }
    toast(`${mode==='print'?'Mencetak':mode==='pdf'?'Export PDF':'Export Word Lama'} berhasil`, 'success');
  };

  const handleUploadTemplate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const buffer = await file.arrayBuffer();
      const panitia = panitiaList.find(p => String(p.ID) === String(rows[0]?.ID_Panitia)) || {};

      if (rows[0]?.Jenis_Mailing === 'Sekaligus') {
        const filename = `${rows[0].Jenis_Surat}_Sekaligus_Batch${selBatch}`;
        await generateDocxFromTemplate(buffer, rows, filename, panitia, perizinan, barang);
      } else {
        for (const r of rows) {
          const filename = `${r.Jenis_Surat}_${r.Nama}_${r.No_Surat}`;
          await generateDocxFromTemplate(buffer, r, filename, panitia, perizinan, barang);
        }
      }
      toast('Berhasil meng-generate Word dari template!', 'success');
    } catch (err) {
      toast('Gagal memproses template: ' + err.message, 'error');
    }
    e.target.value = null;
  };

  const handleUploadPDFTemplate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSavingPdf(true);
    try {
      const buffer = await file.arrayBuffer();
      const panitia = panitiaList.find(p => String(p.ID) === String(rows[0]?.ID_Panitia)) || {};

      if (rows[0]?.Jenis_Mailing === 'Sekaligus') {
        const filename = `${rows[0].Jenis_Surat}_Sekaligus_Batch${selBatch}`;
        await generatePDFFromTemplate(buffer, rows, filename, panitia, {}, perizinan, barang);
      } else {
        for (const r of rows) {
          const filename = `${r.Jenis_Surat}_${r.Nama}_${r.No_Surat}`;
          await generatePDFFromTemplate(buffer, r, filename, panitia, {}, perizinan, barang);
        }
      }
      toast('PDF dari template berhasil diunduh!', 'success');
    } catch (err) {
      toast('Gagal buat PDF dari template: ' + err.message, 'error');
    } finally {
      setSavingPdf(false);
      e.target.value = null;
    }
  };

  const handleGenerateFromMaster = async () => {
    if (!rows.length) { toast('Tidak ada data','error'); return; }
    setSavingPdf(true);
    try {
      const jenisSurat = rows[0].Jenis_Surat || 'UMUM';
      const panitia = panitiaList.find(p => String(p.ID) === String(rows[0]?.ID_Panitia)) || {};
      const res = await api.getTemplate({ 
        templateName: rows[0].Nama_Template,
        jenisSurat: jenisSurat,
        panitiaName: panitia.Nama_Panitia || 'Lainnya'
      });
      if (!res.success || !res.base64) {
        throw new Error(`Template untuk kategori "${jenisSurat}" belum diupload di menu Pengaturan.`);
      }

      const binaryString = atob(res.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
      const buffer = bytes.buffer;
      
      // Metadata untuk Auto-Archive di GAS
      const metadata = {
        idBatch:     selBatch,
        noSurat:     rows[0].No_Surat,
        panitiaName: panitia.Nama_Panitia,
        kategori:    jenisSurat,
        tahun:       new Date(rows[0].Tanggal).getFullYear().toString(),
        bulan:       String(new Date(rows[0].Tanggal).getMonth() + 1).padStart(2, '0')
      };

      if (rows[0]?.Jenis_Mailing === 'Sekaligus') {
        const filename = `${jenisSurat}_Sekaligus_Batch${selBatch}`;
        await generatePDFFromTemplate(buffer, rows, filename, panitia, metadata, perizinan, barang);
      } else {
        for (const r of rows) {
          const filename = `${jenisSurat}_${r.Nama}_${r.No_Surat}`;
          // Untuk perseorangan, kita update metadata per orang agar noSurat pas di spreadsheet
          const metaOrang = { ...metadata, noSurat: r.No_Surat };
          await generatePDFFromTemplate(buffer, r, filename, panitia, metaOrang, perizinan, barang);
        }
      }
      toast('PDF Master berhasil diunduh & diarsipkan ke Drive!', 'success');
    } catch (err) {
      toast('Gagal: ' + err.message, 'error');
    } finally {
      setSavingPdf(false);
    }
  };

  const handleSaveToDrive = async () => {
    if (!rows.length) { toast('Tidak ada data','error'); return; }
    setSaving(true);
    setDriveLinks([]);
    try {
      const jenisSurat = rows[0].Jenis_Surat || 'UMUM';
      const panitia = panitiaList.find(p => String(p.ID) === String(rows[0]?.ID_Panitia)) || {};
      const resTpl = await api.getTemplate({
        templateName: rows[0].Nama_Template,
        jenisSurat: jenisSurat,
        panitiaName: panitia.Nama_Panitia || 'Lainnya'
      });
      if (!resTpl.success || !resTpl.base64) {
        throw new Error(`Template untuk kategori "${jenisSurat}" belum diupload di menu Pengaturan.`);
      }

      const binaryString = atob(resTpl.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
      const buffer = bytes.buffer;

      const links = [];

      const metadata = {
        idBatch:     selBatch,
        noSurat:     rows[0].No_Surat,
        panitiaName: panitia.Nama_Panitia,
        kategori:    jenisSurat,
        tahun:       new Date(rows[0].Tanggal).getFullYear().toString(),
        bulan:       String(new Date(rows[0].Tanggal).getMonth() + 1).padStart(2, '0')
      };

      if (rows[0]?.Jenis_Mailing === 'Sekaligus') {
        const filename = `${jenisSurat}_Sekaligus_Batch${selBatch}`;
        const res = await generatePDFFromTemplate(buffer, rows, filename, panitia, metadata, perizinan, barang, true);
        if (res.viewUrl) links.push({ name: res.name, url: res.viewUrl });
      } else {
        for (const r of rows) {
          const filename = `${jenisSurat}_${r.Nama}_${r.No_Surat}`;
          const metaOrang = { ...metadata, noSurat: r.No_Surat };
          const res = await generatePDFFromTemplate(buffer, r, filename, panitia, metaOrang, perizinan, barang, true);
          if (res.viewUrl) links.push({ name: res.name, url: res.viewUrl });
        }
      }

      setDriveLinks(links);
      toast(`${links.length} PDF berhasil disimpan ke Drive!`, 'success');
    } catch (err) {
      toast('Gagal simpan Drive: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDFLokal = async () => {
    if (!rows.length) { toast('Tidak ada data','error'); return; }
    setSavingPdf(true);
    const panitia = getActivePanitia();
    try {
      if (rows[0]?.Jenis_Mailing === 'Sekaligus') {
        const html     = buildSuratHTML(rows, rows[0].Jenis_Surat, 'Sekaligus', panitia, barang);
        const filename = `${rows[0].Jenis_Surat}_Sekaligus_Batch${selBatch}`;
        await downloadPDFLokal(html, filename);
      } else {
        for (const r of rows) {
          const html     = buildSuratHTML([r], r.Jenis_Surat, 'Perseorangan', panitia, barang);
          const filename = `${r.Jenis_Surat}_${r.Nama}_${r.No_Surat}`;
          await downloadPDFLokal(html, filename);
        }
      }
      toast('PDF berhasil diunduh!', 'success');
    } catch (err) {
      toast('Gagal buat PDF: ' + err.message, 'error');
    } finally {
      setSavingPdf(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!selBatch) return;
    if (!window.confirm('Hapus seluruh data batch ini? Tidak dapat dibatalkan.')) return;
    setDeleting(true);
    try {
      await api.deleteBatch(selBatch);
      toast('Batch berhasil dihapus','success');
      // Reload
      const isAdmin = seting.idPanitia === 'ADMIN';
      const params = isAdmin ? {} : { ID_Panitia: seting.idPanitia };
      const r = await api.getSurat(params);
      const data = r.data || [];
      setAllSurat(data);
      const bMap = {};
      data.forEach(d => {
        if (!bMap[d.ID_Batch]) bMap[d.ID_Batch] = { id:d.ID_Batch, jenisSurat:d.Jenis_Surat,
          jenisMailing:d.Jenis_Mailing, tanggal:d.Tanggal, acara:d.Acara, count:0 };
        bMap[d.ID_Batch].count++;
      });
      const bl = Object.values(bMap).sort((a,b)=>b.id-a.id);
      setBatches(bl);
      setSelBatch(bl[0]?.id || null);
    } catch(e) {
      toast('Gagal hapus: '+e.message,'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveRow = async (fromIndex, toIndex) => {
    if (fromIndex < 0 || fromIndex >= rows.length || toIndex < 0 || toIndex >= rows.length) return;
    const newRows = [...rows];
    const [movedItem] = newRows.splice(fromIndex, 1);
    newRows.splice(toIndex, 0, movedItem);
    
    setLoading(true);
    try {
      const orderIds = newRows.map(r => r.ID_Surat);
      await api.updateBatchOrder(selBatch, orderIds);
      toast('Urutan lampiran berhasil diperbarui!', 'success');
      
      // Update local state by mapping original list
      setAllSurat(prev => {
        const batchIds = new Set(orderIds.map(String));
        let inserted = false;
        const result = [];
        prev.forEach(s => {
          if (batchIds.has(String(s.ID_Surat))) {
            if (!inserted) {
              result.push(...newRows);
              inserted = true;
            }
          } else {
            result.push(s);
          }
        });
        return result;
      });
    } catch(err) {
      toast('Gagal memperbarui urutan: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPerson = (p) => {
    setSelectedPerson(p);
    setFormNama(p.Nama || '');
    setFormKet(p.Jabatan_Panitia || p.Ket || '');
    setFormKamar(p.Kamar_Bagian || '');
    setFormProdi(p.Prodi || '');
    setFormSemester(p.Semester || '');
    setFormThnPengabdian(p.Tahun_Pengabdian || '');
  };

  const handleAddRecipient = async () => {
    if (!formNama) { toast('Nama harus diisi!', 'error'); return; }
    setSaving(true);
    try {
      const baseRow = rows[0] || {};
      const newRecipientRow = {
        ...baseRow,
        Nama:             formNama,
        Ket:              formKet,
        Kamar_Bagian:     formKamar,
        Prodi:            formProdi,
        Semester:         formSemester,
        Tahun_Pengabdian: formThnPengabdian,
        Link_PDF:         ''
      };
      
      delete newRecipientRow.ID_Surat;
      delete newRecipientRow.Tanggal_Dibuat;
      delete newRecipientRow._row;
      
      await api.insertSurat([newRecipientRow]);
      toast(`Berhasil menambahkan ${formNama} ke mailing list!`, 'success');
      
      setShowAddModal(false);
      setSelectedPerson(null);
      setSearchVal('');
      
      const isAdmin = seting.idPanitia === 'ADMIN';
      const params = isAdmin ? {} : { ID_Panitia: seting.idPanitia };
      const r = await api.getSurat(params);
      setAllSurat(r.data || []);
    } catch(err) {
      toast('Gagal menambahkan penerima: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const BADGE = {
    'Perizinan':  'badge-amber',
    'Undangan':   'badge-blue',
    'Peminjaman': 'badge-green',
  };

  return (
    <div className="fade-in" style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16 }}>

      {/* ── Panel kiri: daftar batch ── */}
      <div>
        <div style={{ fontWeight:700, fontSize:12, letterSpacing:.5, textTransform:'uppercase',
                      color:'var(--text-muted)', marginBottom:10 }}>
          Riwayat Mailing
        </div>
        {loading ? (
          <div style={{ padding:20, textAlign:'center', opacity:.5, fontSize:13 }}>Memuat...</div>
        ) : batches.length === 0 ? (
          <div style={{ padding:20, textAlign:'center', opacity:.5, fontSize:13 }}>
            Belum ada mailing
          </div>
        ) : batches.map(b => (
          <div key={b.id}
            onClick={() => setSelBatch(b.id)}
            style={{
              padding:'10px 14px', borderRadius:8, cursor:'pointer', marginBottom:6,
              border:`1px solid ${Number(selBatch)===Number(b.id) ? 'var(--accent)' : 'var(--border)'}`,
              background: Number(selBatch)===Number(b.id) ? 'var(--accent-soft)' : 'var(--card)',
              transition:'all .15s',
            }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <span className={`badge ${BADGE[b.jenisSurat]||'badge-blue'}`}>{b.jenisSurat}</span>
              <span style={{ fontSize:11, opacity:.5 }}>#{b.id}</span>
            </div>
            <div style={{ fontSize:12, fontWeight:600, marginBottom:2 }}>{b.acara || '-'}</div>
            <div style={{ fontSize:11, opacity:.6 }}>
              {formatTanggalIndo(b.tanggal)} · {b.count} orang · {b.jenisMailing}
            </div>
          </div>
        ))}
      </div>

      {/* ── Panel kanan: detail batch ── */}
      <div>
        {!selBatch || !selBatchInfo ? (
          <div className="card" style={{ padding:60, textAlign:'center', opacity:.5 }}>
            Pilih batch dari daftar kiri
          </div>
        ) : (
          <>
            {/* Info batch */}
            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span className={`badge ${BADGE[selBatchInfo.jenisSurat]||'badge-blue'}`} style={{ fontSize:13 }}>
                      {selBatchInfo.jenisSurat}
                    </span>
                    <select
                      value={selBatchInfo.jenisMailing}
                      disabled={loading}
                      onChange={async (e) => {
                        const newType = e.target.value;
                        if (window.confirm(`Ubah tipe mailing batch ini menjadi "${newType}"?`)) {
                          try {
                            setLoading(true);
                            await api.updateBatchMailing(selBatch, newType);
                            toast('Tipe mailing berhasil diubah!', 'success');
                            // Update local states immediately
                            setAllSurat(prev => prev.map(s => Number(s.ID_Batch) === Number(selBatch) ? { ...s, Jenis_Mailing: newType } : s));
                            setBatches(prev => prev.map(b => Number(b.id) === Number(selBatch) ? { ...b, jenisMailing: newType } : b));
                          } catch(err) {
                            toast('Gagal mengubah tipe: ' + err.message, 'error');
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      style={{
                        padding: '2px 8px',
                        fontSize: 11,
                        borderRadius: 6,
                        border: '1px solid var(--accent2)',
                        background: '#EDF7F1',
                        color: 'var(--accent2)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        height: 24,
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title="Ubah tipe mailing (Perseorangan / Sekaligus)"
                    >
                      <option value="Perseorangan">👤 Perseorangan</option>
                      <option value="Sekaligus">👥 Sekaligus</option>
                    </select>
                    <span style={{ fontSize:12, opacity:.5 }}>Batch #{selBatch}</span>
                  </div>
                  <div style={{ fontWeight:700, fontSize:16, marginBottom:2 }}>
                    {rows[0]?.Acara || '-'}
                  </div>
                  <div style={{ fontSize:13, opacity:.6 }}>
                    {rows[0]?.Hari}, {formatTanggalIndo(rows[0]?.Tanggal)} · {formatWaktu(rows[0]?.Waktu)} · {rows[0]?.Tempat}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button className="btn btn-ghost" style={{ fontSize:12 }}
                    onClick={() => handleGenerate('print')}>🖨 Print</button>
                  <button className="btn btn-secondary" style={{ fontSize:12 }}
                    onClick={() => handleGenerate('pdf')}>📄 PDF (Print)</button>
                  <button className="btn btn-secondary" style={{ fontSize:12, background:'#e0f2fe', color:'#0369a1' }}
                    onClick={handleDownloadPDFLokal} disabled={savingPdf}>
                    {savingPdf ? '⏳ Membuat...' : '⬇ PDF Lokal'}
                  </button>
                  <button className="btn btn-success" style={{ fontSize:12, opacity:.8 }}
                    onClick={() => handleGenerate('word')}>📝 Word (Lama)</button>
                  
                  {/* Upload template Word → Word */}
                  <input type="file" accept=".docx" ref={fileInputRef}
                         style={{ display:'none' }} onChange={handleUploadTemplate} />
                  <button className="btn btn-success" style={{ fontSize:12, background:'#16a34a' }}
                    onClick={() => fileInputRef.current.click()}>📝 Word (Asli)</button>

                  {/* Cetak PDF otomatis menggunakan Template Master dari Drive */}
                  <button className="btn" style={{ fontSize:12, background:'#f59e0b', color:'#fff' }}
                    onClick={handleGenerateFromMaster} disabled={savingPdf}>
                    {savingPdf ? '⏳ Menyiapkan...' : '📄 PDF (Master)'}
                  </button>

                  {/* Upload template Word → PDF */}
                  <input type="file" accept=".docx" ref={pdfTplInputRef}
                         style={{ display:'none' }} onChange={handleUploadPDFTemplate} />
                  <button className="btn" style={{ fontSize:12, background:'#7c3aed', color:'#fff' }}
                    onClick={() => pdfTplInputRef.current.click()} disabled={savingPdf}>
                    {savingPdf ? '⏳ Membuat...' : '📄 PDF (Template)'}
                  </button>

                  <button className="btn" style={{ fontSize:12, background:'#1a56db', color:'#fff' }}
                    onClick={handleSaveToDrive} disabled={saving}>
                    {saving ? '⏳ Menyimpan...' : '☁ Simpan ke Drive'}
                  </button>

                  <button className="btn btn-danger" style={{ fontSize:12 }}
                    onClick={handleDeleteBatch} disabled={deleting}>
                    {deleting ? '⏳' : '🗑 Hapus'}
                  </button>
                </div>
              </div>
            </div>

            {/* Panel link Drive (Baru & Lama) */}
            {(() => {
              let existingLinks = [];
              const isSekaligus = rows[0]?.Jenis_Mailing === 'Sekaligus';

              if (isSekaligus) {
                // Untuk sekaligus, cukup tampilkan satu link utama
                if (rows[0]?.Link_PDF) {
                  existingLinks = [{ 
                    name: `${rows[0].Jenis_Surat} Sekaligus (Batch #${selBatch})`, 
                    url: rows[0].Link_PDF 
                  }];
                }
              } else {
                // Untuk perseorangan, tampilkan per orang
                existingLinks = rows
                  .filter(r => r.Link_PDF)
                  .map(r => ({ name: `${r.Nama} (PDF)`, url: r.Link_PDF }));
              }
              
              const allLinks = [...existingLinks, ...driveLinks];
              if (allLinks.length === 0) return null;

              return (
                <div style={{
                  marginBottom:14, padding:'12px 16px',
                  background:'#f0fdf4', border:'1px solid #bbf7d0',
                  borderRadius:10,
                }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#166534', marginBottom:8 }}>
                    📂 File Terarsip di Google Drive ({allLinks.length} file)
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {allLinks.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer"
                        style={{
                          fontSize:12, color:'#15803d', textDecoration:'none',
                          padding:'4px 8px', borderRadius:6,
                          background:'rgba(255,255,255,.6)',
                          display:'flex', alignItems:'center', gap:6,
                        }}>
                        📄 {l.name}
                        <span style={{ opacity:.5, fontSize:11 }}>↗ Buka</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Tabel nama */}
            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div className="section-title" style={{ margin:0 }}>Daftar Nama ({rows.length} orang)</div>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize:12, padding:'6px 12px', display:'flex', alignItems:'center', gap:4 }}
                  onClick={() => {
                    setSelectedPerson(null);
                    setSearchVal('');
                    setShowAddModal(true);
                  }}
                >
                  ➕ Tambah Penerima
                </button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'var(--bg)' }}>
                      {['', 'No.', 'No. Surat', 'Nama', 'Keterangan', 'Kamar/Bagian', 'Prodi', 'Semester', 'Aksi'].map(h => (
                        <th key={h} style={{ padding:'8px 10px', textAlign: h === 'Aksi' || h === '' ? 'center' : 'left', fontSize:12,
                                             fontWeight:600, color:'var(--text-muted)',
                                             borderBottom:'1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.ID_Surat}
                        draggable={!loading}
                        onDragStart={(e) => {
                          draggedIndex.current = i;
                          e.currentTarget.style.opacity = '0.5';
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.style.opacity = '1';
                          draggedIndex.current = null;
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIndex = draggedIndex.current;
                          const toIndex = i;
                          if (fromIndex !== null && fromIndex !== toIndex) {
                            handleMoveRow(fromIndex, toIndex);
                          }
                        }}
                        style={{
                          borderBottom:'1px solid var(--border)',
                          background: loading ? '#fafafa' : 'transparent',
                          cursor: loading ? 'not-allowed' : 'move'
                        }}
                      >
                        <td style={{ padding:'8px 10px', display:'flex', alignItems:'center', gap:4, justifyContent:'center' }}>
                          <span
                            style={{ cursor:'grab', opacity:.4, fontSize:14, paddingRight:4 }}
                            title="Drag/seret untuk mengatur urutan"
                          >
                            ⋮⋮
                          </span>
                          <button
                            disabled={i === 0 || loading}
                            onClick={() => handleMoveRow(i, i - 1)}
                            style={{ background:'none', border:'none', padding:2, cursor: loading || i === 0 ? 'not-allowed' : 'pointer', fontSize:10, opacity: i === 0 ? .2 : .6 }}
                            title="Pindahkan ke atas"
                          >
                            ▲
                          </button>
                          <button
                            disabled={i === rows.length - 1 || loading}
                            onClick={() => handleMoveRow(i, i + 1)}
                            style={{ background:'none', border:'none', padding:2, cursor: loading || i === rows.length - 1 ? 'not-allowed' : 'pointer', fontSize:10, opacity: i === rows.length - 1 ? .2 : .6 }}
                            title="Pindahkan ke bawah"
                          >
                            ▼
                          </button>
                        </td>
                        <td style={{ padding:'8px 10px', opacity:.5 }}>{i+1}</td>
                        <td style={{ padding:'8px 10px' }}>{r.No_Surat}</td>
                        <td style={{ padding:'8px 10px', fontWeight:600 }}>{r.Nama}</td>
                        <td style={{ padding:'8px 10px', opacity:.7 }}>{r.Ket}</td>
                        <td style={{ padding:'8px 10px', opacity:.7 }}>{r.Kamar_Bagian}</td>
                        <td style={{ padding:'8px 10px', opacity:.7 }}>{r.Prodi}</td>
                        <td style={{ padding:'8px 10px', opacity:.7 }}>{r.Semester}</td>
                        <td style={{ padding:'8px 10px', textAlign:'center' }}>
                          <button
                            onClick={async () => {
                              if (rows.length <= 1) {
                                toast('Tidak dapat menghapus satu-satunya penerima. Hapus seluruh batch menggunakan tombol di atas jika diperlukan.', 'warning');
                                return;
                              }
                              if (window.confirm(`Hapus "${r.Nama}" dari batch surat ini?`)) {
                                try {
                                  setLoading(true);
                                  await api.deleteSurat(r._row);
                                  toast(`Berhasil menghapus ${r.Nama}`, 'success');
                                  
                                  // Hapus data lokal dari allSurat
                                  setAllSurat(prev => prev.filter(x => String(x.ID_Surat) !== String(r.ID_Surat)));
                                  
                                  // Kurangi count pada batch lokal
                                  setBatches(prev => prev.map(b => Number(b.id) === Number(selBatch) ? { ...b, count: b.count - 1 } : b));
                                } catch(err) {
                                  toast('Gagal menghapus: ' + err.message, 'error');
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            disabled={loading}
                            className="btn btn-ghost"
                            style={{
                              padding: '2px 6px',
                              minHeight: 0,
                              height: 24,
                              color: 'var(--danger)',
                              border: '1px solid transparent',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 11
                            }}
                            onMouseEnter={e => {
                              if (!loading) {
                                e.currentTarget.style.borderColor = 'var(--danger)';
                                e.currentTarget.style.background = '#fef2f2';
                              }
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = 'transparent';
                              e.currentTarget.style.background = 'transparent';
                            }}
                            title={`Hapus ${r.Nama} dari list`}
                          >
                            🗑 Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabel barang jika peminjaman */}
            {selBatchInfo.jenisSurat === 'Peminjaman' && (
              <div className="card">
                <div className="section-title">Daftar Barang Pinjaman</div>
                {barang.length === 0 ? (
                  <div style={{ opacity:.5, fontSize:13, padding:'12px 0' }}>
                    Tidak ada data barang
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:'var(--bg)' }}>
                        {['No.','Nama Barang','Jumlah','Satuan','Keterangan'].map(h => (
                          <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:12,
                                               fontWeight:600, color:'var(--text-muted)',
                                               borderBottom:'1px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {barang.map((b, i) => (
                        <tr key={b.ID_Peminjaman} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={{ padding:'8px 10px', opacity:.5 }}>{i+1}</td>
                          <td style={{ padding:'8px 10px', fontWeight:600 }}>{b.Nama_Barang}</td>
                          <td style={{ padding:'8px 10px' }}>{b.Jumlah_Barang}</td>
                          <td style={{ padding:'8px 10px', opacity:.7 }}>{b.Satuan}</td>
                          <td style={{ padding:'8px 10px', opacity:.7 }}>{b.Keterangan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal Overlay: Tambah Penerima ── */}
      {showAddModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000, padding:16,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div style={{
            background:'var(--card)', borderRadius:14, width:'100%', maxWidth:520,
            maxHeight:'85vh', display:'flex', flexDirection:'column',
            boxShadow:'0 20px 60px rgba(0,0,0,.2)',
            animation:'fadeIn .2s ease',
          }}>
            {/* Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)',
                          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>➕ Tambah Penerima Baru</div>
                <div style={{ fontSize:11, opacity:.5 }}>Masukkan penerima susulan ke dalam Batch #{selBatch}</div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{
                background:'var(--bg)', border:'1px solid var(--border)',
                borderRadius:8, width:32, height:32, cursor:'pointer',
                fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
              }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ flex:1, overflow:'auto', padding:'16px 20px' }}>
              {loadingMaster ? (
                <div style={{ textAlign:'center', padding:40, opacity:.5, fontSize:13 }}>
                  ⏳ Memuat database Guru & Santri...
                </div>
              ) : (
                <>
                  {/* Pilihan tipe: Guru / Santri */}
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase' }}>Tipe database</label>
                    <div style={{ display:'flex', gap:10 }}>
                      <button
                        type="button"
                        onClick={() => { setAddType('guru'); setSelectedPerson(null); setSearchVal(''); }}
                        className="btn"
                        style={{
                          flex:1,
                          background: addType === 'guru' ? '#e0f2fe' : 'var(--bg)',
                          border: `1px solid ${addType === 'guru' ? '#0284c7' : 'var(--border)'}`,
                          color: addType === 'guru' ? '#0369a1' : 'var(--text)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 12px'
                        }}
                      >
                        👨‍🏫 Guru (Ustadz/ah)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddType('santri'); setSelectedPerson(null); setSearchVal(''); }}
                        className="btn"
                        style={{
                          flex:1,
                          background: addType === 'santri' ? '#e0f2fe' : 'var(--bg)',
                          border: `1px solid ${addType === 'santri' ? '#0284c7' : 'var(--border)'}`,
                          color: addType === 'santri' ? '#0369a1' : 'var(--text)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 12px'
                        }}
                      >
                        🎓 Santri
                      </button>
                    </div>
                  </div>

                  {/* Input pencarian */}
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase' }}>Cari Nama Penerima</label>
                    <input
                      type="text"
                      placeholder={`Ketik nama ${addType === 'guru' ? 'guru ustadz/ah' : 'santri'}...`}
                      value={searchVal}
                      onChange={(e) => {
                        setSearchVal(e.target.value);
                        setSelectedPerson(null);
                      }}
                      style={{ width:'100%', padding:'8px 10px', fontSize:13, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', outline:'none' }}
                    />
                    
                    {/* Hasil pencarian */}
                    {searchVal && !selectedPerson && (
                      <div style={{
                        maxHeight:150, overflowY:'auto', border:'1px solid var(--border)',
                        borderRadius:8, background:'var(--card)', boxShadow:'0 4px 12px rgba(0,0,0,.08)', marginTop:4
                      }}>
                        {(() => {
                          const filtered = addType === 'guru'
                            ? masterGuru.filter(g => g.Nama?.toLowerCase().includes(searchVal.toLowerCase()))
                            : masterSantri.filter(s => s.Nama?.toLowerCase().includes(searchVal.toLowerCase()));
                          
                          if (filtered.length === 0) {
                            return <div style={{ padding:10, fontSize:12, opacity:.5, textAlign:'center' }}>Tidak ditemukan matches</div>;
                          }
                          return filtered.map(p => (
                            <div
                              key={p.ID_Guru || p.ID_Santri}
                              onClick={() => handleSelectPerson(p)}
                              style={{
                                padding:'8px 12px', fontSize:12, cursor:'pointer',
                                borderBottom:'1px solid var(--border)', transition:'background .1s',
                                display:'flex', justifyContent:'space-between'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <strong style={{ color:'var(--text)' }}>{p.Nama}</strong>
                              <span style={{ fontSize:11, opacity:.5 }}>{p.Kamar_Bagian || p.Kelas || ''}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Form konfirmasi detail data */}
                  {selectedPerson ? (
                    <div style={{
                      padding:14, background:'var(--bg)', borderRadius:10,
                      border:'1px solid var(--border)', animation:'fadeIn .15s'
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)' }}>Isi Form Penerima (Bisa Diedit)</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPerson(null)}
                          style={{ background:'none', border:'none', fontSize:11, color:'var(--danger)', cursor:'pointer', fontWeight:600 }}
                        >
                          ✕ Reset Pilihan
                        </button>
                      </div>
                      
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                        <div>
                          <label style={{ display:'block', fontSize:11, opacity:.6, marginBottom:2 }}>Nama Lengkap *</label>
                          <input
                            type="text"
                            value={formNama}
                            onChange={(e) => setFormNama(e.target.value)}
                            style={{ width:'100%', padding:'6px 8px', fontSize:12, borderRadius:6, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)' }}
                          />
                        </div>
                        <div>
                          <label style={{ display:'block', fontSize:11, opacity:.6, marginBottom:2 }}>Keterangan / Jabatan</label>
                          <input
                            type="text"
                            value={formKet}
                            onChange={(e) => setFormKet(e.target.value)}
                            style={{ width:'100%', padding:'6px 8px', fontSize:12, borderRadius:6, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)' }}
                            placeholder="Contoh: Panitia, Guru, dll."
                          />
                        </div>
                      </div>
                      
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                        <div>
                          <label style={{ display:'block', fontSize:11, opacity:.6, marginBottom:2 }}>Kamar / Bagian</label>
                          <input
                            type="text"
                            value={formKamar}
                            onChange={(e) => setFormKamar(e.target.value)}
                            style={{ width:'100%', padding:'6px 8px', fontSize:12, borderRadius:6, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)' }}
                          />
                        </div>
                        <div>
                          <label style={{ display:'block', fontSize:11, opacity:.6, marginBottom:2 }}>Prodi</label>
                          <input
                            type="text"
                            value={formProdi}
                            onChange={(e) => setFormProdi(e.target.value)}
                            style={{ width:'100%', padding:'6px 8px', fontSize:12, borderRadius:6, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)' }}
                          />
                        </div>
                      </div>
                      
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={{ display:'block', fontSize:11, opacity:.6, marginBottom:2 }}>Semester</label>
                          <input
                            type="text"
                            value={formSemester}
                            onChange={(e) => setFormSemester(e.target.value)}
                            style={{ width:'100%', padding:'6px 8px', fontSize:12, borderRadius:6, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)' }}
                          />
                        </div>
                        <div>
                          <label style={{ display:'block', fontSize:11, opacity:.6, marginBottom:2 }}>Tahun Pengabdian</label>
                          <input
                            type="text"
                            value={formThnPengabdian}
                            onChange={(e) => setFormThnPengabdian(e.target.value)}
                            style={{ width:'100%', padding:'6px 8px', fontSize:12, borderRadius:6, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)' }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding:24, textAlign:'center', opacity:.5,
                      border:'1px dashed var(--border)', borderRadius:10, fontSize:12
                    }}>
                      💡 Pilih nama penerima dari daftar pencarian di atas untuk memunculkan form pengisian data
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)',
                          display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ fontSize:12 }}>
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddRecipient}
                disabled={saving || !selectedPerson}
                style={{ fontSize:12, padding:'8px 16px', display:'flex', alignItems:'center', gap:4 }}
              >
                {saving ? '⏳ Menyimpan...' : '➕ Tambahkan ke Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
