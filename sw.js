/* 오늘도득템 서비스 워커 — 앱 껍데기만 캐시해서 홈 화면 앱처럼 빠르게 열리게 합니다.
   내용(데이터)은 항상 네트워크를 먼저 보고, 실패하면 캐시로 대신합니다. */
const CACHE = "deuktem-v2";
const SHELL = [
  "./",
  "./index.html",
  "./assets/styles.css",
  "./assets/app.js",
  "./data/items.js",
  "./data/adpick.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  // 네트워크 우선 → 실패 시 캐시 (데이터가 항상 최신이 되도록)
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
