/* Service worker dell'app Dichiarazione utenze.
   - Pagina: prima dalla rete (così gli aggiornamenti arrivano subito), senza rete dalla copia salvata.
   - Librerie e font: dalla copia salvata, aggiornata in background. */
var V = "utenze-v1";
var CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
var EXTRA = [
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"
];
var EXT = /(^|\.)(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) {
    return c.addAll(CORE).then(function () {
      return Promise.all(EXTRA.map(function (u) {
        return fetch(u, { mode: "no-cors" }).then(function (r) { return c.put(u, r); }).catch(function () {});
      }));
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET") return;
  var u = new URL(r.url);

  if (r.mode === "navigate") {
    e.respondWith(
      fetch(r.url, { cache: "no-cache", credentials: "same-origin" }).then(function (res) {
        if (res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { c.put("./index.html", cp); }); }
        return res;
      }).catch(function () {
        return caches.match("./index.html").then(function (m) { return m || caches.match("./"); });
      })
    );
    return;
  }

  if (u.origin === self.location.origin || EXT.test(u.hostname)) {
    e.respondWith(caches.match(r).then(function (m) {
      var net = fetch(r).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); }
        return res;
      }).catch(function () { return m; });
      return m || net;
    }));
  }
});
