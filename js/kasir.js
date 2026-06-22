// ============================================================
// KASIR.JS — Menu Display & Cart for Kasir Page
// ============================================================

let activeCategory = 'semua';
let searchQuery = '';

async function loadMenuKasir() {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Memuat menu...</p></div>`;
  try {
    allMenu = await DB.getMenu();
    renderMenuGrid();
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><p>Gagal memuat menu.<br><button class="btn-outline small" onclick="loadMenuKasir()">Coba Lagi</button></p></div>`;
  }
}

function renderMenuGrid() {
  const grid = document.getElementById('menu-grid');
  let list = allMenu.filter(m => m.aktif);
  if (activeCategory !== 'semua') list = list.filter(m => m.kategori === activeCategory);
  if (searchQuery) list = list.filter(m => m.nama.toLowerCase().includes(searchQuery.toLowerCase()));

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><p>Menu tidak ditemukan</p></div>`;
    return;
  }

  const settings = DB.getSettings();
  grid.innerHTML = list.map(menu => `
    <div class="menu-card" onclick="addToCart('${menu.id}')">
      ${settings.showFoto !== false && menu.foto
        ? `<img class="menu-card-img" src="${menu.foto}" alt="${menu.nama}" onerror="this.outerHTML=placeholderImg()" loading="lazy" />`
        : menuPlaceholder(menu.nama)
      }
      <div class="menu-card-body">
        <div class="menu-card-name">${menu.nama}</div>
        <div class="menu-card-price">${formatRp(menu.harga)}</div>
      </div>
      <button class="menu-card-add" onclick="event.stopPropagation();addToCart('${menu.id}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
  `).join('');
}

function menuPlaceholder(nama) {
  const colors = ['#dcfce7', '#d1fae5', '#bbf7d0', '#a7f3d0'];
  const color = colors[nama.length % colors.length];
  return `<div class="menu-card-placeholder" style="background:${color}">
    <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
      <path d="M32 12C32 12 20 16 20 28C20 36 26 42 32 44C38 42 44 36 44 28C44 16 32 12Z" fill="#16a34a" opacity="0.4"/>
      <path d="M32 44V52M26 52H38" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
    </svg>
  </div>`;
}

function placeholderImg() {
  return `<div class="menu-card-placeholder"><svg width="48" height="48" viewBox="0 0 64 64" fill="none"><path d="M32 12C32 12 20 16 20 28C20 36 26 42 32 44C38 42 44 36 44 28C44 16 32 12Z" fill="#16a34a" opacity="0.4"/></svg></div>`;
}

function filterCategory(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMenuGrid();
}

function filterMenu(q) {
  searchQuery = q;
  renderMenuGrid();
}

// ===== MENU MANAGEMENT =====
async function loadMenuMgmt() {
  const list = document.getElementById('menu-mgmt-list');
  list.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Memuat...</p></div>`;
  try {
    allMenu = await DB.getMenu();
    if (allMenu.length === 0) {
      list.innerHTML = `<div class="empty-state"><p>Belum ada menu. Tambahkan menu pertama!</p></div>`;
      return;
    }
    list.innerHTML = allMenu.map(m => `
      <div class="menu-mgmt-card ${m.aktif ? '' : 'menu-inactive'}">
        ${m.foto
          ? `<img class="menu-mgmt-img" src="${m.foto}" alt="${m.nama}" onerror="this.style.display='none'" />`
          : `<div class="menu-mgmt-img" style="background:var(--green-50);display:flex;align-items:center;justify-content:center;font-size:24px;">🫖</div>`
        }
        <div class="menu-mgmt-info">
          <div class="menu-mgmt-name">${m.nama}</div>
          <div class="menu-mgmt-cat">${m.kategori === 'teh-original' ? 'Teh Original' : 'Rasa-Rasa'}</div>
          <div class="menu-mgmt-price">${formatRp(m.harga)}</div>
        </div>
        <div class="menu-mgmt-actions">
          <button class="btn-edit" onclick="openEditMenu('${m.id}')">Edit</button>
          <button class="btn-del" onclick="deleteMenu('${m.id}')">Hapus</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><p>Gagal memuat menu</p></div>`;
  }
}

async function openAddMenu() {
  document.getElementById('menu-modal-title').textContent = 'Tambah Menu';
  document.getElementById('menu-id').value = '';
  document.getElementById('menu-nama').value = '';
  document.getElementById('menu-kategori').value = 'teh-original';
  document.getElementById('menu-harga').value = '';
  document.getElementById('menu-foto').value = '';
  document.getElementById('foto-preview').innerHTML = '';
  document.getElementById('menu-aktif').checked = true;
  await loadBahanOptions();
  document.getElementById('bahan-mapping').innerHTML = `
    <div class="bahan-row">
      <select class="bahan-select"><option value="">-- Pilih Bahan --</option>${getBahanOptions()}</select>
      <input type="number" class="bahan-qty" placeholder="Qty" min="0" step="0.1" />
      <button class="btn-icon-danger" onclick="removeBahan(this)">✕</button>
    </div>`;
  document.getElementById('modal-menu').classList.remove('hidden');
}

async function openEditMenu(id) {
  const menu = allMenu.find(m => m.id === id);
  if (!menu) return;
  document.getElementById('menu-modal-title').textContent = 'Edit Menu';
  document.getElementById('menu-id').value = menu.id;
  document.getElementById('menu-nama').value = menu.nama;
  document.getElementById('menu-kategori').value = menu.kategori;
  document.getElementById('menu-harga').value = menu.harga;
  document.getElementById('menu-foto').value = menu.foto || '';
  document.getElementById('menu-aktif').checked = menu.aktif !== false;
  if (menu.foto) document.getElementById('foto-preview').innerHTML = `<img src="${menu.foto}" onerror="this.style.display='none'" />`;
  else document.getElementById('foto-preview').innerHTML = '';

  await loadBahanOptions();
  const bahan = menu.bahan || [];
  if (bahan.length === 0) {
    document.getElementById('bahan-mapping').innerHTML = `<div class="bahan-row"><select class="bahan-select"><option value="">-- Pilih Bahan --</option>${getBahanOptions()}</select><input type="number" class="bahan-qty" placeholder="Qty" min="0" step="0.1" /><button class="btn-icon-danger" onclick="removeBahan(this)">✕</button></div>`;
  } else {
    document.getElementById('bahan-mapping').innerHTML = bahan.map(b => `
      <div class="bahan-row">
        <select class="bahan-select"><option value="">-- Pilih Bahan --</option>${getBahanOptions(b.id)}</select>
        <input type="number" class="bahan-qty" placeholder="Qty" min="0" step="0.1" value="${b.qty}" />
        <button class="btn-icon-danger" onclick="removeBahan(this)">✕</button>
      </div>`).join('');
  }
  document.getElementById('modal-menu').classList.remove('hidden');
}

async function loadBahanOptions() {
  if (!allStok || allStok.length === 0) allStok = await DB.getStok();
}

function getBahanOptions(selectedId = '') {
  return (allStok || []).map(s => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${s.nama} (${s.satuan})</option>`).join('');
}

function addBahanRow() {
  const container = document.getElementById('bahan-mapping');
  const row = document.createElement('div');
  row.className = 'bahan-row';
  row.innerHTML = `<select class="bahan-select"><option value="">-- Pilih Bahan --</option>${getBahanOptions()}</select><input type="number" class="bahan-qty" placeholder="Qty" min="0" step="0.1" /><button class="btn-icon-danger" onclick="removeBahan(this)">✕</button>`;
  container.appendChild(row);
}

function removeBahan(btn) {
  const rows = document.querySelectorAll('#bahan-mapping .bahan-row');
  if (rows.length <= 1) { btn.closest('.bahan-row').querySelector('.bahan-select').value = ''; btn.closest('.bahan-row').querySelector('.bahan-qty').value = ''; return; }
  btn.closest('.bahan-row').remove();
}

async function saveMenu() {
  const id = document.getElementById('menu-id').value;
  const nama = document.getElementById('menu-nama').value.trim();
  const harga = parseInt(document.getElementById('menu-harga').value);
  if (!nama) { showToast('Nama menu wajib diisi', 'error'); return; }
  if (!harga || harga < 0) { showToast('Harga tidak valid', 'error'); return; }

  const bahan = [];
  document.querySelectorAll('#bahan-mapping .bahan-row').forEach(row => {
    const sel = row.querySelector('.bahan-select').value;
    const qty = parseFloat(row.querySelector('.bahan-qty').value);
    if (sel && qty > 0) bahan.push({ id: sel, qty });
  });

  const menu = { nama, kategori: document.getElementById('menu-kategori').value, harga, foto: document.getElementById('menu-foto').value.trim(), aktif: document.getElementById('menu-aktif').checked, bahan };
  if (id) menu.id = id;

  try {
    await DB.saveMenu(menu);
    closeMenuModal();
    await loadMenuMgmt();
    showToast(`Menu ${id ? 'diperbarui' : 'ditambahkan'} ✓`, 'success');
  } catch (e) {
    showToast('Gagal menyimpan menu', 'error');
  }
}

async function deleteMenu(id) {
  const menu = allMenu.find(m => m.id === id);
  if (!confirm(`Hapus menu "${menu?.nama}"?`)) return;
  try {
    await DB.deleteMenu(id);
    await loadMenuMgmt();
    showToast('Menu dihapus', 'success');
  } catch { showToast('Gagal menghapus', 'error'); }
}

function closeMenuModal() { document.getElementById('modal-menu').classList.add('hidden'); }

// Preview foto URL
document.addEventListener('DOMContentLoaded', () => {
  const fotoInput = document.getElementById('menu-foto');
  if (fotoInput) {
    fotoInput.addEventListener('input', function() {
      const prev = document.getElementById('foto-preview');
      if (this.value) prev.innerHTML = `<img src="${this.value}" onerror="this.style.display='none'" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1.5px solid var(--border)" />`;
      else prev.innerHTML = '';
    });
  }
});

// ===== TRANSAKSI PAGE =====
async function loadTransaksi() {
  const dateInput = document.getElementById('trx-date');
  if (!dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
  const tanggal = dateInput.value;

  try {
    const list = await DB.getTransaksi(tanggal);
    const omzet = list.reduce((s, t) => s + t.total, 0);
    document.getElementById('trx-total-count').textContent = list.length;
    document.getElementById('trx-total-omzet').textContent = formatRp(omzet);

    const container = document.getElementById('transaksi-list');
    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>Tidak ada transaksi pada tanggal ini</p></div>`;
      return;
    }
    const methodBadge = { 'Tunai': 'badge-tunai', 'QRIS': 'badge-qris', 'Transfer Bank': 'badge-transfer', 'E-Wallet': 'badge-ewallet' };
    container.innerHTML = list.map(t => `
      <div class="trx-card" onclick='viewTransaksiDetail(${JSON.stringify(t)})'>
        <div class="trx-card-header">
          <span class="trx-invoice">${t.invoice}</span>
          <span class="trx-time">${t.waktu}</span>
        </div>
        <div class="trx-items-preview">${t.items.map(i => `${i.nama} x${i.qty}`).join(', ')}</div>
        <div class="trx-card-footer">
          <span class="trx-amount">${formatRp(t.total)}</span>
          <span class="trx-method-badge ${methodBadge[t.metode] || 'badge-tunai'}">${t.metode}</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('transaksi-list').innerHTML = `<div class="empty-state"><p>Gagal memuat data</p></div>`;
  }
}
