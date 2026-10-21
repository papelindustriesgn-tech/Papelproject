/* Uny — service worker (PWA). Stratégies simples et sûres pour réseaux mobiles limités. */
const VERSION = "uny-v2";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const IMAGES = `${VERSION}-images`;
const OFFLINE_URL = "/hors-ligne";
const NETWORK_TIMEOUT_MS = 3000;
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon.svg"];
// Portails établissement et partenaire, profil (justificatifs, sécurité), notifications, API
const NO_STORE = ["/universite", "/partenaire", "/profil", "/notifications", "/api", "/connexion", "/inscription"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// À la déconnexion, on efface les pages personnelles mises en cache.
self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGES));
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Jamais de cache pour l'authentification, les données Supabase privées et les requêtes RSC
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/admin") || req.headers.get("RSC") === "1") return;

  // Espaces métier et pages sensibles : réseau uniquement (page hors ligne si pas de réseau), jamais gardés sur l'appareil
  if (req.mode === "navigate" && NO_STORE.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) {
    event.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()));
    return;
  }

  // Pages : réseau d'abord, cache en secours (la carte reste consultable hors ligne).
  // Réseau lent : au-delà de 3 s, on affiche la dernière version enregistrée et le réseau la met à jour en arrière-plan.
  if (req.mode === "navigate") {
    const network = fetch(req).then((res) => {
      if (res.ok && url.origin === self.location.origin && !res.redirected) {
        const copy = res.clone();
        caches
          .open(PAGES)
          .then((c) => c.put(req, copy))
          .then(() => trim(PAGES, 30));
      }
      return res;
    });
    event.waitUntil(network.catch(() => undefined));
    event.respondWith(
      new Promise((resolve) => {
        let settled = false;
        const done = (res) => {
          if (!settled && res) {
            settled = true;
            resolve(res);
          }
        };
        const timer = setTimeout(async () => done(await caches.match(req)), NETWORK_TIMEOUT_MS);
        network
          .then((res) => {
            clearTimeout(timer);
            done(res);
          })
          .catch(async () => {
            clearTimeout(timer);
            done((await caches.match(req)) || (await caches.match(OFFLINE_URL)));
          });
      }),
    );
    return;
  }

  // Assets Next.js versionnés : cache d'abord
  if (url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(STATIC).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Images : cache puis mise à jour en arrière-plan
  const isImage =
    req.destination === "image" ||
    url.pathname.startsWith("/_next/image") ||
    url.hostname === "images.unsplash.com" ||
    url.pathname.includes("/storage/v1/object/public/");
  if (isImage) {
    event.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const hit = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok || res.type === "opaque") cache.put(req, res.clone()).then(() => trim(IMAGES, 150));
            return res;
          })
          .catch(() => hit);
        return hit || network;
      }),
    );
  }
});
