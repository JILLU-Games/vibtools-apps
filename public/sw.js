/**
 * Service Worker for apps.vib.tools (PWA & Offline Shell).
 */

const CACHE_NAME = "vib-apps-hub-v3";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/styles/tokens.css",
  "/styles/globals.css",
  "/lib/cn.js",
  "/lib/theme.js",
  "/lib/router.js",
  "/lib/api.js",
  "/lib/appMeta.js",
  "/lib/clipboard.js",
  "/components/ui/index.js",
  "/components/ui/Icon.js",
  "/components/ui/Button.js",
  "/components/ui/Input.js",
  "/components/ui/Badge.js",
  "/components/ui/Card.js",
  "/components/ui/Modal.js",
  "/components/ui/Toast.js",
  "/components/layout/Header.js",
  "/components/layout/Sidebar.js",
  "/components/layout/MobileNav.js",
  "/components/layout/Footer.js",
  "/components/layout/MainLayout.js",
  "/components/sections/AppGrid.js",
  "/components/sections/AppDetailView.js",
  "/components/sections/CliGuideSection.js",
  "/components/sections/SchemaGuideSection.js",
  "/app.js",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/vib.tools.Branding/favicon.svg",
  "/vib.tools.Branding/favicon-96x96.png",
  "/vib.tools.Branding/web-app-manifest-192x192.png",
  "/vib.tools.Branding/web-app-manifest-512x512.png",
  "/icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith("http")) return;

  // 1. API requests -> Network First (Never cache API errors)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline", message: "Network unavailable" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json; charset=utf-8" }
          }
        );
      })
    );
    return;
  }

  // 2. Navigation requests (HTML pages) -> Network first, fallback to cached /index.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // 3. Static Assets -> Stale While Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.method === "GET"
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
