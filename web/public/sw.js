// PROWASH service worker — minimal offline fallback only.
// Intercepts same-origin GET navigations; on network failure serves the cached
// offline page. API, Socket.IO, and all non-GET requests pass straight through
// (booking and live tracking always require connectivity).
const OFFLINE_URL = '/offline.html'
const CACHE = 'prowash-offline-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Only handle same-origin GET navigations; leave everything else online-only
  if (request.method !== 'GET' || request.mode !== 'navigate') return
  event.respondWith(
    fetch(request).catch(() => caches.match(OFFLINE_URL))
  )
})
