# Surat Kepanitiaan — Web App

Sistem surat kepanitiaan berbasis web dengan Google Sheets sebagai database.

## Struktur File

```
surat-kepanitiaan/
├── Code.gs                        ← Apps Script (backend)
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── src/
    ├── main.jsx
    ├── App.jsx                    ← Layout + routing
    ├── lib/
    │   ├── api.js                 ← Semua pemanggilan ke Apps Script
    │   └── utils.js               ← Format tanggal, build HTML surat, print/PDF/Word
    ├── pages/
    │   ├── BuatSurat.jsx          ← Form buat surat + checklist guru
    │   ├── Mailing.jsx            ← Riwayat mailing + generate output
    │   ├── MasterGuru.jsx         ← CRUD data guru
    │   └── Seting.jsx             ← Pengaturan instansi
    └── components/
        └── BarangModal.jsx        ← Modal input barang pinjaman
```

---

## LANGKAH 1 — Setup Google Sheets + Apps Script

### 1.1 Buat Google Spreadsheet baru
Buka https://sheets.google.com → buat spreadsheet baru.
Beri nama: **"DB Surat Kepanitiaan"**

Sheet akan dibuat otomatis oleh Apps Script, tapi bisa juga buat manual
dengan nama PERSIS sama:
- `MasterGuru`
- `SuratKepanitiaan`
- `BarangPinjaman`
- `Seting`

### 1.2 Buka Apps Script
Di spreadsheet → menu **Extensions → Apps Script**

### 1.3 Paste kode
Hapus kode default, paste seluruh isi `Code.gs` ke editor.

### 1.4 Deploy sebagai Web App
1. Klik **Deploy → New Deployment**
2. Pilih type: **Web app**
3. Isi deskripsi: "Surat Kepanitiaan API"
4. **Execute as:** Me
5. **Who has access:** Anyone
6. Klik **Deploy**
7. **Salin URL** yang muncul — bentuknya:
   `https://script.google.com/macros/s/AKfycb.../exec`

> ⚠ Setiap kali kode Apps Script diubah, harus deploy ulang (New Deployment
> atau Manage Deployments → Edit versi).

---

## LANGKAH 2 — Setup Web App

### 2.1 Clone / download project
Letakkan folder `surat-kepanitiaan` di komputer.

### 2.2 Buat file .env
Di root folder (`surat-kepanitiaan/`), buat file `.env`:
```
VITE_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
```
Ganti URL dengan URL Apps Script Anda dari langkah 1.4.

### 2.3 Install & jalankan lokal
```bash
cd surat-kepanitiaan
npm install
npm run dev
```
Buka http://localhost:5173

---

## LANGKAH 3 — Deploy ke Vercel

### 3.1 Push ke GitHub
```bash
git init
git add .
git commit -m "init surat kepanitiaan"
git remote add origin https://github.com/username/surat-kepanitiaan.git
git push -u origin main
```

### 3.2 Import di Vercel
1. Buka https://vercel.com → New Project
2. Import repo dari GitHub
3. **Environment Variables** → tambahkan:
   - Key:   `VITE_SCRIPT_URL`
   - Value: URL Apps Script Anda
4. Klik **Deploy**

### 3.3 Selesai
Vercel akan memberi URL seperti `https://surat-kepanitiaan.vercel.app`

---

## Cara Pakai

### Alur Normal
```
Pengaturan (isi instansi + TTD)
    ↓
Master Guru (input nama-nama guru)
    ↓
Buat Surat
  → Pilih jenis surat (Perizinan/Undangan/Peminjaman)
  → Pilih mode (Perseorangan/Sekaligus)
  → Isi data header surat
  → Jika Peminjaman: klik "Kelola Barang" dulu
  → Centang nama dari daftar
  → Klik "Buat Surat"
    ↓
Mailing
  → Pilih batch dari daftar kiri
  → Klik Print / PDF / Word
```

### Mode Perseorangan vs Sekaligus
| | Perseorangan | Sekaligus |
|---|---|---|
| Jumlah file output | 1 per orang | 1 file |
| Nomor surat | Bertambah tiap orang | Sama semua |
| Lampiran nama | ✗ | ✓ (Perizinan & Undangan) |
| Lampiran barang | ✓ (tiap surat) | ✓ (satu lampiran) |

### Output Surat
- **Print** → buka dialog print browser
- **PDF** → buka tab baru → Save as PDF dari dialog print
- **Word** → download file `.doc` (bisa dibuka di Word/LibreOffice)

---

## Rekomendasi Improve (Future)

1. **Import Excel Master Guru** — upload .xlsx untuk bulk insert
2. **Preview surat** — lihat tampilan surat sebelum generate
3. **Template kustom** — editor template HTML per jenis surat
4. **Filter riwayat** — filter mailing per bulan/jenis/nama
5. **Export rekap** — export semua mailing ke Excel
6. **Multi-user dengan auth** — Google OAuth untuk keamanan
