// ============================================================
// SW.JS — Service Worker (PWA Offline Support)
// ============================================================

const CACHE_NAME = 'esteh-pos-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/db.js',
  './js/app.js',
  './js/kasir.js',
  './js/stok.js',
  './js/dashboard.js',
  './js/ai.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@600;700;800&display=swap',
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http') || url.includes('fonts.googleapis'))))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network first for API, cache first for static
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // API calls (Google Apps Script) - network only
  if (url.hostname.includes('script.google.com') || url.hostname.includes('api.anthropic.com')) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ status: 'error', message: 'Offline' }), { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // Google Fonts - cache first, fallback to network
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(res => { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(request, clone)); return res; })));
    return;
  }

  // Static assets - cache first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(request, clone)); }
        return res;
      }).catch(() => {
        if (request.destination === 'document') return caches.match('./index.html');
      });
    })
  );
});

// Background sync (optional)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncPendingTransactions());
  }
});

async function syncPendingTransactions() {
  // Placeholder for offline transaction sync
  console.log('[SW] Syncing pending transactions...');
}

// Push notifications for low stock
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Es Teh POS', {
      body: data.body || 'Ada notifikasi baru',
      icon: './icons/icon-192.png',
      badge: './icons/icon-72.png',
      tag: 'esteh-notification',
    })
  );
});
