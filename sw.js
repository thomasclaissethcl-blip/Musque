const CACHE_NAME = 'improlab-studio-poc-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/logo.svg',
  './data/pathways.json',
  './data/lessons.json',
  './js/app.js',
  './js/audioEngine.js',
  './js/config.js',
  './js/dataService.js',
  './js/exercises.js',
  './js/renderers.js',
  './js/review.js',
  './js/state.js',
  './js/storage.js',
  './js/utils.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
