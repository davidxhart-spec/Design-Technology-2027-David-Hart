/* The textbook as an app — written by rebuild-book-site.sh; do not edit by hand.
   1. The offline copy: registers sw.js, so every page opens without the internet once the book has been visited.
   2. The "Install the app" button on the contents page, where the browser offers one (Edge, Chrome).
   3. Opened straight from files (the copy on a drive): YouTube will not play an embedded video for a page that has
      no web address of its own (Error 153), so each video becomes a link that opens it on YouTube instead. */
(function () {
  'use strict';
  var inMacApp = window.IBDT_APP === true;                     // DT Textbook, the Mac app (BookViewController)
  var installed = inMacApp || navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  var getApp = document.getElementById('get-app');
  if (getApp && installed) getApp.hidden = true;

  if (!inMacApp && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  var btn = document.getElementById('install-app'), offer = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); offer = e;
    if (btn) btn.hidden = false;
  });
  if (btn) btn.addEventListener('click', function () {
    if (!offer) return;
    offer.prompt();
    offer.userChoice.then(function () { offer = null; btn.hidden = true; });
  });
  window.addEventListener('appinstalled', function () { if (btn) btn.hidden = true; });

  if (location.protocol === 'file:') {
    var frames = document.querySelectorAll('figure.video iframe');
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i], m = /\/embed\/([\w-]{11})/.exec(f.src);
      if (!m) continue;
      var a = document.createElement('a');
      a.className = 'video-link';
      a.href = 'https://www.youtube.com/watch?v=' + m[1];
      a.target = '_blank'; a.rel = 'noopener';
      a.textContent = '▶  Watch on YouTube: ' + (f.title || 'the video');
      f.parentNode.replaceChild(a, f);
    }
  }
})();
