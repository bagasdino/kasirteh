/* ═══════════════════════════════════════════════
   ES TEH POS — APP.JS
   Full POS frontend with Google Sheets API
   and Rule-Based AI Analytics
════════════════════════════════════════════════ */

'use strict';

/* ─── CONFIG ─── */
let CONFIG = {
  scriptUrl: '',
  outletName: 'Outlet Utama',
  demoMode: false,
  darkMode: false,
};

/* ─── STATE ─── */
let MENU = [];
let CART = [];
let STOCK = [];
let TRANSACTIONS = [];
let currentPage = 'kasir';
let activeCategory = 'Semua';
let selectedPayment = 'Tunai';
let editingMenuId = null;
let editingStockId = null;
let salesChartInst = null;
let cupChartInst = null;

/* ═══ DEMO DATA ════════════════════════════════ */
const DEMO_MENU = [
  { id: 1, name: 'Teh Original', category: 'Teh Original', emoji: '🍵', hasJumbo: true, priceRegular: 5000, priceJumbo: 7000, active: true },
  { id: 2, name: 'Thai Tea',     category: 'Milk Tea',      emoji: '🧋', hasJumbo: false, priceRegular: 7000, priceJumbo: 0, active: true },
  { id: 3, name: 'Green Tea',    category: 'Lainnya',       emoji: '🍃', hasJumbo: false, priceRegular: 7000, priceJumbo: 0, active: true },
  { id: 4, name: 'Lemon Tea',    category: 'Lemon Tea',     emoji: '🍋', hasJumbo: false, priceRegular: 6000, priceJumbo: 0, active: true },
  { id: 5, name: 'Taro',         category: 'Milk Tea',      emoji: '🟣', hasJumbo: false, priceRegular: 7000, priceJumbo: 0, active: true },
  { id: 6, name: 'Coklat',       category: 'Lainnya',       emoji: '🍫', hasJumbo: false, priceRegular: 8000, priceJumbo: 0, active: true },
  { id: 7, name: 'Matcha',       category: 'Lainnya',       emoji: '🌿', hasJumbo: false, priceRegular: 8000, priceJumbo: 0, active: true },
  { id: 8, name: 'Brown Sugar',  category: 'Milk Tea',      emoji: '🤎', hasJumbo: false, priceRegular: 9000, priceJumbo: 0, active: true },
];

const DEMO_STOCK = [
  { id: 1, name: 'Cup Regular', qty: 120, unit: 'pcs', threshold: 30 },
  { id: 2, name: 'Cup Jumbo',   qty: 45,  unit: 'pcs', threshold: 20 },
  { id: 3, name: 'Cup 16oz',    qty: 30,  unit: 'pcs', threshold: 20 },
  { id: 4, name: 'Serbuk Thai Tea',  qty: 350, unit: 'gr', threshold: 100 },
  { id: 5, name: 'Serbuk Green Tea', qty: 250, unit: 'gr', threshold: 100 },
  { id: 6, name: 'Serbuk Taro',      qty: 200, unit: 'gr', threshold: 100 },
  { id: 7, name: 'Serbuk Coklat',    qty: 150, unit: 'gr', threshold: 100 },
  { id: 8, name: 'Gula Cair',        qty: 1.2, unit: 'liter', threshold: 0.5 },
  { id: 9, name: 'Susu Kental Manis',qty: 2,   unit: 'kaleng', threshold: 1 },
  { id: 10,name: 'Es Batu',          qty: 20,  unit: 'bag', threshold: 5 },
];

/* Generate demo transactions for last 7 days */
function generateDemoTransactions() {
  const txs = [];
  const now = new Date();
  const methods = ['Tunai','QRIS','Tunai','Tunai','Transfer'];
  let txId = 100;

  for (let d = 6; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const count = 10 + Math.floor(Math.random() * 15);
    for (let i = 0; i < count; i++) {
      const menu = DEMO_MENU[Math.floor(Math.random() * DEMO_MENU.length)];
      const isJumbo = menu.hasJumbo && Math.random() > .5;
      const qty = 1 + Math.floor(Math.random() * 3);
      const price = isJumbo ? menu.priceJumbo : menu.priceRegular;
      const hour = 8 + Math.floor(Math.random() * 13);
      const time = new Date(date);
      time.setHours(hour, Math.floor(Math.random() * 60));
      txs.push({
        id: `TRX-${txId++}`,
        date: time.toISOString(),
        items: [{ menuId: menu.id, name: menu.name, size: isJumbo ? 'Jumbo' : 'Regular', qty, price }],
        total: price * qty,
        method: methods[Math.floor(Math.random() * methods.length)],
        table: '',
        note: '',
      });
    }
  }
  return txs;
}

/* ═══ INIT ══════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  setTimeout(() => {
    hideSplash();
    if (!CONFIG.scriptUrl && !CONFIG.demoMode) {
      showSetupModal();
    } else {
      showApp();
      initApp();
    }
  }, 1200);
});

function loadConfig() {
  try {
    const saved = localStorage.getItem('esteh_config');
    if (saved) Object.assign(CONFIG, JSON.parse(saved));
    if (CONFIG.darkMode) document.documentElement.setAttribute('data-theme','dark');
  } catch(e) {}
}

function saveConfig() {
  localStorage.setItem('esteh_config', JSON.stringify(CONFIG));
}

function hideSplash() {
  document.getElementById('splash').classList.add('fade-out');
}

function showSetupModal() {
  const el = document.getElementById('setupModal');
  el.classList.remove('hidden');
  el.classList.add('setup-center');
  if (CONFIG.scriptUrl) document.getElementById('scriptUrl').value = CONFIG.scriptUrl;
  if (CONFIG.outletName) document.getElementById('outletName').value = CONFIG.outletName;
}

function openSetup() {
  showSetupModal();
}

function saveSetup() {
  const url = document.getElementById('scriptUrl').value.trim();
  const name = document.getElementById('outletName').value.trim() || 'Outlet Utama';
  if (!url) { showToast('Masukkan URL Google Apps Script!', 'error'); return; }
  CONFIG.scriptUrl = url;
  CONFIG.outletName = name;
  CONFIG.demoMode = false;
  saveConfig();
  document.getElementById('setupModal').classList.add('hidden');
  document.getElementById('outletDisplay').textContent = name;
  showApp();
  initApp();
  showToast('Pengaturan tersimpan!', 'success');
}

function useDemoMode() {
  CONFIG.demoMode = true;
  CONFIG.outletName = 'Outlet Demo';
  saveConfig();
  document.getElementById('setupModal').classList.add('hidden');
  document.getElementById('outletDisplay').textContent = CONFIG.outletName;
  showApp();
  initApp();
  showToast('Mode Demo aktif ✨', 'success');
}

function showApp() {
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('outletDisplay').textContent = CONFIG.outletName;
  setTodayDate();
}

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  const el = document.getElementById('orderDateFilter');
  if (el) el.value = today;
}

async function initApp() {
  if (CONFIG.demoMode) {
    MENU = [...DEMO_MENU];
    STOCK = [...DEMO_STOCK];
    TRANSACTIONS = generateDemoTransactions();
  } else {
    await Promise.all([fetchMenu(), fetchStock(), fetchTransactions()]);
  }
  renderMenu();
  renderCategoryTabs();
}

/* ═══ API LAYER ═════════════════════════════════ */
async function apiCall(action, data = {}) {
  if (CONFIG.demoMode) return demoApiHandler(action, data);
  try {
    const url = `${CONFIG.scriptUrl}?action=${action}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      mode: 'cors',
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API error');
    return json.data;
  } catch(e) {
    console.error('API Error:', e);
    showToast('Koneksi gagal: ' + e.message, 'error');
    throw e;
  }
}

/* Demo API responses */
function demoApiHandler(action, data) {
  switch(action) {
    case 'getMenu': return MENU;
    case 'getStock': return STOCK;
    case 'getTransactions': return TRANSACTIONS;
    case 'addTransaction': {
      const tx = { ...data, id: `TRX-${Date.now()}`, date: new Date().toISOString() };
      TRANSACTIONS.unshift(tx);
      // Update stock
      for (const item of tx.items) {
        if (item.name === 'Teh Original' && item.size === 'Jumbo') {
          reduceStock('Cup Jumbo', item.qty);
        } else {
          reduceStock('Cup Regular', item.qty);
        }
      }
      return tx;
    }
    case 'addMenu': {
      const m = { ...data, id: Date.now(), active: true };
      MENU.push(m);
      return m;
    }
    case 'updateMenu': {
      const i = MENU.findIndex(m => m.id == data.id);
      if (i >= 0) MENU[i] = { ...MENU[i], ...data };
      return MENU[i];
    }
    case 'deleteMenu': {
      MENU = MENU.filter(m => m.id != data.id);
      return true;
    }
    case 'addStock': {
      const existing = STOCK.findIndex(s => s.name.toLowerCase() === data.name.toLowerCase());
      if (existing >= 0) {
        STOCK[existing] = { ...STOCK[existing], ...data };
        return STOCK[existing];
      }
      const s = { ...data, id: Date.now() };
      STOCK.push(s);
      return s;
    }
    case 'updateStock': {
      const i = STOCK.findIndex(s => s.id == data.id);
      if (i >= 0) STOCK[i] = { ...STOCK[i], ...data };
      return STOCK[i];
    }
    case 'deleteStock': {
      STOCK = STOCK.filter(s => s.id != data.id);
      return true;
    }
    default: return null;
  }
}

function reduceStock(name, qty) {
  const i = STOCK.findIndex(s => s.name === name);
  if (i >= 0) STOCK[i].qty = Math.max(0, STOCK[i].qty - qty);
}

/* ═══ FETCH DATA ════════════════════════════════ */
async function fetchMenu() {
  try { MENU = await apiCall('getMenu'); } catch(e) { MENU = [...DEMO_MENU]; }
}

async function fetchStock() {
  try { STOCK = await apiCall('getStock'); } catch(e) { STOCK = [...DEMO_STOCK]; }
}

async function fetchTransactions() {
  try { TRANSACTIONS = await apiCall('getTransactions'); } catch(e) { TRANSACTIONS = generateDemoTransactions(); }
}

/* ═══ MENU RENDERING ════════════════════════════ */
function renderCategoryTabs() {
  const categories = ['Semua', ...new Set(MENU.map(m => m.category))];
  const tabs = document.getElementById('categoryTabs');
  tabs.innerHTML = categories.map(cat =>
    `<button class="cat-tab${cat === activeCategory ? ' active':''}" onclick="filterCategory('${cat}', this)">${cat}</button>`
  ).join('');
}

function renderMenu(filter = '') {
  const grid = document.getElementById('menuGrid');
  let items = MENU.filter(m => m.active !== false);
  if (activeCategory !== 'Semua') items = items.filter(m => m.category === activeCategory);
  if (filter) items = items.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()));

  if (!items.length) {
    grid.innerHTML = '<div class="empty-state">🔍 Menu tidak ditemukan</div>';
    return;
  }

  grid.innerHTML = items.map(m => {
    const inCart = CART.some(c => c.menuId === m.id);
    const displayPrice = m.hasJumbo
      ? `Rp ${fmt(m.priceRegular)} - ${fmt(m.priceJumbo)}`
      : `Rp ${fmt(m.priceRegular)}`;
    const sizeLabel = m.hasJumbo ? 'Regular / Jumbo' : 'Regular';
    return `
      <div class="menu-card${inCart?' in-cart':''}" onclick="addToCart(${m.id})">
        <div class="menu-emoji">${m.emoji || '🍵'}</div>
        <div class="menu-name">${m.name}</div>
        <div class="menu-size-label">${sizeLabel}</div>
        <div class="menu-price">${displayPrice}</div>
        <button class="menu-add-btn" onclick="event.stopPropagation(); addToCart(${m.id})">+</button>
      </div>`;
  }).join('');
}

function filterMenu() {
  renderMenu(document.getElementById('menuSearch').value);
}

function filterCategory(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMenu(document.getElementById('menuSearch').value);
}

/* ═══ CART ══════════════════════════════════════ */
function addToCart(menuId) {
  const menu = MENU.find(m => m.id === menuId);
  if (!menu) return;

  if (menu.hasJumbo) {
    openSizeModal(menu);
  } else {
    addCartItem(menu, 'Regular', menu.priceRegular);
  }
}

function addCartItem(menu, size, price) {
  const key = `${menu.id}_${size}`;
  const existing = CART.find(c => c.key === key);
  if (existing) {
    existing.qty++;
  } else {
    CART.push({ key, menuId: menu.id, name: menu.name, size, price, qty: 1, emoji: menu.emoji || '🍵' });
  }
  updateCartBar();
  renderMenu(document.getElementById('menuSearch').value);
  showToast(`${menu.emoji || '🍵'} ${menu.name} ditambahkan`, 'success');
}

function updateCartBar() {
  const total = CART.reduce((s, c) => s + c.price * c.qty, 0);
  const count = CART.reduce((s, c) => s + c.qty, 0);
  document.getElementById('cartBadge').textContent = count;
  document.getElementById('cartCountText').textContent = `${count} Item`;
  document.getElementById('cartPrice').textContent = `Rp ${fmt(total)}`;
  const bar = document.getElementById('cartBar');
  if (CART.length) bar.classList.remove('hidden');
  else bar.classList.add('hidden');
}

/* ═══ SIZE MODAL ════════════════════════════════ */
let pendingMenu = null;

function openSizeModal(menu) {
  pendingMenu = menu;
  document.getElementById('sizeModalTitle').textContent = 'Pilih Ukuran';
  document.getElementById('sizeModalSubtitle').textContent = menu.name;
  document.getElementById('sizeOptions').innerHTML = `
    <div class="size-option" onclick="selectSize('Regular', ${menu.priceRegular})">
      <div class="size-option-left">
        <span class="size-emoji">${menu.emoji || '🍵'}</span>
        <div>
          <div class="size-name">Regular</div>
          <div style="font-size:12px;color:var(--text-muted)">Cup standar</div>
        </div>
      </div>
      <span class="size-price">Rp ${fmt(menu.priceRegular)}</span>
    </div>
    <div class="size-option" onclick="selectSize('Jumbo', ${menu.priceJumbo})">
      <div class="size-option-left">
        <span class="size-emoji">${menu.emoji || '🍵'}${menu.emoji || '🍵'}</span>
        <div>
          <div class="size-name">Jumbo</div>
          <div style="font-size:12px;color:var(--text-muted)">Cup besar</div>
        </div>
      </div>
      <span class="size-price">Rp ${fmt(menu.priceJumbo)}</span>
    </div>
  `;
  document.getElementById('sizeModal').classList.remove('hidden');
}

function selectSize(size, price) {
  closeSizeModal();
  if (pendingMenu) addCartItem(pendingMenu, size, price);
}

function closeSizeModal() {
  document.getElementById('sizeModal').classList.add('hidden');
  pendingMenu = null;
}

/* ═══ CHECKOUT MODAL ════════════════════════════ */
function openCheckoutModal() {
  if (!CART.length) return;
  renderCheckoutItems();
  document.getElementById('checkoutModal').classList.remove('hidden');
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.add('hidden');
}

function renderCheckoutItems() {
  const total = CART.reduce((s, c) => s + c.price * c.qty, 0);
  document.getElementById('checkoutItems').innerHTML = CART.map((c, i) => `
    <div class="checkout-item">
      <div class="checkout-item-info">
        <div class="checkout-item-name">${c.emoji} ${c.name}</div>
        <div class="checkout-item-detail">${c.size} • Rp ${fmt(c.price)}</div>
      </div>
      <div class="checkout-item-qty">
        <button class="qty-btn" onclick="changeQty(${i}, -1)">−</button>
        <span class="qty-num">${c.qty}</span>
        <button class="qty-btn" onclick="changeQty(${i}, 1)">+</button>
      </div>
      <div class="checkout-item-price">Rp ${fmt(c.price * c.qty)}</div>
      <button class="remove-item-btn" onclick="removeItem(${i})">✕</button>
    </div>
  `).join('');
  document.getElementById('checkoutSubtotal').textContent = `Rp ${fmt(total)}`;
  document.getElementById('checkoutDiscount').textContent = 'Rp 0';
  document.getElementById('checkoutTotal').textContent = `Rp ${fmt(total)}`;
  document.getElementById('checkoutBtnTotal').textContent = `Rp ${fmt(total)}`;
}

function changeQty(idx, delta) {
  CART[idx].qty = Math.max(1, CART[idx].qty + delta);
  renderCheckoutItems();
  updateCartBar();
}

function removeItem(idx) {
  CART.splice(idx, 1);
  if (!CART.length) { closeCheckoutModal(); updateCartBar(); return; }
  renderCheckoutItems();
  updateCartBar();
}

function selectPayment(btn) {
  document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedPayment = btn.dataset.method;
}

async function confirmCheckout() {
  if (!CART.length) return;
  const btn = document.getElementById('confirmCheckoutBtn');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  const total = CART.reduce((s, c) => s + c.price * c.qty, 0);
  const txData = {
    items: CART.map(c => ({ menuId: c.menuId, name: c.name, size: c.size, qty: c.qty, price: c.price })),
    total,
    method: selectedPayment,
    table: document.getElementById('tableNumber').value,
    note: document.getElementById('orderNote').value,
    outlet: CONFIG.outletName,
  };

  try {
    await apiCall('addTransaction', txData);
    CART = [];
    updateCartBar();
    closeCheckoutModal();
    document.getElementById('tableNumber').value = '';
    document.getElementById('orderNote').value = '';
    renderMenu(document.getElementById('menuSearch').value);
    showToast('✅ Transaksi berhasil!', 'success');
  } catch(e) {
    showToast('Gagal menyimpan transaksi', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `Checkout <span id="checkoutBtnTotal">Rp ${fmt(total)}</span> →`;
  }
}

/* ═══ NAVIGATION ════════════════════════════════ */
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  const titles = { kasir:'Kasir', pesanan:'Pesanan', stok:'Stok', laporan:'Laporan', akun:'Dashboard' };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  if (page === 'akun') loadDashboard();
  if (page === 'laporan') loadReport();
  if (page === 'stok') { loadStockTable(); loadMenuManage(); }
  if (page === 'pesanan') loadOrders();
}

/* ═══ ORDERS PAGE ═══════════════════════════════ */
function loadOrders() {
  const dateVal = document.getElementById('orderDateFilter').value;
  const filtered = TRANSACTIONS.filter(tx => {
    if (!dateVal) return true;
    return tx.date.startsWith(dateVal);
  }).sort((a,b) => new Date(b.date) - new Date(a.date));

  const list = document.getElementById('orderList');
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">📋 Tidak ada transaksi untuk tanggal ini</div>';
    return;
  }
  list.innerHTML = filtered.map(tx => {
    const itemSummary = tx.items.map(i => `${i.name} (${i.size}) ×${i.qty}`).join(', ');
    return `
      <div class="order-card">
        <div class="order-card-header">
          <span class="order-id">${tx.id}</span>
          <span class="order-time">${formatTime(tx.date)}</span>
        </div>
        <div class="order-items">${itemSummary}${tx.table ? ` • ${tx.table}` : ''}</div>
        <div class="order-footer">
          <span class="order-method">${tx.method}</span>
          <span class="order-total">Rp ${fmt(tx.total)}</span>
        </div>
      </div>`;
  }).join('');
}

/* ═══ STOCK PAGE ════════════════════════════════ */
let stockTabActive = 'bahan';

function switchStockTab(tab, btn) {
  stockTabActive = tab;
  document.querySelectorAll('#page-stok .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('stockBahanTab').classList.toggle('hidden', tab !== 'bahan');
  document.getElementById('stockMenuTab').classList.toggle('hidden', tab !== 'menu');
  if (tab === 'bahan') loadStockTable();
  if (tab === 'menu') loadMenuManage();
}

function loadStockTable() {
  const body = document.getElementById('stockTableBody');
  if (!STOCK.length) {
    body.innerHTML = '<tr><td colspan="4" class="loading-cell">Stok kosong. Tambahkan bahan baku.</td></tr>';
    return;
  }
  body.innerHTML = STOCK.map(s => {
    const status = getStockStatus(s);
    return `<tr>
      <td style="font-weight:600">${s.name}</td>
      <td><span class="stock-qty">${s.qty}</span> ${s.unit}</td>
      <td><span class="stock-status ${status.cls}">${status.label}</span></td>
      <td>
        <div class="action-btns">
          <button class="action-btn" onclick="editStock(${s.id})">Edit</button>
          <button class="action-btn danger" onclick="deleteStock(${s.id})">Hapus</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterStock() {
  const q = document.getElementById('stockSearch').value.toLowerCase();
  document.querySelectorAll('#stockTableBody tr').forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(q) ? '' : 'none';
  });
}

function getStockStatus(s) {
  if (s.qty <= 0) return { cls: 'status-habis', label: 'Habis' };
  if (s.qty <= s.threshold) return { cls: 'status-menipis', label: 'Menipis' };
  return { cls: 'status-aman', label: 'Aman' };
}

function openStockModal(stockId = null) {
  editingStockId = stockId;
  const modal = document.getElementById('stockModal');
  if (stockId) {
    const s = STOCK.find(s => s.id === stockId);
    document.getElementById('stockModalTitle').textContent = 'Edit Stok';
    document.getElementById('stockNameInput').value = s.name;
    document.getElementById('stockQtyInput').value = s.qty;
    document.getElementById('stockUnitInput').value = s.unit;
    document.getElementById('stockThresholdInput').value = s.threshold;
    document.getElementById('stockEditId').value = s.id;
  } else {
    document.getElementById('stockModalTitle').textContent = 'Tambah Stok';
    document.getElementById('stockNameInput').value = '';
    document.getElementById('stockQtyInput').value = '';
    document.getElementById('stockUnitInput').value = 'pcs';
    document.getElementById('stockThresholdInput').value = '20';
    document.getElementById('stockEditId').value = '';
  }
  modal.classList.remove('hidden');
}

function closeStockModal() { document.getElementById('stockModal').classList.add('hidden'); }

async function saveStock() {
  const name = document.getElementById('stockNameInput').value.trim();
  const qty = parseFloat(document.getElementById('stockQtyInput').value);
  const unit = document.getElementById('stockUnitInput').value.trim() || 'pcs';
  const threshold = parseFloat(document.getElementById('stockThresholdInput').value) || 20;
  const editId = document.getElementById('stockEditId').value;

  if (!name) { showToast('Nama bahan harus diisi!', 'error'); return; }
  if (isNaN(qty)) { showToast('Jumlah stok harus diisi!', 'error'); return; }

  try {
    if (editId) {
      await apiCall('updateStock', { id: parseInt(editId), name, qty, unit, threshold });
      showToast('Stok diperbarui!', 'success');
    } else {
      await apiCall('addStock', { name, qty, unit, threshold });
      showToast('Stok ditambahkan!', 'success');
    }
    closeStockModal();
    if (!CONFIG.demoMode) await fetchStock();
    loadStockTable();
  } catch(e) {}
}

function editStock(id) { openStockModal(id); }

async function deleteStock(id) {
  if (!confirm('Hapus bahan ini?')) return;
  try {
    await apiCall('deleteStock', { id });
    showToast('Bahan dihapus', 'success');
    if (!CONFIG.demoMode) await fetchStock();
    loadStockTable();
  } catch(e) {}
}

/* ═══ MENU MANAGEMENT ═══════════════════════════ */
function loadMenuManage() {
  const list = document.getElementById('menuManageList');
  if (!MENU.length) { list.innerHTML = '<div class="empty-state">Belum ada menu</div>'; return; }
  list.innerHTML = MENU.map(m => `
    <div class="menu-manage-card">
      <div class="menu-manage-emoji">${m.emoji || '🍵'}</div>
      <div class="menu-manage-info">
        <div class="menu-manage-name">${m.name}</div>
        <div class="menu-manage-detail">${m.category} • ${m.hasJumbo ? 'Regular & Jumbo' : 'Regular'}</div>
        <div class="menu-manage-price">
          Rp ${fmt(m.priceRegular)}${m.hasJumbo ? ` / Rp ${fmt(m.priceJumbo)}` : ''}
        </div>
      </div>
      <div class="action-btns">
        <button class="action-btn" onclick="editMenu(${m.id})">Edit</button>
        <button class="action-btn danger" onclick="deleteMenu(${m.id})">Hapus</button>
      </div>
    </div>`).join('');
}

function openMenuModal(menuId = null) {
  editingMenuId = menuId;
  const modal = document.getElementById('menuModal');
  if (menuId) {
    const m = MENU.find(m => m.id === menuId);
    document.getElementById('menuModalTitle').textContent = 'Edit Menu';
    document.getElementById('menuNameInput').value = m.name;
    document.getElementById('menuCategoryInput').value = m.category;
    document.getElementById('menuSizeInput').value = m.hasJumbo ? 'Both' : 'Regular';
    document.getElementById('menuPriceRegular').value = m.priceRegular;
    document.getElementById('menuPriceJumbo').value = m.priceJumbo || '';
    document.getElementById('menuEmoji').value = m.emoji || '';
    document.getElementById('menuEditId').value = m.id;
    togglePriceFields();
  } else {
    document.getElementById('menuModalTitle').textContent = 'Tambah Menu';
    document.getElementById('menuNameInput').value = '';
    document.getElementById('menuCategoryInput').value = 'Teh Original';
    document.getElementById('menuSizeInput').value = 'Regular';
    document.getElementById('menuPriceRegular').value = '';
    document.getElementById('menuPriceJumbo').value = '';
    document.getElementById('menuEmoji').value = '';
    document.getElementById('menuEditId').value = '';
    document.getElementById('jumboGroup').style.display = 'none';
  }
  modal.classList.remove('hidden');
}

function closeMenuModal() { document.getElementById('menuModal').classList.add('hidden'); }

function togglePriceFields() {
  const isJumbo = document.getElementById('menuSizeInput').value === 'Both';
  document.getElementById('jumboGroup').style.display = isJumbo ? '' : 'none';
}

async function saveMenu() {
  const name = document.getElementById('menuNameInput').value.trim();
  const category = document.getElementById('menuCategoryInput').value;
  const hasJumbo = document.getElementById('menuSizeInput').value === 'Both';
  const priceRegular = parseInt(document.getElementById('menuPriceRegular').value);
  const priceJumbo = hasJumbo ? parseInt(document.getElementById('menuPriceJumbo').value) : 0;
  const emoji = document.getElementById('menuEmoji').value.trim() || '🍵';
  const editId = document.getElementById('menuEditId').value;

  if (!name) { showToast('Nama menu harus diisi!', 'error'); return; }
  if (!priceRegular || priceRegular <= 0) { showToast('Harga harus diisi!', 'error'); return; }

  const menuData = { name, category, hasJumbo, priceRegular, priceJumbo, emoji, active: true };

  try {
    if (editId) {
      await apiCall('updateMenu', { id: parseInt(editId), ...menuData });
      showToast('Menu diperbarui!', 'success');
    } else {
      await apiCall('addMenu', menuData);
      showToast('Menu ditambahkan!', 'success');
    }
    closeMenuModal();
    if (!CONFIG.demoMode) await fetchMenu();
    renderMenu();
    renderCategoryTabs();
    loadMenuManage();
  } catch(e) {}
}

function editMenu(id) { openMenuModal(id); }

async function deleteMenu(id) {
  if (!confirm('Hapus menu ini?')) return;
  try {
    await apiCall('deleteMenu', { id });
    showToast('Menu dihapus', 'success');
    if (!CONFIG.demoMode) await fetchMenu();
    renderMenu();
    renderCategoryTabs();
    loadMenuManage();
  } catch(e) {}
}

/* ═══ DASHBOARD & ANALYTICS ═════════════════════ */
function loadDashboard() {
  const period = document.getElementById('dashboardPeriod').value;
  const data = analyzeData(period);
  renderKPIs(data);
  renderAIInsight(data);
  renderSalesChart(data, period);
  renderCupChart(data);
  renderTopProducts(data);
  renderPaymentBreakdown(data);
  renderStockAlerts();
  renderCupPrediction(data);
}

function analyzeData(period) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate()-1);
  const yDate = yesterday.toISOString().split('T')[0];

  // Filter txs by period
  let txs = TRANSACTIONS;
  if (period === 'today') {
    txs = TRANSACTIONS.filter(tx => tx.date.startsWith(today));
  } else if (period === 'week') {
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate()-6);
    txs = TRANSACTIONS.filter(tx => new Date(tx.date) >= weekAgo);
  }

  // Yesterday txs for comparison
  const yTxs = TRANSACTIONS.filter(tx => tx.date.startsWith(yDate));

  const revenue = txs.reduce((s, tx) => s + tx.total, 0);
  const yRevenue = yTxs.reduce((s, tx) => s + tx.total, 0);
  const txCount = txs.length;
  const yTxCount = yTxs.length;
  const itemCount = txs.reduce((s, tx) => s + tx.items.reduce((si, i) => si + i.qty, 0), 0);
  const yItemCount = yTxs.reduce((s, tx) => s + tx.items.reduce((si, i) => si + i.qty, 0), 0);
  const avgTx = txCount ? revenue / txCount : 0;
  const yAvgTx = yTxCount ? yRevenue / yTxCount : 0;

  // Daily sales for chart
  const dailySales = {};
  const dailyCups = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate()-i);
    const dk = d.toISOString().split('T')[0];
    dailySales[dk] = 0;
    dailyCups[dk] = { regular: 0, jumbo: 0 };
  }
  TRANSACTIONS.filter(tx => tx.date.split('T')[0] in dailySales).forEach(tx => {
    const dk = tx.date.split('T')[0];
    dailySales[dk] += tx.total;
    tx.items.forEach(item => {
      if (item.name === 'Teh Original' && item.size === 'Jumbo') {
        dailyCups[dk].jumbo += item.qty;
      } else {
        dailyCups[dk].regular += item.qty;
      }
    });
  });

  // Product ranking
  const productMap = {};
  txs.forEach(tx => tx.items.forEach(item => {
    const key = `${item.name} (${item.size})`;
    productMap[key] = (productMap[key] || 0) + item.qty;
  }));
  const topProducts = Object.entries(productMap).sort((a,b) => b[1]-a[1]).slice(0,5);

  // Payment methods
  const paymentMap = {};
  txs.forEach(tx => { paymentMap[tx.method] = (paymentMap[tx.method] || 0) + tx.total; });

  // Cup usage
  const totalRegular = txs.reduce((s, tx) => s + tx.items.filter(i => !(i.name==='Teh Original'&&i.size==='Jumbo')).reduce((si,i)=>si+i.qty,0), 0);
  const totalJumbo = txs.reduce((s, tx) => s + tx.items.filter(i => i.name==='Teh Original'&&i.size==='Jumbo').reduce((si,i)=>si+i.qty,0), 0);

  return {
    revenue, yRevenue, txCount, yTxCount, itemCount, yItemCount,
    avgTx, yAvgTx, dailySales, dailyCups,
    topProducts, paymentMap, totalRegular, totalJumbo,
  };
}

function renderKPIs(data) {
  document.getElementById('kpiRevenue').textContent = `Rp ${fmt(data.revenue)}`;
  document.getElementById('kpiTx').textContent = data.txCount;
  document.getElementById('kpiItems').textContent = data.itemCount;
  document.getElementById('kpiAvg').textContent = `Rp ${fmt(data.avgTx)}`;

  setChange('kpiRevenueChange', data.revenue, data.yRevenue);
  setChange('kpiTxChange', data.txCount, data.yTxCount);
  setChange('kpiItemsChange', data.itemCount, data.yItemCount);
  setChange('kpiAvgChange', data.avgTx, data.yAvgTx);
}

function setChange(elId, curr, prev) {
  const el = document.getElementById(elId);
  if (!prev) { el.textContent = '—'; el.className = 'kpi-change'; return; }
  const pct = ((curr - prev) / prev * 100).toFixed(1);
  const up = curr >= prev;
  el.textContent = `${up?'↑':'↓'} ${Math.abs(pct)}% dari kemarin`;
  el.className = `kpi-change${up?'':' negative'}`;
}

/* AI / Rule-Based Insight */
function renderAIInsight(data) {
  const el = document.getElementById('aiInsightText');
  const insights = [];

  // Revenue insight
  if (data.revenue > data.yRevenue * 1.1) {
    insights.push(`🚀 Penjualan hari ini naik ${((data.revenue/data.yRevenue-1)*100).toFixed(0)}% dari kemarin! Performa bagus.`);
  } else if (data.revenue < data.yRevenue * .9 && data.yRevenue > 0) {
    insights.push(`📉 Penjualan turun ${((1-data.revenue/data.yRevenue)*100).toFixed(0)}% dari kemarin. Coba promosi untuk meningkatkan transaksi.`);
  }

  // Top product
  if (data.topProducts.length) {
    const top = data.topProducts[0];
    insights.push(`🏆 Menu terlaris: ${top[0]} (${top[1]} terjual).`);
  }

  // Stock warning
  const lowStock = STOCK.filter(s => s.qty <= s.threshold && s.qty > 0);
  const outStock = STOCK.filter(s => s.qty <= 0);
  if (outStock.length) insights.push(`🔴 STOK HABIS: ${outStock.map(s=>s.name).join(', ')}. Segera restok!`);
  else if (lowStock.length) insights.push(`⚠️ Stok menipis: ${lowStock.map(s=>s.name).join(', ')}.`);

  // Cup usage
  const totalCups = data.totalRegular + data.totalJumbo;
  if (totalCups > 0) {
    insights.push(`🥤 Penggunaan cup hari ini: ${data.totalRegular} Regular + ${data.totalJumbo} Jumbo = ${totalCups} total.`);
  }

  if (!insights.length) insights.push('📊 Data penjualan sedang dianalisis. Lakukan beberapa transaksi untuk melihat insight.');
  el.textContent = insights.join(' ');
}

function renderSalesChart(data, period) {
  const labels = Object.keys(data.dailySales).map(d => {
    const dt = new Date(d);
    return dt.toLocaleDateString('id-ID', { weekday:'short', day:'numeric' });
  });
  const values = Object.values(data.dailySales);

  const ctx = document.getElementById('salesChart').getContext('2d');
  if (salesChartInst) salesChartInst.destroy();
  salesChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Penjualan (Rp)',
        data: values,
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22,163,74,.12)',
        borderWidth: 2.5,
        pointBackgroundColor: '#16a34a',
        pointRadius: 4,
        tension: .4,
        fill: true,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => `Rp ${fmt(ctx.raw)}` }
      }},
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: {
          font: { size: 11 }, callback: v => `${(v/1000).toFixed(0)}rb`
        }}
      }
    }
  });
}

function renderCupChart(data) {
  const days = Object.keys(data.dailyCups);
  const labels = days.map(d => new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'short' }));
  const regular = days.map(d => data.dailyCups[d].regular);
  const jumbo = days.map(d => data.dailyCups[d].jumbo);

  const ctx = document.getElementById('cupChart').getContext('2d');
  if (cupChartInst) cupChartInst.destroy();
  cupChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Cup Regular', data: regular, backgroundColor: '#16a34a', borderRadius: 4 },
        { label: 'Cup Jumbo', data: jumbo, backgroundColor: '#4ade80', borderRadius: 4 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10 } } },
      scales: {
        x: { grid: { display: false }, stacked: true, ticks: { font: { size: 10 } } },
        y: { grid: { color: 'rgba(0,0,0,.06)' }, stacked: true, ticks: { font: { size: 11 }, stepSize: 5 } }
      }
    }
  });
}

function renderTopProducts(data) {
  const el = document.getElementById('topProducts');
  if (!data.topProducts.length) { el.innerHTML = '<div class="empty-state">Belum ada data</div>'; return; }
  const max = data.topProducts[0][1];
  el.innerHTML = data.topProducts.map(([name, count], i) => `
    <div class="top-product-row">
      <span class="top-product-rank">${i+1}</span>
      <span class="top-product-name">${name}</span>
      <div class="top-product-bar-wrap"><div class="top-product-bar" style="width:${(count/max*100).toFixed(0)}%"></div></div>
      <span class="top-product-count">${count}</span>
    </div>`).join('');
}

function renderPaymentBreakdown(data) {
  const el = document.getElementById('paymentBreakdown');
  const entries = Object.entries(data.paymentMap);
  const total = entries.reduce((s,[,v]) => s+v, 0);
  if (!entries.length) { el.innerHTML = '<div class="empty-state">Belum ada data</div>'; return; }
  const colors = { Tunai: '#16a34a', QRIS: '#3b82f6', Transfer: '#f59e0b' };
  el.innerHTML = entries.map(([method, amount]) => {
    const pct = total ? (amount/total*100).toFixed(0) : 0;
    return `
      <div class="payment-row">
        <span class="payment-method-name">${method}</span>
        <div class="payment-bar-wrap"><div class="payment-bar" style="width:${pct}%;background:${colors[method]||'#6b7280'}"></div></div>
        <span class="payment-pct">${pct}%</span>
      </div>`;
  }).join('');
}

function renderStockAlerts() {
  const el = document.getElementById('stockAlerts');
  const alerts = STOCK.filter(s => s.qty <= s.threshold);
  if (!alerts.length) { el.innerHTML = '<div style="color:var(--green-600);font-size:13px;font-weight:600">✅ Semua stok dalam kondisi aman</div>'; return; }
  el.innerHTML = alerts.map(s => {
    const status = s.qty <= 0 ? 'habis' : 'menipis';
    return `<div class="stock-alert-item ${status}">
      <span class="stock-alert-name">${s.name}</span>
      <span class="stock-alert-qty">${s.qty} ${s.unit} ${s.qty<=0?'• HABIS':'• Menipis'}</span>
    </div>`;
  }).join('');
}

function renderCupPrediction(data) {
  const el = document.getElementById('cupPrediction');
  // Calculate average daily usage from last 7 days
  const regularValues = Object.values(data.dailyCups).map(d => d.regular);
  const jumboValues = Object.values(data.dailyCups).map(d => d.jumbo);
  const avgRegular = Math.ceil(regularValues.reduce((s,v)=>s+v,0) / regularValues.length);
  const avgJumbo = Math.ceil(jumboValues.reduce((s,v)=>s+v,0) / jumboValues.length);
  const pred7Regular = avgRegular * 7;
  const pred7Jumbo = avgJumbo * 7;

  // Current stock
  const stockRegular = STOCK.find(s=>s.name==='Cup Regular')?.qty || 0;
  const stockJumbo = STOCK.find(s=>s.name==='Cup Jumbo')?.qty || 0;
  const daysRegular = avgRegular ? Math.floor(stockRegular / avgRegular) : '∞';
  const daysJumbo = avgJumbo ? Math.floor(stockJumbo / avgJumbo) : '∞';

  el.innerHTML = `
    <div class="prediction-row">
      <div>
        <div class="prediction-label">Cup Regular (7 hari)</div>
        <div style="font-size:12px;color:var(--text-muted)">Stok saat ini: ${stockRegular} pcs • Cukup ~${daysRegular} hari</div>
      </div>
      <span class="prediction-value">${pred7Regular} pcs</span>
    </div>
    <div class="prediction-row">
      <div>
        <div class="prediction-label">Cup Jumbo (7 hari)</div>
        <div style="font-size:12px;color:var(--text-muted)">Stok saat ini: ${stockJumbo} pcs • Cukup ~${daysJumbo} hari</div>
      </div>
      <span class="prediction-value">${pred7Jumbo} pcs</span>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:8px">
      * Berdasarkan rata-rata ${avgRegular} cup regular + ${avgJumbo} cup jumbo per hari selama 7 hari terakhir.
    </div>`;
}

/* ═══ REPORT PAGE ═══════════════════════════════ */
let reportTab = 'penjualan';

function switchReportTab(tab, btn) {
  reportTab = tab;
  document.querySelectorAll('.report-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadReport();
}

function loadReport() {
  const period = document.getElementById('reportPeriod').value;
  const data = analyzeData(period);
  const el = document.getElementById('reportContent');

  if (reportTab === 'penjualan') {
    el.innerHTML = `
      <div class="report-stats">
        <div class="report-stat"><div class="report-stat-label">Total Penjualan</div><div class="report-stat-value" style="color:var(--accent)">Rp ${fmt(data.revenue)}</div></div>
        <div class="report-stat"><div class="report-stat-label">Total Transaksi</div><div class="report-stat-value">${data.txCount}</div></div>
        <div class="report-stat"><div class="report-stat-label">Produk Terjual</div><div class="report-stat-value">${data.itemCount}</div></div>
        <div class="report-stat"><div class="report-stat-label">Rata-rata/Transaksi</div><div class="report-stat-value">Rp ${fmt(data.avgTx)}</div></div>
      </div>
      <div class="chart-card"><div class="chart-header"><span class="chart-title">Grafik Per Jam</span></div><canvas id="reportChart" height="180"></canvas></div>`;

    // Hourly chart
    setTimeout(() => renderHourlyChart(period), 100);

  } else if (reportTab === 'produk') {
    if (!data.topProducts.length) { el.innerHTML = '<div class="empty-state">Belum ada data penjualan</div>'; return; }
    el.innerHTML = `
      <div class="stock-table-wrap">
        <table class="stock-table">
          <thead><tr><th>#</th><th>Menu</th><th>Qty Terjual</th><th>Kontribusi</th></tr></thead>
          <tbody>${data.topProducts.map(([name, qty], i) => {
            const pct = data.itemCount ? (qty/data.itemCount*100).toFixed(1) : 0;
            return `<tr><td style="font-weight:700;color:var(--text-muted)">${i+1}</td><td style="font-weight:600">${name}</td><td class="stock-qty">${qty}</td><td><span style="color:var(--accent);font-weight:700">${pct}%</span></td></tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;

  } else if (reportTab === 'transaksi') {
    const period2 = period;
    const now = new Date();
    let txs = TRANSACTIONS;
    if (period2 === 'today') txs = txs.filter(tx => tx.date.startsWith(now.toISOString().split('T')[0]));
    else if (period2 === 'week') { const wa = new Date(now); wa.setDate(wa.getDate()-6); txs = txs.filter(tx => new Date(tx.date) >= wa); }

    el.innerHTML = !txs.length
      ? '<div class="empty-state">Tidak ada transaksi</div>'
      : `<div class="order-list">${txs.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(tx => {
          const itemSummary = tx.items.map(i => `${i.name} ×${i.qty}`).join(', ');
          return `<div class="order-card">
            <div class="order-card-header"><span class="order-id">${tx.id}</span><span class="order-time">${formatTime(tx.date)}</span></div>
            <div class="order-items">${itemSummary}</div>
            <div class="order-footer"><span class="order-method">${tx.method}</span><span class="order-total">Rp ${fmt(tx.total)}</span></div>
          </div>`;
        }).join('')}</div>`;

  } else if (reportTab === 'stok') {
    el.innerHTML = `
      <div class="stock-table-wrap">
        <table class="stock-table">
          <thead><tr><th>Bahan</th><th>Stok</th><th>Batas</th><th>Status</th></tr></thead>
          <tbody>${STOCK.map(s => {
            const st = getStockStatus(s);
            return `<tr><td style="font-weight:600">${s.name}</td><td class="stock-qty">${s.qty} ${s.unit}</td><td style="color:var(--text-muted)">${s.threshold} ${s.unit}</td><td><span class="stock-status ${st.cls}">${st.label}</span></td></tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
  }
}

function renderHourlyChart(period) {
  const ctx = document.getElementById('reportChart');
  if (!ctx) return;

  const now = new Date();
  let txs = TRANSACTIONS;
  if (period === 'today') txs = txs.filter(tx => tx.date.startsWith(now.toISOString().split('T')[0]));
  else if (period === 'week') { const wa = new Date(now); wa.setDate(wa.getDate()-6); txs = txs.filter(tx => new Date(tx.date) >= wa); }

  const hours = Array.from({length: 16}, (_, i) => i + 7); // 07-22
  const hourData = {};
  hours.forEach(h => hourData[h] = 0);
  txs.forEach(tx => {
    const h = new Date(tx.date).getHours();
    if (h in hourData) hourData[h] += tx.total;
  });

  new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: hours.map(h => `${h.toString().padStart(2,'0')}:00`),
      datasets: [{ label: 'Penjualan', data: Object.values(hourData), backgroundColor: '#16a34a', borderRadius: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `Rp ${fmt(c.raw)}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { ticks: { callback: v => `${(v/1000).toFixed(0)}rb`, font: { size: 10 } } }
      }
    }
  });
}

/* ═══ UI UTILITIES ══════════════════════════════ */
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast${type?' '+type:''}`;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  CONFIG.darkMode = !isDark;
  saveConfig();
  document.getElementById('darkModeBtn').textContent = isDark ? '🌙' : '☀️';
}

function fmt(n) {
  if (isNaN(n) || n === undefined) return '0';
  return Math.round(n).toLocaleString('id-ID');
}

function formatTime(isoStr) {
  try {
    return new Date(isoStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  } catch(e) { return isoStr; }
}

/* ═══ PWA SERVICE WORKER ════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
