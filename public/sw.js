/* Only public, immutable identity assets and a generic offline page are cached.
 * Never cache Supabase, API responses, signed-in HTML, or session tokens here. */
const CACHE = "isev-public-v1";
const PUBLIC_ASSETS = [
  "/offline.html",
  "/app-icons/icon-192.png",
  "/app-icons/icon-512.png",
  "/app-icons/maskable-512.png",
  "/app-icons/apple-touch-icon.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PUBLIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("isev-public-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match("/offline.html")) ||
          new Response(
            "Sem conexão. Conecte-se à internet e tente novamente.",
            {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            },
          ),
      ),
    );
  } else if (!url.search && PUBLIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(url.pathname).then((cached) => cached || fetch(request)),
    );
  }
});
