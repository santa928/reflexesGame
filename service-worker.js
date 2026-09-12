// Generated from the precached files by scripts/update-cache-version.mjs.
const CACHE_VERSION = "04dbe7956c40165ca879";
const CACHE_PREFIX = `pikapika-touch:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./vendor/phaser.min.js",
  "./src/main.js",
  "./src/buttonStyle.js",
  "./src/themeStyle.js",
  "./src/spawnLogic.js",
  "./src/targetStyle.js",
  "./src/roundClock.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
const SHELL_URLS = new Set(APP_SHELL_FILES.map(file => new URL(file, self.registration.scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([...SHELL_URLS].map(url => new Request(url, { cache: "reload" })))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      )),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  requestUrl.search = "";
  requestUrl.hash = "";
  if (!SHELL_URLS.has(requestUrl.href)) return;
  const cacheUrl = event.request.mode === "navigate"
    ? new URL("./index.html", self.registration.scope).href
    : requestUrl.href;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => (await cache.match(cacheUrl)) || fetch(event.request)),
  );
});
