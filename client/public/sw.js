// Mind Bridge service worker: keeps the app shell and static files so the site opens on a weak connection and can be
// installed. It never stores anything personal: no API calls, no Firebase traffic, no non-GET requests, nothing from other
// origins. Pages are network-first (always the latest deploy when online); files under /assets/ are named by content hash,
// so they are cache-first. Bump VERSION to drop every old cache.
const VERSION = "v1";
const SHELL = `mb-shell-${VERSION}`;
const ASSETS = `mb-assets-${VERSION}`;
const KNOWN = [SHELL, ASSETS];
const OFFLINE_PAGE =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  "<title>Mind Bridge is offline</title>" +
  '<body style="font:16px/1.6 system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem">' +
  "<h1>You are offline</h1><p>Mind Bridge needs a connection to load. Please reconnect and try again.</p>" +
  '<p>If you need to talk to someone right now, call the free 24/7 crisis line: <a href="tel:1553">1553</a>.</p>';

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.add("/index.html"))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KNOWN.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put("/index.html", copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match("/index.html")
            .then(
              (cached) =>
                cached ||
                new Response(OFFLINE_PAGE, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }),
            ),
        ),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSETS).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            }),
        ),
      ),
    );
  }
});
