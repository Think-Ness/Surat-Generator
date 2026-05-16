// src/lib/utils.js

// ── Tanggal ──────────────────────────────────────────────────────
const BULAN_ID = [
  '', 'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];
const HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

export function formatTanggalIndo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getDate()} ${BULAN_ID[d.getMonth() + 1]} ${d.getFullYear()}`;
}

export function getHariIndo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return HARI_ID[d.getDay()];
}

export function formatTanggalFile(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function formatWaktu(waktu) {
  if (!waktu) return '';
  if (typeof waktu === 'string' && waktu.includes('1899-12-30T')) {
    const d = new Date(waktu);
    if (!isNaN(d)) {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }
  }
  return waktu;
}

// ── Build HTML surat (shared untuk print/PDF) ────────────────────
// panitia = objek dari panitiaList { Nama_Panitia, Instansi, Alamat, Nama_Ketua, Jabatan, Link_TTD }
export function buildSuratHTML(rows, jenisSurat, jenisMailing, panitia = {}, barang = []) {
  const s = rows[0]; // data header diambil dari baris pertama
  const instansi   = panitia?.Instansi   || panitia?.Nama_Panitia || 'Pondok Modern Darussalam Gontor';
  const alamat     = panitia?.Alamat     || 'Ponorogo, Jawa Timur';
  const ttdNama    = panitia?.Nama_Ketua || '';
  const ttdJabatan = panitia?.Jabatan    || '';

  const isSekaligus = jenisMailing === 'Sekaligus';

  const lampiranNama = isSekaligus && (jenisSurat === 'Perizinan' || jenisSurat === 'Undangan')
    ? buildLampiranNama(rows) : '';

  const lampiranBarang = jenisSurat === 'Peminjaman'
    ? buildLampiranBarang(barang) : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: "Times New Roman", serif; font-size: 12pt; color: #000;
         padding: 2.5cm 2.5cm 2cm 3cm; }
  .kop { text-align:center; border-bottom:3px double #000; padding-bottom:8px; margin-bottom:16px; }
  .kop h2 { font-size:16pt; text-transform:uppercase; letter-spacing:1px; }
  .kop p { font-size:10pt; }
  .nomor { margin-bottom:16px; }
  .nomor table td { padding:1px 4px; vertical-align:top; }
  .body-surat { text-align:justify; line-height:1.8; margin-bottom:16px; }
  .body-surat p { margin-bottom:8px; }
  .data-personal { margin:12px 0; }
  .data-personal table { width:100%; }
  .data-personal table td { padding:2px 4px; vertical-align:top; }
  .data-personal table td:first-child { width:180px; }
  .ttd { margin-top:32px; }
  .ttd-kanan { float:right; text-align:center; width:250px; }
  .ttd-kiri  { float:left; text-align:center; width:250px; }
  .ttd-garis { margin:60px auto 4px; border-bottom:1px solid #000; width:200px; }
  .clearfix::after { content:''; display:block; clear:both; }
  h3.lampiran-title { margin:24px 0 8px; text-align:center; text-transform:uppercase; }
  table.lampiran { width:100%; border-collapse:collapse; margin-top:8px; font-size:11pt; }
  table.lampiran th, table.lampiran td {
    border:1px solid #000; padding:4px 8px; text-align:left; }
  table.lampiran th { background:#f0f0f0; text-align:center; }
  @media print {
    @page { size: A4; margin: 2.5cm 2.5cm 2cm 3cm; }
    body { padding: 0; }
  }
</style>
</head>
<body>
  <div class="kop">
    <h2>${instansi}</h2>
    <p>${alamat}</p>
  </div>

  <div class="nomor">
    <table>
      <tr><td>Nomor</td><td>:</td><td>${s.No_Surat || ''}</td></tr>
      <tr><td>Lampiran</td><td>:</td><td>${lampiranNama || lampiranBarang ? '1 (satu) lembar' : '-'}</td></tr>
      <tr><td>Hal</td><td>:</td><td><strong>${s.Hal || ''}</strong></td></tr>
    </table>
  </div>

  <div class="body-surat">
    <p>Kepada Yth.<br>
    ${isSekaligus ? 'Sdr./i. Terlampir' : `Sdr./i. <strong>${s.Nama}</strong>`}<br>
    di tempat.</p>

    <p><em>Assalamu'alaikum Wr. Wb.</em></p>

    <p>Dengan hormat, sehubungan dengan kegiatan <strong>${s.Acara || ''}</strong>,
    bersama ini kami ${jenisSurat === 'Perizinan' ? 'mengajukan permohonan izin' :
                       jenisSurat === 'Undangan'  ? 'mengundang' : 'mengajukan permohonan peminjaman'}
    ${isSekaligus ? 'nama-nama sebagaimana terlampir' :
      `Sdr./i. <strong>${s.Nama}</strong>${s.Ket ? ', ' + s.Ket : ''}`}
    untuk hadir pada:</p>

    <div class="data-personal">
      <table>
        <tr><td>Hari, Tanggal</td><td>:</td><td>${s.Hari}, ${formatTanggalIndo(s.Tanggal)}</td></tr>
        <tr><td>Waktu</td><td>:</td><td>${formatWaktu(s.Waktu) || ''}</td></tr>
        <tr><td>Tempat</td><td>:</td><td>${s.Tempat || ''}</td></tr>
        <tr><td>Acara</td><td>:</td><td>${s.Acara || ''}</td></tr>
      </table>
    </div>

    ${jenisSurat === 'Peminjaman' ? `<p>Adapun barang yang dipinjam sebagaimana terlampir.</p>` : ''}

    <p>Demikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya,
    kami ucapkan terima kasih.</p>

    <p><em>Wassalamu'alaikum Wr. Wb.</em></p>
  </div>

  <div class="ttd clearfix">
    <div class="ttd-kiri">
      <p>${s.Tanggal_Hijriah || ''}</p>
      <p>${formatTanggalIndo(s.Tanggal)}</p>
    </div>
    <div class="ttd-kanan">
      <p>${ttdJabatan}</p>
      <div class="ttd-garis"></div>
      <p><strong>${ttdNama}</strong></p>
    </div>
  </div>

  ${lampiranNama}
  ${lampiranBarang}
</body>
</html>`;
}

function buildLampiranNama(rows) {
  const rowsHTML = rows.map((r, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${r.Nama || ''}</td>
      <td>${r.Ket || ''}</td>
      <td>${r.Kamar_Bagian || ''}</td>
      <td>${r.Prodi || ''}</td>
      <td>${r.Semester || ''}</td>
    </tr>`).join('');
  return `
    <div style="page-break-before:always">
      <h3 class="lampiran-title">Lampiran Daftar Nama</h3>
      <table class="lampiran">
        <thead>
          <tr>
            <th style="width:40px">No.</th>
            <th>Nama</th>
            <th>Keterangan</th>
            <th>Kamar/Bagian</th>
            <th>Prodi</th>
            <th>Semester</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>`;
}

function buildLampiranBarang(barang) {
  if (!barang.length) return '';
  const rowsHTML = barang.map((b, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${b.Nama_Barang || ''}</td>
      <td style="text-align:center">${b.Jumlah_Barang || ''}</td>
      <td>${b.Satuan || ''}</td>
      <td>${b.Keterangan || ''}</td>
    </tr>`).join('');
  return `
    <div style="page-break-before:always">
      <h3 class="lampiran-title">Lampiran Daftar Barang Pinjaman</h3>
      <table class="lampiran">
        <thead>
          <tr>
            <th style="width:40px">No.</th>
            <th>Nama Barang</th>
            <th>Jumlah</th>
            <th>Satuan</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>`;
}

// ── Print ────────────────────────────────────────────────────────
export function printSurat(html) {
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

// ── Export PDF (via print dialog → Save as PDF) ──────────────────
export function exportPDF(html, filename) {
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html.replace('</head>',
    `<script>
      window.onload = function() {
        document.title = '${filename}';
        window.print();
        setTimeout(() => window.close(), 1000);
      }
    <\/script></head>`));
  win.document.close();
}

// ── Download PDF Lokal (via html2pdf.js) ─────────────────────────
export async function downloadPDFLokal(html, filename) {
  const html2pdf = (await import('html2pdf.js')).default;

  // Buat wrapper div dari string HTML
  const container = document.createElement('div');
  container.innerHTML = html;
  // Ambil body content saja agar tidak ada tag html/head
  const bodyContent = container.querySelector('body') || container;

  const opt = {
    margin:      [15, 20, 15, 25], // top, right, bottom, left (mm)
    filename:    filename + '.pdf',
    image:       { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:   { mode: ['avoid-all', 'css', 'legacy'] },
  };

  await html2pdf().set(opt).from(bodyContent).save();
}

// ── Export Word (.docx via HTML blob) ────────────────────────────
export function exportWord(html, filename) {
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword'
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename + '.doc';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Toast helper ─────────────────────────────────────────────────
export function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    padding:12px 20px;border-radius:8px;font-size:14px;
    color:#fff;font-family:sans-serif;max-width:320px;
    background:${type==='success'?'#16a34a':type==='error'?'#dc2626':'#2563eb'};
    box-shadow:0 4px 12px rgba(0,0,0,.2);
    animation:slideIn .2s ease;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
