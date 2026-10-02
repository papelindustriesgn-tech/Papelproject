/*
 * Service worker de Papel ERP : permet d'ouvrir l'application terrain SANS réseau.
 * - Fichiers statiques de Next (/_next/static, versionnés) : cache d'abord.
 * - Page /terrain : réseau d'abord, copie en cache en secours (hors ligne).
 * - Tuiles de carte déjà consultées : cache limité.
 * Les données ne passent pas par ici : elles sont dans la base du téléphone (IndexedDB).
 */
const VERSION = "papel-v1";
const CACHE_PAGES = `${VERSION}-pages`;
const CACHE_STATIQUE = `${VERSION}-statique`;
const CACHE_TUILES = `${VERSION}-tuiles`;
const MAX_TUILES = 600;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_PAGES)
      .then((c) => c.addAll(["/terrain", "/logo-papel.png", "/icons/icon-192.png"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => !c.startsWith(VERSION)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

async function limiterCache(nom, max) {
  const cache = await caches.open(nom);
  const cles = await cache.keys();
  for (let i = 0; i < cles.length - max; i++) await cache.delete(cles[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Tuiles de carte
  if (/tile\.openstreetmap\.org|tiles?\./.test(url.hostname)) {
    event.respondWith(
      caches.open(CACHE_TUILES).then(async (cache) => {
        const enCache = await cache.match(req);
        if (enCache) return enCache;
        try {
          const rep = await fetch(req);
          if (rep.ok) {
            cache.put(req, rep.clone());
            limiterCache(CACHE_TUILES, MAX_TUILES);
          }
          return rep;
        } catch {
          return new Response("", { status: 504 });
        }
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Fichiers statiques versionnés : cache d'abord.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/logo-papel.png") {
    event.respondWith(
      caches.open(CACHE_STATIQUE).then(async (cache) => {
        const enCache = await cache.match(req);
        if (enCache) return enCache;
        const rep = await fetch(req);
        if (rep.ok) cache.put(req, rep.clone());
        return rep;
      }),
    );
    return;
  }

  // Page de l'application terrain : réseau d'abord, cache en secours.
  if (req.mode === "navigate" && url.pathname.startsWith("/terrain")) {
    event.respondWith(
      fetch(req)
        .then((rep) => {
          if (rep.ok && !rep.redirected) caches.open(CACHE_PAGES).then((c) => c.put("/terrain", rep.clone()));
          return rep;
        })
        .catch(() => caches.match("/terrain").then((r) => r || new Response("<h1>Hors ligne</h1><p>Ouvrez l'application une première fois avec du réseau.</p>", { headers: { "Content-Type": "text/html; charset=utf-8" } }))),
    );
  }
});
