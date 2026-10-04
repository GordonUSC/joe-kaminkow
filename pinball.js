/* Joe K attract mode: a small, honest pinball machine.
   The ball bounces off the shapes painted in the playfield art (positions measured from the image).
   Every lit bumper, lane or target reveals the next verified moment of his career on the dot-matrix display.
   Left flipper: Z, Left arrow, or the left half of the table. Right flipper: M, Right arrow, or the right half. */
(function () {
  var cv = document.getElementById('table'); if (!cv) return;
  var ctx = cv.getContext('2d');
  var dmd = document.getElementById('dmd'), dctx = dmd.getContext('2d');
  var FACTS = window.JOEK_FACTS || [];
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bg = new Image(); bg.src = 'art/playfield.webp';
  var IMG_RATIO = 2688 / 1520;
  var W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);

  /* ---------- sound: opt-in, one owner ---------- */
  var SND = {}, soundOn = false, music = document.getElementById('attract');
  ['coin', 'flipper', 'bumper', 'knocker', 'reels'].forEach(function (k) { var a = new Audio('audio/' + k + '.mp3'); a.preload = 'auto'; SND[k] = a; });
  var VOL = { coin: .8, flipper: .45, bumper: .7, knocker: 1, reels: .8 };
  /* stereo, in honor of Laser War (1987), listed as the first pinball with stereo sound: each hit plays from where it happens on the table */
  var AC = null, BUF = {};
  function initAudio() {
    if (AC) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
    Object.keys(SND).forEach(function (k) { fetch('audio/' + k + '.mp3').then(function (r) { return r.arrayBuffer(); }).then(function (b) { return new Promise(function (ok, no) { AC.decodeAudioData(b, ok, no); }); }).then(function (buf) { BUF[k] = buf; }).catch(function () {}); });
  }
  function sfx(k, x) {
    if (!soundOn) return;
    if (AC && BUF[k]) { try { if (AC.state === 'suspended') AC.resume(); var src = AC.createBufferSource(), g = AC.createGain(), node = g; src.buffer = BUF[k]; g.gain.value = VOL[k];
      if (AC.createStereoPanner && typeof x === 'number') { var pn = AC.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, (x / W) * 2 - 1)) * .85; g.connect(pn); node = pn; }
      src.connect(g); node.connect(AC.destination); src.start(); return; } catch (e) {} }
    if (!SND[k]) return; try { var c = SND[k].cloneNode(); c.volume = VOL[k]; c.play().catch(function () {}); } catch (e) {}
  }
  var sb = document.getElementById('sound'), mb = document.getElementById('musicbtn');
  function paintSound() { sb.setAttribute('aria-pressed', soundOn); sb.textContent = soundOn ? 'Sound on' : 'Sound off'; }
  sb.addEventListener('click', function () { soundOn = !soundOn; if (soundOn) initAudio(); if (!soundOn) { music.pause(); paintMusic(); } paintSound(); });
  function paintMusic() { mb.setAttribute('aria-pressed', !music.paused); mb.textContent = music.paused ? 'Music off' : 'Music on'; }
  mb.addEventListener('click', function () { if (music.paused) { music.volume = .35; music.play().then(paintMusic, paintMusic); } else { music.pause(); paintMusic(); } });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { music.pause(); paintMusic(); } });

  /* ---------- dot-matrix display, 128 x 32 ---------- */
  var off = document.createElement('canvas'); off.width = 128; off.height = 32; var octx = off.getContext('2d');
  var dmdLines = ['INSERT COIN', ''], dmdBlink = true, dmdT = 0;
  function say(a, b, blink) { dmdLines = [a || '', b || '']; dmdBlink = !!blink; var live = document.getElementById('dmdtext'); if (live) live.textContent = (a || '') + ' ' + (b || ''); }
  function drawDMD(t) {
    octx.fillStyle = '#000'; octx.fillRect(0, 0, 128, 32);
    var show = !dmdBlink || Math.floor(t / 520) % 2 === 0;
    if (show) {
      octx.fillStyle = '#fff'; octx.textAlign = 'center'; octx.textBaseline = 'middle';
      var two = dmdLines[1] !== '';
      fitText(dmdLines[0], two ? 9 : 16, two ? 11 : 17);
      if (two) fitText(dmdLines[1], 8, 25);
    }
    var px = octx.getImageData(0, 0, 128, 32).data, cw = dmd.width / 128, ch = dmd.height / 32;
    dctx.fillStyle = '#120400'; dctx.fillRect(0, 0, dmd.width, dmd.height);
    for (var y = 0; y < 32; y++) for (var x = 0; x < 128; x++) {
      var on = px[(y * 128 + x) * 4] > 110;
      dctx.fillStyle = on ? '#ff8a1e' : '#2a0e02';
      dctx.beginPath(); dctx.arc(x * cw + cw / 2, y * ch + ch / 2, Math.min(cw, ch) * (on ? .44 : .3), 0, 6.283); dctx.fill();
    }
  }
  function fitText(s, size, y) { var fs = size; octx.font = fs + 'px Silkscreen, monospace'; while (octx.measureText(s).width > 124 && fs > 5) { fs--; octx.font = fs + 'px Silkscreen, monospace'; } octx.fillText(s, 64, y); }

  /* ---------- table geometry (relative to the painted art) ---------- */
  var R = { ball: .022 };
  var BUMP = [[.50, .185, .072], [.35, .285, .072], [.65, .285, .072]];
  var REELS = [.36, .49, .64, .555];
  var LANES = [[.34, .112], [.40, .112], [.54, .112], [.60, .112]];
  var TARGETS = [[.50, .615], [.50, .785]];
  var WALLS = [
    [.04, .10, .15, .025], [.15, .025, .85, .025], [.85, .025, .96, .10],
    [.04, .10, .04, .78], [.96, .10, .96, .78],
    [.04, .78, .265, .842], [.96, .78, .735, .842],
    [.20, .675, .20, .795], [.20, .795, .315, .79], [.80, .675, .80, .795], [.80, .795, .685, .79],
    [.36, .49, .64, .49], [.36, .555, .64, .555], [.36, .49, .36, .555], [.64, .49, .64, .555]
  ];
  var SLINGS = [[.20, .675, .315, .79], [.80, .675, .685, .79]];
  var FL = [{ px: .265, py: .842, dir: 1, a: .45, up: false, w: 0 }, { px: .735, py: .842, dir: -1, a: .45, up: false, w: 0 }];
  var FL_LEN = .175, FL_R = .017, FL_DOWN = .45, FL_UP = -.42;

  var ball = null, score = 0, balls = 3, factI = 0, playing = false, idleT = 0, auto = true, lit = {}, ended = false;
  function resize() {
    var wrap = cv.parentElement.getBoundingClientRect();
    W = Math.floor(wrap.width); H = Math.floor(W * IMG_RATIO);
    var small = innerWidth < 860, maxH = small ? Math.max(360, innerHeight - (dmd.getBoundingClientRect().height || 90) - 96) : Math.max(380, innerHeight * .86);
    if (H > maxH) { H = Math.floor(maxH); W = Math.floor(H / IMG_RATIO); }
    cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var dw = dmd.getBoundingClientRect().width; dmd.width = Math.max(256, Math.floor(dw * dpr)); dmd.height = Math.floor(dmd.width / 4);
  }
  function serve() { ball = { x: .5 * W + (Math.random() - .5) * .2 * W, y: .06 * H, vx: (Math.random() - .5) * .6 * W, vy: .2 * H }; }

  /* ---------- physics ---------- */
  function closest(px, py, ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0; return [ax + t * dx, ay + t * dy]; }
  function hitSeg(ax, ay, bx, by, rad, rest, kick, svx, svy) {
    var c = closest(ball.x, ball.y, ax, ay, bx, by), dx = ball.x - c[0], dy = ball.y - c[1], d = Math.hypot(dx, dy), r = R.ball * W + rad;
    if (d >= r || d === 0) return false;
    var nx = dx / d, ny = dy / d; ball.x = c[0] + nx * r; ball.y = c[1] + ny * r;
    var rvx = ball.vx - (svx || 0), rvy = ball.vy - (svy || 0), vn = rvx * nx + rvy * ny;
    if (vn < 0) { ball.vx -= (1 + rest) * vn * nx; ball.vy -= (1 + rest) * vn * ny; }
    if (kick) { ball.vx += nx * kick; ball.vy += ny * kick; }
    return true;
  }
  function flipEnd(f) { var ang = f.a; return [f.px * W + Math.cos(ang) * FL_LEN * W * f.dir, f.py * H + Math.sin(ang) * FL_LEN * W]; }
  function step(dt) {
    FL.forEach(function (f) { var target = f.up ? FL_UP : FL_DOWN, prev = f.a, sp = 28 * dt; f.a += Math.max(-sp, Math.min(sp, target - f.a)); f.w = (f.a - prev) / dt; });
    if (!ball) return;
    ball.vy += 1.15 * H * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    var max = 2.6 * H, sp = Math.hypot(ball.vx, ball.vy); if (sp > max) { ball.vx *= max / sp; ball.vy *= max / sp; }
    WALLS.forEach(function (w) { hitSeg(w[0] * W, w[1] * H, w[2] * W, w[3] * H, 0, .45); });
    SLINGS.forEach(function (s, i) { if (hitSeg(s[0] * W, s[1] * H, s[2] * W, s[3] * H, 0, .4, .55 * W)) award('sling' + i, 1000); });
    BUMP.forEach(function (b, i) {
      var dx = ball.x - b[0] * W, dy = ball.y - b[1] * H, d = Math.hypot(dx, dy), r = R.ball * W + b[2] * W;
      if (d < r && d > 0) { var nx = dx / d, ny = dy / d; ball.x = b[0] * W + nx * r; ball.y = b[1] * H + ny * r; var vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { ball.vx -= 2 * vn * nx; ball.vy -= 2 * vn * ny; } ball.vx += nx * .9 * W; ball.vy += ny * .9 * W; flash['b' + i] = 1; sfx('bumper', ball.x); award('bump' + i, 5000); }
    });
    LANES.forEach(function (l, i) { if (Math.abs(ball.x - l[0] * W) < .03 * W && Math.abs(ball.y - l[1] * H) < .03 * H && !lit['lane' + i]) { lit['lane' + i] = 1; award('lane' + i, 2500); } });
    TARGETS.forEach(function (t, i) { if (Math.hypot(ball.x - t[0] * W, ball.y - t[1] * H) < .045 * W) { if (!lit['t' + i + '_cool']) { lit['t' + i + '_cool'] = 1; setTimeout(function () { lit['t' + i + '_cool'] = 0; }, 900); award('target' + i, 7500); } } });
    if (ball.y > REELS[1] * H - R.ball * W - 2 && ball.y < REELS[3] * H + R.ball * W + 2 && ball.x > REELS[0] * W && ball.x < REELS[2] * W) { if (!lit.reelcool) { lit.reelcool = 1; setTimeout(function () { lit.reelcool = 0; }, 1200); spinReels(); award('reels', 25000); } }
    FL.forEach(function (f) {
      var e = flipEnd(f), cx = closest(ball.x, ball.y, f.px * W, f.py * H, e[0], e[1]);
      var rx = cx[0] - f.px * W, ry = cx[1] - f.py * H, svx = -f.w * ry * f.dir, svy = f.w * rx * f.dir;
      hitSeg(f.px * W, f.py * H, e[0], e[1], FL_R * W, .3, 0, svx, svy);
    });
    if (ball.y > H + 40) drain();
  }

  /* ---------- the game around the physics ---------- */
  var flash = {}, reelT = 0, lastAward = {};
  function spinReels() { reelT = 1.2; sfx('reels', W / 2); }
  function award(key, pts) {
    var now = performance.now(); if (lastAward[key] && now - lastAward[key] < 350) return; lastAward[key] = now;
    score += pts; if (auto && !playing) return;
    if (FACTS.length && (key.indexOf('bump') === 0 || key.indexOf('lane') === 0 || key === 'reels' || key.indexOf('target') === 0)) nextFact();
    else say(fmt(score), 'BALL ' + (4 - balls));
  }
  function nextFact() {
    if (factI >= FACTS.length) return;
    var f = FACTS[factI++]; say(f.dmd[0], f.dmd[1]); revealCard(f.id);
    document.getElementById('progress').textContent = factI + ' of ' + FACTS.length + ' lit';
    if (factI === FACTS.length) setTimeout(replay, 1600);
  }
  function revealCard(id) { var c = document.querySelector('[data-fact="' + id + '"]'); if (c) c.classList.add('lit'); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function drain() {
    ball = null; if (auto && !playing) { setTimeout(serve, 700); return; }
    balls--; if (balls > 0) { say('BALL ' + (4 - balls), fmt(score)); setTimeout(serve, 1100); } else { replay(); }
  }
  function replay() {
    if (ended) return; ended = true; ball = null; sfx('knocker');
    say('REPLAY!', 'JOE K WINS AGAIN', false);
    setTimeout(function () { say('ENTER INITIALS', 'J O E', true); }, 2200);
    setTimeout(function () { say('THANK YOU', 'FOR 40 YEARS OF PLAY', false); document.getElementById('story').classList.add('open'); document.getElementById('after').hidden = false; document.body.classList.remove('playing'); }, 4600);
  }
  function start() {
    document.body.classList.add('lit');
    if (playing) return;
    if (innerWidth < 860) { document.body.classList.add('playing'); requestAnimationFrame(function () { document.documentElement.style.setProperty('--dmdh', dmd.parentElement.getBoundingClientRect().height + 'px'); resize(); cv.parentElement.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }); } playing = true; auto = false; ended = false; score = 0; balls = 3; factI = 0;
    document.querySelectorAll('[data-fact].lit').forEach(function (c) { c.classList.remove('lit'); });
    say('JOE K', '40 YEARS ON THE FLOOR'); setTimeout(function () { serve(); say('BALL 1', 'HIT ANYTHING THAT GLOWS'); }, 1200);
    document.getElementById('progress').textContent = '0 of ' + FACTS.length + ' lit';
  }
  document.getElementById('coin').addEventListener('click', function () {
    soundOn = true; initAudio(); paintSound(); sfx('coin'); document.body.classList.add('lit');
    say('CREDITS 1', 'PRESS START'); document.getElementById('coin').hidden = true; document.getElementById('startbtn').hidden = false; document.getElementById('startbtn').focus();
  });
  document.getElementById('silent').addEventListener('click', function () { document.getElementById('coin').hidden = true; document.getElementById('silent').hidden = true; start(); });
  document.getElementById('startbtn').addEventListener('click', function () { document.getElementById('startbtn').hidden = true; document.getElementById('silent').hidden = true; start(); });
  document.getElementById('skip').addEventListener('click', function () { FACTS.forEach(function (f) { revealCard(f.id); }); document.getElementById('story').classList.add('open'); });

  /* ---------- input ---------- */
  function set(i, on) { if (FL[i].up !== on && on) sfx('flipper', i ? W * .85 : W * .15); FL[i].up = on; idleT = 0; }
  addEventListener('keydown', function (e) { if (e.repeat) return; if (e.key === 'z' || e.key === 'Z' || e.key === 'ArrowLeft') { set(0, true); if (playing) e.preventDefault(); } if (e.key === 'm' || e.key === 'M' || e.key === '/' || e.key === 'ArrowRight') { set(1, true); if (playing) e.preventDefault(); } });
  addEventListener('keyup', function (e) { if (e.key === 'z' || e.key === 'Z' || e.key === 'ArrowLeft') set(0, false); if (e.key === 'm' || e.key === 'M' || e.key === '/' || e.key === 'ArrowRight') set(1, false); });
  function touch(e, on) { if (!playing) return; e.preventDefault(); var r = cv.getBoundingClientRect(); [].forEach.call(e.changedTouches || [e], function (t) { set((t.clientX - r.left) < r.width / 2 ? 0 : 1, on); }); }
  cv.addEventListener('touchstart', function (e) { touch(e, true); }, { passive: false });
  cv.addEventListener('touchend', function (e) { touch(e, false); }, { passive: false });
  cv.addEventListener('mousedown', function (e) { touch(e, true); }); addEventListener('mouseup', function () { set(0, false); set(1, false); });
  ['fl', 'fr'].forEach(function (id, i) { var b = document.getElementById(id); b.addEventListener('pointerdown', function (e) { e.preventDefault(); set(i, true); }); b.addEventListener('pointerup', function () { set(i, false); }); b.addEventListener('pointerleave', function () { set(i, false); }); });

  /* attract mode: the machine plays itself until someone takes over */
  function autopilot() {
    if (!ball) return;
    [0, 1].forEach(function (i) { var f = FL[i], near = ball.y > (f.py - .07) * H && ball.y < (f.py + .04) * H && Math.abs(ball.x - (f.px + f.dir * .09) * W) < .12 * W && ball.vy > 0; f.up = near; });
  }

  /* ---------- draw ---------- */
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0, W, H); else { ctx.fillStyle = '#16204a'; ctx.fillRect(0, 0, W, H); }
    BUMP.forEach(function (b, i) { if (flash['b' + i] > 0) { ctx.fillStyle = 'rgba(255,240,180,' + flash['b' + i] * .7 + ')'; ctx.beginPath(); ctx.arc(b[0] * W, b[1] * H, b[2] * W * 1.15, 0, 6.283); ctx.fill(); flash['b' + i] -= .06; } });
    LANES.forEach(function (l, i) { if (lit['lane' + i]) { ctx.fillStyle = 'rgba(255,200,60,.85)'; ctx.beginPath(); ctx.arc(l[0] * W, l[1] * H, .018 * W, 0, 6.283); ctx.fill(); } });
    if (reelT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (Math.sin(t / 40) * .2 + .25) + ')'; ctx.fillRect(REELS[0] * W, REELS[1] * H, (REELS[2] - REELS[0]) * W, (REELS[3] - REELS[1]) * H); }
    FL.forEach(function (f) { var e = flipEnd(f); ctx.lineCap = 'round'; ctx.strokeStyle = '#7a0d0d'; ctx.lineWidth = FL_R * 2 * W + 4; ctx.beginPath(); ctx.moveTo(f.px * W, f.py * H); ctx.lineTo(e[0], e[1]); ctx.stroke(); ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = FL_R * 2 * W - 2; ctx.stroke(); });
    if (ball) { var g = ctx.createRadialGradient(ball.x - 3, ball.y - 4, 1, ball.x, ball.y, R.ball * W); g.addColorStop(0, '#ffffff'); g.addColorStop(.35, '#c9cfdb'); g.addColorStop(1, '#3b4250'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ball.x, ball.y, R.ball * W, 0, 6.283); ctx.fill(); }
  }
  var last = 0;
  function loop(t) {
    var dt = Math.min(.033, (t - last) / 1000 || .016); last = t;
    if (auto) autopilot(); else { idleT += dt; }
    if (reelT > 0) reelT -= dt;
    var n = 4; for (var i = 0; i < n; i++) step(dt / n);
    draw(t); drawDMD(t);
    requestAnimationFrame(loop);
  }
  resize(); addEventListener('resize', resize);
  say('INSERT COIN', 'JOE K  40 YEARS ON THE FLOOR', true);
  if (!reduce) serve();
  document.fonts && document.fonts.load('10px Silkscreen').then(function () {}, function () {});
  requestAnimationFrame(loop);
})();
