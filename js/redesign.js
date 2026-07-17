/* dhruvc.com redesign interactions: theme, marginalia, whispers, filters,
   bell, moon, reels, seahorse. progressive enhancement: everything reads fine without this file. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function isMobile() { return window.matchMedia('(max-width: 940px)').matches; }
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  var inkColor = ''; // cached --ink; refreshed on theme change so canvases don't force style reads per frame
  function refreshInk() { inkColor = cssVar('--ink'); }

  /* ---------- theme toggle (init script in <head> sets data-theme pre-paint) ---------- */
  var themeBtn = document.querySelector('.theme-toggle');
  var sysDark = window.matchMedia('(prefers-color-scheme: dark)');
  function setThemeButton() {
    if (!themeBtn) return;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeBtn.setAttribute('aria-label', dark ? 'switch to light mode' : 'switch to dark mode');
    var canvas = themeBtn.querySelector('canvas.themepx');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 13, 13);
    ctx.fillStyle = inkColor || cssVar('--ink');
    var x, y;
    if (dark) {
      // pixel sun: small disc + rays
      for (y = 0; y < 13; y++) for (x = 0; x < 13; x++) {
        var dx = x - 6, dy = y - 6;
        if (dx * dx + dy * dy <= 6) ctx.fillRect(x, y, 1, 1);
      }
      [[6, 0], [6, 12], [0, 6], [12, 6], [2, 2], [10, 2], [2, 10], [10, 10]].forEach(function (p) {
        ctx.fillRect(p[0], p[1], 1, 1);
      });
    } else {
      // pixel crescent: outer disc minus offset disc
      for (y = 0; y < 13; y++) for (x = 0; x < 13; x++) {
        var ox = x - 6, oy = y - 6, ix = x - 8.5, iy = y - 5;
        if (ox * ox + oy * oy <= 30 && ix * ix + iy * iy > 26) ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    refreshInk();
    setThemeButton();
    drawMoon();
    drawBell();
    swapBandcamp();
  }
  function swapBandcamp() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('.bc-embed iframe[data-src-dark]').forEach(function (frame) {
      var want = dark ? frame.dataset.srcDark : frame.dataset.srcLight;
      if (frame.getAttribute('src') !== want) frame.setAttribute('src', want);
    });
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var toDark = document.documentElement.getAttribute('data-theme') !== 'dark';
      try {
        // store only when the choice differs from the system, so system changes keep working
        if (toDark === sysDark.matches) localStorage.removeItem('theme');
        else localStorage.setItem('theme', toDark ? 'dark' : 'light');
      } catch (e) { /* private mode etc */ }
      applyTheme(toDark ? 'dark' : 'light');
    });
  }
  if (typeof sysDark.addEventListener === 'function') {
    sysDark.addEventListener('change', function (e) {
      var stored = null;
      try { stored = localStorage.getItem('theme'); } catch (err) {}
      if (!stored) applyTheme(e.matches ? 'dark' : 'light');
    });
  }
  setThemeButton();

  /* ---------- marginalia ---------- */
  var marginsEl = document.querySelector('[data-margins]');
  document.querySelectorAll('button.mn').forEach(function (trigger) {
    var note = document.getElementById(trigger.getAttribute('aria-describedby'));
    if (!note || !marginsEl) return;
    // hoist the inline note into the margin column
    marginsEl.appendChild(note);

    function pin() {
      if (isMobile()) return;
      note.style.top = (trigger.getBoundingClientRect().top - marginsEl.getBoundingClientRect().top - 26) + 'px';
      note.classList.add('pinned');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function unpin() {
      if (note.classList.contains('inline')) return;
      note.classList.remove('pinned');
      trigger.setAttribute('aria-expanded', 'false');
    }
    trigger.addEventListener('mouseenter', pin);
    trigger.addEventListener('focus', pin);
    trigger.addEventListener('mouseleave', unpin);
    trigger.addEventListener('blur', unpin);
    trigger.addEventListener('click', function () {
      if (isMobile()) {
        var open = note.classList.contains('inline');
        if (open) {
          note.classList.remove('inline', 'pinned');
          marginsEl.appendChild(note);
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          note.classList.add('inline', 'pinned');
          var host = trigger.closest('p, li') || trigger.parentElement;
          host.insertAdjacentElement('afterend', note);
          trigger.setAttribute('aria-expanded', 'true');
        }
      } else {
        if (note.classList.contains('pinned')) unpin(); else pin();
      }
    });
  });

  /* ---------- ledger whispers ---------- */
  document.querySelectorAll('ol.ledger').forEach(function (ol) {
    var whisper = marginsEl && marginsEl.querySelector('.whisper');
    if (!whisper) return;
    ol.querySelectorAll('li[data-desc]').forEach(function (li) {
      li.addEventListener('mouseenter', function () {
        whisper.textContent = li.getAttribute('data-desc') || '';
        whisper.style.top = (li.getBoundingClientRect().top - marginsEl.getBoundingClientRect().top - 4) + 'px';
        whisper.classList.add('on');
      });
      li.addEventListener('mouseleave', function () { whisper.classList.remove('on'); });
    });
  });

  /* ---------- ink filters ---------- */
  document.querySelectorAll('.filters').forEach(function (filterEl) {
    var scope = filterEl.closest('article') || document;
    var active = null;
    filterEl.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        active = (active === btn.dataset.f) ? null : btn.dataset.f;
        filterEl.querySelectorAll('button').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.dataset.f === active));
        });
        scope.querySelectorAll('ol.ledger li').forEach(function (li) {
          li.classList.toggle('dim', active !== null && li.getAttribute('data-ink') !== active);
        });
      });
    });
  });

  /* ---------- bell (+ the "om" egg) ---------- */
  var bell = document.querySelector('button.bell');
  var ding = document.getElementById('ding');
  var bellAudio = document.getElementById('bell-audio');
  var feeling = document.getElementById('feeling');
  var feelings = ['be happy', 'be well', 'be at ease', 'know stillness'];
  var feelingIdx = 0;
  function ring() {
    if (!bell) return;
    bell.classList.remove('rung');
    void bell.offsetWidth;
    bell.classList.add('rung');
    if (bellAudio) { try { bellAudio.currentTime = 0; bellAudio.play(); } catch (e) {} }
    if (feeling) {
      feelingIdx = (feelingIdx + 1) % feelings.length;
      feeling.textContent = feelings[feelingIdx];
    }
    if (ding) {
      ding.classList.add('on');
      setTimeout(function () { ding.classList.remove('on'); }, 1400);
    }
  }
  if (bell) bell.addEventListener('click', ring);
  var tail = '';
  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key && e.key.length === 1) {
      tail = (tail + e.key.toLowerCase()).slice(-2);
      if (tail === 'om') ring();
    }
  });

  /* ---------- seahorse bubbles ---------- */
  var shorse = document.querySelector('.shorse');
  if (shorse) {
    shorse.addEventListener('click', function () {
      // three bubbles from the mouth (top-left of the seahorse), drifting as they rise
      [[5, 4, 14, '5px'], [9, 10, 8, '-6px'], [7, 0, 20, '3px']].forEach(function (spec, i) {
        var b = document.createElement('span');
        b.className = 'bub';
        b.setAttribute('aria-hidden', 'true');
        b.style.width = spec[0] + 'px';
        b.style.height = spec[0] + 'px';
        b.style.left = spec[1] + 'px';
        b.style.top = spec[2] + 'px';
        b.style.setProperty('--dx', spec[3]);
        b.style.animationDelay = (i * 0.18) + 's';
        shorse.appendChild(b);
        setTimeout(function () { b.remove(); }, 2400);
      });
    });
  }

  /* ---------- lunar phase (recomputed each visit) ---------- */
  var SYNODIC = 29.53058867;
  var EPOCH = Date.UTC(2000, 0, 6, 18, 14) / 86400000; // a known new moon
  var age = ((Date.now() / 86400000 - EPOCH) % SYNODIC + SYNODIC) % SYNODIC;
  var illum = (1 - Math.cos(2 * Math.PI * age / SYNODIC)) / 2;
  var waxing = age < SYNODIC / 2;
  var moonNames = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
  var moonName = moonNames[Math.round(age / (SYNODIC / 8)) % 8];
  var moonCanvas = document.querySelector('canvas.moon');
  var moonWrap = document.getElementById('moonwrap');
  if (moonWrap) moonWrap.title = moonName + ' · ' + Math.round(illum * 100) + '% lit';
  if (moonCanvas) moonCanvas.setAttribute('aria-label', "tonight's moon: " + moonName);
  function drawMoon() {
    if (!moonCanvas) return;
    var ctx = moonCanvas.getContext('2d');
    var s = moonCanvas.width;
    var r = (s - 1) / 2;
    var inkCol = inkColor || cssVar('--ink');
    ctx.clearRect(0, 0, s, s);
    for (var y = 0; y < s; y++) {
      for (var x = 0; x < s; x++) {
        var nx = (x - r) / r, ny = (y - r) / r;
        if (nx * nx + ny * ny > 1) continue;
        var chord = Math.sqrt(Math.max(0, 1 - ny * ny));
        var threshold = (1 - 2 * illum) * chord;
        var lit = waxing ? nx > threshold : nx < -threshold;
        ctx.globalAlpha = lit ? 1 : 0.16;
        ctx.fillStyle = inkCol;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- pixel bell (same one-bit style as the moon) ---------- */
  var bellCanvas = document.querySelector('canvas.bellpx');
  var BELL_BITMAP = [
    '......#......',
    '.....#.#.....',
    '....#...#....',
    '...#.....#...',
    '...#.....#...',
    '..#.......#..',
    '..#.......#..',
    '.#.........#.',
    '#############',
    '.....###.....',
    '......#......'
  ];
  function drawBell() {
    if (!bellCanvas) return;
    var ctx = bellCanvas.getContext('2d');
    ctx.clearRect(0, 0, bellCanvas.width, bellCanvas.height);
    ctx.fillStyle = inkColor || cssVar('--ink');
    BELL_BITMAP.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        if (row[x] === '#') ctx.fillRect(x, y + 1, 1, 1);
      }
    });
  }

  refreshInk();
  drawMoon();
  drawBell();
  swapBandcamp();
})();
