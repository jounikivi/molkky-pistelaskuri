const CACHE_NAME = "molkky-pwa-v3";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./ohjeet.html",
  "./game.html",
  "./team-game.html",
  "./style.css",
  "./manifest.webmanifest",
  "./js/pwa.js",
  "./js/app.js",
  "./js/team-app.js",
  "./js/team-randomizer.js",
  "./js/rules.js",
  "./js/shared.js",
  "./js/state-utils.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  event.respondWith(handleAssetRequest(event.request));
});

async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const freshResponse = await fetch(request);
    if (freshResponse.ok) {
      cache.put(request, freshResponse.clone());
    }
    return freshResponse;
  } catch {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match("./index.html"))
    );
  }
}

async function handleAssetRequest(request) {
  const cachedResponse = await caches.match(request, { ignoreSearch: true });
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}
