/* service-worker.js — Mölkky PWA */
const VERSION = "v1.0.0";
const CACHE_NAME = `molkky-${VERSION}`;

const PRECACHE = [
  "/",                // jos hostaat juureen
  "/index.html",
  "/game.html",
  "/team-game.html",
  "/style.css",
  "/js/nav.js",
  "/js/app.js",
  "/js/gameState.js",
  "/js/rules.js",
  "/js/team-app.js",
  "/js/teamState.js",
  "/js/sw-register.js",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/maskable-192.png",
  "/assets/icons/maskable-512.png"
];

// Asenna ja esilataa “app shell”
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Puhdista vanhat välimuistit
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith("molkky-") && k !== CACHE_NAME)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Helper: onko pyyntö HTML-navigaatio (spa-tyylinen navigointi)
function isNavigationRequest(request) {
  return request.mode === "navigate" ||
    (request.method === "GET" &&
     request.headers.get("accept")?.includes("text/html"));
}

// Strategiat:
// - HTML: network-first → cache fallback
// - muut (CSS/JS/kuvat): cache-first → network fallback
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (isNavigationRequest(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        // Päivitä cache taustalla
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req) || await cache.match("/index.html");
        return cached;
      }
    })());
    return;
  }

  // Static assets: cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      // vain onnistuneet vastaukset talteen
      if (res.ok && (req.url.startsWith(self.location.origin))) {
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      return cached || Response.error();
    }
  })());
});

// Mahdollista ohjattu päivitys (ei pakollinen)
// Asiakas voi postMessage('SKIP_WAITING') → aktivoi uusi SW heti
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
