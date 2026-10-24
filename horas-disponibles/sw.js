/* La aplicación nunca guarda respuestas de autenticación, agenda o API. */
const CACHE = 'kinecheck-horas-shell-v1';
const STATIC = [
  '/horas-disponibles/styles.css',
  '/horas-disponibles/demo/demo.css',
  '/assets/brand/kinecheck-3d-symbol-192.png',
  '/assets/brand/kinecheck-3d-symbol-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.allSettled(STATIC.map(path => cache.add(path)))));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('kinecheck-horas-shell-') && key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  if (request.mode === 'navigate' || !STATIC.includes(url.pathname)) return;
  event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
});
