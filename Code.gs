// ================================================================
// APPS SCRIPT BACKEND — Multi-Panitia Support
// ================================================================

const SHEET_GURU    = 'MasterGuru';
const SHEET_SANTRI  = 'MasterSantri';
const SHEET_SURAT   = 'SuratKepanitiaan';
const SHEET_BARANG  = 'BarangPinjaman';
const SHEET_SETING  = 'Seting';
const SHEET_PERIZINAN = 'Perizinan';

// ================================================================
// ROUTER UTAMA
// ================================================================
function doGet(e) {
  const action = e.parameter.action;
  let result;
  try {
    switch (action) {
      case 'getGuru':        result = getGuru(e);          break;
      case 'getSantri':      result = getSantri();         break;
      case 'getSurat':       result = getSurat(e);         break;
      case 'getBarang':      result = getBarang(e);        break;
      case 'getPerizinan':   result = getPerizinan(e);     break;
      case 'getPanitia':     result = getPanitia();        break;
      case 'getNextNoSurat': result = getNextNoSurat(e);   break;
      case 'getNextBatch':   result = getNextBatch();      break;
      case 'getTemplate':    result = getTemplate(e);      break;
      case 'listTemplates':  result = listTemplates(e);    break;
      default: result = { error: 'Action tidak dikenal: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonResponse(result);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const action  = payload.action;
  let result;
  try {
    switch (action) {
      case 'insertSurat':   result = insertSurat(payload);   break;
      case 'insertBarang':  result = insertBarang(payload);  break;
      case 'deleteBarang':  result = deleteBarang(payload);  break;
      case 'insertPerizinan': result = insertPerizinan(payload); break;
      case 'deleteBatch':   result = deleteBatch(payload);   break;
      case 'savePanitia':   result = savePanitia(payload);   break;
      case 'deletePanitia': result = deletePanitia(payload); break;
      case 'updateGuru':    result = updateGuru(payload);    break;
      case 'addGuru':       result = addGuru(payload);       break;
      case 'deleteGuru':    result = deleteGuru(payload);    break;
      case 'addSantri':     result = addSantri(payload);     break;
      case 'updateSantri':  result = updateSantri(payload);  break;
      case 'deleteSantri':  result = deleteSantri(payload);  break;
      case 'saveToDrive':   result = saveToDrive(payload);   break;
      case 'docxToPdf':     result = docxToPdf(payload);     break;
      case 'saveTemplate':  result = saveTemplate(payload);  break;
      default: result = { error: 'Action tidak dikenal: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonResponse(result);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
// HELPER: Ambil & Buat Sheet
// ================================================================
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = createSheet(name);
  return sheet;
}

function createSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.insertSheet(name);
  const headers = {
    [SHEET_GURU]: [
      'ID_Guru','Nama','Jabatan_Panitia','Nama_Kepanitiaan','Tahun_Pengabdian','Kamar_Bagian','Prodi','Semester'
    ],
    [SHEET_SANTRI]: [
      'ID_Santri','Nama','Jabatan_Panitia','Nama_Kepanitiaan','Kelas','Kamar_Bagian'
    ],
    [SHEET_SURAT]: [
      'ID_Surat','No_Surat','Tanggal_Hijriah','Tanggal_Romawi','Hal',
      'Nama','Ket','Kamar_Bagian','Prodi','Semester','Tahun_Pengabdian',
      'Hari','Tanggal','Tempat','Waktu','Acara',
      'Jenis_Surat','Jenis_Mailing','ID_Batch','ID_Panitia','Nama_Template','Tanggal_Dibuat','Link_PDF'
    ],
    [SHEET_BARANG]: [
      'ID_Peminjaman','No_Surat','Nama_Barang','Jumlah_Barang','Satuan','Keterangan'
    ],
    [SHEET_PERIZINAN]: [
      'ID_Perizinan','No_Surat','Keperluan','Alasan'
    ],
    [SHEET_SETING]: ['ID','Nama_Panitia','Instansi','Alamat','Nama_Ketua','Jabatan','Link_TTD']
  };
  if (headers[name]) {
    sheet.appendRow(headers[name]);
    sheet.getRange(1, 1, 1, headers[name].length)
         .setFontWeight('bold')
         .setBackground('#f3f4f6');
  }
  return sheet;
}

function getObjectFromRow(headers, row, rowNumber) {
  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i]);
  obj._row = rowNumber;
  return obj;
}

// ================================================================
// MASTER GURU
// ================================================================
function getGuru(e) {
  const sheet = getSheet(SHEET_GURU);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return { data: [] };
  const headers = data[0];
  let rows = data.slice(1).map((r, i) => getObjectFromRow(headers, r, i + 2)).filter(r => r.ID_Guru !== '');
  
  if (e && e.parameter && e.parameter.panitiaName) {
    const pName = e.parameter.panitiaName.toLowerCase();
    rows = rows.filter(r => r.Nama_Kepanitiaan?.toLowerCase() === pName);
  }
  return { data: rows };
}

function addGuru(payload) {
  const sheet = getSheet(SHEET_GURU);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('ID_Guru');
  const ids = data.slice(1).map(r => Number(r[idIdx])).filter(Boolean);
  const newId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
  
  const row = headers.map(h => {
    if (h === 'ID_Guru') return newId;
    return payload[h] || '';
  });
  sheet.appendRow(row);
  return { success: true, id: newId };
}

function updateGuru(payload) {
  const sheet = getSheet(SHEET_GURU);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = headers.map(h => payload[h] || '');
  sheet.getRange(payload._row, 1, 1, rowData.length).setValues([rowData]);
  return { success: true };
}

function deleteGuru(payload) {
  const sheet = getSheet(SHEET_GURU);
  sheet.deleteRow(payload._row);
  return { success: true };
}

// ================================================================
// MASTER SANTRI
// ================================================================
function getSantri() {
  const sheet = getSheet(SHEET_SANTRI);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return { data: [] };
  const headers = data[0];
  const rows = data.slice(1).map((r, i) => getObjectFromRow(headers, r, i + 2)).filter(r => r.ID_Santri !== '');
  return { data: rows };
}

function addSantri(payload) {
  const sheet = getSheet(SHEET_SANTRI);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('ID_Santri');
  const ids = data.slice(1).map(r => Number(r[idIdx])).filter(Boolean);
  const newId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
  
  const row = headers.map(h => {
    if (h === 'ID_Santri') return newId;
    return payload[h] || '';
  });
  sheet.appendRow(row);
  return { success: true, id: newId };
}

function updateSantri(payload) {
  const sheet = getSheet(SHEET_SANTRI);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = headers.map(h => payload[h] || '');
  sheet.getRange(payload._row, 1, 1, rowData.length).setValues([rowData]);
  return { success: true };
}

function deleteSantri(payload) {
  const sheet = getSheet(SHEET_SANTRI);
  sheet.deleteRow(payload._row);
  return { success: true };
}

// ================================================================
// SURAT KEPANITIAAN
// ================================================================
function getSurat(e) {
  const sheet   = getSheet(SHEET_SURAT);
  const data    = sheet.getDataRange().getValues();
  if (data.length <= 1) return { data: [] };
  const headers = data[0];
  let rows = data.slice(1).map((r, i) => getObjectFromRow(headers, r, i + 2)).filter(r => r.ID_Surat !== '');

  if (e && e.parameter && e.parameter.batch) {
    const batch = Number(e.parameter.batch);
    rows = rows.filter(r => Number(r.ID_Batch) === batch);
  }
  if (e && e.parameter && e.parameter.ID_Panitia) {
    const idP = String(e.parameter.ID_Panitia);
    rows = rows.filter(r => String(r.ID_Panitia) === idP);
  }
  return { data: rows };
}

function insertSurat(payload) {
  const sheet   = getSheet(SHEET_SURAT);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx   = headers.indexOf('ID_Surat');
  const ids     = data.slice(1).map(r => Number(r[idIdx])).filter(Boolean);
  let   idSurat = ids.length > 0 ? Math.max(...ids) + 1 : 1;

  payload.rows.forEach(r => {
    const row = headers.map(h => {
      if (h === 'ID_Surat') return idSurat++;
      if (h === 'Tanggal_Dibuat') return new Date().toISOString();
      return r[h] || '';
    });
    sheet.appendRow(row);
  });
  return { success: true, count: payload.rows.length };
}

function deleteBatch(payload) {
  const sheet   = getSheet(SHEET_SURAT);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const bIdx    = headers.indexOf('ID_Batch');
  const nsIdx   = headers.indexOf('No_Surat');
  const noSuratSet = new Set();

  for (let i = data.length - 1; i >= 1; i--) {
    if (Number(data[i][bIdx]) === Number(payload.batch)) {
      noSuratSet.add(data[i][nsIdx]);
      sheet.deleteRow(i + 1);
    }
  }

  noSuratSet.forEach(ns => {
    deleteBarang({ No_Surat: ns, _all: true });
    deletePerizinan({ No_Surat: ns, _all: true });
  });

  return { success: true };
}

function getNextNoSurat(e) {
  const sheet = getSheet(SHEET_SURAT);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = headers.indexOf('No_Surat');
  const pIdx = headers.indexOf('ID_Panitia');
  
  let rows = data.slice(1);
  if (e && e.parameter && e.parameter.ID_Panitia) {
    rows = rows.filter(r => String(r[pIdx]) === String(e.parameter.ID_Panitia));
  }
  
  const nos = rows.map(r => Number(r[idx])).filter(Boolean);
  return { next: nos.length > 0 ? Math.max(...nos) + 1 : 1 };
}

function getNextBatch() {
  const sheet = getSheet(SHEET_SURAT);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = headers.indexOf('ID_Batch');
  const batches = data.slice(1).map(r => Number(r[idx])).filter(Boolean);
  return { next: batches.length > 0 ? Math.max(...batches) + 1 : 1 };
}

// ================================================================
// BARANG PINJAMAN
// ================================================================
function getBarang(e) {
  const sheet   = getSheet(SHEET_BARANG);
  const data    = sheet.getDataRange().getValues();
  if (data.length <= 1) return { data: [] };
  const headers = data[0];
  let rows = data.slice(1).map((r, i) => getObjectFromRow(headers, r, i + 2)).filter(r => r.ID_Peminjaman !== '');

  if (e && e.parameter && e.parameter.noSurat) {
    rows = rows.filter(r => String(r.No_Surat) === String(e.parameter.noSurat));
  }
  return { data: rows };
}

function insertBarang(payload) {
  const sheet = getSheet(SHEET_BARANG);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('ID_Peminjaman');
  const ids = data.slice(1).map(r => Number(r[idIdx])).filter(Boolean);
  let idB = ids.length > 0 ? Math.max(...ids) + 1 : 1;

  payload.items.forEach(item => {
    const row = headers.map(h => {
      if (h === 'ID_Peminjaman') return idB++;
      return item[h] || '';
    });
    sheet.appendRow(row);
  });
  return { success: true };
}

function deleteBarang(payload) {
  const sheet = getSheet(SHEET_BARANG);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const nsIdx = headers.indexOf('No_Surat');
  const idIdx = headers.indexOf('ID_Peminjaman');

  for (let i = data.length - 1; i >= 1; i--) {
    if (payload._all && String(data[i][nsIdx]) === String(payload.No_Surat)) {
      sheet.deleteRow(i + 1);
    } else if (!payload._all && Number(data[i][idIdx]) === Number(payload.ID_Peminjaman)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return { success: true };
}

// ================================================================
// PERIZINAN
// ================================================================
function getPerizinan(e) {
  const sheet = getSheet(SHEET_PERIZINAN);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { data: [] };
  const headers = data[0];
  let rows = data.slice(1).map((r, i) => getObjectFromRow(headers, r, i + 2)).filter(r => r.ID_Perizinan !== '');

  if (e && e.parameter && e.parameter.noSurat) {
    rows = rows.filter(r => String(r.No_Surat) === String(e.parameter.noSurat));
  }
  return { data: rows };
}

function insertPerizinan(payload) {
  const sheet = getSheet(SHEET_PERIZINAN);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const nsIdx = headers.indexOf('No_Surat');
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][nsIdx]) === String(payload.No_Surat)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    headers.forEach((h, i) => {
      if (payload[h] !== undefined && h !== 'ID_Perizinan' && h !== 'No_Surat') {
        sheet.getRange(rowIndex, i + 1).setValue(payload[h]);
      }
    });
  } else {
    const idIdx = headers.indexOf('ID_Perizinan');
    const ids = data.slice(1).map(r => Number(r[idIdx])).filter(Boolean);
    const newId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
    
    const row = headers.map(h => {
      if (h === 'ID_Perizinan') return newId;
      return payload[h] || '';
    });
    sheet.appendRow(row);
  }
  return { success: true };
}

function deletePerizinan(payload) {
  const sheet = getSheet(SHEET_PERIZINAN);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const nsIdx = headers.indexOf('No_Surat');

  for (let i = data.length - 1; i >= 1; i--) {
    if (payload._all && String(data[i][nsIdx]) === String(payload.No_Surat)) {
      sheet.deleteRow(i + 1);
    }
  }
  return { success: true };
}

// ================================================================
// MASTER PANITIA
// ================================================================
function getPanitia() {
  const sheet = getSheet(SHEET_SETING);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { data: [] };
  const headers = data[0];
  return {
    success: true,
    data: data.slice(1).map(r => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    })
  };
}

function savePanitia(payload) {
  const sheet = getSheet(SHEET_SETING);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const id = payload.ID || new Date().getTime().toString();
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowData = headers.map(h => {
    if (h === 'ID') return id;
    return payload[h] || '';
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return { success: true, id: id };
}

function deletePanitia(payload) {
  const sheet = getSheet(SHEET_SETING);
  const data = sheet.getDataRange().getValues();
  const id = payload.id;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'ID tidak ditemukan' };
}

// ================================================================
// DRIVE & ARCHIVING
// ================================================================
function getOrCreateFolder(parent, name) {
  const iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

function saveToDrive(payload) {
  const html      = payload.html;
  const filename  = payload.filename  || 'Surat';
  const kategori  = payload.kategori  || 'Lainnya';
  const tahun     = payload.tahun     || new Date().getFullYear().toString();
  const bulan     = payload.bulan     || String(new Date().getMonth() + 1).padStart(2, '0');
  const panitia   = payload.panitiaName || 'Lainnya';

  const root      = getOrCreateFolder(DriveApp.getRootFolder(), 'Surat Kepanitiaan');
  const panFolder = getOrCreateFolder(root, panitia);
  const katFolder = getOrCreateFolder(panFolder, kategori);
  const thnFolder = getOrCreateFolder(katFolder, tahun);
  const blnFolder = getOrCreateFolder(thnFolder, bulan);

  const blob = Utilities.newBlob(html, 'text/html', filename + '.html');
  const file = blnFolder.createFile(blob);
  return { success: true, url: file.getUrl(), name: file.getName() };
}

function saveTemplate(payload) {
  const bytes = Utilities.base64Decode(payload.base64);
  const fileName = payload.fileName || ('TEMPLATE_' + (payload.jenisSurat || 'UMUM') + '.docx');
  const panitiaName = payload.panitiaName || 'Lainnya';
  const blob  = Utilities.newBlob(bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileName);
  
  const root = getOrCreateFolder(DriveApp.getRootFolder(), 'Surat Kepanitiaan');
  const panFolder = getOrCreateFolder(root, panitiaName);
  const tplFolder = getOrCreateFolder(panFolder, '_TEMPLATES_');
  
  const iter = tplFolder.getFilesByName(fileName);
  if (iter.hasNext()) iter.next().setTrashed(true);
  
  const file = tplFolder.createFile(blob);
  return { success: true, id: file.getId(), name: fileName };
}

function listTemplates(e) {
  const panitiaName = (e && e.parameter && e.parameter.panitiaName) || 'Lainnya';
  const root = getOrCreateFolder(DriveApp.getRootFolder(), 'Surat Kepanitiaan');
  const panFolder = getOrCreateFolder(root, panitiaName);
  const tplFolder = getOrCreateFolder(panFolder, '_TEMPLATES_');
  
  const files = tplFolder.getFiles();
  const list = [];
  while (files.hasNext()) {
    const f = files.next();
    if (f.getName().endsWith('.docx')) {
      list.push({
        name: f.getName(),
        id: f.getId(),
        url: f.getUrl()
      });
    }
  }
  return { success: true, data: list };
}

function getTemplate(e) {
  const name = e.parameter.templateName;
  const panitiaName = e.parameter.panitiaName || 'Lainnya';
  
  const root = getOrCreateFolder(DriveApp.getRootFolder(), 'Surat Kepanitiaan');
  const panFolder = getOrCreateFolder(root, panitiaName);
  const tplFolder = getOrCreateFolder(panFolder, '_TEMPLATES_');
  
  const iter = tplFolder.getFilesByName(name);
  if (iter.hasNext()) {
    const file = iter.next();
    return { 
      success: true, 
      base64: Utilities.base64Encode(file.getBlob().getBytes()),
      name: file.getName()
    };
  }
  return { success: false, error: 'Template ' + name + ' tidak ditemukan di folder ' + panitiaName };
}

function docxToPdf(payload) {
  try {
    const bytes = Utilities.base64Decode(payload.base64);
    const blob  = Utilities.newBlob(bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', payload.filename + '.docx');
    
    const token = ScriptApp.getOAuthToken();
    const uploadRes = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart&convert=true', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      payload: {
        metadata: Utilities.newBlob(JSON.stringify({ title: 'temp_' + payload.filename }), 'application/json'),
        file: blob
      }
    });
    const gdocId = JSON.parse(uploadRes.getContentText()).id;
    const doc = DocumentApp.openById(gdocId);
    doc.saveAndClose();
    
    const gdocFile = DriveApp.getFileById(gdocId);
    const pdfBlob = gdocFile.getAs('application/pdf').setName(payload.filename + '.pdf');
    
    const root      = getOrCreateFolder(DriveApp.getRootFolder(), 'Surat Kepanitiaan');
    const panitia   = payload.panitiaName || 'Lainnya';
    const panFolder = getOrCreateFolder(root, panitia);
    const katFolder = getOrCreateFolder(panFolder, payload.kategori || 'Arsip');
    const thnFolder = getOrCreateFolder(katFolder, payload.tahun || new Date().getFullYear().toString());
    const blnFolder = getOrCreateFolder(thnFolder, payload.bulan || 'Semua');
    
    const pdfFile = blnFolder.createFile(pdfBlob);
    gdocFile.setTrashed(true);
    
    if (payload.idBatch && payload.noSurat) {
      logPdfToSheet(payload.idBatch, payload.noSurat, pdfFile.getUrl());
    }
    
    return {
      success: true,
      url: pdfFile.getDownloadUrl(),
      viewUrl: pdfFile.getUrl(),
      name: pdfFile.getName()
    };
  } catch (err) {
    return { success: false, error: "Gagal: " + err.toString() };
  }
}

function logPdfToSheet(idBatch, noSurat, url) {
  const sheet = getSheet(SHEET_SURAT);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const batchIdx = headers.indexOf('ID_Batch');
  const noIdx    = headers.indexOf('No_Surat');
  const linkIdx  = headers.indexOf('Link_PDF');
  
  if (linkIdx === -1) return;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][batchIdx]) === String(idBatch) && String(data[i][noIdx]) === String(noSurat)) {
      sheet.getRange(i + 1, linkIdx + 1).setValue(url);
    }
  }
}

// ================================================================
// SETUP & UTILITIES
// ================================================================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allHeaders = {
    [SHEET_GURU]: [
      'ID_Guru','Nama','Jabatan_Panitia','Nama_Kepanitiaan','Tahun_Pengabdian','Kamar_Bagian','Prodi','Semester'
    ],
    [SHEET_SANTRI]: [
      'ID_Santri','Nama','Jabatan_Panitia','Nama_Kepanitiaan','Kelas','Kamar_Bagian'
    ],
    [SHEET_SURAT]: [
      'ID_Surat','No_Surat','Tanggal_Hijriah','Tanggal_Romawi','Hal',
      'Nama','Ket','Kamar_Bagian','Prodi','Semester','Tahun_Pengabdian',
      'Hari','Tanggal','Tempat','Waktu','Acara',
      'Jenis_Surat','Jenis_Mailing','ID_Batch','ID_Panitia','Nama_Template','Tanggal_Dibuat','Link_PDF'
    ],
    [SHEET_BARANG]: [
      'ID_Peminjaman','No_Surat','Nama_Barang','Jumlah_Barang','Satuan','Keterangan'
    ],
    [SHEET_PERIZINAN]: [
      'ID_Perizinan','No_Surat','Keperluan','Alasan'
    ],
    [SHEET_SETING]: ['ID','Nama_Panitia','Instansi','Alamat','Nama_Ketua','Jabatan','Link_TTD']
  };

  for (let sheetName in allHeaders) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(allHeaders[sheetName]);
      sheet.getRange(1, 1, 1, allHeaders[sheetName].length).setFontWeight('bold').setBackground('#f3f4f6');
    } else {
      const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const missing = allHeaders[sheetName].filter(h => existingHeaders.indexOf(h) === -1);
      if (missing.length > 0) {
        const lastCol = sheet.getLastColumn();
        sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]).setFontWeight('bold').setBackground('#f3f4f6');
      }
    }
  }
  Logger.log("✅ SETUP SELESAI!");
}