// Minimal app-shell service worker. Enables PWA installability and basic
// offline resilience for the shell (not a full offline-first strategy —
// the app requires network for generation/preview regardless).
const CACHE_NAME = "chinna-coder-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.json", "/favicon.ico", "/icon.png", "/apple-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {
      // Best-effort: don't fail install if a shell asset 404s in dev.
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never cache API calls, streaming generation, or the Sandpack preview —
  // those must always hit the network fresh.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    request.headers.get("accept")?.includes("text/event-stream")
  ) {
    return;
  }

  // Never intercept navigation requests (loading the page itself) — always
  // hit the network directly. Intercepting document requests is what caused
  // "Failed to convert value to 'Response'" and blank pages: if both the
  // cache and network failed, the old code could resolve to `undefined`
  // instead of a real Response, and the browser has nothing to render.
  if (request.mode === "navigate") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached || new Response("", { status: 504, statusText: "Offline" }));
      // Always resolve to an actual Response, never to `undefined`.
      return cached ?? network;
    }),
  );
});
