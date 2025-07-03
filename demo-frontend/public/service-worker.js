const CACHE_NAME = 'recipe-box-cache-v2';

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/logo.svg',
        '/manifest.json'
      ]);
    }).then(() => {
      // Force activation of new service worker
      return self.skipWaiting();
    })
  );
});

// Activate event - cleanup old caches
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
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests with content type validation
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and external URLs
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Bypass cache for API calls to ensure fresh data
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/functions/v1/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Don't cache non-successful responses
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Content type validation to prevent caching HTML as JS/CSS
        const contentType = networkResponse.headers.get('content-type') || '';
        const requestUrl = event.request.url;
        
        // Check for JS files being served as HTML (the race condition issue)
        if (requestUrl.includes('.js') && !contentType.includes('javascript')) {
          console.warn('Service Worker: Rejecting non-JS content for JS request:', requestUrl);
          return networkResponse; // Don't cache, but return to browser
        }
        
        // Check for CSS files being served as HTML
        if (requestUrl.includes('.css') && !contentType.includes('css')) {
          console.warn('Service Worker: Rejecting non-CSS content for CSS request:', requestUrl);
          return networkResponse; // Don't cache, but return to browser
        }

        // Clone response for caching (response can only be read once)
        const responseToCache = networkResponse.clone();
        
        // Cache valid responses
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((error) => {
        console.error('Service Worker: Fetch failed for', event.request.url, error);
        throw error;
      });
    })
  );
});