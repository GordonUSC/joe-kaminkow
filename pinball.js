/* JOE K: a Data East-spec machine, built the way he built the DB5: to the original.
   What is matched to the record (sources in the page footer):
   - 128 x 32 neon plasma dot matrix, orange (Data East from Lethal Weapon 3, 1992; first DMD in pinball was Data East's Checkpoint, 1991)
   - attract mode is a lamp show plus high scores ("World Record" and Highscore 2 to 4), never a ball in play
   - coin door priced USA2: 25c / $1.00 / 25c slots, 50c per play, 3 plays for $1.00; or the operator's Free Play setting
   - fire-button launch with a skill shot worth 2M, 3M, 4M on balls 1 to 3
   - ball save for the first 10 seconds; one tilt warning, then tilt
   - replay at 300,000,000 fires the knocker; match is a two-digit multiple of 10, 00 to 90
   - the slot reels hold the ball and kick it back out: the movable ball-retrieval target of his 1994 patent with Ed Cebula
   - every hit plays in stereo, for Laser War (1987), the first pinball with stereo and subwoofer sound
   Controls: Z / M or arrows for flippers, Space to fire, N to nudge, S to start. Touch: halves of the table, plus buttons. */
(function () {
  var cv = document.getElementById('table'); if (!cv) return;
  var ctx = cv.getContext('2d'), dmd = document.getElementById('dmd'), dctx = dmd.getContext('2d');
  var FACTS = window.JOEK_FACTS || [], reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bg = new Image(); bg.src = 'art/playfield.webp';
  var IMG_RATIO = 2688 / 1520, LANE = .085;
  var W = 0, H = 0, AW = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- sound: opt-in, stereo ---------- */
  var KEYS = ['coin', 'flipper', 'bumper', 'knocker', 'reels', 'vo-skill', 'vo-jackpot', 'vo-saved', 'vo-replay', 'vo-tilt', 'vo-reels'];
  var VOL = { coin: .8, flipper: .45, bumper: .7, knocker: 1, reels: .8, 'vo-skill': .9, 'vo-jackpot': .9, 'vo-saved': .9, 'vo-replay': .9, 'vo-tilt': .9, 'vo-reels': .9 };
  var SND = {}, AC = null, BUF = {}, soundOn = false, music = $('attract'), lastVo = 0;
  KEYS.forEach(function (k) { var a = new Audio('audio/' + k + '.mp3'); a.preload = 'auto'; SND[k] = a; });
  function initAudio() {
    if (AC) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
    KEYS.forEach(function (k) { fetch('audio/' + k + '.mp3').then(function (r) { return r.arrayBuffer(); }).then(function (b) { return new Promise(function (ok, no) { AC.decodeAudioData(b, ok, no); }); }).then(function (buf) { BUF[k] = buf; }).catch(function () {}); });
  }
  function sfx(k, x) {
    if (!soundOn) return;
    if (k.indexOf('vo-') === 0) { var now = performance.now(); if (now - lastVo < 1300) return; lastVo = now; }
    if (AC && BUF[k]) { try { if (AC.state === 'suspended') AC.resume(); var src = AC.createBufferSource(), g = AC.createGain(), node = g; src.buffer = BUF[k]; g.gain.value = VOL[k];
      if (AC.createStereoPanner && typeof x === 'number') { var pn = AC.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, (x / W) * 2 - 1)) * .85; g.connect(pn); node = pn; }
      src.connect(g); node.connect(AC.destination); src.start(); return; } catch (e) {} }
    try { var c = SND[k].cloneNode(); c.volume = VOL[k]; c.play().catch(function () {}); } catch (e) {}
  }
  var sb = $('sound'), mb = $('musicbtn');
  function paintSound() { sb.setAttribute('aria-pressed', soundOn); sb.textContent = soundOn ? 'Sound on' : 'Sound off'; }
  sb.addEventListener('click', function () { soundOn = !soundOn; if (soundOn) initAudio(); else { music.pause(); paintMusic(); } paintSound(); });
  function paintMusic() { mb.setAttribute('aria-pressed', !music.paused); mb.textContent = music.paused ? 'Music off' : 'Music on'; }
  mb.addEventListener('click', function () { if (music.paused) { music.volume = .3; music.play().then(paintMusic, paintMusic); } else { music.pause(); paintMusic(); } });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { music.pause(); paintMusic(); } });

  /* ---------- 128 x 32 neon plasma display ---------- */
  var off = document.createElement('canvas'); off.width = 128; off.height = 32; var octx = off.getContext('2d');
  var dmdLines = ['', ''], dmdBlink = false, dmdBig = false;
  function say(a, b, opt) { opt = opt || {}; dmdLines = [a || '', b || '']; dmdBlink = !!opt.blink; dmdBig = !!opt.big; var live = $('dmdtext'); if (live) live.textContent = (a || '') + ' ' + (b || ''); }
  /* Silkscreen is a pixel font drawn on an 8 px grid; keep it at 8 or 16 and squeeze sideways instead of shrinking, so each dot stays on the grid */
  function fit(s, size, y) { octx.font = size + 'px Silkscreen, monospace'; var w = octx.measureText(s).width; octx.save(); octx.translate(64, y); if (w > 124) octx.scale(124 / w, 1); octx.fillText(s, 0, 0); octx.restore(); }
  var dmdKey = '';
  function drawDMD(t) {
    var on = !dmdBlink || Math.floor(t / 480) % 2 === 0, key = dmdLines.join('|') + on + dmdBig + dmd.width;
    if (key === dmdKey) return; dmdKey = key;   /* redraw only when the picture changes: 4,096 dots is a lot for a phone at 60 fps */
    octx.fillStyle = '#000'; octx.fillRect(0, 0, 128, 32);
    if (on) {
      octx.fillStyle = '#fff'; octx.textAlign = 'center'; octx.textBaseline = 'top';
      if (dmdBig) { fit(dmdLines[0], 16, 2); if (dmdLines[1]) fit(dmdLines[1], 8, 22); }
      else if (dmdLines[1]) { fit(dmdLines[0], 8, 5); fit(dmdLines[1], 8, 19); }
      else fit(dmdLines[0], 16, 8);
    }
    var px = octx.getImageData(0, 0, 128, 32).data, cw = dmd.width / 128, ch = dmd.height / 32, r = Math.min(cw, ch) * .42;
    dctx.fillStyle = '#0c0300'; dctx.fillRect(0, 0, dmd.width, dmd.height);
    for (var y = 0; y < 32; y++) for (var x = 0; x < 128; x++) {
      var v = px[(y * 128 + x) * 4]; dctx.fillStyle = v > 95 ? '#ff6a1a' : v > 40 ? '#a8410f' : '#3a1205';
      dctx.beginPath(); dctx.arc(x * cw + cw / 2, y * ch + ch / 2, r, 0, 6.283); dctx.fill();
    }
  }

  /* ---------- the table: geometry measured from the painted art ---------- */
  var RB = .022;
  var BUMP = [[.50, .185, .072], [.35, .285, .072], [.65, .285, .072]];
  var REELS = [.36, .49, .64, .555];
  var LANES = [[.34, .112], [.40, .112], [.54, .112], [.60, .112]];
  var TARGETS = [[.50, .615], [.50, .785]];
  var WALLS = [[.04, .10, .15, .025], [.15, .025, .85, .025], [.85, .025, .96, .10], [.04, .10, .04, .78], [.96, .10, .96, .78],
    [.04, .78, .265, .842], [.96, .78, .735, .842], [.20, .675, .20, .795], [.20, .795, .315, .79], [.80, .675, .80, .795], [.80, .795, .685, .79],
    [.36, .49, .64, .49], [.36, .555, .64, .555], [.36, .49, .36, .555], [.64, .49, .64, .555]];
  var SLINGS = [[.20, .675, .315, .79], [.80, .675, .685, .79]];
  var LAMPS = [[.34, .112], [.40, .112], [.54, .112], [.60, .112], [.50, .615], [.50, .66], [.50, .70], [.50, .74], [.50, .785], [.39, .74], [.61, .74], [.11, .56], [.89, .56], [.06, .68], [.94, .68], [.19, .19], [.81, .19], [.33, .45], [.67, .45], [.23, .885], [.77, .885]];
  var FL = [{ px: .265, py: .842, dir: 1, a: .45, up: false, w: 0 }, { px: .735, py: .842, dir: -1, a: .45, up: false, w: 0 }];
  var FL_LEN = .175, FL_R = .017, FL_DOWN = .45, FL_UP = -.42;
  function X(r) { return r * AW; } function Y(r) { return r * H; }

  function resize() {
    var wrap = cv.parentElement.getBoundingClientRect(), small = innerWidth < 860;
    var maxH = small ? Math.max(360, innerHeight - (dmd.getBoundingClientRect().height || 90) - 150) : Math.max(380, innerHeight * .84);
    W = Math.floor(wrap.width); AW = Math.floor(W / (1 + LANE)); H = Math.floor(AW * IMG_RATIO);
    if (H > maxH) { H = Math.floor(maxH); AW = Math.floor(H / IMG_RATIO); W = Math.floor(AW * (1 + LANE)); }
    cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var dw = dmd.getBoundingClientRect().width; dmd.width = Math.max(256, Math.floor(dw * dpr)); dmd.height = Math.floor(dmd.width / 4);
  }

  /* ---------- game state ---------- */
  var HS = [['WORLD RECORD', 'JOE', 300000000], ['HIGHSCORE 2', 'GB', 275000000], ['HIGHSCORE 3', 'DBY', 250000000], ['HIGHSCORE 4', 'AST', 225000000]];
  var REPLAY_AT = 300000000;
  var mode = 'attract', credits = 0, coins = 0, freePlay = false, ball = null, ballN = 0, score = 0, factI = 0, replayGot = false;
  var launchT = 0, saveUntil = 0, tiltWarn = 0, nudges = [], tilted = false, skillLane = 0, skillLive = false, hold = 0, lit = {}, flash = {}, reelT = 0, lastAward = {};
  var LANE_X = function () { return AW + (W - AW) / 2; };
  var queue = [], queueUntil = 0, still = 0, savedThisBall = false;
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function showCredits() { say(freePlay ? 'FREE PLAY' : 'CREDITS ' + credits, freePlay || credits ? 'PRESS START' : '50 CENTS PER PLAY'); }
  function coin(value) {
    initAudio(); soundOn = true; paintSound(); sfx('coin', W * .5);
    if (value === 100) credits += 3; else { coins += value; while (coins >= 50) { coins -= 50; credits++; } }
    paintCredits(); if (mode === 'attract') showCredits(); lampsOn();
  }
  function paintCredits() { $('credits').textContent = freePlay ? 'Free play' : (credits + ' credit' + (credits === 1 ? '' : 's') + (coins ? ' + 25¢' : '')); $('startbtn').disabled = !(freePlay || credits > 0) || mode === 'game'; }
  function lampsOn() { document.body.classList.add('lit'); }

  function start() {
    if (mode === 'game') return; if (!freePlay) { if (credits < 1) { showCredits(); return; } credits--; }
    mode = 'game'; queue = []; queueUntil = 0; paintCredits(); lampsOn(); score = 0; ballN = 0; factI = 0; replayGot = false; tiltWarn = 0;
    document.querySelectorAll('[data-fact].lit').forEach(function (c) { c.classList.remove('lit'); });
    $('progress').textContent = '0 of ' + FACTS.length + ' lit';
    if (innerWidth < 860) { document.body.classList.add('playing'); requestAnimationFrame(function () { document.documentElement.style.setProperty('--dmdh', dmd.parentElement.getBoundingClientRect().height + 'px'); resize(); cv.parentElement.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }); }
    nextBall();
  }
  function nextBall() {
    ballN++; tilted = false; nudges = []; lit = {}; savedThisBall = false;
    ball = { x: LANE_X(), y: Y(.93), vx: 0, vy: 0, lane: true, rail: -1 };
    skillLane = 0; skillLive = true; say('BALL ' + ballN, 'FIRE FOR SKILL SHOT ' + (ballN + 1) + 'M');
  }
  function fire() {
    if (mode !== 'game' || !ball || !ball.lane || ball.vy) return;
    ball.vy = -2.35 * H; launchT = performance.now(); if (!savedThisBall) saveUntil = launchT + 11200; sfx('flipper', LANE_X());
    say(fmt(score), 'BALL ' + ballN);
  }
  function addScore(n) {
    score += n + 10;
    if (!replayGot && score >= REPLAY_AT) { replayGot = true; credits++; paintCredits(); sfx('knocker'); sfx('vo-replay'); say('REPLAY', fmt(score), { big: true }); }
  }
  function award(key, pts) {
    var now = performance.now(); if (lastAward[key] && now - lastAward[key] < 350) return; lastAward[key] = now;
    if (mode !== 'game' || tilted) return;
    addScore(pts);
    if (FACTS.length && /^(bump|lane|reels|target)/.test(key) && factI < FACTS.length) {
      var f = FACTS[factI++]; addScore(15000000); queue.push(f.dmd); var c = document.querySelector('[data-fact="' + f.id + '"]'); if (c) c.classList.add('lit');
      $('progress').textContent = factI + ' of ' + FACTS.length + ' lit';
    } else if (!queue.length && performance.now() > queueUntil) say(fmt(score), 'BALL ' + ballN);
  }
  function nudge() {
    if (mode !== 'game' || !ball || ball.lane || tilted) return;
    var now = performance.now(); nudges = nudges.filter(function (t) { return now - t < 2500; }); nudges.push(now);
    ball.vx += (Math.random() - .5) * .5 * AW; ball.vy -= .15 * H;
    if (nudges.length >= 3) { nudges = []; if (tiltWarn < 1) { tiltWarn++; say('WARNING', '', { blink: true }); } else { tilted = true; FL.forEach(function (f) { f.up = false; }); say('TILT', '', { big: true }); sfx('vo-tilt'); } }
  }
  function drain() {
    var now = performance.now();
    if (!tilted && now < saveUntil) { ball = { x: LANE_X(), y: Y(.93), vx: 0, vy: 0, lane: true, rail: -1 }; say('BALL SAVED', '', { big: true }); sfx('vo-saved'); saveUntil = 0; savedThisBall = true; setTimeout(fire, 900); return; }
    ball = null; if (ballN < 3) { setTimeout(nextBall, 1400); say(fmt(score), 'BALL ' + (ballN + 1)); } else endGame();
  }
  function endGame() {
    mode = 'end'; queue = []; queueUntil = 0; var m = Math.floor(Math.random() * 10) * 10, last = score % 100;
    say('MATCH', (m < 10 ? '0' : '') + m, { big: true });
    setTimeout(function () {
      if (m === last) { credits++; paintCredits(); sfx('knocker'); say('MATCH', 'CREDITS ' + credits, { big: true }); }
      var rank = HS.findIndex(function (h) { return score > h[2]; });
      setTimeout(function () {
        if (rank >= 0) { HS.splice(rank, 0, ['', 'JOE', score]); HS.length = 4; HS.forEach(function (h, i) { h[0] = i ? 'HIGHSCORE ' + (i + 1) : 'WORLD RECORD'; }); say('ENTER INITIALS', 'J O E', { blink: true }); }
        else say(fmt(score), 'THANKS FOR PLAYING');
        setTimeout(function () { mode = 'attract'; document.body.classList.remove('playing'); $('story').classList.add('open'); paintCredits(); attractI = 0; attractT = 0; }, 3600);
      }, 1800);
    }, 1600);
  }

  /* ---------- physics ---------- */
  function closest(px, py, ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0; return [ax + t * dx, ay + t * dy]; }
  function hitSeg(ax, ay, bx, by, rad, rest, kick, svx, svy) {
    var c = closest(ball.x, ball.y, ax, ay, bx, by), dx = ball.x - c[0], dy = ball.y - c[1], d = Math.hypot(dx, dy), r = RB * AW + rad;
    if (d >= r || d === 0) return false;
    var nx = dx / d, ny = dy / d; ball.x = c[0] + nx * r; ball.y = c[1] + ny * r;
    var rvx = ball.vx - (svx || 0), rvy = ball.vy - (svy || 0), vn = rvx * nx + rvy * ny;
    if (vn < 0) { ball.vx -= (1 + rest) * vn * nx; ball.vy -= (1 + rest) * vn * ny; }
    if (kick) { ball.vx += nx * kick; ball.vy += ny * kick; }
    return true;
  }
  function flipEnd(f) { return [X(f.px) + Math.cos(f.a) * FL_LEN * AW * f.dir, Y(f.py) + Math.sin(f.a) * FL_LEN * AW]; }
  function step(dt) {
    FL.forEach(function (f) { var target = f.up && !tilted ? FL_UP : FL_DOWN, prev = f.a, sp = 28 * dt; f.a += Math.max(-sp, Math.min(sp, target - f.a)); f.w = (f.a - prev) / dt; });
    if (!ball) return;
    if (hold > 0) { hold -= dt; if (hold <= 0) { ball.vx = (Math.random() - .5) * .9 * AW; ball.vy = .9 * H; } return; }
    if (ball.lane) {
      if (!ball.vy) return;
      ball.vy += 1.15 * H * dt; ball.y += ball.vy * dt;
      if (ball.y > Y(.93)) { ball.y = Y(.93); ball.vy = 0; }
      if (ball.y < Y(.10)) { ball.lane = false; ball.rail = 0; }
      return;
    }
    if (ball.rail >= 0) {
      ball.rail += dt / .28; var t = Math.min(1, ball.rail), sx = LANE_X(), sy = Y(.10), ex = X(.80), ey = Y(.05), cx = sx, cy = Y(.015);
      ball.x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex; ball.y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
      if (t >= 1) { ball.rail = -1; ball.vx = -1.15 * AW; ball.vy = .25 * H; }
      return;
    }
    if (Math.hypot(ball.vx, ball.vy) < .05 * H) { still += dt; if (still > 1.6) { still = 0; ball.vx += (ball.x > X(.5) ? -1 : 1) * .5 * AW; ball.vy -= .55 * H; } } else still = 0;
    ball.vy += 1.15 * H * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    var max = 2.6 * H, sp2 = Math.hypot(ball.vx, ball.vy); if (sp2 > max) { ball.vx *= max / sp2; ball.vy *= max / sp2; }
    WALLS.forEach(function (w) { hitSeg(X(w[0]), Y(w[1]), X(w[2]), Y(w[3]), 0, .45); });
    SLINGS.forEach(function (s, i) { if (hitSeg(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]), 0, .4, .55 * AW)) { sfx('bumper', ball.x); award('sling' + i, 100000); } });
    BUMP.forEach(function (b, i) {
      var dx = ball.x - X(b[0]), dy = ball.y - Y(b[1]), d = Math.hypot(dx, dy), r = RB * AW + b[2] * AW;
      if (d < r && d > 0) { var nx = dx / d, ny = dy / d; ball.x = X(b[0]) + nx * r; ball.y = Y(b[1]) + ny * r; var vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { ball.vx -= 2 * vn * nx; ball.vy -= 2 * vn * ny; } ball.vx += nx * .9 * AW; ball.vy += ny * .9 * AW; flash['b' + i] = 1; sfx('bumper', ball.x); award('bump' + i, 1000000); }
    });
    LANES.forEach(function (l, i) {
      if (Math.abs(ball.x - X(l[0])) < .03 * AW && Math.abs(ball.y - Y(l[1])) < .03 * H) {
        if (skillLive) { skillLive = false; if (i === skillLane) { addScore((ballN + 1) * 1000000); say('SKILL SHOT', fmt((ballN + 1) * 1000000), { big: true }); sfx('vo-skill', ball.x); } }
        if (!lit['lane' + i]) { lit['lane' + i] = 1; award('lane' + i, 2000000); }
      }
    });
    if (ball.y > Y(.2)) skillLive = false;
    TARGETS.forEach(function (t, i) { if (Math.hypot(ball.x - X(t[0]), ball.y - Y(t[1])) < .045 * AW && !lit['t' + i]) { lit['t' + i] = 1; setTimeout(function () { lit['t' + i] = 0; }, 900); award('target' + i, 5000000); } });
    if (ball.y > Y(REELS[1]) - RB * AW - 2 && ball.y < Y(REELS[3]) + RB * AW + 2 && ball.x > X(REELS[0]) && ball.x < X(REELS[2]) && !lit.reelcool) {
      lit.reelcool = 1; setTimeout(function () { lit.reelcool = 0; }, 2600);
      ball.x = X(.5); ball.y = Y((REELS[1] + REELS[3]) / 2); ball.vx = 0; ball.vy = 0; hold = 1.3; reelT = 1.3;
      sfx('reels', ball.x); setTimeout(function () { sfx('vo-jackpot', W / 2); }, 500); award('reels', 10000000);
    }
    FL.forEach(function (f) { var e = flipEnd(f), c = closest(ball.x, ball.y, X(f.px), Y(f.py), e[0], e[1]), rx = c[0] - X(f.px), ry = c[1] - Y(f.py); hitSeg(X(f.px), Y(f.py), e[0], e[1], FL_R * AW, .3, 0, -f.w * ry * f.dir, f.w * rx * f.dir); });
    if (ball.y > H + 40) drain();
  }

  /* ---------- draw ---------- */
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0, AW, H); else { ctx.fillStyle = '#16204a'; ctx.fillRect(0, 0, AW, H); }
    ctx.fillStyle = '#b07a43'; ctx.fillRect(AW, 0, W - AW, H); ctx.fillStyle = '#8a5a2c'; ctx.fillRect(AW + 2, Y(.10), W - AW - 4, H - Y(.10));
    ctx.strokeStyle = '#d9dde6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(AW + 1, H); ctx.lineTo(AW + 1, Y(.12)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 2, H); ctx.lineTo(W - 2, Y(.06)); ctx.quadraticCurveTo(W - 2, 2, X(.86), Y(.02)); ctx.stroke();
    if (mode !== 'game') { var n = Math.floor(t / 110) % LAMPS.length; LAMPS.forEach(function (l, i) { if ((i + n) % 5 === 0 || (i * 7 + n) % 11 === 0) { ctx.fillStyle = 'rgba(255,214,120,.75)'; ctx.beginPath(); ctx.arc(X(l[0]), Y(l[1]), .02 * AW, 0, 6.283); ctx.fill(); } }); }
    if (mode === 'game' && skillLive && ball && ball.lane) { skillLane = Math.floor(t / 420) % 4; var sl = LANES[skillLane]; ctx.fillStyle = 'rgba(255,90,30,.9)'; ctx.beginPath(); ctx.arc(X(sl[0]), Y(sl[1]), .022 * AW, 0, 6.283); ctx.fill(); }
    BUMP.forEach(function (b, i) { if (flash['b' + i] > 0) { ctx.fillStyle = 'rgba(255,240,180,' + flash['b' + i] * .7 + ')'; ctx.beginPath(); ctx.arc(X(b[0]), Y(b[1]), b[2] * AW * 1.15, 0, 6.283); ctx.fill(); flash['b' + i] -= .06; } });
    LANES.forEach(function (l, i) { if (lit['lane' + i]) { ctx.fillStyle = 'rgba(255,200,60,.85)'; ctx.beginPath(); ctx.arc(X(l[0]), Y(l[1]), .018 * AW, 0, 6.283); ctx.fill(); } });
    if (reelT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (Math.sin(t / 40) * .2 + .25) + ')'; ctx.fillRect(X(REELS[0]), Y(REELS[1]), X(REELS[2] - REELS[0]), Y(REELS[3] - REELS[1])); }
    FL.forEach(function (f) { var e = flipEnd(f); ctx.lineCap = 'round'; ctx.strokeStyle = '#7a0d0d'; ctx.lineWidth = FL_R * 2 * AW + 4; ctx.beginPath(); ctx.moveTo(X(f.px), Y(f.py)); ctx.lineTo(e[0], e[1]); ctx.stroke(); ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = FL_R * 2 * AW - 2; ctx.stroke(); });
    if (ball) { var g = ctx.createRadialGradient(ball.x - 3, ball.y - 4, 1, ball.x, ball.y, RB * AW); g.addColorStop(0, '#ffffff'); g.addColorStop(.35, '#c9cfdb'); g.addColorStop(1, '#3b4250'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ball.x, ball.y, RB * AW, 0, 6.283); ctx.fill(); }
  }

  var attractI = 0, attractT = 0;
  function attractFrames() {
    var f = [['JOE K', '40 YEARS ON THE FLOOR']];
    HS.forEach(function (h) { f.push([h[0], h[1] + '  ' + fmt(h[2])]); });
    f.push(['REPLAY AT', fmt(REPLAY_AT)]); f.push(freePlay ? ['FREE PLAY', 'PRESS START'] : credits ? ['CREDITS ' + credits, 'PRESS START'] : ['INSERT COIN', '50 CENTS PER PLAY']);
    return f;
  }

  /* ---------- input ---------- */
  function setF(i, on) { if (mode !== 'game' || tilted) { FL[i].up = false; return; } if (FL[i].up !== on && on) sfx('flipper', i ? W * .85 : W * .15); FL[i].up = on; }
  addEventListener('keydown', function (e) {
    if (e.repeat) return; var k = e.key;
    if (k === 'z' || k === 'Z' || k === 'ArrowLeft') { setF(0, true); if (mode === 'game') e.preventDefault(); }
    if (k === 'm' || k === 'M' || k === '/' || k === 'ArrowRight') { setF(1, true); if (mode === 'game') e.preventDefault(); }
    if (k === ' ' && mode === 'game') { e.preventDefault(); fire(); }
    if ((k === 'n' || k === 'N') && mode === 'game') nudge();
    if ((k === 's' || k === 'S') && mode !== 'game') start();
  });
  addEventListener('keyup', function (e) { var k = e.key; if (k === 'z' || k === 'Z' || k === 'ArrowLeft') setF(0, false); if (k === 'm' || k === 'M' || k === '/' || k === 'ArrowRight') setF(1, false); });
  function touch(e, on) { if (mode !== 'game') return; e.preventDefault(); var r = cv.getBoundingClientRect(); [].forEach.call(e.changedTouches || [e], function (t) { var x = t.clientX - r.left, pf = r.width * AW / W; if (x > pf) { if (on) fire(); } else setF(x < pf / 2 ? 0 : 1, on); }); }
  cv.addEventListener('touchstart', function (e) { touch(e, true); }, { passive: false });
  cv.addEventListener('touchend', function (e) { touch(e, false); }, { passive: false });
  cv.addEventListener('mousedown', function (e) { touch(e, true); }); addEventListener('mouseup', function () { setF(0, false); setF(1, false); });
  ['fl', 'fr'].forEach(function (id, i) { var b = $(id); b.addEventListener('pointerdown', function (e) { e.preventDefault(); setF(i, true); }); b.addEventListener('pointerup', function () { setF(i, false); }); b.addEventListener('pointerleave', function () { setF(i, false); }); });
  $('firebtn').addEventListener('click', fire); $('nudgebtn').addEventListener('click', nudge);
  $('c25a').addEventListener('click', function () { coin(25); }); $('c100').addEventListener('click', function () { coin(100); }); $('c25b').addEventListener('click', function () { coin(25); });
  $('freeplay').addEventListener('change', function (e) { freePlay = e.target.checked; paintCredits(); if (mode === 'attract') showCredits(); lampsOn(); });
  $('startbtn').addEventListener('click', start);
  $('skip').addEventListener('click', function () { FACTS.forEach(function (f) { var c = document.querySelector('[data-fact="' + f.id + '"]'); if (c) c.classList.add('lit'); }); $('story').classList.add('open'); });

  var last = 0;
  function loop(t) {
    var dt = Math.min(.033, (t - last) / 1000 || .016); last = t;
    if (mode === 'attract') { attractT += dt; if (attractT > 2.4) { attractT = 0; var fr = attractFrames(); attractI = (attractI + 1) % fr.length; say(fr[attractI][0], fr[attractI][1]); } }
    if (reelT > 0) reelT -= dt;
    if (mode === 'game' && queue.length && t > queueUntil) { var q = queue.shift(); say(q[0], q[1]); queueUntil = t + 1900; } else if (!queue.length && mode === 'game' && queueUntil && t > queueUntil + 400) { queueUntil = 0; say(fmt(score), 'BALL ' + ballN); }
    for (var i = 0; i < 4; i++) step(dt / 4);
    draw(reduce && mode !== 'game' ? 0 : t); drawDMD(t);
    requestAnimationFrame(loop);
  }
  resize(); addEventListener('resize', resize); paintCredits();
  if (document.fonts) document.fonts.load('8px Silkscreen').then(function () { dmdKey = ''; }, function () {}); if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { dmdKey = ''; });
  var fr0 = attractFrames(); say(fr0[0][0], fr0[0][1]);
  window.__joek = { drainNow: function () { if (ball) { saveUntil = 0; ball.lane = false; ball.rail = -1; ball.y = H + 60; } }, state: function () { return { mode: mode, credits: credits, score: score, ballN: ballN, facts: factI, lane: ball && ball.lane, tilted: tilted }; } };
  requestAnimationFrame(loop);
})();
