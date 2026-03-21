/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST?: Array<unknown> };

// Required injection point for vite-plugin-pwa (injectManifest).
declare global {
  const __WB_MANIFEST: Array<unknown> | undefined;
}

const CACHE_PREFIX = 'schooldekho';
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime`;
const ASSETS_CACHE = `${CACHE_PREFIX}-assets`;
const API_CACHE = `${CACHE_PREFIX}-api`;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(ASSETS_CACHE).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        console.log('Note: Some assets may not be available offline');
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheName.startsWith(CACHE_PREFIX)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => {
            return cache.match(request).then((cached) => {
              return cached || new Response('Offline - Data not available', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'application/json',
                }),
              });
            });
          });
      })
    );
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => {
            return cache.match(request).then((cached) => {
              if (cached) return cached;
              return cache.match('/index.html').then((indexPage) => {
                if (indexPage) return indexPage;
                return new Response('Offline - Page not available', {
                  status: 503,
                  statusText: 'Service Unavailable',
                });
              });
            });
          });
      })
    );
    return;
  }

  // Handle other requests (CSS, JS, images, etc.)
  event.respondWith(
    caches.open(ASSETS_CACHE).then((cache) => {
      return cache.match(request).then((response) => {
        if (response) {
          // Update cache in background
          fetch(request).then((newResponse) => {
            if (newResponse.ok) {
              cache.put(request, newResponse);
            }
          }).catch(() => {
            // Silently fail background update
          });
          return response;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        });
      });
    }).catch(() => {
      // Fallback for offline
      if (request.destination === 'image') {
        return new Response(
          '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ddd" width="100" height="100"/></svg>',
          {
            headers: {
              'Content-Type': 'image/svg+xml',
            },
          }
        );
      }
      return new Response('Offline', { status: 503 });
    })
  );
});

export {};
