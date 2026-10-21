/* The offline copy of the textbook (a service worker) — written by rebuild-book-site.sh; do not edit by hand.
   At the first visit every page, script and icon is kept on the device, so the book opens without the internet.
   Online, each page is fetched fresh and the kept copy updated; when the network fails, or has not answered in
   4 seconds, the kept copy is shown. Videos, and anything else from another site, are left to the network.
   VERSION changes whenever any kept file does, which replaces the old copy. */
var VERSION = 'dt2027-97a92f44e304';
var FILES = ["./", "00-introduction.html", "A1.1-ergonomics.html", "A2.1-user-centred-research.html", "A2.2-prototyping-techniques.html", "A3.1-material-classification.html", "A3.2-structural-systems.html", "A3.3-mechanical-systems.html", "A3.4-electronic-systems.html", "A4.1-manufacturing-techniques.html", "B1.1-user-centred-design.html", "B2.1-design-process.html", "B2.2-modelling-prototyping.html", "B3.1-material-selection.html", "B3.2-structural-application.html", "B3.3-mechanical-application.html", "B3.4-electronic-application.html", "B4.1-production-systems.html", "C1.1-responsibility.html", "C1.2-inclusive-design.html", "C1.3-beyond-usability.html", "C2.1-sustainability.html", "C2.2-circular-economy.html", "C3.1-product-analysis.html", "C3.2-lifecycle-analysis.html", "C4.1-design-for-manufacture-strategies.html", "EE-extended-essay.html", "exam-technique.html", "glossary.html", "index.html", "progress.js", "app.js", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('dt2027-') === 0 && k !== VERSION; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(new Promise(function (resolve) {
    var settled = false;
    function give(res) { if (!settled && res) { settled = true; resolve(res); } }
    function kept() {
      return caches.match(req, { ignoreSearch: true }).then(function (m) {
        return m || (req.mode === 'navigate' ? caches.match('index.html') : undefined);
      });
    }
    var timer = setTimeout(function () { kept().then(give); }, 4000);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      give(res);
    }).catch(function () {
      clearTimeout(timer);
      kept().then(function (m) { give(m || Response.error()); });
    });
  }));
});
