/* Study progress — lets a student mark each chapter Not started, Studied or Confident and
   tick off each section of it (every h2 except Teacher's notes), shows the chapter mark as a
   dot beside every chapter in the sidebar, and adds a progress summary with a "Revise next"
   list to the contents page. Ticking every section marks the chapter Studied.

   Saved in this browser only (localStorage). Nothing is sent anywhere.
   The topic list is read from the sidebar, so a new chapter is tracked as soon as its
   sidebar link reads like "A1.1 Ergonomics" (with "(HL)" at the end for HL topics). */
(function () {
  'use strict';

  var KEY = 'ibdt2027-progress';
  var LABELS = ['Not started', 'Studied', 'Confident'];
  var REFRESH_DAYS = 21;   // a Confident topic comes back on "Revise next" after this long
  var NEXT_MAX = 6;

  var CSS = [
    '.pg-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }',
    '.pg-dot { flex: 0 0 auto; display: inline-block; width: 10px; height: 10px; border-radius: 50%;',
    '  border: 1.5px solid #c7c7cc; background: transparent; vertical-align: middle; }',
    '.pg-dot[data-s="1"] { border-color: #FF9F0A; background: linear-gradient(90deg, #FF9F0A 50%, transparent 50%); }',
    '.pg-dot[data-s="2"] { border-color: #34C759; background: #34C759; }',
    'aside a.pg-link { display: flex; align-items: center; justify-content: space-between; gap: 8px; }',
    'aside a.active .pg-dot { border-color: rgba(255,255,255,0.8); }',
    'aside a.active .pg-dot[data-s="1"] { border-color: #fff; background: linear-gradient(90deg, #fff 50%, transparent 50%); }',
    'aside a.active .pg-dot[data-s="2"] { border-color: #fff; background: #fff; }',
    'main li a + .pg-dot { margin-left: 8px; }',
    '.pg-part { margin-left: 6px; font-size: 11px; color: #8A4B00; }',

    '.pg-h2row { display: flex; align-items: center; justify-content: space-between; gap: 12px;',
    '  margin: 32px 0 12px; padding-bottom: 4px; border-bottom: 1px solid rgba(0,0,0,0.08); }',
    '.pg-h2row > h2 { flex: 1; margin: 0; padding: 0; border: 0; }',
    '.pg-tick { flex: 0 0 auto; font: inherit; font-size: 12px; font-weight: 600; letter-spacing: 0; color: #6e6e73;',
    '  background: #fff; border: 1px solid rgba(0,0,0,0.12); border-radius: 999px; padding: 4px 11px 4px 6px;',
    '  min-height: 30px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }',
    '.pg-tick:hover { border-color: #007AFF; color: #007AFF; }',
    '.pg-tick:focus-visible { outline: 2px solid #007AFF; outline-offset: 2px; }',
    '.pg-box { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid #c7c7cc; background: #fff;',
    '  display: inline-flex; align-items: center; justify-content: center; }',
    '.pg-tick[aria-pressed="true"] { background: #E3F6E8; border-color: #34C759; color: #1E7A34; }',
    '.pg-tick[aria-pressed="true"] .pg-box { background: #34C759; border-color: #34C759; }',
    '.pg-tick[aria-pressed="true"] .pg-box::after { content: ""; width: 4px; height: 8px; border: solid #fff;',
    '  border-width: 0 2px 2px 0; transform: translateY(-1px) rotate(45deg); }',

    '.pg-bar { display: flex; height: 6px; border-radius: 3px; background: rgba(0,0,0,0.08); overflow: hidden; }',
    '.pg-bar i { display: block; height: 100%; }',
    '.pg-bar i.c { background: #34C759; }',
    '.pg-bar i.s { background: #FF9F0A; }',

    'aside a.pg-meter { display: grid; grid-template-columns: 1fr auto; gap: 6px 8px; align-items: center;',
    '  padding: 8px; margin: -8px 0 16px; font-size: 11px; color: #6e6e73; }',
    'aside a.pg-meter .pg-meter-label { font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; color: #8e8e93; }',
    'aside a.pg-meter .pg-meter-num { font-variant-numeric: tabular-nums; }',
    'aside a.pg-meter .pg-bar { grid-column: 1 / -1; }',
    'aside a.pg-meter:hover .pg-meter-label { color: #007AFF; }',

    '.pg-card { background: #fff; border: 1px solid rgba(0,0,0,0.08); border-radius: 10px; padding: 12px 14px;',
    '  margin: 12px 0 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }',
    '.pg-card.pg-end { margin: 40px 0 0; }',
    '.pg-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #8e8e93; }',
    '.pg-seg { display: inline-flex; flex-wrap: wrap; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; overflow: hidden; background: #fff; }',
    '.pg-seg button { font: inherit; font-size: 13px; font-weight: 600; color: #3a3a3c; background: transparent; border: 0;',
    '  padding: 7px 12px; min-height: 36px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }',
    '.pg-seg button + button { border-left: 1px solid rgba(0,0,0,0.12); }',
    '.pg-seg button:hover { background: rgba(0,122,255,0.06); }',
    '.pg-seg button:focus-visible { outline: 2px solid #007AFF; outline-offset: -2px; }',
    '.pg-seg button[aria-pressed="true"][data-s="0"] { background: #e5e5ea; color: #1c1c1e; }',
    '.pg-seg button[aria-pressed="true"][data-s="1"] { background: #FFF1DC; color: #8A4B00; }',
    '.pg-seg button[aria-pressed="true"][data-s="2"] { background: #E3F6E8; color: #1E7A34; }',
    '.pg-seg button[aria-pressed="true"][data-l] { background: #007AFF; color: #fff; }',
    '.pg-note { flex-basis: 100%; margin: 0; font-size: 12px; color: #6e6e73; }',

    '.pg-summary { background: #fff; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 16px 20px 18px; margin: 20px 0 8px; }',
    '.pg-summary h2 { margin: 0; padding: 0; border: 0; }',
    '.pg-summary h3 { font-size: 14px; margin: 18px 0 4px; }',
    '.pg-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; margin-bottom: 12px; }',
    '.pg-level-wrap { display: inline-flex; align-items: center; gap: 8px; }',
    '.pg-bar.pg-big { height: 10px; border-radius: 5px; }',
    '.pg-count { font-size: 14px; margin: 8px 0 4px; }',
    '.pg-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: #6e6e73; margin: 0 0 12px; }',
    '.pg-legend span { display: inline-flex; align-items: center; gap: 6px; }',
    '.pg-strand { display: grid; grid-template-columns: minmax(0, 1fr) 120px 44px; align-items: center; gap: 10px; font-size: 13px; padding: 3px 0; }',
    '.pg-strand-num { text-align: right; color: #6e6e73; font-variant-numeric: tabular-nums; }',
    '.pg-summary ol.pg-next { list-style: none; margin: 0; }',
    '.pg-next li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 12px; font-size: 13px;',
    '  padding: 7px 0; margin: 0; border-top: 1px solid rgba(0,0,0,0.06); }',
    '.pg-why { color: #6e6e73; }',
    '.pg-empty { font-size: 13px; }',
    '.pg-backup { margin-top: 16px; font-size: 13px; }',
    '.pg-backup summary { cursor: pointer; color: #007AFF; font-weight: 600; }',
    '.pg-backup p { font-size: 13px; margin: 8px 0; }',
    '.pg-backup textarea { display: block; width: 100%; min-height: 60px; font: 12px "SF Mono", Menlo, monospace;',
    '  padding: 8px; border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; margin: 4px 0 8px; resize: vertical; }',
    '.pg-btn { font: inherit; font-size: 13px; font-weight: 600; padding: 6px 12px; min-height: 34px; border-radius: 7px;',
    '  border: 1px solid rgba(0,0,0,0.15); background: #fff; color: #1c1c1e; cursor: pointer; margin: 0 8px 8px 0; }',
    '.pg-btn:hover { background: rgba(0,122,255,0.06); }',
    '.pg-btn.pg-danger { color: #C62828; }',
    '.pg-msg { min-height: 1em; color: #1E7A34; }',

    '@media (max-width: 600px) {',
    '  .pg-card .pg-seg { display: flex; flex-wrap: nowrap; width: 100%; }',
    '  .pg-card .pg-seg button { flex: 1 1 0; justify-content: center; padding: 7px 4px; font-size: 12px; gap: 5px; }',
    '  .pg-strand { grid-template-columns: minmax(0, 1fr) 64px 40px; }',
    '  .pg-summary { padding: 14px 14px 16px; }',
    '}',
    '@media print { .pg-card, .pg-summary, .pg-meter, .pg-dot, .pg-part, .pg-tick { display: none !important; } }'
  ].join('\n');

  // ---------- saved state ----------
  // { v, level: 'SL' | 'HL', topics: { 'A1.1': { s: 1 | 2, d: 'YYYY-MM-DD', x: ['key-concepts', …], n: 4 } } }
  // s/d = chapter mark and the day it was set; x = sections ticked, n = how many sections the chapter has.

  var state = fresh();
  var saveOK = true;

  function fresh() { return { v: 1, level: 'HL', topics: {} }; }

  function clean(o) {
    if (!o || typeof o !== 'object' || !o.topics || typeof o.topics !== 'object') return null;
    var out = { v: 1, level: o.level === 'SL' ? 'SL' : 'HL', topics: {} };
    Object.keys(o.topics).forEach(function (code) {
      var t = o.topics[code];
      if (!/^[A-C]\d+\.\d+$/.test(code) || !t || typeof t !== 'object') return;
      var e = {};
      if (t.s === 1 || t.s === 2) {
        e.s = t.s;
        e.d = /^\d{4}-\d{2}-\d{2}$/.test(t.d) ? t.d : today();
      }
      var x = Array.isArray(t.x) ? t.x.filter(function (k) { return typeof k === 'string' && /^[a-z0-9-]{1,60}$/.test(k); }) : [];
      if (x.length) {
        e.x = x;
        e.n = Math.max(x.length, Math.min(50, t.n | 0));
      }
      if (e.s || e.x) out.topics[code] = e;
    });
    return out;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      state = (raw && clean(JSON.parse(raw))) || fresh();
    } catch (e) { saveOK = false; }
  }

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); saveOK = true; }
    catch (e) { saveOK = false; }
  }

  function statusOf(code) { var t = state.topics[code]; return t && t.s ? t.s : 0; }
  function dateOf(code) { var t = state.topics[code]; return t && t.d ? t.d : null; }
  function ticked(code) { var t = state.topics[code]; return t && t.x ? t.x : []; }
  function sectionCount(code) { var t = state.topics[code]; return t && t.n ? t.n : 0; }

  function entry(code) { return state.topics[code] || (state.topics[code] = {}); }
  function tidy(code) { var t = state.topics[code]; if (t && !t.s && !t.x) delete state.topics[code]; }

  var autoStudied = false;   // this visit's last tick completed the chapter and marked it Studied

  function setStatus(code, s) {
    var t = entry(code);
    if (s) { t.s = s; t.d = today(); }
    else { delete t.s; delete t.d; }
    autoStudied = false;
    tidy(code);
    save();
    render();
  }

  function toggleSection(key) {
    var t = entry(here.code);
    var keys = sections.map(function (sec) { return sec.key; });
    var x = (t.x || []).filter(function (k) { return keys.indexOf(k) >= 0; });   // drop renamed headings
    var i = x.indexOf(key);
    if (i >= 0) x.splice(i, 1); else x.push(key);
    if (x.length) { t.x = x; t.n = sections.length; }
    else { delete t.x; delete t.n; }
    autoStudied = false;
    if (!t.s && x.length === sections.length) { t.s = 1; t.d = today(); autoStudied = true; }
    tidy(here.code);
    save();
    render();
  }

  // ---------- dates (local calendar days) ----------

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDay(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysSince(s) { return Math.round((parseDay(today()) - parseDay(s)) / 86400000); }
  function ago(s) { var n = daysSince(s); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago'; }
  function niceDate(s) { return parseDay(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }

  // ---------- topics, read from the sidebar ----------

  var topics = [];
  var file = decodeURIComponent(location.pathname.split('/').pop() || '') || 'index.html';
  var here = null, meter = null, summary = null, cards = [], sections = [];

  function readTopics() {
    var links = document.querySelectorAll('aside a[href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var m = /^([A-C]\d+\.\d+)\s+(.+?)(\s*\(HL\))?$/.exec(a.textContent.replace(/\s+/g, ' ').trim());
      if (!m) continue;
      var section = a.closest('.nav-section');
      var heading = section && section.querySelector('.nav-heading');
      var t = {
        code: m[1], title: m[2], hl: !!m[3], href: a.getAttribute('href'),
        strand: m[1].charAt(0),
        strandName: heading ? heading.textContent.replace(/^Strand\s+[A-C]\s*[—–-]\s*/, '') : '',
        link: a, dots: []
      };
      topics.push(t);
      if (t.href === file) here = t;
    }
  }

  function counted() { return topics.filter(function (t) { return state.level === 'HL' || !t.hl; }); }

  function stats(list) {
    var studied = 0, confident = 0;
    list.forEach(function (t) {
      var s = statusOf(t.code);
      if (s >= 1) studied++;
      if (s === 2) confident++;
    });
    return { total: list.length, studied: studied, confident: confident };
  }

  // ---------- small builders ----------

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function makeDot(s, spoken) {
    var d = el('span', 'pg-dot');
    d.setAttribute('aria-hidden', spoken ? 'false' : 'true');
    if (spoken) d.appendChild(el('span', 'pg-sr'));
    setDot(d, s);
    return d;
  }

  function setDot(d, s) {
    d.setAttribute('data-s', s);
    d.title = LABELS[s];
    if (d.firstChild) d.firstChild.textContent = ' (' + LABELS[s] + ')';
  }

  function makeBar() {
    var b = el('span', 'pg-bar');
    b.setAttribute('aria-hidden', 'true');
    b.appendChild(el('i', 'c'));
    b.appendChild(el('i', 's'));
    return b;
  }

  function fillBar(b, st) {
    var c = st.total ? st.confident / st.total * 100 : 0;
    var s = st.total ? (st.studied - st.confident) / st.total * 100 : 0;
    b.children[0].style.width = c + '%';
    b.children[1].style.width = s + '%';
  }

  // ---------- sidebar: a dot per chapter + an overall meter ----------

  function buildSidebar() {
    topics.forEach(function (t) {
      t.link.classList.add('pg-link');
      var d = makeDot(0, true);
      t.link.appendChild(d);
      t.dots.push(d);
    });
    var sub = document.querySelector('aside .sub');
    if (!sub) return;
    meter = el('a', 'pg-meter');
    meter.href = 'index.html#progress';
    meter.appendChild(el('span', 'pg-meter-label', 'Your progress'));
    meter.appendChild(el('span', 'pg-meter-num'));
    meter.appendChild(makeBar());
    sub.parentNode.insertBefore(meter, sub.nextSibling);
  }

  // ---------- chapter page: Not started / Studied / Confident ----------

  function buildCard(label, parent, before, extraClass) {
    var box = el('div', 'pg-card' + (extraClass ? ' ' + extraClass : ''));
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Your progress on ' + here.code);
    box.appendChild(el('span', 'pg-label', label));
    var seg = el('div', 'pg-seg');
    [0, 1, 2].forEach(function (s) {
      var b = el('button');
      b.type = 'button';
      b.setAttribute('data-s', s);
      b.appendChild(makeDot(s, false));
      b.appendChild(document.createTextNode(LABELS[s]));
      b.addEventListener('click', function () { setStatus(here.code, s); });
      seg.appendChild(b);
    });
    box.appendChild(seg);
    var note = el('p', 'pg-note');
    note.setAttribute('aria-live', 'polite');
    box.appendChild(note);
    parent.insertBefore(box, before);
    cards.push({ seg: seg, note: note });
  }

  function buildCards() {
    var main = document.querySelector('main');
    var h1 = main && main.querySelector('h1');
    if (!h1) return;
    buildCard('Your progress', main, h1.nextSibling);
    var end = main.querySelector('.next-prev') || main.querySelector('.footer');
    buildCard('Finished this chapter?', main, end, 'pg-end');
  }

  // a Done tick on each section heading (Key concepts, Case studies, Glossary, Check your understanding)
  function buildSections() {
    var hs = document.querySelectorAll('main h2');
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      var title = h.textContent.replace(/\s+/g, ' ').trim();
      if (/^teacher/i.test(title)) continue;
      var key = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
      if (!key) continue;
      var b = el('button', 'pg-tick');
      b.type = 'button';
      b.setAttribute('aria-label', title + ' done');
      b.appendChild(el('span', 'pg-box'));
      b.appendChild(el('span', 'pg-tick-text'));
      b.addEventListener('click', toggleSection.bind(null, key));
      // the tick sits beside the heading, not inside it, so the heading still reads as just its title
      var row = el('div', 'pg-h2row');
      h.parentNode.insertBefore(row, h);
      row.appendChild(h);
      row.appendChild(b);
      sections.push({ key: key, btn: b });
    }
  }

  function cardNote() {
    var s = statusOf(here.code), d = dateOf(here.code), txt;
    if (!saveOK) return 'This browser is not letting the page save, so your marks will be lost when you close it.';
    var done = ticked(here.code).length, total = sections.length;
    var part = total ? done + ' of ' + total + ' sections ticked. ' : '';
    if (s === 0) {
      txt = done
        ? part + 'Tick the rest as you finish them and the chapter is marked Studied.'
        : 'Tick each section’s Done as you finish it, or mark the whole chapter Studied. Saved in this browser only.';
    } else if (s === 1) {
      txt = (autoStudied ? 'Every section ticked, so the chapter is marked Studied. ' : 'Studied ' + ago(d) + '. ' + part) +
        'Mark it Confident once you can answer Check your understanding without looking at the model answers.';
    } else {
      txt = 'Confident since ' + niceDate(d) + '. It comes back on your Revise next list after three weeks.';
    }
    if (here.hl && state.level === 'SL') txt += ' This is an HL topic, so it is not counted in your SL progress.';
    return txt;
  }

  // ---------- contents page: summary, strands, Revise next, backup ----------

  function buildSummary() {
    var main = document.querySelector('main');
    var h1 = main && main.querySelector('h1');
    if (!h1) return;
    var after = (h1.nextElementSibling && h1.nextElementSibling.tagName === 'P') ? h1.nextElementSibling : h1;

    summary = el('section', 'pg-summary');
    summary.id = 'progress';

    var head = el('div', 'pg-head');
    head.appendChild(el('h2', null, 'Your progress'));
    var wrap = el('div', 'pg-level-wrap');
    wrap.appendChild(el('span', 'pg-label', 'Your level'));
    var lv = el('div', 'pg-seg');
    lv.setAttribute('role', 'group');
    lv.setAttribute('aria-label', 'Your level');
    ['SL', 'HL'].forEach(function (l) {
      var b = el('button', null, l);
      b.type = 'button';
      b.setAttribute('data-l', l);
      b.addEventListener('click', function () { state.level = l; save(); render(); });
      lv.appendChild(b);
    });
    wrap.appendChild(lv);
    head.appendChild(wrap);
    summary.appendChild(head);

    var big = makeBar();
    big.classList.add('pg-big');
    summary.appendChild(big);
    summary.appendChild(el('p', 'pg-count'));

    var legend = el('p', 'pg-legend');
    [0, 1, 2].forEach(function (s) {
      var item = el('span');
      item.appendChild(makeDot(s, false));
      item.appendChild(document.createTextNode(LABELS[s]));
      legend.appendChild(item);
    });
    summary.appendChild(legend);

    summary.appendChild(el('div', 'pg-strands'));
    summary.appendChild(el('h3', null, 'Revise next'));
    summary.appendChild(el('div', 'pg-next-wrap'));
    summary.appendChild(buildBackup());

    after.parentNode.insertBefore(summary, after.nextSibling);

    // a dot (and "2/4 sections" while part-done) beside each chapter in the contents list too
    topics.forEach(function (t) {
      var links = main.querySelectorAll('li a[href]');
      for (var i = 0; i < links.length; i++) {
        if (links[i].getAttribute('href') !== t.href) continue;
        var d = makeDot(0, true);
        var part = el('span', 'pg-part');
        links[i].parentNode.insertBefore(part, links[i].nextSibling);
        links[i].parentNode.insertBefore(d, part);
        t.dots.push(d);
        t.part = part;
      }
    });
  }

  function partText(t) {
    var done = ticked(t.code).length;
    return done ? done + ' of ' + sectionCount(t.code) + ' sections ticked' : '';
  }

  function byDate(a, b) { return dateOf(a.code) < dateOf(b.code) ? -1 : 1; }

  function reviseNext() {
    var list = counted();
    var going = list.filter(function (t) { return statusOf(t.code) === 0 && ticked(t.code).length; })
      .map(function (t) { return { t: t, why: 'in progress: ' + partText(t) }; });
    var studied = list.filter(function (t) { return statusOf(t.code) === 1; })
      .sort(byDate)
      .map(function (t) { return { t: t, why: 'studied ' + ago(dateOf(t.code)) + ', not yet confident' }; });
    var unstarted = list.filter(function (t) { return statusOf(t.code) === 0 && !ticked(t.code).length; })
      .map(function (t) { return { t: t, why: 'not started' }; });
    var stale = list.filter(function (t) { return statusOf(t.code) === 2 && daysSince(dateOf(t.code)) >= REFRESH_DAYS; })
      .sort(byDate)
      .map(function (t) { return { t: t, why: 'confident ' + ago(dateOf(t.code)) + ', worth a refresh' }; });
    return going.concat(studied, unstarted, stale).slice(0, NEXT_MAX);
  }

  function renderSummary(st) {
    var btns = summary.querySelectorAll('button[data-l]');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-l') === state.level ? 'true' : 'false');

    fillBar(summary.querySelector('.pg-big'), st);
    summary.querySelector('.pg-count').textContent =
      st.studied + ' of ' + st.total + ' ' + state.level + ' topics studied · ' + st.confident + ' confident';

    var strands = summary.querySelector('.pg-strands');
    strands.textContent = '';
    var seen = {};
    counted().forEach(function (t) {
      if (seen[t.strand]) return;
      seen[t.strand] = true;
      var sst = stats(counted().filter(function (x) { return x.strand === t.strand; }));
      var row = el('div', 'pg-strand');
      var name = el('span');
      name.appendChild(el('strong', null, t.strand + ' '));
      name.appendChild(document.createTextNode(t.strandName));
      row.appendChild(name);
      var bar = makeBar();
      fillBar(bar, sst);
      row.appendChild(bar);
      row.appendChild(el('span', 'pg-strand-num', sst.studied + '/' + sst.total));
      strands.appendChild(row);
    });

    var wrap = summary.querySelector('.pg-next-wrap');
    wrap.textContent = '';
    var next = reviseNext();
    if (!next.length) {
      wrap.appendChild(el('p', 'pg-empty', 'Nothing due — every topic is marked Confident within the last three weeks.'));
      return;
    }
    var ol = el('ol', 'pg-next');
    next.forEach(function (n) {
      var li = el('li');
      var a = el('a', null, n.t.code + ' ' + n.t.title + (n.t.hl ? ' (HL)' : ''));
      a.href = n.t.href;
      li.appendChild(a);
      li.appendChild(el('span', 'pg-why', n.why));
      ol.appendChild(li);
    });
    wrap.appendChild(ol);
  }

  // ---------- moving progress between devices ----------

  var CODE_PREFIX = 'IBDT1.';

  function exportCode() { return CODE_PREFIX + btoa(JSON.stringify(state)); }

  function importCode(text) {
    var s = (text || '').replace(/\s+/g, '');
    if (s.indexOf(CODE_PREFIX) !== 0) return null;
    try { return clean(JSON.parse(atob(s.slice(CODE_PREFIX.length)))); }
    catch (e) { return null; }
  }

  function buildBackup() {
    var det = el('details', 'pg-backup');
    det.appendChild(el('summary', null, 'Saved in this browser only — move it to another device'));
    det.appendChild(el('p', null,
      'Your marks are kept in this browser on this device. Nothing is sent to a server, so no one else (your teacher included) can see them. ' +
      'To carry them to another device or browser, copy your progress code here and paste it into this page there.'));

    var msg = el('p', 'pg-msg');
    msg.setAttribute('role', 'status');
    var box = el('textarea');
    box.setAttribute('aria-label', 'Progress code');
    box.placeholder = 'Paste a progress code here';

    var copy = el('button', 'pg-btn', 'Copy progress code');
    copy.type = 'button';
    copy.addEventListener('click', function () {
      var code = exportCode();
      var shown = function () {
        box.value = code;
        box.select();
        msg.textContent = 'Your code is in the box above: select it and copy it.';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () { msg.textContent = 'Copied. Paste it into this page on your other device.'; }, shown);
      } else shown();
    });

    var paste = el('button', 'pg-btn', 'Load pasted code');
    paste.type = 'button';
    paste.addEventListener('click', function () {
      var o = importCode(box.value);
      if (!o) { msg.textContent = 'That doesn’t look like a progress code. Copy the whole code and try again.'; return; }
      if (!window.confirm('Replace the progress saved in this browser with the pasted code?')) return;
      state = o;
      save();
      render();
      box.value = '';
      msg.textContent = 'Progress loaded.';
    });

    var reset = el('button', 'pg-btn pg-danger', 'Reset all progress');
    reset.type = 'button';
    reset.addEventListener('click', function () {
      if (!window.confirm('Clear every mark saved in this browser? This cannot be undone.')) return;
      var level = state.level;
      state = fresh();
      state.level = level;
      save();
      render();
      msg.textContent = 'Progress cleared.';
    });

    det.appendChild(copy);
    det.appendChild(box);
    det.appendChild(paste);
    det.appendChild(reset);
    det.appendChild(msg);
    return det;
  }

  // ---------- render everything from state ----------

  function render() {
    topics.forEach(function (t) {
      var s = statusOf(t.code);
      t.dots.forEach(function (d) { setDot(d, s); });
      if (t.part) {
        var done = ticked(t.code).length;
        t.part.textContent = s === 0 && done ? done + '/' + sectionCount(t.code) + ' sections' : '';
      }
    });
    if (sections.length) {
      var x = ticked(here.code);
      sections.forEach(function (sec) {
        var on = x.indexOf(sec.key) >= 0;
        sec.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        sec.btn.lastChild.textContent = on ? 'Done' : 'Mark done';
      });
    }
    var st = stats(counted());
    if (meter) {
      meter.querySelector('.pg-meter-num').textContent = st.studied + '/' + st.total + ' studied';
      fillBar(meter.querySelector('.pg-bar'), st);
    }
    cards.forEach(function (c) {
      var s = statusOf(here.code);
      var btns = c.seg.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', +btns[i].getAttribute('data-s') === s ? 'true' : 'false');
      c.note.textContent = cardNote();
    });
    if (summary) renderSummary(st);
  }

  function init() {
    readTopics();
    if (!topics.length) return;
    var style = el('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    load();
    buildSidebar();
    if (here) { buildSections(); buildCards(); }
    if (file === 'index.html') buildSummary();
    render();
    if (summary && location.hash === '#progress') summary.scrollIntoView();
    // keep other open tabs of the book in step
    window.addEventListener('storage', function (e) {
      if (e.key === KEY || e.key === null) { load(); render(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
