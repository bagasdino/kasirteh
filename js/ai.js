// ============================================================
// AI.JS — AI Insight via Anthropic API (Claude)
// ============================================================

async function loadAIInsight() {
  const el = document.getElementById('ai-insight');
  if (!el) return;
  el.innerHTML = `<div class="loading-state" style="padding:16px 0"><div class="spinner"></div><p>Menganalisis data penjualan...</p></div>`;

  try {
    const [transaksiAll, stok, menu] = await Promise.all([
      DB.getTransaksi(),
      DB.getStok(),
      DB.getMenu(),
    ]);

    // Summarize data for AI
    const today = new Date().toISOString().split('T')[0];
    const last7 = new Date(); last7.setDate(last7.getDate() - 7);
    const last7Str = last7.toISOString().split('T')[0];

    const trx7 = transaksiAll.filter(t => t.tanggal >= last7Str);
    const omzet7 = trx7.reduce((s, t) => s + t.total, 0);
    const trxCount7 = trx7.length;

    const prodCount = {};
    trx7.forEach(t => t.items.forEach(i => { prodCount[i.nama] = (prodCount[i.nama] || 0) + i.qty; }));
    const topProds = Object.entries(prodCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, q]) => `${n}: ${q} pcs`).join(', ');

    const lowStok = stok.filter(s => s.jumlah <= s.minimal).map(s => `${s.nama} (${s.jumlah}/${s.minimal} ${s.satuan})`).join(', ');

    // Daily average
    const dayCount = {};
    trx7.forEach(t => { dayCount[t.tanggal] = (dayCount[t.tanggal] || 0) + t.total; });
    const avgOmzet = Object.values(dayCount).length > 0 ? Math.round(Object.values(dayCount).reduce((a, b) => a + b, 0) / Object.values(dayCount).length) : 0;

    const prompt = `Kamu adalah asisten AI untuk aplikasi kasir Es Teh UMKM. Berikan analisis bisnis singkat dan praktis dalam Bahasa Indonesia.

DATA PENJUALAN 7 HARI TERAKHIR:
- Total transaksi: ${trxCount7}
- Total omzet: Rp${omzet7.toLocaleString('id-ID')}
- Rata-rata omzet/hari: Rp${avgOmzet.toLocaleString('id-ID')}
- Produk terlaris: ${topProds || 'Belum ada data'}
- Stok menipis/habis: ${lowStok || 'Semua stok aman'}
- Jumlah menu aktif: ${menu.filter(m => m.aktif).length}

Berikan analisis dalam format berikut (singkat, tidak lebih dari 150 kata):
1. 📊 Ringkasan performa (1-2 kalimat)
2. 🏆 Insight produk terlaris (1 kalimat)
3. ⚠️ Peringatan stok + rekomendasi restock (jika ada)
4. 📈 Prediksi omzet 7 hari ke depan berdasarkan rata-rata
5. 💡 1 saran praktis untuk meningkatkan penjualan`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('') || '';

    el.innerHTML = `<div style="white-space:pre-wrap;font-size:14px;line-height:1.8;color:var(--text-primary)">${escapeHtml(text)}</div>`;
  } catch (e) {
    // Fallback: local analysis
    el.innerHTML = generateLocalInsight();
  }
}

function generateLocalInsight() {
  const transaksi = DB.getLocal('transaksi') || [];
  const stok = DB.getLocal('stok') || [];
  const today = new Date().toISOString().split('T')[0];
  const last7 = new Date(); last7.setDate(last7.getDate() - 7);
  const trx7 = transaksi.filter(t => t.tanggal >= last7.toISOString().split('T')[0]);
  const omzet7 = trx7.reduce((s, t) => s + t.total, 0);
  const avgOmzet = trx7.length > 0 ? Math.round(omzet7 / 7) : 0;
  const prodCount = {};
  trx7.forEach(t => t.items.forEach(i => { prodCount[i.nama] = (prodCount[i.nama] || 0) + i.qty; }));
  const topProd = Object.entries(prodCount).sort((a, b) => b[1] - a[1])[0];
  const lowStok = stok.filter(s => s.jumlah <= s.minimal);
  const prediksi = avgOmzet * 7;

  let insight = `📊 <b>Ringkasan Performa</b>\nDalam 7 hari terakhir, toko berhasil meraih ${trx7.length} transaksi dengan total omzet ${formatRp(omzet7)}.

🏆 <b>Produk Terlaris</b>\n${topProd ? `"${topProd[0]}" menjadi menu favoritas pelanggan dengan ${topProd[1]} cup terjual.` : 'Belum ada data produk terlaris.'}

${lowStok.length > 0 ? `⚠️ <b>Peringatan Stok</b>\n${lowStok.map(s => `${s.nama} tinggal ${s.jumlah} ${s.satuan} (min: ${s.minimal})`).join('\n')} — segera restock!` : '✅ <b>Stok Aman</b>\nSemua bahan baku dalam kondisi aman.'}

📈 <b>Prediksi 7 Hari ke Depan</b>\nBerdasarkan rata-rata harian ${formatRp(avgOmzet)}, potensi omzet minggu depan sekitar ${formatRp(prediksi)}.

💡 <b>Saran</b>\nCoba tambahkan promo bundle atau paket hemat untuk meningkatkan nilai transaksi per pelanggan.`;

  return `<div style="white-space:pre-wrap;font-size:14px;line-height:1.8;color:var(--text-primary)">${insight}</div>`;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
