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
                    <span className="badge badge-blue">{selBatchInfo.jenisMailing}</span>
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
              <div className="section-title">Daftar Nama ({rows.length} orang)</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'var(--bg)' }}>
                      {['No.','No. Surat','Nama','Keterangan','Kamar/Bagian','Prodi','Semester'].map(h => (
                        <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:12,
                                             fontWeight:600, color:'var(--text-muted)',
                                             borderBottom:'1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.ID_Surat} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'8px 10px', opacity:.5 }}>{i+1}</td>
                        <td style={{ padding:'8px 10px' }}>{r.No_Surat}</td>
                        <td style={{ padding:'8px 10px', fontWeight:600 }}>{r.Nama}</td>
                        <td style={{ padding:'8px 10px', opacity:.7 }}>{r.Ket}</td>
                        <td style={{ padding:'8px 10px', opacity:.7 }}>{r.Kamar_Bagian}</td>
                        <td style={{ padding:'8px 10px', opacity:.7 }}>{r.Prodi}</td>
                        <td style={{ padding:'8px 10px', opacity:.7 }}>{r.Semester}</td>
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
    </div>
  );
}
