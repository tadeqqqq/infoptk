// Инфо ПТК работает без интернета: при первом открытии сохраняем приложение на телефоне.
// Страницу (index.html) сначала берём из сети — чтобы видеть обновления, без сети — из сохранённой копии.
// Стили, скрипты, картинки и шрифты берём из сохранённого (у скриптов и стилей в адресе есть ?v=версия).
const CACHE = "infoptk-202611022253";
const CORE = [
  "./",
  "./styles.css", "./data.js", "./app.js",
  "./img/novsu-white.svg", "./img/novsu-emblem-white.svg", "./img/novsu-blue.svg", "./img/logo.svg",
  "./fonts/ptsans-400-cyrillic.woff2", "./fonts/ptsans-700-cyrillic.woff2",
  "./fonts/ptsans-400-latin.woff2", "./fonts/ptsans-700-latin.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // чужие сайты не трогаем

  // Страница: сначала сеть, без сети — сохранённая копия
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !url.searchParams.has("check")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("./", copy));
          }
          return res;
        })
        .catch(() => caches.match("./")),
    );
    return;
  }

  // Остальное: из сохранённого, а если нет — из сети с сохранением
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
