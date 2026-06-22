# 🍵 Es Teh POS — Panduan Lengkap

## Struktur Folder

```
esteh-pos/
├── index.html          → File utama aplikasi (buka ini di browser)
├── manifest.json       → Konfigurasi PWA
├── sw.js               → Service Worker (offline support)
├── Code.gs             → Google Apps Script (backend database)
├── css/
│   └── style.css       → Stylesheet utama
├── js/
│   ├── config.js       → Konfigurasi & data demo
│   ├── db.js           → Layer database (LocalStorage + GAS)
│   ├── app.js          → Controller utama
│   ├── kasir.js        → Halaman kasir & transaksi
│   ├── stok.js         → Manajemen stok
│   ├── dashboard.js    → Dashboard & grafik
│   └── ai.js           → Analisis AI
└── icons/              → Icon PWA (tambahkan manual)
```

---

## 🚀 Cara Deploy

### Opsi A: Mode Demo (Tanpa Google Sheets)

1. Buka `index.html` di browser
2. Klik **"Coba Mode Demo"**
3. Data tersimpan di LocalStorage browser
4. Siap digunakan!

> **Catatan:** Data demo akan hilang jika cache browser dihapus. Gunakan Google Sheets untuk produksi.

---

### Opsi B: Dengan Google Sheets (Produksi)

#### Langkah 1: Buat Google Spreadsheet

1. Buka [Google Sheets](https://sheets.google.com)
2. Buat spreadsheet baru, beri nama: **"Database Es Teh POS"**
3. Catat URL spreadsheet Anda

#### Langkah 2: Setup Google Apps Script

1. Di spreadsheet, klik menu **Extensions → Apps Script**
2. Hapus kode default yang ada
3. Copy-paste seluruh isi file **`Code.gs`** ke editor Apps Script
4. Simpan (Ctrl+S), beri nama project: **"Es Teh POS API"**
5. Klik menu **⚙️ Es Teh POS → Setup Sheets** untuk membuat sheet otomatis
6. Konfirmasi izin akses yang diminta

#### Langkah 3: Deploy sebagai Web App

1. Di Apps Script, klik **Deploy → New deployment**
2. Klik ikon ⚙️ di sebelah "Select type" → pilih **Web app**
3. Isi konfigurasi:
   - **Description:** Es Teh POS API v1
   - **Execute as:** Me (your email)
   - **Who has access:** Anyone (agar bisa diakses dari browser)
4. Klik **Deploy**
5. **Salin URL** yang diberikan (format: `https://script.google.com/macros/s/XXXXX/exec`)

#### Langkah 4: Hubungkan ke Aplikasi

1. Buka `index.html` di browser
2. Masukkan URL Apps Script yang sudah disalin
3. Masukkan nama toko Anda
4. Klik **Simpan & Mulai**

#### ⚠️ Penting Setelah Update Kode GAS

Setiap kali Anda mengubah kode `Code.gs`:
1. Klik **Deploy → Manage deployments**
2. Klik ikon ✏️ (Edit)
3. Ubah version ke **"New version"**
4. Klik **Deploy**

---

## 📱 Install sebagai PWA (Android/iOS)

### Android Chrome:
1. Buka `index.html` di Chrome
2. Muncul banner "Add to Home Screen" → klik Install
3. Atau: menu (⋮) → **Add to Home Screen**

### iOS Safari:
1. Buka `index.html` di Safari
2. Tap tombol **Share** (kotak dengan panah ke atas)
3. Pilih **"Add to Home Screen"**
4. Beri nama → klik **Add**

### Untuk PWA yang bisa diinstall, tambahkan icon di folder `icons/`:
```
icons/icon-72.png
icons/icon-96.png
icons/icon-128.png
icons/icon-144.png
icons/icon-152.png
icons/icon-192.png
icons/icon-384.png
icons/icon-512.png
```
> Gunakan tool online seperti [PWA Asset Generator](https://progressier.com/pwa-icons-generator) untuk membuat semua ukuran sekaligus dari satu gambar.

---

## 💻 Cara Deploy ke Hosting (Opsional)

### GitHub Pages (Gratis):
1. Upload semua file ke repository GitHub
2. Settings → Pages → Source: main branch
3. Akses via `https://username.github.io/repo-name`

### Netlify (Gratis):
1. Drag & drop folder `esteh-pos` ke [netlify.com](https://netlify.com)
2. Dapat domain gratis `xxx.netlify.app`

### Vercel (Gratis):
```bash
npm i -g vercel
cd esteh-pos
vercel
```

---

## 🤖 Fitur AI

Analisis AI menggunakan Claude API. Untuk mengaktifkan:
1. Buka `js/ai.js`
2. Di fungsi `loadAIInsight()`, AI sudah otomatis mencoba Anthropic API
3. Jika tidak ada koneksi/API key, akan menggunakan analisis lokal

> **Mode Demo:** Analisis AI lokal sudah aktif tanpa perlu API key.

---

## 👥 Panduan Pengguna

### Untuk Kasir:
1. **Pilih menu** → tap produk atau tombol + untuk tambah ke keranjang
2. **Lihat keranjang** → tap tombol hijau di kanan bawah
3. **Bayar** → tap "Bayar", pilih metode, masukkan nominal
4. **Selesai** → tap "Selesai", struk siap dicetak

### Untuk Owner/Admin:
- **Dashboard** → lihat omzet, transaksi, grafik penjualan, analisis AI
- **Transaksi** → histori semua transaksi dengan filter tanggal
- **Stok** → pantau dan update stok bahan baku
- **Menu** → tambah, edit, hapus menu
- **Pengaturan** → nama toko, kasir, konfigurasi

---

## 🏗️ Struktur Google Sheets

| Sheet | Fungsi |
|-------|--------|
| Menu | Data produk/menu |
| Transaksi | Header transaksi |
| DetailTransaksi | Item per transaksi |
| Stok | Data stok bahan baku |
| MutasiStok | Histori perubahan stok |
| Pengaturan | Konfigurasi aplikasi |
| LaporanHarian | Rekap harian otomatis |

---

## 🐛 Troubleshooting

**Q: CORS Error saat hubungkan GAS?**
A: Pastikan "Who has access" = "Anyone" saat deploy. Re-deploy dengan version baru.

**Q: Data tidak tersimpan di GAS?**
A: Cek URL GAS sudah benar. Buka URL GAS langsung di browser, harus muncul JSON.

**Q: Tampilan rusak di iPhone?**
A: Pastikan buka via Safari (bukan Chrome di iOS). PWA hanya bisa diinstall via Safari di iOS.

**Q: Stok tidak berkurang otomatis?**
A: Pastikan setiap menu sudah di-mapping ke bahan baku di halaman Menu → Edit → Bahan Baku.

---

## 📞 Keterangan Teknis

- **Frontend:** Vanilla HTML/CSS/JavaScript (tanpa framework)
- **Database:** Google Sheets via Google Apps Script REST API
- **Storage:** LocalStorage (offline/demo) + Google Sheets (produksi)
- **PWA:** Service Worker + Web App Manifest
- **AI:** Anthropic Claude API (fallback ke analisis lokal)
- **Grafik:** Canvas API (tanpa library eksternal)
- **Font:** Google Fonts (Inter + Poppins)
- **Ukuran:** ~80KB total (sangat ringan)

---

*Es Teh POS v1.0.0 — Dibuat dengan ❤️ untuk UMKM Indonesia*
