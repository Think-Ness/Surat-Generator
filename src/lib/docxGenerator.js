import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { formatTanggalIndo, formatWaktu } from './utils';
import { api } from './api';

const ROMAWI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function enrichData(d, panitia = {}, perizinan = {}, barang = []) {
  const t = new Date(d.Tanggal);
  const ts = new Date(d.Tanggal_Romawi);
  
  // Ekstrak Tahun Hijriah
  const thnMatch = d.Tanggal_Hijriah?.match(/\b(\d{4})\b/);
  const Thn_Hijriah = thnMatch ? thnMatch[1] : '';

  // Deteksi Bulan Hijriah
  let Bln_Hijriah_Romawi = '';
  if (d.Tanggal_Hijriah) {
    const text = d.Tanggal_Hijriah.toLowerCase();
    // Ganti apostrof kurawal ke lurus untuk konsistensi pencarian
    const cleanText = text.replace(/’/g, "'");

    if (cleanText.includes('muharram')) Bln_Hijriah_Romawi = 'I';
    else if (cleanText.includes('safar')) Bln_Hijriah_Romawi = 'II';
    else if (cleanText.includes('rabi') && (cleanText.includes('awal') || cleanText.includes('ula'))) Bln_Hijriah_Romawi = 'III';
    else if (cleanText.includes('rabi') && (cleanText.includes('akhir') || cleanText.includes('tsan') || cleanText.includes('thani'))) Bln_Hijriah_Romawi = 'IV';
    else if (cleanText.includes('jumad') && (cleanText.includes('awal') || cleanText.includes('ula'))) Bln_Hijriah_Romawi = 'V';
    else if (cleanText.includes('jumad') && (cleanText.includes('akhir') || cleanText.includes('tsan') || cleanText.includes('thani'))) Bln_Hijriah_Romawi = 'VI';
    else if (cleanText.includes('rajab')) Bln_Hijriah_Romawi = 'VII';
    else if (cleanText.includes('sya') && cleanText.includes('ban')) Bln_Hijriah_Romawi = 'VIII';
    else if (cleanText.includes('ramadhan') || cleanText.includes('ramadan')) Bln_Hijriah_Romawi = 'IX';
    else if (cleanText.includes('syawal')) Bln_Hijriah_Romawi = 'X';
    else if (cleanText.includes('zulqa') || cleanText.includes('dzulqa') || cleanText.includes('zulka') || cleanText.includes('dzulka')) Bln_Hijriah_Romawi = 'XI';
    else if (cleanText.includes('zulhij') || cleanText.includes('dzulhij')) Bln_Hijriah_Romawi = 'XII';
  }

  // Bangun teks daftar barang untuk tag tunggal
  const Daftar_Barang_Text = barang.length > 0 
    ? barang.map((b, i) => `${i + 1}. ${b.Nama_Barang} (${b.Jumlah_Barang} ${b.Satuan})`).join(', ')
    : '';

  return {
    ...d,
    // Tag Umum
    Tanggal_Indo: formatTanggalIndo(d.Tanggal),
    Waktu: formatWaktu(d.Waktu),
    Tanggal_Surat_Indo: formatTanggalIndo(d.Tanggal_Romawi),
    Bln_Surat_Romawi: !isNaN(ts) ? ROMAWI[ts.getMonth() + 1] : '',
    Thn_Surat: !isNaN(ts) ? ts.getFullYear() : '',
    Bln_Masehi_Romawi: !isNaN(t) ? ROMAWI[t.getMonth() + 1] : '',
    Thn_Masehi: !isNaN(t) ? t.getFullYear() : '',
    Bln_Hijriah_Romawi,
    Thn_Hijriah,
    
    // Tag Panitia TTD (pengirim surat)
    Panitia:         panitia.Nama_Panitia || '',
    Instansi:        panitia.Instansi     || '',
    Alamat:          panitia.Alamat       || '',
    Ketua:           panitia.Nama_Ketua   || '',
    Ketua_Nama:      panitia.Nama_Ketua   || '',
    Ketua_Jabatan:   panitia.Jabatan      || '',
    Link_TTD:        panitia.Link_TTD     || '',
    Panitia_Lengkap: panitia.Nama_Panitia && panitia.Instansi
                     ? `${panitia.Nama_Panitia} ${panitia.Instansi}`
                     : (panitia.Nama_Panitia || panitia.Instansi || ''),

    // Tag Perizinan
    Keperluan:     perizinan?.Keperluan || '',
    Alasan:        perizinan?.Alasan    || '',

    // Tag Penerima surat — jabatan & kepanitiaan si penerima
    Jabatan:          d.Jabatan_Panitia  || '',
    Panitia_Nama:     d.Nama_Kepanitiaan || '',
    Nama_Kepanitiaan: d.Nama_Kepanitiaan || '',

    // Tag Peminjaman
    Daftar_Barang_Text,
    items: barang
  };
}

/**
 * Helper untuk grouping data per Kamar/Bagian
 */
function groupData(data, panitia, perizinan, barang) {
  const mapped = data.map((d, i) => ({ ...enrichData(d, panitia, perizinan, barang), No: i + 1 }));
  
  // Grouping by Kamar_Bagian
  const groupsMap = mapped.reduce((acc, obj) => {
    const key = obj.Kamar_Bagian || 'Tanpa Bagian';
    if (!acc[key]) acc[key] = { Bagian: key, orang: [] };
    acc[key].orang.push(obj);
    return acc;
  }, {});

  const groups = Object.values(groupsMap);
  return { 
    ...mapped[0], 
    orang: mapped, 
    groups, 
    items: barang 
  };
}

/**
 * Generate Word (.docx) asli
 */
export async function generateDocxFromTemplate(templateBuffer, data, filename, panitia = {}, perizinan = {}, barang = []) {
  try {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    if (Array.isArray(data)) {
      doc.render(groupData(data, panitia, perizinan, barang));
    } else {
      doc.render(enrichData(data, panitia, perizinan, barang));
    }

    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    saveAs(out, filename + '.docx');
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Generate PDF Presisi via GAS + Simpan ke Drive otomatis
 */
export async function generatePDFFromTemplate(templateBuffer, data, filename, panitia = {}, metadata = {}, perizinan = {}, barang = [], silent = false) {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  if (Array.isArray(data)) {
    doc.render(groupData(data, panitia, perizinan, barang));
  } else {
    doc.render(enrichData(data, panitia, perizinan, barang));
  }

  const docxArrayBuffer = doc.getZip().generate({ type: 'arraybuffer' });

  // Base64
  const base64 = btoa(
    new Uint8Array(docxArrayBuffer)
      .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  // Kirim ke GAS — payload lengkap
  const res = await api.docxToPdf({
    base64,
    filename,
    ...metadata
  });
  if (res.success && res.url) {
    if (!silent) window.open(res.url, '_blank');
    return res;
  } else {
    throw new Error(res.error || 'Gagal konversi ke PDF');
  }
}
