const CACHE_NAME = 'chord-compare-v11';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/music.js',
  './js/chord-parser.js',
  './js/songs.js',
  './js/diagrams.js',
  './js/audio.js',
  './js/storage.js',
  './data/chords.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/usagi-face.png',
  './assets/usagi-cheer.png',
  './assets/usagi-dance.png',
  './assets/usagi-ukulele.jpg',
  './assets/usagi-friends.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
