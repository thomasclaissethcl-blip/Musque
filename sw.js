const CACHE_NAME = 'impro-lab-prod-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './data/pathways.json',
  './data/lessons.json',
  './js/app.js',
  './js/config.js',
  './js/dataService.js',
  './js/exercises.js',
  './js/midiEngine.js',
  './js/renderers.js',
  './js/review.js',
  './js/state.js',
  './js/storage.js',
  './js/utils.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
