// ============================================================
// DASHBOARD.JS — Dashboard & Charts (pure canvas, no library)
// ============================================================

let dashPeriod = 'hari';
let chartData = [];
let chartType = 'omzet';

async function loadDashboard() {
  try {
    const data = await DB.getDashboard(dashPeriod);
    renderDashStats(data);
    chartData = data.chartData || [];
    drawChart();
    renderTopProducts(data.topProducts || []);
    renderLowStock(data.lowStock || []);
    loadAIInsight();
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('dash-date').textContent = today;
  } catch (e) {
    showToast('Gagal memuat dashboard', 'error');
  }
}

function renderDashStats(data) {
  document.getElementById('dash-omzet').textContent = formatRp(data.omzet || 0);
  document.getElementById('dash-trx').textContent = data.trx || 0;
  document.getElementById('dash-produk').textContent = data.produk || 0;
  document.getElementById('dash-nota').textContent = data.nota || 0;

  const fmtGrowth = (val) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val}%`;
  };
  document.getElementById('dash-omzet-growth').textContent = fmtGrowth(data.growthOmzet || 0);
  document.getElementById('dash-trx-growth').textContent = fmtGrowth(data.growthTrx || 0);
  document.getElementById('dash-produk-growth').textContent = fmtGrowth(data.growthProduk || 0);
  document.getElementById('dash-nota-growth').textContent = fmtGrowth(data.growthTrx || 0);

  // Color growth text
  ['dash-omzet-growth','dash-trx-growth','dash-produk-growth','dash-nota-growth'].forEach((id, i) => {
    const vals = [data.growthOmzet, data.growthTrx, data.growthProduk, data.growthTrx];
    const el = document.getElementById(id);
    el.style.color = vals[i] >= 0 ? 'var(--green-400)' : 'var(--danger)';
  });
}

function switchPeriod(period, btn) {
  dashPeriod = period;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadDashboard();
}

function updateChart() {
  chartType = document.getElementById('chart-type').value;
  drawChart();
}

function drawChart() {
  const canvas = document.getElementById('sales-chart');
  if (!canvas || !chartData.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr || 600;
  canvas.height = 180 * dpr;
  ctx.scale(dpr, dpr);
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;

  ctx.clearRect(0, 0, W, H);

  const vals = chartData.map(d => chartType === 'omzet' ? d.omzet : d.transaksi);
  const maxVal = Math.max(...vals, 1);
  const labels = chartData.map(d => d.label);
  const n = vals.length;

  const padL = 50, padR = 16, padT = 16, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Get theme colors
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const lineColor = '#16a34a';
  const gridColor = isDark ? '#334155' : '#e8ecf0';
  const textColor = isDark ? '#94a3b8' : '#9ca3af';
  const fillStart = isDark ? 'rgba(22,163,74,0.25)' : 'rgba(22,163,74,0.15)';
  const fillEnd = 'rgba(22,163,74,0)';

  // Grid lines
  const steps = 4;
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= steps; i++) {
    const y = padT + chartH - (i / steps) * chartH;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    const label = chartType === 'omzet' ? formatRpShort((maxVal * i / steps)) : Math.round(maxVal * i / steps);
    ctx.fillText(label, padL - 6, y + 3);
  }

  // X labels
  ctx.fillStyle = textColor;
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((label, i) => {
    const x = padL + (i / (n - 1)) * chartW;
    ctx.fillText(label, x, H - 8);
  });

  if (vals.every(v => v === 0)) return;

  // Points
  const pts = vals.map((v, i) => ({ x: padL + (i / (n - 1)) * chartW, y: padT + chartH - (v / maxVal) * chartH }));

  // Gradient fill
  const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  grad.addColorStop(0, fillStart); grad.addColorStop(1, fillEnd);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, padT + chartH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, padT + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // Dots
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
    ctx.strokeStyle = isDark ? '#1e293b' : '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function formatRpShort(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'Jt';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n;
}

function renderTopProducts(products) {
  const el = document.getElementById('top-products');
  if (!products.length) { el.innerHTML = `<div style="color:var(--text-muted);font-size:13px">Belum ada data penjualan</div>`; return; }
  const rankClass = ['top-rank-1','top-rank-2','top-rank-3'];
  el.innerHTML = products.map((p, i) => `
    <div class="top-product-item">
      <div class="top-rank ${rankClass[i] || ''}">${i + 1}</div>
      <div class="top-product-name">${p.nama}</div>
      <div class="top-product-count">${p.qty} pcs</div>
    </div>`).join('');
}

function renderLowStock(list) {
  const section = document.getElementById('low-stock-section');
  const el = document.getElementById('low-stock-list');
  if (!list.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  el.innerHTML = list.map(s => `
    <div class="low-item">
      <span style="width:10px;height:10px;border-radius:50%;background:${s.jumlah === 0 ? 'var(--danger)' : 'var(--warning)'};flex-shrink:0;display:inline-block"></span>
      <span class="low-item-name">${s.nama}</span>
      <span class="low-item-qty">${s.jumlah} ${s.satuan}</span>
    </div>`).join('');
}

// Redraw chart on resize
window.addEventListener('resize', () => { if (currentPage === 'dashboard') drawChart(); });
