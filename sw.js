/* ==========================================================================
   Habit Tracker — Service Worker
   Cache-first strategy for static assets. Falls back to index.html for
   navigation requests (SPA single-page behavior).
   ========================================================================== */

const CACHE = 'habit-tracker-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/dashboard.css',
  './css/dashboard-v2.css',
  './css/mobile.css',
  './css/habits.css',
  './css/calendar.css',
  './css/kanban.css',
  './css/goals.css',
  './css/notes.css',
  './css/achievements.css',
  './css/animations.css',
  './js/utils.js',
  './js/db.js',
  './js/state.js',
  './js/theme.js',
  './js/charts.js',
  './js/ui.js',
  './js/habits.js',
  './js/calendar.js',
  './js/projects.js',
  './js/goals.js',
  './js/notes.js',
  './js/stats.js',
  './js/achievements.js',
  './js/app.js'
];

/* Install: cache all static assets */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

/* Activate: clean old caches */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

/* Fetch: cache-first for static assets, network-fallback for everything else */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful responses for future
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Network failed — try serving index.html for navigation (SPA)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
