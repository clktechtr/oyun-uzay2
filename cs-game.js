// CodeStudio 2D oyun motoru (cs-game.js). Kullanım: const g = CSGame.create({width:360, height:640}); g.scene("oyun", {enter, update(g,dt), draw(g,ctx)}); g.start("oyun");
(function csGameLib(root) {
            if (root.CSGame) return;
            var doc = root.document || null, LS = null, mem = {};
            try { var kk = '__csg_t'; root.localStorage.setItem(kk, '1'); root.localStorage.removeItem(kk); LS = root.localStorage; } catch (e) { LS = null; }
            function sget(k) { try { return LS ? LS.getItem(k) : (k in mem ? mem[k] : null); } catch (e) { return k in mem ? mem[k] : null; } }
            function sset(k, v) { try { if (LS) LS.setItem(k, v); else mem[k] = v; } catch (e) { mem[k] = v; } }
            var DEFS = {}, IMGS = {}, pending = 0, readyCbs = [];
            function dec(name) {
                var a = DEFS[name]; if (!a || IMGS[name]) return;
                if (a.k === 'grid') {
                    var rows = a.rows || [], h = rows.length, w = h ? rows[0].length : 0, c = doc.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
                    var x = c.getContext('2d'); for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) { var ch = rows[j].charAt(i), col = a.pal && a.pal[ch]; if (ch !== '.' && col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }
                    IMGS[name] = c;
                } else if (a.k === 'svg' || a.k === 'png') {
                    var im = new root.Image(); pending++; IMGS[name] = im;
                    var fin = function () { pending--; if (!pending) { var q = readyCbs.slice(); readyCbs = []; q.forEach(function (f) { try { f(); } catch (e) {} }); } };
                    im.onload = fin; im.onerror = fin;
                    im.src = a.k === 'svg' ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(a.d) : a.d;
                }
            }
            var LAY = { scenes: {} };
            function setLayout(o) { LAY = o && typeof o === 'object' && o.scenes && typeof o.scenes === 'object' ? o : { scenes: {} }; }
            function whenReady(fn) { if (!pending) fn(); else readyCbs.push(fn); }
            function addAssets(o) { if (!o || typeof o !== 'object') return; Object.keys(o).forEach(function (n) { if (/^[A-Za-z0-9_]{1,40}$/.test(n) && o[n] && typeof o[n] === 'object') { DEFS[n] = o[n]; delete IMGS[n]; if (doc) dec(n); } }); }
            function imgOf(name) { var a = DEFS[name]; if (a && a.k === 'anim') { return null; } return IMGS[name] || null; }
            function sizeOf(name) { var i = IMGS[name], a = DEFS[name]; if (!i) return { w: (a && a.w) || 16, h: (a && a.h) || 16 }; return { w: i.naturalWidth || i.width || (a && a.w) || 16, h: i.naturalHeight || i.height || (a && a.h) || 16 }; }
            function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
            function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
            function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
            // --- ses: sentezlenmiş efektler + müzik (sesler game/sounds.js'ten ya da g.defineSound ile gelir)
            var AC = null, muted = sget('csg:mute') === '1', SND = {}, warned = {}, MUS = null, musTimer = 0, musicUsed = false;
            function actx() { if (!AC) { try { var C = root.AudioContext || root.webkitAudioContext; if (C) AC = new C(); } catch (e) {} } if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) {} } return AC; }
            var SFX = { coin: [[880, .06, 'square'], [1320, .1, 'square']], jump: [[300, .12, 'square', 620]], hit: [[160, .18, 'sawtooth', 60]], shoot: [[900, .08, 'square', 300]], boom: [[120, .3, 'sawtooth', 30]], win: [[523, .1, 'triangle'], [659, .1, 'triangle'], [784, .2, 'triangle']], lose: [[392, .15, 'triangle'], [294, .15, 'triangle'], [196, .3, 'triangle']], click: [[600, .04, 'square']] };
            var WAVES = { sine: 1, square: 1, sawtooth: 1, triangle: 1, noise: 1 };
            function nfreq(n) { var m = /^([A-G])([#b]?)([1-7])$/.exec(n); if (!m) return 0; var b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * Math.pow(2, ((+m[3] + 1) * 12 + b - 69) / 12); }
            function okSnd(d) {
                if (!d || typeof d !== 'object') return null;
                if (d.k === 'sfx') {
                    if (!Array.isArray(d.notes) || !d.notes.length || d.notes.length > 16) return null; var tot = 0, ns = [];
                    for (var i = 0; i < d.notes.length; i++) { var x = d.notes[i]; if (!Array.isArray(x)) return null; var f = +x[0], du = +x[1]; if (!(f >= 20 && f <= 8000 && du >= 0.01 && du <= 1.5)) return null; var f2 = +x[3] || 0; if (f2 && !(f2 >= 20 && f2 <= 8000)) f2 = 0; var vo = x[4] == null ? 1 : Math.max(0.05, Math.min(1, +x[4] || 1)); tot += du; ns.push([f, du, WAVES[x[2]] ? x[2] : 'square', f2, vo]); }
                    if (tot > 4) return null; return { k: 'sfx', notes: ns, cat: d.cat, label: d.label };
                }
                if (d.k === 'music') {
                    var bpm = +d.bpm; if (!(bpm >= 60 && bpm <= 200) || !Array.isArray(d.tracks) || !d.tracks.length || d.tracks.length > 3) return null; var len = 0, tr = [];
                    for (var t = 0; t < d.tracks.length; t++) { var k = d.tracks[t]; if (!k || !Array.isArray(k.seq) || k.seq.length < 8 || k.seq.length > 64) return null; for (var j = 0; j < k.seq.length; j++) if (!/^(-|x|[A-G][#b]?[1-7])$/.test(String(k.seq[j]))) return null; len = Math.max(len, k.seq.length); tr.push({ wave: WAVES[k.wave] ? k.wave : 'square', vol: Math.max(0.05, Math.min(1, +k.vol || 0.5)), seq: k.seq.map(String) }); }
                    tr.forEach(function (k) { while (k.seq.length < len) k.seq.push('-'); }); return { k: 'music', bpm: bpm, tracks: tr, cat: d.cat, label: d.label };
                }
                return null;
            }
            function addSounds(o) { if (!o || typeof o !== 'object') return; Object.keys(o).forEach(function (n) { if (!/^[A-Za-z0-9_]{1,40}$/.test(n)) return; var c = okSnd(o[n]); if (c) SND[n] = c; else if (root.console) try { root.console.warn('cs-game: geçersiz ses tanımı: ' + n); } catch (e) {} }); }
            function tone(f, d, type, f2, when, vol) {
                var a = actx(); if (!a || muted) return; var t = a.currentTime + (when || 0), g = a.createGain(), o; var v = 0.12 * (vol == null ? 1 : vol);
                if (type === 'noise') { var n = Math.max(1, Math.floor(a.sampleRate * d)), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0); for (var i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; o = a.createBufferSource(); o.buffer = b; }
                else { o = a.createOscillator(); o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d); }
                g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
            }
            function sfx(n) {
                var s = SND[n]; var notes = s && s.k === 'sfx' ? s.notes : SFX[n];
                if (!notes) { if (!warned[n]) { warned[n] = 1; if (root.console) try { root.console.warn('cs-game: böyle bir ses yok: ' + n); } catch (e) {} } return; }
                var t = 0; notes.forEach(function (x) { tone(x[0], x[1], x[2], x[3], t, x[4]); t += x[1]; });
            }
            function musicStop() { MUS = null; if (musTimer) { clearInterval(musTimer); musTimer = 0; } }
            function musicTick() {
                var a = AC; if (!a || !MUS) return; var m = MUS, sd = 60 / m.d.bpm / 2;
                while (m.next < a.currentTime + 0.25) {
                    var i = m.step; if (i >= m.len) { if (!m.loop) { musicStop(); return; } m.step = i = 0; }
                    m.d.tracks.forEach(function (tr) { var tk = tr.seq[i]; if (tk === '-') return; var w = m.next - a.currentTime; if (tk === 'x') { tone(0, Math.min(0.08, sd), 'noise', 0, w, tr.vol * m.vol * 0.7); return; } var hold = 1; for (var j = i + 1; j < m.len && tr.seq[j] === '-'; j++) hold++; tone(nfreq(tk), Math.min(hold * sd * 0.95, 2), tr.wave, 0, w, tr.vol * m.vol); });
                    m.next += sd; m.step++;
                }
            }
            function musicStart(name, op) {
                var d = SND[name]; if (!d || d.k !== 'music') { if (!warned[name]) { warned[name] = 1; if (root.console) try { root.console.warn('cs-game: böyle bir müzik yok: ' + name); } catch (e) {} } return; }
                if (MUS && MUS.name === name) return; musicStop(); var a = actx(); if (!a) return;
                musicUsed = true; MUS = { name: name, d: d, step: 0, next: a.currentTime + 0.08, vol: op && op.vol != null ? clamp(+op.vol || 0, 0, 1) : 0.5, loop: !(op && op.loop === false), len: d.tracks[0].seq.length }; musicTick(); musTimer = setInterval(musicTick, 40);
            }
            function playDef(d, vol) { var c = okSnd(d); if (!c) return null; muted = false; SND.__p = c; if (c.k === 'sfx') sfx('__p'); else { musicStop(); musicStart('__p', { vol: vol == null ? 0.6 : vol }); } delete SND.__p; return { stop: musicStop }; }
            // --- oyun
            function create(o) {
                o = o || {};
                var W = Math.max(64, o.width | 0 || 360), H = Math.max(64, o.height | 0 || 640), cvs, ctx, scenes = {}, cur = null, curName = '', acc = 0, last = 0, running = false, raf = 0, paused = false, time = 0, shakeAmt = 0, parts = [], started = false;
                var keys = {}, pressed = {}, ptrs = {}, tapQ = [], scale = 1, offX = 0, offY = 0, ctl = { dpad: false, stick: false, buttons: [] }, held = {}, bpress = {};
                var KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', ' ': 'A', z: 'A', x: 'B', Enter: 'A' };
                var g = { W: W, H: H, ctx: null, canvas: null, time: 0, frame: 0, score: 0 };
                function mk() {
                    cvs = doc.createElement('canvas'); cvs.setAttribute('role', 'img'); cvs.setAttribute('aria-label', o.label || 'Oyun alanı'); cvs.tabIndex = 0;
                    cvs.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;outline:none;background:' + (o.bg || '#000');
                    doc.body.style.cssText += ';margin:0;overflow:hidden;background:' + (o.bg || '#000') + ';overscroll-behavior:none'; doc.body.appendChild(cvs); ctx = cvs.getContext('2d'); g.ctx = ctx; g.canvas = cvs; resize();
                }
                function resize() {
                    if (!cvs) return; var dpr = Math.min(root.devicePixelRatio || 1, 3), vw = root.innerWidth || W, vh = root.innerHeight || H;
                    cvs.width = Math.round(vw * dpr); cvs.height = Math.round(vh * dpr); scale = Math.min(vw / W, vh / H); offX = (vw - W * scale) / 2; offY = (vh - H * scale) / 2; g.scale = scale; g.dpr = dpr;
                }
                function toLogical(e) { var r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left - offX) / scale, y: (e.clientY - r.top - offY) / scale }; }
                // sanal kontroller (logical koordinatlarda; en az ~56 mantıksal px)
                function ctlRects() {
                    var r = [], by = H - 70, m = 14;
                    if (ctl.dpad) { r.push({ n: 'left', x: m, y: by - 8, w: 64, h: 64, t: '◀' }); r.push({ n: 'right', x: m + 72, y: by - 8, w: 64, h: 64, t: '▶' }); if (ctl.dpad === 'full') { r.push({ n: 'up', x: m + 36, y: by - 78, w: 64, h: 64, t: '▲' }); r.push({ n: 'down', x: m + 36, y: by + 62, w: 64, h: 40, t: '▼' }); } }
                    ctl.buttons.forEach(function (b, i) { r.push({ n: b, x: W - m - 64 - i * 74, y: by - 8, w: 64, h: 64, t: b }); });
                    return r;
                }
                function recompute() {
                    held = {}; Object.keys(keys).forEach(function (k) { if (keys[k]) held[k] = 1; });
                    var rs = ctlRects(); Object.keys(ptrs).forEach(function (id) { var p = ptrs[id]; p.ctl = null; rs.forEach(function (rc) { if (p.x >= rc.x - 6 && p.x <= rc.x + rc.w + 6 && p.y >= rc.y - 6 && p.y <= rc.y + rc.h + 6) { held[rc.n] = 1; p.ctl = rc.n; } }); });
                    if (ctl.stick) { g.stick = { x: 0, y: 0 }; Object.keys(ptrs).forEach(function (id) { var p = ptrs[id]; if (p.stick) { var dx = p.x - p.sx, dy = p.y - p.sy, d = Math.hypot(dx, dy), m = Math.min(1, d / 40); g.stick = { x: d ? dx / d * m : 0, y: d ? dy / d * m : 0 }; } }); }
                }
                function bind() {
                    root.addEventListener('resize', resize); root.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
                    cvs.addEventListener('contextmenu', function (e) { e.preventDefault(); });
                    cvs.addEventListener('pointerdown', function (e) {
                        e.preventDefault(); try { cvs.setPointerCapture(e.pointerId); } catch (x) {} actx(); var p = toLogical(e); if (musicUsed && o.muteButton !== false && p.x >= W - 40 && p.x <= W - 4 && p.y >= 4 && p.y <= 40) { muted = !muted; sset('csg:mute', muted ? '1' : '0'); return; } p.id = e.pointerId; p.sx = p.x; p.sy = p.y; p.down = true;
                        if (ctl.stick && p.x < W * 0.5 && !ctlRects().some(function (rc) { return p.x >= rc.x && p.x <= rc.x + rc.w && p.y >= rc.y && p.y <= rc.y + rc.h; })) p.stick = true;
                        ptrs[e.pointerId] = p; g.x = p.x; g.y = p.y; g.down = true; tapQ.push({ x: p.x, y: p.y }); recompute();
                        Object.keys(held).forEach(function (k) { bpress[k] = 1; });
                    });
                    cvs.addEventListener('pointermove', function (e) { var p = ptrs[e.pointerId]; if (!p) { var q = toLogical(e); g.x = q.x; g.y = q.y; return; } var q2 = toLogical(e); p.x = q2.x; p.y = q2.y; g.x = p.x; g.y = p.y; recompute(); });
                    var up = function (e) { var p = ptrs[e.pointerId]; if (p) { delete ptrs[e.pointerId]; } g.down = Object.keys(ptrs).length > 0; recompute(); };
                    cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);
                    root.addEventListener('keydown', function (e) { var k = KEYMAP[e.key]; if (k) { if (!keys[k]) pressed[k] = 1; keys[k] = true; if (e.key === ' ' || e.key.indexOf('Arrow') === 0) e.preventDefault(); recompute(); actx(); } });
                    root.addEventListener('keyup', function (e) { var k = KEYMAP[e.key]; if (k) { keys[k] = false; recompute(); } });
                    doc.addEventListener('visibilitychange', function () { if (doc.hidden) { paused = true; if (AC) try { AC.suspend(); } catch (e) {} keys = {}; ptrs = {}; recompute(); if (cur && cur.pause) try { cur.pause(g); } catch (e) {} } else { last = 0; paused = false; actx(); } });
                }
                g.controls = function (c) { ctl = { dpad: c && c.dpad ? c.dpad : false, stick: !!(c && c.stick), buttons: (c && c.buttons) || [] }; recompute(); };
                g.btn = function (n) { return !!held[n]; };
                g.btnPressed = function (n) { return !!pressed[n] || !!bpress[n]; };
                g.stick = { x: 0, y: 0 };
                g.axisX = function () { return (held.right ? 1 : 0) - (held.left ? 1 : 0) || (ctl.stick ? g.stick.x : 0); };
                g.tapped = function (rect) { for (var i = 0; i < tapQ.length; i++) { var t = tapQ[i]; if (!rect || (t.x >= rect.x && t.x <= rect.x + rect.w && t.y >= rect.y && t.y <= rect.y + rect.h)) return t; } return null; };
                g.anyTap = function () { return tapQ.length > 0 || !!pressed.A; };
                g.scene = function (n, s) { scenes[n] = s; return g; };
                function layItems() { var a = LAY.scenes[curName], b = LAY.scenes['*']; return (Array.isArray(b) ? b : []).concat(Array.isArray(a) ? a : []); }
                g.objs = function () { return layItems(); };
                g.obj = function (id) { var l = layItems(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; };
                function drawLay(layer) { if (o.layout === false) return; var l = layItems(); for (var i = 0; i < l.length; i++) { var it = l[i]; if (!it || it.hide || (it.z === 'alt' ? 'alt' : 'ust') !== layer || !it.a) continue; g.sprite(it.a, +it.x || 0, +it.y || 0, { w: +it.w || 32, h: +it.h || 32, rot: (+it.r || 0) * Math.PI / 180, flip: it.f ? 1 : 0, alpha: it.al == null ? 1 : +it.al }); } }
                g.go = function (n, arg) { if (!scenes[n]) throw new Error('Sahne yok: ' + n); if (cur && cur.exit) try { cur.exit(g); } catch (e) {} cur = scenes[n]; curName = n; g.scene_ = n; parts = []; if (cur.enter) cur.enter(g, arg); };
                g.sceneName = function () { return curName; };
                g.start = function (n) { if (!doc) return; if (!started) { started = true; mk(); bind(); } whenReady(function () { g.go(n); running = true; last = 0; raf = root.requestAnimationFrame(loop); }); return g; };
                g.pause = function (v) { paused = v !== false; };
                g.sprite = function (name, x, y, op) {
                    op = op || {}; var d = DEFS[name], nm = name;
                    if (d && d.k === 'anim') { var fr = d.frames || []; if (!fr.length) return; nm = fr[Math.floor((op.t != null ? op.t : g.time) * (d.fps || 8)) % fr.length]; }
                    var im = IMGS[nm]; if (!im) return; var s = sizeOf(nm), w = op.w || s.w * (op.scale || 1), h = op.h || s.h * (op.scale || 1), ax = op.ax == null ? 0.5 : op.ax, ay = op.ay == null ? 0.5 : op.ay;
                    ctx.save(); ctx.globalAlpha = op.alpha == null ? 1 : op.alpha; ctx.translate(x, y); if (op.rot) ctx.rotate(op.rot); ctx.scale(op.flip ? -1 : 1, 1);
                    ctx.imageSmoothingEnabled = !(o.pixel !== false && DEFS[nm] && DEFS[nm].k !== 'svg');
                    try { ctx.drawImage(im, -w * ax, -h * ay, w, h); } catch (e) {} ctx.restore();
                };
                g.tile = function (name, x, y, w, h, op) { var im = IMGS[name]; if (!im) return; var s = sizeOf(name), sc = (op && op.scale) || 1, tw = s.w * sc, th = s.h * sc; ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.imageSmoothingEnabled = !(o.pixel !== false && DEFS[name] && DEFS[name].k !== 'svg'); var ox = (op && op.ox) || 0; for (var yy = y; yy < y + h; yy += th) for (var xx = x - ((ox % tw) + tw) % tw; xx < x + w; xx += tw) { try { ctx.drawImage(im, xx, yy, tw, th); } catch (e) {} } ctx.restore(); };
                g.rect = function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
                g.circle = function (x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); };
                g.text = function (s, x, y, op) { op = op || {}; ctx.save(); ctx.font = (op.bold === false ? '' : 'bold ') + (op.size || 20) + 'px ' + (op.font || 'system-ui, sans-serif'); ctx.textAlign = op.align || 'left'; ctx.textBaseline = op.base || 'top'; if (op.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(String(s), x + 1.5, y + 1.5); } ctx.fillStyle = op.color || '#fff'; ctx.fillText(String(s), x, y); ctx.restore(); };
                g.button = function (label, x, y, w, h, op) { op = op || {}; ctx.save(); ctx.fillStyle = op.bg || '#2f6fed'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, 10); else ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke(); ctx.restore(); g.text(label, x + w / 2, y + h / 2, { align: 'center', base: 'middle', size: op.size || 22, shadow: false }); return !!g.tapped({ x: x, y: y, w: w, h: h }); };
                g.sfx = sfx; g.music = musicStart; g.stopMusic = musicStop; g.defineSound = function (n, d) { var o = {}; o[n] = d; addSounds(o); }; g.beep = function (f, d, t) { tone(f, d || .1, t || 'square'); };
                g.mute = function (v) { muted = v === undefined ? !muted : !!v; sset('csg:mute', muted ? '1' : '0'); return muted; }; g.muted = function () { return muted; };
                g.vibrate = function (ms) { try { if (root.navigator && root.navigator.vibrate) root.navigator.vibrate(ms || 30); } catch (e) {} };
                g.save = function (k, v) { sset('csg:' + (o.id || 'g') + ':' + k, JSON.stringify(v)); }; g.load = function (k, d) { var v = sget('csg:' + (o.id || 'g') + ':' + k); if (v == null) return d; try { var x = JSON.parse(v); return x == null ? d : x; } catch (e) { return d; } };
                g.shake = function (a) { shakeAmt = Math.max(shakeAmt, a || 6); };
                g.burst = function (x, y, op) { op = op || {}; for (var i = 0; i < (op.n || 12); i++) { var a = Math.random() * 6.283, s = (op.speed || 90) * (0.4 + Math.random()); parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: op.life || 0.5, max: op.life || 0.5, c: op.color || '#ffd23f', r: op.r || 2.5 }); } };
                g.rand = function (a, b) { return a + Math.random() * (b - a); }; g.irand = function (a, b) { return Math.floor(g.rand(a, b + 1)); };
                g.hit = hit; g.dist = dist; g.clamp = clamp; g.size = sizeOf; g.has = function (n) { return !!DEFS[n]; };
                function drawCtl() {
                    var rs = ctlRects(); rs.forEach(function (rc) { ctx.save(); ctx.globalAlpha = held[rc.n] ? 0.75 : 0.4; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(rc.x + rc.w / 2, rc.y + rc.h / 2, Math.min(rc.w, rc.h) / 2, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#111'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(rc.t, rc.x + rc.w / 2, rc.y + rc.h / 2); ctx.restore(); });
                    if (ctl.stick) Object.keys(ptrs).forEach(function (id) { var p = ptrs[id]; if (p.stick) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.sx, p.sy, 40, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(p.sx + g.stick.x * 40, p.sy + g.stick.y * 40, 18, 0, 6.2832); ctx.fill(); ctx.restore(); } });
                }
                function render() {
                    var vw = cvs.width, vh = cvs.height; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = o.bg || '#000'; ctx.fillRect(0, 0, vw, vh);
                    var s = scale * g.dpr; var sx = shakeAmt > 0 ? (Math.random() - .5) * shakeAmt : 0, sy = shakeAmt > 0 ? (Math.random() - .5) * shakeAmt : 0;
                    ctx.setTransform(s, 0, 0, s, offX * g.dpr + sx * s, offY * g.dpr + sy * s); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
                    try { drawLay('alt'); } catch (e) { fail(e); }
                    if (cur && cur.draw) try { cur.draw(g, ctx); } catch (e) { fail(e); }
                    try { drawLay('ust'); } catch (e) { fail(e); }
                    parts.forEach(function (p) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); }); ctx.globalAlpha = 1;
                    drawCtl(); if (musicUsed && o.muteButton !== false) drawMute(); ctx.restore();
                }
                function drawMute() { ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(W - 38, 6, 32, 30, 8); else ctx.rect(W - 38, 6, 32, 30); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 20px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('\u266A', W - 22, 22); if (muted) { ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W - 34, 31); ctx.lineTo(W - 10, 11); ctx.stroke(); } ctx.restore(); }
                function fail(e) { running = false; try { root.console.error('Oyun hatası:', e); } catch (x) {} try { if (root.CSFeedback) root.CSFeedback.report(e); } catch (x) {} }
                function stepOnce() {
                    var dt = 1 / 60; g.time = time += dt; g.frame++;
                    if (cur && cur.update) cur.update(g, dt);
                    for (var i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; if (p.life <= 0) parts.splice(i, 1); }
                    if (shakeAmt > 0) shakeAmt = Math.max(0, shakeAmt - 40 * dt);
                    pressed = {}; bpress = {}; tapQ = [];
                }
                function loop(ts) {
                    if (!running) return; raf = root.requestAnimationFrame(loop);
                    if (paused) { last = ts; return; }
                    if (!last) last = ts; acc += Math.min(0.1, (ts - last) / 1000); last = ts;
                    try { var n = 0; while (acc >= 1 / 60 && n < 5) { stepOnce(); acc -= 1 / 60; n++; } render(); } catch (e) { fail(e); }
                }
                g.step = function (n) { for (var i = 0; i < (n || 1); i++) stepOnce(); if (cvs) render(); };   // testler için
                g.press = function (k) { if (!keys[k]) pressed[k] = 1; keys[k] = true; recompute(); }; g.release = function (k) { keys[k] = false; recompute(); };
                g.tap = function (x, y) { tapQ.push({ x: x, y: y }); g.x = x; g.y = y; };
                g.state = function () { return { scene: curName, score: g.score, frame: g.frame, paused: paused, running: running, parts: parts.length }; };
                return g;
            }
            root.CSGame = { create: create, setLayout: setLayout, layout: function () { return LAY; }, addAssets: addAssets, addSounds: addSounds, okSound: okSnd, sound: function (n) { return SND[n] || null; }, sounds: function () { return Object.keys(SND); }, playDef: playDef, stopMusic: musicStop, ready: whenReady, hit: hit, dist: dist, clamp: clamp, assets: function () { return Object.keys(DEFS); }, def: function (n) { return DEFS[n] || null; }, image: function (n) { return IMGS[n] || null; }, version: 1 };
        })(typeof window !== "undefined" ? window : globalThis);
