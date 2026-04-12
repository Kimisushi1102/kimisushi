self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Basic fetch passthrough to satisfy PWA requirements
    e.respondWith(fetch(e.request).catch(error => {
        console.error("Fetch failed in Service Worker:", error);
    }));
});
