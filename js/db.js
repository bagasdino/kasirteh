// ============================================================
// DB.JS — Data Layer (LocalStorage + Google Apps Script Sync)
// ============================================================

const DB = {
  _gasUrl: null,
  _isDemo: true,

  init() {
    this._gasUrl = localStorage.getItem(CONFIG.GAS_URL_KEY) || null;
    this._isDemo = !this._gasUrl || localStorage.getItem(CONFIG.DEMO_MODE_KEY) === 'true';
    if (this._isDemo && !this.getLocal('menu')) this._seedDemo();
    return this;
  },

  _seedDemo() {
    this.setLocal('menu', DEMO_MENU);
    this.setLocal('stok', DEMO_STOK);
    this.setLocal('transaksi', generateDemoTransaksi());
    this.setLocal('mutasi', []);
    this.setLocal('settings', DEFAULT_SETTINGS);
  },

  getLocal(key) {
    try {
      const v = localStorage.getItem(`${CONFIG.STORAGE_KEY}_${key}`);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },

  setLocal(key, val) {
    try { localStorage.setItem(`${CONFIG.STORAGE_KEY}_${key}`, JSON.stringify(val)); } catch {}
  },

  // ===== MENU =====
  async getMenu() {
    if (this._isDemo) return this.getLocal('menu') || [];
    return this._gasCall('getMenu');
  },

  async saveMenu(menu) {
    if (this._isDemo) {
      const list = this.getLocal('menu') || [];
      if (menu.id) {
        const idx = list.findIndex(m => m.id === menu.id);
        if (idx > -1) list[idx] = menu; else list.push(menu);
      } else {
        menu.id = 'm' + Date.now();
        list.push(menu);
      }
      this.setLocal('menu', list);
      return menu;
    }
    return this._gasCall('saveMenu', menu);
  },

  async deleteMenu(id) {
    if (this._isDemo) {
      const list = (this.getLocal('menu') || []).filter(m => m.id !== id);
      this.setLocal('menu', list);
      return true;
    }
    return this._gasCall('deleteMenu', { id });
  },

  // ===== STOK =====
  async getStok() {
    if (this._isDemo) return this.getLocal('stok') || [];
    return this._gasCall('getStok');
  },

  async saveStok(stok) {
    if (this._isDemo) {
      const list = this.getLocal('stok') || [];
      if (stok.id) {
        const idx = list.findIndex(s => s.id === stok.id);
        if (idx > -1) list[idx] = stok; else list.push(stok);
      } else {
        stok.id = 's' + Date.now();
        list.push(stok);
      }
      this.setLocal('stok', list);
      return stok;
    }
    return this._gasCall('saveStok', stok);
  },

  async updateStokQty(id, delta, keterangan = '') {
    if (this._isDemo) {
      const list = this.getLocal('stok') || [];
      const idx = list.findIndex(s => s.id === id);
      if (idx > -1) {
        const before = list[idx].jumlah;
        list[idx].jumlah = Math.max(0, before + delta);
        this.setLocal('stok', list);
        this._addMutasi({ stokId: id, nama: list[idx].nama, before, after: list[idx].jumlah, delta, keterangan, waktu: new Date().toISOString() });
      }
      return list;
    }
    return this._gasCall('updateStok', { id, delta, keterangan });
  },

  _addMutasi(entry) {
    const list = this.getLocal('mutasi') || [];
    list.unshift(entry);
    if (list.length > 200) list.pop();
    this.setLocal('mutasi', list);
  },

  async getMutasi() {
    if (this._isDemo) return this.getLocal('mutasi') || [];
    return this._gasCall('getMutasi');
  },

  // ===== TRANSAKSI =====
  async getTransaksi(tanggal) {
    if (this._isDemo) {
      const all = this.getLocal('transaksi') || [];
      if (tanggal) return all.filter(t => t.tanggal === tanggal);
      return all;
    }
    return this._gasCall('getTransaksi', { tanggal });
  },

  async saveTransaksi(trx) {
    if (this._isDemo) {
      const list = this.getLocal('transaksi') || [];
      trx.id = 'trx' + Date.now();
      const today = new Date().toISOString().split('T')[0];
      const todayTrx = list.filter(t => t.tanggal === today);
      const invNum = String(todayTrx.length + 1).padStart(3, '0');
      const datePart = today.replace(/-/g, '').slice(2);
      trx.invoice = `#INV-${datePart}-${invNum}`;
      trx.tanggal = today;
      trx.waktu = new Date().toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' });
      list.unshift(trx);
      this.setLocal('transaksi', list);
      // Update stok
      const menu = this.getLocal('menu') || [];
      for (const item of trx.items) {
        const m = menu.find(x => x.id === item.menuId);
        if (m && m.bahan) {
          for (const b of m.bahan) {
            await this.updateStokQty(b.id, -b.qty * item.qty, `Transaksi ${trx.invoice} - ${item.nama}`);
          }
        }
      }
      return trx;
    }
    return this._gasCall('simpanTransaksi', trx);
  },

  // ===== DASHBOARD =====
  async getDashboard(period = 'hari') {
    if (this._isDemo) {
      const all = this.getLocal('transaksi') || [];
      const today = new Date().toISOString().split('T')[0];
      let filtered = [], prev = [];
      if (period === 'hari') {
        filtered = all.filter(t => t.tanggal === today);
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        prev = all.filter(t => t.tanggal === yStr);
      } else if (period === 'minggu') {
        const w = new Date(); w.setDate(w.getDate() - 7);
        const wStr = w.toISOString().split('T')[0];
        filtered = all.filter(t => t.tanggal >= wStr);
        const pw = new Date(); pw.setDate(pw.getDate() - 14);
        const pwStr = pw.toISOString().split('T')[0];
        prev = all.filter(t => t.tanggal >= pwStr && t.tanggal < wStr);
      } else {
        const m = new Date(); m.setDate(1);
        const mStr = m.toISOString().split('T')[0];
        filtered = all.filter(t => t.tanggal >= mStr);
        const pm = new Date(); pm.setMonth(pm.getMonth() - 1); pm.setDate(1);
        const pmStr = pm.toISOString().split('T')[0];
        const pmEnd = new Date(); pmEnd.setDate(1); pmEnd.setDate(pmEnd.getDate() - 1);
        const pmEndStr = pmEnd.toISOString().split('T')[0];
        prev = all.filter(t => t.tanggal >= pmStr && t.tanggal <= pmEndStr);
      }
      const omzet = filtered.reduce((s, t) => s + t.total, 0);
      const prevOmzet = prev.reduce((s, t) => s + t.total, 0);
      const produk = filtered.reduce((s, t) => s + t.items.reduce((a, i) => a + i.qty, 0), 0);
      const prevProduk = prev.reduce((s, t) => s + t.items.reduce((a, i) => a + i.qty, 0), 0);
      const growth = (curr, prev) => prev === 0 ? 100 : Math.round((curr - prev) / prev * 100);

      // Chart data (last 7 days)
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const dayTrx = all.filter(t => t.tanggal === ds);
        chartData.push({ label: d.toLocaleDateString('id', { weekday: 'short' }), omzet: dayTrx.reduce((s, t) => s + t.total, 0), transaksi: dayTrx.length });
      }

      // Top products
      const prodCount = {};
      filtered.forEach(t => t.items.forEach(i => { prodCount[i.nama] = (prodCount[i.nama] || 0) + i.qty; }));
      const topProducts = Object.entries(prodCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nama, qty]) => ({ nama, qty }));

      // Low stock
      const stok = this.getLocal('stok') || [];
      const settings = this.getLocal('settings') || DEFAULT_SETTINGS;
      const lowStock = stok.filter(s => s.jumlah <= s.minimal).map(s => ({ nama: s.nama, jumlah: s.jumlah, satuan: s.satuan, minimal: s.minimal }));

      return { omzet, trx: filtered.length, produk, nota: filtered.length, prevOmzet, prevTrx: prev.length, prevProduk, growthOmzet: growth(omzet, prevOmzet), growthTrx: growth(filtered.length, prev.length), growthProduk: growth(produk, prevProduk), chartData, topProducts, lowStock };
    }
    return this._gasCall('getDashboard', { period });
  },

  // ===== SETTINGS =====
  getSettings() {
    return { ...(this.getLocal('settings') || DEFAULT_SETTINGS) };
  },
  saveSettings(settings) {
    const s = { ...this.getSettings(), ...settings };
    this.setLocal('settings', s);
    return s;
  },

  // ===== SETUP =====
  setGasUrl(url) {
    this._gasUrl = url;
    this._isDemo = false;
    localStorage.setItem(CONFIG.GAS_URL_KEY, url);
    localStorage.removeItem(CONFIG.DEMO_MODE_KEY);
  },
  enableDemo() {
    this._isDemo = true;
    localStorage.setItem(CONFIG.DEMO_MODE_KEY, 'true');
    if (!this.getLocal('menu')) this._seedDemo();
  },
  isDemo() { return this._isDemo; },

  // ===== GAS API CALL =====
  async _gasCall(action, data = {}) {
    if (!this._gasUrl) throw new Error('GAS URL not set');
    try {
      const params = new URLSearchParams({ action, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : v])) });
      const res = await fetch(`${this._gasUrl}?${params.toString()}`);
      const json = await res.json();
      if (json.status === 'error') throw new Error(json.message);
      return json.data;
    } catch (e) {
      console.error('GAS Error:', e);
      throw e;
    }
  }
};
