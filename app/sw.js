'use strict';
const LIFEOS_VERSION = '2.14.86';
const CACHE = 'lifeos-v2.14.86';
const VERSIONED_INDEX = './index.html?v=2.14.86';
const CORE = [
  VERSIONED_INDEX,
  './offline.html',
  './manifest.webmanifest',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('lifeos-') && key !== CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirstDocument(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(VERSIONED_INDEX, response.clone());
    }
    return response;
  } catch (_) {
    return (await caches.match(VERSIONED_INDEX)) || (await caches.match('./offline.html'));
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request, { cache: 'no-cache' }).then(async response => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
    }).catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response && response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return caches.match('./offline.html');
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const isDocument = event.request.mode === 'navigate' || event.request.destination === 'document';
  event.respondWith(isDocument ? networkFirstDocument(event.request) : cacheFirstAsset(event.request));
});
