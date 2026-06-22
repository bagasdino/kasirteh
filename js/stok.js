// ============================================================
// STOK.JS — Stock Management
// ============================================================

let activeStokTab = 'bahan';

async function loadStok() {
  try {
    allStok = await DB.getStok();
    renderStokBahan();
    renderStokKemasan();
    loadMutasi();
  } catch (e) {
    showToast('Gagal memuat stok', 'error');
  }
}

function renderStokBahan() {
  const list = (allStok || []).filter(s => s.tipe === 'bahan');
  renderStokList('stok-bahan-list', list);
}

function renderStokKemasan() {
  const list = (allStok || []).filter(s => s.tipe === 'kemasan');
  renderStokList('stok-kemasan-list', list);
}

function renderStokList(containerId, list) {
  const container = document.getElementById(containerId);
  if (!list || list.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Belum ada data. Klik + untuk menambah.</p></div>`;
    return;
  }
  container.innerHTML = list.map(s => {
    const pct = s.minimal > 0 ? s.jumlah / s.minimal : 1;
    const dotClass = pct <= 0 ? 'dot-red' : pct <= 1 ? 'dot-orange' : 'dot-green';
    return `
    <div class="stok-card">
      <div class="stok-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
      </div>
      <div class="stok-info">
        <div class="stok-name">${s.nama}</div>
        <div class="stok-jumlah">${s.jumlah} ${s.satuan} <span style="color:var(--text-muted);font-size:11px">• Min: ${s.minimal} ${s.satuan}</span></div>
      </div>
      <div class="stok-status">
        <div class="stok-dot ${dotClass}" title="${dotClass === 'dot-green' ? 'Aman' : dotClass === 'dot-orange' ? 'Menipis' : 'Kritis'}"></div>
        <div class="stok-action-btns">
          <button class="btn-stok-action" onclick="adjustStok('${s.id}', 'tambah')">+</button>
          <button class="btn-stok-action" onclick="adjustStok('${s.id}', 'kurang')">−</button>
          <button class="btn-stok-action" onclick="openEditStok('${s.id}')">✏️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function switchStokTab(tab, btn) {
  activeStokTab = tab;
  document.querySelectorAll('.stok-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.stok-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`stok-${tab}`).classList.remove('hidden');
  if (tab === 'mutasi') loadMutasi();
}

async function loadMutasi() {
  const container = document.getElementById('mutasi-list');
  try {
    const list = await DB.getMutasi();
    if (!list || list.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>Belum ada histori perubahan stok</p></div>`;
      return;
    }
    container.innerHTML = list.slice(0, 50).map(m => {
      const isPlus = m.delta > 0;
      return `
      <div class="stok-card" style="padding:10px 14px">
        <div class="stok-info">
          <div class="stok-name" style="font-size:13px">${m.nama}</div>
          <div class="stok-jumlah">${m.keterangan || 'Update manual'}</div>
          <div style="font-size:11px;color:var(--text-muted)">${new Date(m.waktu).toLocaleString('id-ID')}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:15px;font-weight:700;color:${isPlus ? 'var(--green-600)' : 'var(--danger)'}">${isPlus ? '+' : ''}${m.delta}</div>
          <div style="font-size:11px;color:var(--text-muted)">${m.before} → ${m.after}</div>
        </div>
      </div>`;
    }).join('');
  } catch {
    container.innerHTML = `<div class="empty-state"><p>Gagal memuat histori</p></div>`;
  }
}

function adjustStok(id, mode) {
  const stok = allStok.find(s => s.id === id);
  if (!stok) return;
  const val = prompt(`${mode === 'tambah' ? 'Tambah' : 'Kurangi'} stok "${stok.nama}"\nStok saat ini: ${stok.jumlah} ${stok.satuan}\n\nMasukkan jumlah:`, '');
  if (val === null || val === '') return;
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) { showToast('Jumlah tidak valid', 'error'); return; }
  const delta = mode === 'tambah' ? num : -num;
  DB.updateStokQty(id, delta, `Update manual (${mode})`).then(async () => {
    allStok = await DB.getStok();
    renderStokBahan();
    renderStokKemasan();
    showToast(`Stok ${stok.nama} ${mode === 'tambah' ? 'ditambah' : 'dikurangi'} ${num} ${stok.satuan} ✓`, 'success');
  });
}

function openAddStok(tipe) {
  document.getElementById('stok-modal-title').textContent = 'Tambah Bahan';
  document.getElementById('stok-id').value = '';
  document.getElementById('stok-nama').value = '';
  document.getElementById('stok-tipe').value = tipe;
  document.getElementById('stok-jumlah').value = '';
  document.getElementById('stok-satuan').value = tipe === 'kemasan' ? 'pcs' : 'gr';
  document.getElementById('stok-minimal').value = tipe === 'kemasan' ? '30' : '100';
  document.getElementById('modal-stok').classList.remove('hidden');
}

function openEditStok(id) {
  const stok = allStok.find(s => s.id === id);
  if (!stok) return;
  document.getElementById('stok-modal-title').textContent = 'Edit Bahan';
  document.getElementById('stok-id').value = stok.id;
  document.getElementById('stok-nama').value = stok.nama;
  document.getElementById('stok-tipe').value = stok.tipe;
  document.getElementById('stok-jumlah').value = stok.jumlah;
  document.getElementById('stok-satuan').value = stok.satuan;
  document.getElementById('stok-minimal').value = stok.minimal;
  document.getElementById('modal-stok').classList.remove('hidden');
}

async function saveStok() {
  const id = document.getElementById('stok-id').value;
  const nama = document.getElementById('stok-nama').value.trim();
  if (!nama) { showToast('Nama bahan wajib diisi', 'error'); return; }
  const stok = {
    nama,
    tipe: document.getElementById('stok-tipe').value,
    jumlah: parseFloat(document.getElementById('stok-jumlah').value) || 0,
    satuan: document.getElementById('stok-satuan').value,
    minimal: parseFloat(document.getElementById('stok-minimal').value) || 0,
  };
  if (id) stok.id = id;
  try {
    await DB.saveStok(stok);
    closeStokModal();
    allStok = await DB.getStok();
    renderStokBahan();
    renderStokKemasan();
    showToast(`Bahan ${id ? 'diperbarui' : 'ditambahkan'} ✓`, 'success');
  } catch { showToast('Gagal menyimpan', 'error'); }
}

function closeStokModal() { document.getElementById('modal-stok').classList.add('hidden'); }
