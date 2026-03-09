/* =====================================================
   HABIT TRACKER — Service Worker
   Caches all app files for offline use.
   Strategy: Cache-first for static assets,
             network-first for HTML pages.
===================================================== */

const VERSION   = "v2";
const CACHE     = `habit-tracker-${VERSION}`;
const OFFLINE   = "/monthly.html";

const PRECACHE = [
  "/monthly.html",
  "/monthly.js",
  "/achievements.html",
  "/auth.html",
  "/journal.html",
  "/leaderboard.html",
  "/settings.html",
  "/social.html",
  "/templates.html",
  "/users.html",
  "/widget.html",
  "/css/themes.css",
  "/css/reset.css",
  "/css/monthly-layout.css",
  "/css/monthly-grid.css",
  "/css/charts.css",
  "/css/monthly-dailystreak.css",
  "/manifest.json",
];

/* ── Install: precache all app files ── */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE.map(u => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // don't block install on cache failure
  );
});

/* ── Activate: remove old caches ── */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: serve from cache, fallback to network ── */
self.addEventListener("fetch", (e) => {
  const { request } = e;

  // Skip non-GET and cross-origin
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  // HTML pages — network-first (get latest, fallback to cache)
  if (request.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then(r => r || caches.match(OFFLINE)))
    );
    return;
  }

  // Static assets — cache-first
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      });
    })
  );
});

/* ── Push notifications ── */
self.addEventListener("push", (e) => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || "Habit Reminder", {
      body:    data.body   || "Time to check in on your habits!",
      icon:    data.icon   || "/manifest.json",
      badge:   data.badge  || "",
      tag:     data.tag    || "habit-reminder",
      data:    { url: data.url || "/monthly.html" },
      actions: [
        { action: "open",    title: "Open App" },
        { action: "dismiss", title: "Dismiss" },
      ],
      requireInteraction: false,
    })
  );
});

/* ── Notification click ── */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "dismiss") return;
  const url = e.notification.data?.url || "/monthly.html";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(list => {
        for (const c of list) {
          if (c.url.includes("monthly.html") && "focus" in c) return c.focus();
        }
        return clients.openWindow(url);
      })
  );
});