// POSIBA service worker (F-PERF-02 shell + Stage 9 field offline, plan §2.9). Static assets cache-first; pages
// network-first with offline fallback; field routes network-first (3 s) → cached template → offline.html.
// Never caches /api (personal data) — field data lives encrypted in IndexedDB, not in plaintext Cache Storage.
const VERSION = "posiba-v2";
const FIELD = "posiba-field-v2";
const OFFLINE = "/offline.html";
const FIELD_RE = /^\/(rw|en|fr)\/(agent|work)\/field(\/|$)/;
const VISIT_RE = /^(\/(rw|en|fr)\/(agent|work)\/field\/visits\/)[^/]+$/;

self.addEventListener("install", (e) => {
  // No skipWaiting here: the field UI swaps code only when nothing is waiting to sync (§2.9.7).
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll([OFFLINE])).then(async () => {
    if (self.registration.active) for (const c of await self.clients.matchAll()) c.postMessage({ type: "update-ready" });
  }));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FIELD).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "skip-waiting") self.skipWaiting();
  if (d.type === "wipe") e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("posiba-field")).map((k) => caches.delete(k)))));
  if (d.type === "precache" && Array.isArray(d.urls)) {
    e.waitUntil(caches.open(FIELD).then((c) => Promise.all(d.urls.filter((u) => typeof u === "string" && u.startsWith("/")).map((u) =>
      fetch(u, { credentials: "include" }).then((r) => r.ok && c.put(templateKey(u), r)).catch(() => {})))));
  }
});

// Background Sync (Chromium only): wake the page's engine; Safari relies on foreground triggers.
self.addEventListener("sync", (e) => {
  if (e.tag === "field-sync") e.waitUntil(self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ type: "field-sync" }))));
});

/** Visit pages share one cached template per locale/workspace; the page reads the id from the URL. */
function templateKey(u) {
  const p = new URL(u, location.origin).pathname;
  const m = p.match(VISIT_RE);
  return m ? `${m[1]}_` : p;
}

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/orvena/")) {
    e.respondWith(caches.open(VERSION).then(async (c) => (await c.match(request)) ?? fetch(request).then((r) => { if (r.ok) c.put(request, r.clone()); return r; })));
    return;
  }
  if (request.mode !== "navigate") return;
  if (FIELD_RE.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(FIELD);
      const key = templateKey(url.pathname);
      try {
        const r = await Promise.race([fetch(request), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]);
        if (r.ok) cache.put(key, r.clone());
        return r;
      } catch {
        return (await cache.match(key)) ?? (await caches.match(OFFLINE)) ?? Response.error();
      }
    })());
    return;
  }
  e.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) ?? Response.error()));
});

// F-NTF-18: payload-less web push → show the newest in-app notification (fetched with the session cookie).
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let n = null;
    try {
      const r = await fetch("/api/notifications?limit=1&unread=true", { credentials: "include" });
      if (r.ok) n = (await r.json())?.data?.notifications?.[0] ?? null;
    } catch { /* offline: generic notice below */ }
    await self.registration.showNotification(n?.title ?? "HEBUZA", {
      body: n?.body || "You have a new update.",
      icon: "/orvena/brand/favicon.png",
      badge: "/orvena/brand/favicon.png",
      tag: n?.id ?? "hebuza",
      data: { href: n?.href || "/notifications" },
    });
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const href = e.notification.data?.href ?? "/notifications";
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = all.find((c) => new URL(c.url).origin === self.location.origin);
    if (open) { await open.focus(); return open.navigate(href); }
    return self.clients.openWindow(href);
  })());
});
