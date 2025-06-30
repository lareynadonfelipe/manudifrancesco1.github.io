const CACHE = "cache-v1";
const assets = [ "/", "/index.html", "/main.js", "/styles.css", "/icons/icon-192.png" ];
self.addEventListener("install", e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(assets)))
);
self.addEventListener("fetch", e =>
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)))
);
