/* Vinora service worker — registered in production only. */
const VERSION = 'vinora-v1';
const STATIC_CACHE = `${VERSION}-static`;
const MEDIA_CACHE = `${VERSION}-media`;
const PAGES_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
    OFFLINE_URL,
    '/favicon.svg',
    '/icons/icon-192.png',
    '/manifest.webmanifest',
];
const MAX_MEDIA = 150;
const MAX_PAGES = 40;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((key) => !key.startsWith(VERSION))
                    .map((key) => caches.delete(key)),
            );

            if (self.registration.navigationPreload) {
                await self.registration.navigationPreload.enable();
            }

            await self.clients.claim();
        })(),
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'logout') {
        event.waitUntil(caches.delete(PAGES_CACHE));
    }
});

async function trim(cacheName, max) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (let i = 0; i < keys.length - max; i++) {
        await cache.delete(keys[i]);
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);

    if (cached) {
        return cached;
    }

    const response = await fetch(request);

    if (response.ok) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, response.clone());
    }

    return response;
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(MEDIA_CACHE);
    const cached = await cache.match(request);
    const network = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache
                    .put(request, response.clone())
                    .then(() => trim(MEDIA_CACHE, MAX_MEDIA));
            }

            return response;
        })
        .catch(() => cached);

    return cached || network;
}

async function networkFirstPage(event) {
    const { request } = event;

    try {
        const preloaded = await event.preloadResponse;
        const response = preloaded || (await fetch(request));

        if (response.ok && !response.redirected) {
            const cache = await caches.open(PAGES_CACHE);
            cache
                .put(request, response.clone())
                .then(() => trim(PAGES_CACHE, MAX_PAGES));
        }

        return response;
    } catch {
        const cache = await caches.open(PAGES_CACHE);
        const cached =
            (await cache.match(request)) ||
            (await cache.match(request, { ignoreSearch: true }));

        return cached || (await caches.match(OFFLINE_URL));
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (
        request.method !== 'GET' ||
        url.origin !== self.location.origin ||
        request.headers.has('X-Inertia') ||
        url.pathname.startsWith('/_inertia') ||
        url.pathname === '/sw.js'
    ) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstPage(event));

        return;
    }

    if (
        url.pathname.startsWith('/build/') ||
        /\.(?:js|css|woff2?)$/.test(url.pathname)
    ) {
        event.respondWith(cacheFirst(request));

        return;
    }

    if (
        url.pathname.startsWith('/storage/') ||
        url.pathname.startsWith('/icons/')
    ) {
        event.respondWith(staleWhileRevalidate(request));
    }
});
