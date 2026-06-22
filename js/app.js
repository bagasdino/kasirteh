// ============================================================
// APP.JS — Main Application Controller
// ============================================================

let currentPage = 'kasir';
let cart = [];
let currentPayMethod = 'Tunai';
let lastTransaction = null;
let allMenu = [];
let allStok = [];

// ===== INIT =====
window.addEventListener('DOMContentLoaded', async () => {
  DB.init();
  await initApp();
});

async function initApp() {
  const splash = document.getElementById('splash');
  await new Promise(r => setTimeout(r, 1800));
  splash.classList.add('fade-out');
  setTimeout(() => splash.classList.add('hidden'), 400);

  const gasUrl = localStorage.getItem(CONFIG.GAS_URL_KEY);
  const isDemo = !gasUrl || localStorage.getItem(CONFIG.DEMO_MODE_KEY) === 'true';

  if (!gasUrl && !isDemo) {
    showSetup();
  } else {
    if (isDemo) DB.enableDemo();
    showApp();
    loadSettings();
    await navigate('kasir');
  }
}

function showSetup() {
  document.getElementById('setup-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

async function saveSetup() {
  const url = document.getElementById('setup-url').value.trim();
  const name = document.getElementById('setup-name').value.trim() || 'Es Teh Kita';
  if (!url) { showToast('Masukkan URL Google Apps Script', 'error'); return; }
  DB.setGasUrl(url);
  DB.saveSettings({ namaToko: name });
  showApp();
  loadSettings();
  await navigate('kasir');
}

function useDemo() {
  DB.enableDemo();
  showApp();
  loadSettings();
  navigate('kasir');
}

function openSetup() {
  closeSidebar();
  const url = localStorage.getItem(CONFIG.GAS_URL_KEY) || '';
  document.getElementById('setup-url').value = url;
  showSetup();
}

// ===== SETTINGS =====
function loadSettings() {
  const s = DB.getSettings();
  document.getElementById('sidebar-store-name').textContent = s.namaToko || 'Es Teh Kita';
  document.getElementById('set-nama-toko') && (document.getElementById('set-nama-toko').value = s.namaToko || '');
  document.getElementById('set-alamat') && (document.getElementById('set-alamat').value = s.alamat || '');
  document.getElementById('set-phone') && (document.getElementById('set-phone').value = s.phone || '');
  document.getElementById('set-kasir') && (document.getElementById('set-kasir').value = s.namaKasir || '');
  document.getElementById('set-stok-kritis') && (document.getElementById('set-stok-kritis').value = s.stokKritis || 20);
  document.getElementById('set-footer') && (document.getElementById('set-footer').value = s.footerStruk || '');
  document.getElementById('set-show-foto') && (document.getElementById('set-show-foto').checked = s.showFoto !== false);
  document.getElementById('conn-mode') && (document.getElementById('conn-mode').textContent = DB.isDemo() ? 'Demo' : 'Google Sheets');
}

function saveSettings() {
  const s = {
    namaToko: document.getElementById('set-nama-toko').value.trim() || 'Es Teh Kita',
    alamat: document.getElementById('set-alamat').value.trim(),
    phone: document.getElementById('set-phone').value.trim(),
    namaKasir: document.getElementById('set-kasir').value.trim() || 'Kasir',
    stokKritis: parseInt(document.getElementById('set-stok-kritis').value) || 20,
    footerStruk: document.getElementById('set-footer').value.trim(),
    showFoto: document.getElementById('set-show-foto').checked,
  };
  DB.saveSettings(s);
  loadSettings();
  showToast('Pengaturan tersimpan ✓', 'success');
}

function clearData() {
  if (!confirm('Reset semua data demo? Data akan dikembalikan ke contoh awal.')) return;
  ['menu','stok','transaksi','mutasi','settings'].forEach(k => localStorage.removeItem(`${CONFIG.STORAGE_KEY}_${k}`));
  DB._seedDemo();
  navigate('kasir');
  showToast('Data direset ke demo', 'success');
}

// ===== NAVIGATION =====
async function navigate(page) {
  if (currentPage === page) { closeSidebar(); return; }
  currentPage = page;
  closeSidebar();

  // Deactivate all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item, .sidebar-item').forEach(b => b.classList.remove('active'));

  // Activate target page
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add('active'));

  const titles = { kasir: 'Kasir', transaksi: 'Transaksi', stok: 'Stok', menu: 'Menu', dashboard: 'Dashboard', pengaturan: 'Pengaturan' };
  document.getElementById('page-title').textContent = titles[page] || page;

  // Load page data
  if (page === 'kasir') await loadMenuKasir();
  else if (page === 'transaksi') await loadTransaksi();
  else if (page === 'stok') await loadStok();
  else if (page === 'menu') await loadMenuMgmt();
  else if (page === 'dashboard') await loadDashboard();
  else if (page === 'pengaturan') loadSettings();

  // Show/hide search
  const searchToggle = document.getElementById('search-toggle');
  if (searchToggle) searchToggle.style.display = page === 'kasir' ? 'flex' : 'none';
}

// ===== SIDEBAR =====
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// ===== DARK MODE =====
function toggleDark() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('esteh_dark', !isDark);
  const icon = document.getElementById('dark-icon');
  if (icon) icon.innerHTML = isDark
    ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
    : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
}

// Initialize dark mode from storage
(function() {
  if (localStorage.getItem('esteh_dark') === 'true') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

// ===== SEARCH =====
function toggleSearch() {
  const bar = document.getElementById('search-bar');
  bar.classList.toggle('hidden');
  if (!bar.classList.contains('hidden')) document.getElementById('search-input').focus();
}
function closeSearch() {
  document.getElementById('search-bar').classList.add('hidden');
  document.getElementById('search-input').value = '';
  filterMenu('');
}

// ===== CART =====
function addToCart(menuId) {
  const menu = allMenu.find(m => m.id === menuId);
  if (!menu) return;
  const existing = cart.find(c => c.menuId === menuId);
  if (existing) { existing.qty++; }
  else { cart.push({ menuId, nama: menu.nama, harga: menu.harga, foto: menu.foto, qty: 1 }); }
  updateCartUI();
  showToast(`${menu.nama} ditambahkan ✓`, 'success');
}

function removeFromCart(menuId) {
  const idx = cart.findIndex(c => c.menuId === menuId);
  if (idx > -1) {
    if (cart[idx].qty > 1) cart[idx].qty--;
    else cart.splice(idx, 1);
  }
  updateCartUI();
  renderCartItems();
}

function clearCart() {
  if (cart.length === 0) return;
  if (!confirm('Hapus semua item dari keranjang?')) return;
  cart = [];
  updateCartUI();
  closeCart();
}

function updateCartUI() {
  const total = cart.reduce((s, c) => s + c.harga * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const fab = document.getElementById('cart-fab');
  if (count > 0) {
    fab.classList.remove('hidden');
    document.getElementById('cart-count').textContent = count;
    document.getElementById('cart-total-fab').textContent = formatRp(total);
  } else {
    fab.classList.add('hidden');
  }
}

function openCart() {
  document.getElementById('modal-cart').classList.remove('hidden');
  renderCartItems();
}
function closeCart() { document.getElementById('modal-cart').classList.add('hidden'); }

function renderCartItems() {
  const container = document.getElementById('cart-items');
  const total = cart.reduce((s, c) => s + c.harga * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  if (cart.length === 0) {
    container.innerHTML = `<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><p>Keranjang kosong</p></div>`;
  } else {
    container.innerHTML = cart.map(item => `
      <div class="cart-item">
        ${item.foto ? `<img class="cart-item-img" src="${item.foto}" alt="${item.nama}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'48\\' height=\\'48\\' viewBox=\\'0 0 24 24\\'><rect width=\\'24\\' height=\\'24\\' fill=\\'%23dcfce7\\'/></svg>'" />` : `<div class="cart-item-img" style="background:var(--green-50);display:flex;align-items:center;justify-content:center;">🫖</div>`}
        <div class="cart-item-info">
          <div class="cart-item-name">${item.nama}</div>
          <div class="cart-item-price">${formatRp(item.harga)} x ${item.qty} = <strong>${formatRp(item.harga * item.qty)}</strong></div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="removeFromCart('${item.menuId}')">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="addToCart('${item.menuId}')">+</button>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('cart-item-count').textContent = count;
  document.getElementById('cart-subtotal').textContent = formatRp(total);
  document.getElementById('cart-grand-total').textContent = formatRp(total);
}

// ===== PAYMENT =====
function openPayment() {
  if (cart.length === 0) return;
  closeCart();
  const total = cart.reduce((s, c) => s + c.harga * c.qty, 0);
  document.getElementById('pay-total').textContent = formatRp(total);
  document.getElementById('pay-nominal').value = '';
  document.getElementById('kembalian').textContent = 'Rp0';
  document.getElementById('pay-note').value = '';
  document.getElementById('modal-payment').classList.remove('hidden');
  selectPayMethod(document.querySelector('.pay-method[data-method="Tunai"]'));
}
function closePayment() { document.getElementById('modal-payment').classList.add('hidden'); }

function selectPayMethod(btn) {
  document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentPayMethod = btn.dataset.method;
  document.getElementById('tunai-section').style.display = currentPayMethod === 'Tunai' ? 'block' : 'none';
}

function calcKembalian() {
  const total = cart.reduce((s, c) => s + c.harga * c.qty, 0);
  const nominal = parseInt(document.getElementById('pay-nominal').value) || 0;
  const kembalian = nominal - total;
  document.getElementById('kembalian').textContent = kembalian >= 0 ? formatRp(kembalian) : '⚠️ Kurang';
  document.getElementById('kembalian').style.color = kembalian >= 0 ? 'var(--primary)' : 'var(--danger)';
}

function setNominal(val) {
  const total = cart.reduce((s, c) => s + c.harga * c.qty, 0);
  const rounded = Math.ceil(total / val) * val;
  document.getElementById('pay-nominal').value = rounded;
  calcKembalian();
}

async function processPayment() {
  if (cart.length === 0) return;
  const total = cart.reduce((s, c) => s + c.harga * c.qty, 0);
  const nominal = parseInt(document.getElementById('pay-nominal').value) || total;

  if (currentPayMethod === 'Tunai' && nominal < total) {
    showToast('Nominal kurang dari total!', 'error');
    return;
  }

  const settings = DB.getSettings();
  const trxData = {
    items: cart.map(c => ({ menuId: c.menuId, nama: c.nama, harga: c.harga, qty: c.qty })),
    total,
    metode: currentPayMethod,
    nominal: currentPayMethod === 'Tunai' ? nominal : total,
    kembalian: currentPayMethod === 'Tunai' ? nominal - total : 0,
    catatan: document.getElementById('pay-note').value.trim(),
    kasir: settings.namaKasir || 'Kasir',
  };

  try {
    showToast('Memproses transaksi...', '');
    lastTransaction = await DB.saveTransaksi(trxData);
    cart = [];
    updateCartUI();
    closePayment();
    showSuccessModal(lastTransaction, settings);
  } catch (e) {
    showToast('Gagal menyimpan transaksi: ' + e.message, 'error');
  }
}

function showSuccessModal(trx, settings) {
  document.getElementById('success-invoice').innerHTML = `
    <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:8px;">${trx.invoice} • ${trx.waktu}</div>
    <div class="struk-divider"></div>
    ${trx.items.map(i => `<div class="cart-row"><span>${i.nama} x${i.qty}</span><span>${formatRp(i.harga * i.qty)}</span></div>`).join('')}
    <div class="struk-divider"></div>
    <div class="cart-row total"><span>Total</span><span>${formatRp(trx.total)}</span></div>
    ${trx.metode === 'Tunai' ? `<div class="cart-row"><span>Bayar</span><span>${formatRp(trx.nominal)}</span></div><div class="cart-row"><span>Kembalian</span><span style="color:var(--primary);font-weight:700">${formatRp(trx.kembalian)}</span></div>` : ''}
    <div class="cart-row" style="margin-top:4px"><span>Metode</span><span>${trx.metode}</span></div>
  `;
  document.getElementById('modal-success').classList.remove('hidden');
}

function closeSuccess() {
  document.getElementById('modal-success').classList.add('hidden');
  navigate('kasir');
}

function printStruk() {
  if (!lastTransaction) return;
  const settings = DB.getSettings();
  const trx = lastTransaction;
  const printArea = document.getElementById('print-area');
  printArea.innerHTML = `
    <div class="struk">
      <div class="struk-header">
        <strong style="font-size:15px">${settings.namaToko || 'Es Teh Kita'}</strong><br>
        ${settings.alamat ? `<small>${settings.alamat}</small><br>` : ''}
        ${settings.phone ? `<small>📱 ${settings.phone}</small><br>` : ''}
        <small>${trx.invoice}</small><br>
        <small>${trx.tanggal} ${trx.waktu} | Kasir: ${trx.kasir}</small>
      </div>
      <div class="struk-divider"></div>
      ${trx.items.map(i => `
        <div class="struk-row"><span>${i.nama}</span></div>
        <div class="struk-row"><span>${i.qty} x ${formatRp(i.harga)}</span><span>${formatRp(i.harga * i.qty)}</span></div>
      `).join('')}
      <div class="struk-divider"></div>
      <div class="struk-row struk-total"><span>TOTAL</span><span>${formatRp(trx.total)}</span></div>
      ${trx.metode === 'Tunai' ? `
        <div class="struk-row"><span>Bayar</span><span>${formatRp(trx.nominal)}</span></div>
        <div class="struk-row"><span>Kembalian</span><span>${formatRp(trx.kembalian)}</span></div>
      ` : ''}
      <div class="struk-row"><span>Metode</span><span>${trx.metode}</span></div>
      <div class="struk-divider"></div>
      <div class="struk-footer">${settings.footerStruk || 'Terima kasih!'}</div>
    </div>
    <button class="print-close" onclick="closePrint()">Tutup</button>
  `;
  printArea.classList.remove('hidden');
  setTimeout(() => window.print(), 100);
}

function closePrint() {
  document.getElementById('print-area').classList.add('hidden');
}

// ===== TRANSAKSI DETAIL =====
function viewTransaksiDetail(trx) {
  const methodBadge = { 'Tunai': 'badge-tunai', 'QRIS': 'badge-qris', 'Transfer Bank': 'badge-transfer', 'E-Wallet': 'badge-ewallet' };
  const badge = methodBadge[trx.metode] || 'badge-tunai';
  const content = `
    <div style="padding:16px">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:13px;color:var(--primary);font-weight:700">${trx.invoice}</div>
        <div style="font-size:12px;color:var(--text-muted)">${trx.tanggal} ${trx.waktu} • ${trx.kasir || ''}</div>
      </div>
      <div style="border-top:1px dashed var(--border);padding-top:12px">
        ${trx.items.map(i => `<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0"><span>${i.nama} x${i.qty}</span><span>${formatRp(i.harga * i.qty)}</span></div>`).join('')}
      </div>
      <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px">
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;padding:4px 0"><span>Total</span><span>${formatRp(trx.total)}</span></div>
        ${trx.metode === 'Tunai' ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);padding:4px 0"><span>Bayar</span><span>${formatRp(trx.nominal)}</span></div><div style="display:flex;justify-content:space-between;font-size:13px;color:var(--primary);font-weight:700;padding:4px 0"><span>Kembalian</span><span>${formatRp(trx.kembalian)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0"><span>Metode</span><span class="trx-method-badge ${badge}">${trx.metode}</span></div>
        ${trx.catatan ? `<div style="font-size:12px;color:var(--text-muted);margin-top:8px">Catatan: ${trx.catatan}</div>` : ''}
      </div>
    </div>
  `;
  showBottomSheet('Detail Transaksi', content);
}

// ===== BOTTOM SHEET HELPER =====
function showBottomSheet(title, content) {
  let overlay = document.getElementById('dynamic-sheet');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'dynamic-sheet';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <h3 id="dynamic-sheet-title"></h3>
          <button class="icon-btn" onclick="document.getElementById('dynamic-sheet').classList.add('hidden')">✕</button>
        </div>
        <div id="dynamic-sheet-body" style="overflow-y:auto;max-height:60vh;"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
  }
  document.getElementById('dynamic-sheet-title').textContent = title;
  document.getElementById('dynamic-sheet-body').innerHTML = content;
  overlay.classList.remove('hidden');
}

// ===== TOAST =====
let _toastTimer;
function showToast(msg, type = '') {
  clearTimeout(_toastTimer);
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  _toastTimer = setTimeout(() => t.classList.add('hidden'), 2800);
}

// ===== HELPERS =====
function formatRp(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID');
}
function formatDate(str) {
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
