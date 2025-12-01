// Service Worker para PWA offline-first
const CACHE_NAME = 'pajarito-saltador-v1';

// Instalación: cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cachear archivos básicos
        return cache.addAll([
          '/',
          '/index.html',
          '/manifest.json',
          '/sw.js'
        ]).then(() => {
          // Intentar cachear assets (pueden fallar si no existen)
          return Promise.allSettled([
            cache.add('/assets/icon-192.png').catch(() => {}),
            cache.add('/assets/icon-512.png').catch(() => {})
          ]);
        });
      })
      .catch((err) => {
        console.error('Error al cachear assets:', err);
      })
  );
  self.skipWaiting();
});

// Activación: limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Cache First (offline-first)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si está en cache, devolverlo
        if (response) {
          return response;
        }
        // Si no, intentar fetch de red
        return fetch(event.request)
          .then((response) => {
            // Si la respuesta es válida, cachearla
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          })
          .catch(() => {
            // Si falla la red y no está en cache, devolver página offline si es navegación
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

