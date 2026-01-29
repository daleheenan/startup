// NovelForge Service Worker
// Provides offline support for chapter viewing and static assets

const CACHE_NAME = 'novelforge-v1';
const STATIC_CACHE = 'novelforge-static-v1';
const CHAPTER_CACHE = 'novelforge-chapters-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('novelforge-') &&
                   name !== CACHE_NAME &&
                   name !== STATIC_CACHE &&
                   name !== CHAPTER_CACHE;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests except for chapter content
  if (url.pathname.startsWith('/api/')) {
    // Cache chapter content for offline viewing
    if (url.pathname.includes('/chapters/') && url.pathname.includes('/content')) {
      event.respondWith(
        caches.open(CHAPTER_CACHE).then((cache) => {
          return fetch(event.request)
            .then((response) => {
              if (response.ok) {
                cache.put(event.request, response.clone());
              }
              return response;
            })
            .catch(() => {
              return cache.match(event.request);
            });
        })
      );
      return;
    }
    // Don't cache other API requests
    return;
  }

  // For navigation requests, use network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // For static assets, use cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update in background
        fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, response);
            });
          }
        });
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(event.request).then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.jpg') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.woff2')
        )) {
          // Clone BEFORE using the response
          const responseToCache = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

// Message event - handle cache management from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_CHAPTER') {
    const { url, content } = event.data;
    caches.open(CHAPTER_CACHE).then((cache) => {
      const response = new Response(JSON.stringify(content), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(url, response);
    });
  }

  if (event.data && event.data.type === 'CLEAR_CHAPTER_CACHE') {
    caches.delete(CHAPTER_CACHE);
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
