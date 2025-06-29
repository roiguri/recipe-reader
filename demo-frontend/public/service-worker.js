self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('recipe-box-cache-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/logo.svg',
        // Add other assets you want to cache
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});