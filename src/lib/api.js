// src/lib/api.js
export const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL || '';

async function get(action, params = {}) {
  if (!SCRIPT_URL) {
    console.error('VITE_SCRIPT_URL is not defined in .env');
    throw new Error('VITE_SCRIPT_URL belum diatur');
  }
  const url = new URL(SCRIPT_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

async function post(action, payload = {}) {
  if (!SCRIPT_URL) {
    console.error('VITE_SCRIPT_URL is not defined in .env');
    throw new Error('VITE_SCRIPT_URL belum diatur');
  }
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

export const api = {
  // Master Guru
  getGuru:        (params)  => get('getGuru', params),
  addGuru:        (data)    => post('addGuru', data),
  updateGuru:     (data)    => post('updateGuru', data),
  deleteGuru:     (data)    => post('deleteGuru', data),

  // Master Santri
  getSantri:      ()        => get('getSantri'),
  addSantri:      (data)    => post('addSantri', data),
  updateSantri:   (data)    => post('updateSantri', data),
  deleteSantri:   (data)    => post('deleteSantri', data),

  // Surat
  getSurat:       (params)  => get('getSurat', params),
  insertSurat:    (rows)    => post('insertSurat', { rows }),
  deleteBatch:    (batch)   => post('deleteBatch', { batch }),
  deleteSurat:    (rowNum)  => post('deleteSurat', { _row: rowNum }),
  updateBatchMailing: (batch, jenisMailing) => post('updateBatchMailing', { batch, jenisMailing }),
  getNextNoSurat: (params)  => get('getNextNoSurat', params),
  getNextBatch:   ()        => get('getNextBatch'),

  // Barang
  getBarang:      (noSurat) => get('getBarang', { noSurat }),
  insertBarang:   (items)   => post('insertBarang', { items }),
  deleteBarang:   (id)      => post('deleteBarang', { ID_Peminjaman: id }),

  // Perizinan
  getPerizinan:   (noSurat) => get('getPerizinan', { noSurat }),
  insertPerizinan:(data)    => post('insertPerizinan', data),

  // Panitia
  getPanitia:     ()        => get('getPanitia'),
  savePanitia:    (data)    => post('savePanitia', data),
  deletePanitia:  (id)      => post('deletePanitia', { id }),

  // Drive & Archiving
  saveToDrive:    (payload) => post('saveToDrive', payload),
  docxToPdf:      (payload) => post('docxToPdf', payload),

  saveTemplate:   (payload) => post('saveTemplate', payload),
  getTemplate:    (params)  => get('getTemplate', params),
  listTemplates:  (params)  => get('listTemplates', params),
};
