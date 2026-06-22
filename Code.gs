// ============================================================
// GOOGLE APPS SCRIPT — Code.gs
// Salin seluruh kode ini ke Google Apps Script Editor
// ============================================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEETS = {
  MENU: 'Menu',
  TRANSAKSI: 'Transaksi',
  DETAIL: 'DetailTransaksi',
  STOK: 'Stok',
  MUTASI: 'MutasiStok',
  PENGATURAN: 'Pengaturan',
  LAPORAN: 'LaporanHarian',
};

// ===== MAIN HANDLER =====
function doGet(e) {
  const action = e.parameter.action;
  const data = e.parameter.data ? JSON.parse(e.parameter.data) : e.parameter;
  
  try {
    let result;
    switch (action) {
      case 'getMenu':        result = getMenu(); break;
      case 'saveMenu':       result = saveMenu(data); break;
      case 'deleteMenu':     result = deleteMenu(data.id); break;
      case 'getStok':        result = getStok(); break;
      case 'saveStok':       result = saveStok(data); break;
      case 'updateStok':     result = updateStok(data.id, parseFloat(data.delta), data.keterangan); break;
      case 'getMutasi':      result = getMutasi(); break;
      case 'getTransaksi':   result = getTransaksi(data.tanggal); break;
      case 'simpanTransaksi':result = simpanTransaksi(data); break;
      case 'getDashboard':   result = getDashboard(data.period || 'hari'); break;
      case 'getPengaturan':  result = getPengaturan(); break;
      case 'savePengaturan': result = savePengaturan(data); break;
      default: result = { error: 'Action not found: ' + action };
    }
    return jsonResponse({ status: 'ok', data: result });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

function doPost(e) {
  return doGet(e);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== SETUP SHEETS =====
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Menu
  let sh = getOrCreate(ss, SHEETS.MENU);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['id','nama','kategori','harga','foto','aktif','bahan','createdAt']);
    sh.appendRow(['m1','Teh Original Regular','teh-original',5000,'',true,'[{"id":"s1","qty":1}]',new Date()]);
    sh.appendRow(['m2','Teh Original Jumbo','teh-original',7000,'',true,'[{"id":"s2","qty":1}]',new Date()]);
    sh.appendRow(['m3','Teh Mangga','rasa-rasa',6000,'',true,'[{"id":"s1","qty":1},{"id":"s3","qty":3}]',new Date()]);
    sh.appendRow(['m4','Teh Melon','rasa-rasa',6000,'',true,'[{"id":"s1","qty":1},{"id":"s4","qty":3}]',new Date()]);
    sh.appendRow(['m5','Teh Stroberi','rasa-rasa',6000,'',true,'[{"id":"s1","qty":1},{"id":"s5","qty":3}]',new Date()]);
    sh.appendRow(['m6','Teh Leci','rasa-rasa',6000,'',true,'[{"id":"s1","qty":1},{"id":"s6","qty":3}]',new Date()]);
  }
  
  // Stok
  sh = getOrCreate(ss, SHEETS.STOK);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['id','nama','tipe','jumlah','satuan','minimal','updatedAt']);
    sh.appendRow(['s1','Cup Regular','kemasan',150,'pcs',50,new Date()]);
    sh.appendRow(['s2','Cup Jumbo','kemasan',80,'pcs',30,new Date()]);
    sh.appendRow(['s3','Serbuk Mangga','bahan',450,'gr',100,new Date()]);
    sh.appendRow(['s4','Serbuk Melon','bahan',300,'gr',100,new Date()]);
    sh.appendRow(['s5','Serbuk Stroberi','bahan',250,'gr',100,new Date()]);
    sh.appendRow(['s6','Serbuk Leci','bahan',200,'gr',100,new Date()]);
    sh.appendRow(['s7','Serbuk Jeruk','bahan',180,'gr',100,new Date()]);
  }
  
  // Transaksi
  sh = getOrCreate(ss, SHEETS.TRANSAKSI);
  if (sh.getLastRow() === 0) sh.appendRow(['id','invoice','tanggal','waktu','total','metode','nominal','kembalian','catatan','kasir','createdAt']);
  
  // Detail
  sh = getOrCreate(ss, SHEETS.DETAIL);
  if (sh.getLastRow() === 0) sh.appendRow(['transaksiId','menuId','nama','harga','qty','subtotal']);
  
  // Mutasi
  sh = getOrCreate(ss, SHEETS.MUTASI);
  if (sh.getLastRow() === 0) sh.appendRow(['stokId','nama','before','after','delta','keterangan','waktu']);
  
  // Pengaturan
  sh = getOrCreate(ss, SHEETS.PENGATURAN);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['key','value']);
    sh.appendRow(['namaToko','Es Teh Kita']);
    sh.appendRow(['alamat','']);
    sh.appendRow(['phone','']);
    sh.appendRow(['namaKasir','Kasir']);
    sh.appendRow(['footerStruk','Terima kasih! Datang lagi ya 🍵']);
  }
  
  // Laporan
  sh = getOrCreate(ss, SHEETS.LAPORAN);
  if (sh.getLastRow() === 0) sh.appendRow(['tanggal','omzet','transaksi','produk']);
  
  SpreadsheetApp.getUi().alert('✅ Sheet berhasil dibuat! Sekarang deploy sebagai Web App.');
}

function getOrCreate(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

// ===== MENU CRUD =====
function getMenu() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.MENU);
  if (!sh || sh.getLastRow() <= 1) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues();
  return rows.filter(r => r[0]).map(r => ({
    id: r[0], nama: r[1], kategori: r[2], harga: r[3],
    foto: r[4], aktif: r[5] === true || r[5] === 'TRUE',
    bahan: r[6] ? JSON.parse(r[6]) : [],
  }));
}

function saveMenu(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.MENU);
  if (data.id) {
    // Find and update
    const last = sh.getLastRow();
    for (let i = 2; i <= last; i++) {
      if (sh.getRange(i, 1).getValue() === data.id) {
        sh.getRange(i, 2, 1, 6).setValues([[data.nama, data.kategori, data.harga, data.foto || '', data.aktif, JSON.stringify(data.bahan || [])]]);
        return data;
      }
    }
  }
  // Insert new
  const id = data.id || 'm' + Date.now();
  sh.appendRow([id, data.nama, data.kategori, data.harga, data.foto || '', data.aktif !== false, JSON.stringify(data.bahan || []), new Date()]);
  data.id = id;
  return data;
}

function deleteMenu(id) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.MENU);
  const last = sh.getLastRow();
  for (let i = 2; i <= last; i++) {
    if (sh.getRange(i, 1).getValue() === id) { sh.deleteRow(i); return true; }
  }
  return false;
}

// ===== STOK =====
function getStok() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.STOK);
  if (!sh || sh.getLastRow() <= 1) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();
  return rows.filter(r => r[0]).map(r => ({ id: r[0], nama: r[1], tipe: r[2], jumlah: r[3], satuan: r[4], minimal: r[5] }));
}

function saveStok(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.STOK);
  if (data.id) {
    const last = sh.getLastRow();
    for (let i = 2; i <= last; i++) {
      if (sh.getRange(i, 1).getValue() === data.id) {
        sh.getRange(i, 2, 1, 5).setValues([[data.nama, data.tipe, data.jumlah, data.satuan, data.minimal]]);
        sh.getRange(i, 7).setValue(new Date());
        return data;
      }
    }
  }
  const id = data.id || 's' + Date.now();
  sh.appendRow([id, data.nama, data.tipe, data.jumlah, data.satuan, data.minimal, new Date()]);
  data.id = id;
  return data;
}

function updateStok(id, delta, keterangan) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.STOK);
  const last = sh.getLastRow();
  for (let i = 2; i <= last; i++) {
    if (sh.getRange(i, 1).getValue() === id) {
      const before = sh.getRange(i, 4).getValue();
      const after = Math.max(0, before + delta);
      sh.getRange(i, 4).setValue(after);
      sh.getRange(i, 7).setValue(new Date());
      // Log mutasi
      const msh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.MUTASI);
      msh.appendRow([id, sh.getRange(i, 2).getValue(), before, after, delta, keterangan || '', new Date()]);
      return { id, before, after };
    }
  }
  return null;
}

function getMutasi() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.MUTASI);
  if (!sh || sh.getLastRow() <= 1) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();
  return rows.filter(r => r[0]).reverse().slice(0, 100).map(r => ({
    stokId: r[0], nama: r[1], before: r[2], after: r[3], delta: r[4], keterangan: r[5], waktu: r[6],
  }));
}

// ===== TRANSAKSI =====
function getTransaksi(tanggal) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tsh = ss.getSheetByName(SHEETS.TRANSAKSI);
  const dsh = ss.getSheetByName(SHEETS.DETAIL);
  if (!tsh || tsh.getLastRow() <= 1) return [];

  const tRows = tsh.getRange(2, 1, tsh.getLastRow() - 1, 11).getValues();
  const dRows = dsh.getLastRow() > 1 ? dsh.getRange(2, 1, dsh.getLastRow() - 1, 6).getValues() : [];

  let trxList = tRows.filter(r => r[0]).map(r => ({
    id: r[0], invoice: r[1], tanggal: Utilities.formatDate(new Date(r[2]), 'Asia/Jakarta', 'yyyy-MM-dd'),
    waktu: r[3], total: r[4], metode: r[5], nominal: r[6], kembalian: r[7], catatan: r[8], kasir: r[9],
    items: dRows.filter(d => d[0] === r[0]).map(d => ({ menuId: d[1], nama: d[2], harga: d[3], qty: d[4], subtotal: d[5] })),
  }));

  if (tanggal) trxList = trxList.filter(t => t.tanggal === tanggal);
  return trxList.reverse();
}

function simpanTransaksi(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tsh = ss.getSheetByName(SHEETS.TRANSAKSI);
  const dsh = ss.getSheetByName(SHEETS.DETAIL);

  const now = new Date();
  const today = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd');
  const time = Utilities.formatDate(now, 'Asia/Jakarta', 'HH:mm');

  // Generate invoice
  const todayRows = tsh.getLastRow() > 1 ? tsh.getRange(2, 1, tsh.getLastRow() - 1, 3).getValues().filter(r => {
    try { return Utilities.formatDate(new Date(r[2]), 'Asia/Jakarta', 'yyyy-MM-dd') === today; } catch { return false; }
  }) : [];
  const invNum = String(todayRows.length + 1).padStart(3, '0');
  const datePart = today.slice(2).replace(/-/g, '');
  const invoice = `#INV-${datePart}-${invNum}`;
  const id = 'trx' + Date.now();

  tsh.appendRow([id, invoice, today, time, data.total, data.metode, data.nominal, data.kembalian, data.catatan || '', data.kasir || 'Kasir', now]);

  const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
  items.forEach(item => {
    dsh.appendRow([id, item.menuId, item.nama, item.harga, item.qty, item.harga * item.qty]);
    // Auto update stok
    const menu = getMenuById(item.menuId);
    if (menu && menu.bahan) {
      menu.bahan.forEach(b => updateStok(b.id, -b.qty * item.qty, `Transaksi ${invoice} - ${item.nama}`));
    }
  });

  // Update laporan harian
  updateLaporanHarian(today, data.total, 1, items.reduce((s, i) => s + i.qty, 0));

  return { id, invoice, tanggal: today, waktu: time, total: data.total, metode: data.metode, nominal: data.nominal, kembalian: data.kembalian, items, kasir: data.kasir };
}

function getMenuById(id) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.MENU);
  const last = sh.getLastRow();
  for (let i = 2; i <= last; i++) {
    if (sh.getRange(i, 1).getValue() === id) {
      const bahan = sh.getRange(i, 7).getValue();
      return { id, bahan: bahan ? JSON.parse(bahan) : [] };
    }
  }
  return null;
}

function updateLaporanHarian(tanggal, omzet, trxCount, produk) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LAPORAN);
  const last = sh.getLastRow();
  for (let i = 2; i <= last; i++) {
    const d = sh.getRange(i, 1).getValue();
    const dStr = d instanceof Date ? Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd') : d;
    if (dStr === tanggal) {
      sh.getRange(i, 2).setValue(sh.getRange(i, 2).getValue() + omzet);
      sh.getRange(i, 3).setValue(sh.getRange(i, 3).getValue() + trxCount);
      sh.getRange(i, 4).setValue(sh.getRange(i, 4).getValue() + produk);
      return;
    }
  }
  sh.appendRow([tanggal, omzet, trxCount, produk]);
}

// ===== DASHBOARD =====
function getDashboard(period) {
  const trxAll = getTransaksi();
  const today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');

  let filtered = [], prev = [];
  if (period === 'hari') {
    filtered = trxAll.filter(t => t.tanggal === today);
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    const ydStr = Utilities.formatDate(yd, 'Asia/Jakarta', 'yyyy-MM-dd');
    prev = trxAll.filter(t => t.tanggal === ydStr);
  } else if (period === 'minggu') {
    const w = new Date(); w.setDate(w.getDate() - 7);
    const wStr = Utilities.formatDate(w, 'Asia/Jakarta', 'yyyy-MM-dd');
    filtered = trxAll.filter(t => t.tanggal >= wStr);
    const pw = new Date(); pw.setDate(pw.getDate() - 14);
    const pwStr = Utilities.formatDate(pw, 'Asia/Jakarta', 'yyyy-MM-dd');
    prev = trxAll.filter(t => t.tanggal >= pwStr && t.tanggal < wStr);
  } else {
    const m = new Date(); m.setDate(1);
    const mStr = Utilities.formatDate(m, 'Asia/Jakarta', 'yyyy-MM-dd');
    filtered = trxAll.filter(t => t.tanggal >= mStr);
  }

  const omzet = filtered.reduce((s, t) => s + t.total, 0);
  const prevOmzet = prev.reduce((s, t) => s + t.total, 0);
  const produk = filtered.reduce((s, t) => s + t.items.reduce((a, i) => a + i.qty, 0), 0);
  const prevProduk = prev.reduce((s, t) => s + t.items.reduce((a, i) => a + i.qty, 0), 0);
  const growth = (c, p) => p === 0 ? 100 : Math.round((c - p) / p * 100);

  // Chart last 7 days
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd');
    const dayTrx = trxAll.filter(t => t.tanggal === ds);
    const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    chartData.push({ label: days[d.getDay()], omzet: dayTrx.reduce((s, t) => s + t.total, 0), transaksi: dayTrx.length });
  }

  // Top products
  const pc = {};
  filtered.forEach(t => t.items.forEach(i => { pc[i.nama] = (pc[i.nama] || 0) + i.qty; }));
  const topProducts = Object.entries(pc).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nama, qty]) => ({ nama, qty }));

  // Low stock
  const stok = getStok();
  const lowStock = stok.filter(s => s.jumlah <= s.minimal).map(s => ({ nama: s.nama, jumlah: s.jumlah, satuan: s.satuan, minimal: s.minimal }));

  return { omzet, trx: filtered.length, produk, nota: filtered.length, prevOmzet, prevTrx: prev.length, prevProduk, growthOmzet: growth(omzet, prevOmzet), growthTrx: growth(filtered.length, prev.length), growthProduk: growth(produk, prevProduk), chartData, topProducts, lowStock };
}

// ===== PENGATURAN =====
function getPengaturan() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PENGATURAN);
  if (!sh || sh.getLastRow() <= 1) return {};
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  const obj = {};
  rows.forEach(r => { if (r[0]) obj[r[0]] = r[1]; });
  return obj;
}

function savePengaturan(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PENGATURAN);
  Object.entries(data).forEach(([key, val]) => {
    const last = sh.getLastRow();
    for (let i = 2; i <= last; i++) {
      if (sh.getRange(i, 1).getValue() === key) { sh.getRange(i, 2).setValue(val); return; }
    }
    sh.appendRow([key, val]);
  });
  return data;
}

// ===== MENU TRIGGER =====
function onOpen() {
  SpreadsheetApp.getUi().createMenu('⚙️ Es Teh POS').addItem('Setup Sheets', 'setupSheets').addToUi();
}
