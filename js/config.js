// ============================================================
// CONFIG.JS — App Configuration & Constants
// ============================================================

const CONFIG = {
  APP_NAME: 'Es Teh POS',
  VERSION: '1.0.0',
  STORAGE_KEY: 'esteh_pos',
  GAS_URL_KEY: 'esteh_gas_url',
  DEMO_MODE_KEY: 'esteh_demo',
};

// Default Settings
const DEFAULT_SETTINGS = {
  namaToko: 'Es Teh Kita',
  alamat: '',
  phone: '',
  namaKasir: 'Kasir',
  showFoto: true,
  stokKritis: 20,
  footerStruk: 'Terima kasih! Datang lagi ya 🍵',
};

// Demo Data — Menu
const DEMO_MENU = [
  { id: 'm1', nama: 'Teh Original Regular', kategori: 'teh-original', harga: 5000, foto: '', aktif: true, bahan: [{ id: 's1', qty: 1 }] },
  { id: 'm2', nama: 'Teh Original Jumbo', kategori: 'teh-original', harga: 7000, foto: '', aktif: true, bahan: [{ id: 's2', qty: 1 }] },
  { id: 'm3', nama: 'Teh Mangga', kategori: 'rasa-rasa', harga: 6000, foto: '', aktif: true, bahan: [{ id: 's1', qty: 1 }, { id: 's3', qty: 3 }] },
  { id: 'm4', nama: 'Teh Melon', kategori: 'rasa-rasa', harga: 6000, foto: '', aktif: true, bahan: [{ id: 's1', qty: 1 }, { id: 's4', qty: 3 }] },
  { id: 'm5', nama: 'Teh Stroberi', kategori: 'rasa-rasa', harga: 6000, foto: '', aktif: true, bahan: [{ id: 's1', qty: 1 }, { id: 's5', qty: 3 }] },
  { id: 'm6', nama: 'Teh Leci', kategori: 'rasa-rasa', harga: 6000, foto: '', aktif: true, bahan: [{ id: 's1', qty: 1 }, { id: 's6', qty: 3 }] },
  { id: 'm7', nama: 'Teh Jeruk', kategori: 'rasa-rasa', harga: 6000, foto: '', aktif: true, bahan: [{ id: 's1', qty: 1 }, { id: 's7', qty: 3 }] },
];

// Demo Data — Stok
const DEMO_STOK = [
  { id: 's1', nama: 'Cup Regular', tipe: 'kemasan', jumlah: 150, satuan: 'pcs', minimal: 50 },
  { id: 's2', nama: 'Cup Jumbo', tipe: 'kemasan', jumlah: 80, satuan: 'pcs', minimal: 30 },
  { id: 's3', nama: 'Serbuk Mangga', tipe: 'bahan', jumlah: 450, satuan: 'gr', minimal: 100 },
  { id: 's4', nama: 'Serbuk Melon', tipe: 'bahan', jumlah: 300, satuan: 'gr', minimal: 100 },
  { id: 's5', nama: 'Serbuk Stroberi', tipe: 'bahan', jumlah: 250, satuan: 'gr', minimal: 100 },
  { id: 's6', nama: 'Serbuk Leci', tipe: 'bahan', jumlah: 200, satuan: 'gr', minimal: 100 },
  { id: 's7', nama: 'Serbuk Jeruk', tipe: 'bahan', jumlah: 180, satuan: 'gr', minimal: 100 },
  { id: 's8', nama: 'Cup 16oz', tipe: 'kemasan', jumlah: 60, satuan: 'pcs', minimal: 30 },
];

// Demo Data — Transaksi (last 7 days)
function generateDemoTransaksi() {
  const trx = [];
  const today = new Date();
  let invNum = 1;
  const methods = ['Tunai', 'QRIS', 'Transfer Bank', 'E-Wallet'];
  for (let d = 6; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];
    const count = 10 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const hour = 8 + Math.floor(Math.random() * 10);
      const min = Math.floor(Math.random() * 60);
      const items = [];
      const itemCount = 1 + Math.floor(Math.random() * 3);
      let total = 0;
      for (let j = 0; j < itemCount; j++) {
        const menu = DEMO_MENU[Math.floor(Math.random() * DEMO_MENU.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        items.push({ menuId: menu.id, nama: menu.nama, harga: menu.harga, qty });
        total += menu.harga * qty;
      }
      const invPad = String(invNum).padStart(3, '0');
      const datePart = dateStr.replace(/-/g, '').slice(2);
      trx.push({
        id: `trx-${d}-${i}`,
        invoice: `#INV-${datePart}-${invPad}`,
        tanggal: dateStr,
        waktu: `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`,
        items,
        total,
        metode: methods[Math.floor(Math.random() * methods.length)],
        nominal: total + (Math.floor(total / 5000) * 5000 - total),
        kembalian: 0,
        catatan: '',
        kasir: 'Demo Kasir',
      });
      invNum++;
    }
  }
  return trx;
}
