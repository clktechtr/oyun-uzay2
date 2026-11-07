// UZAY ATIŞI — Gemiyi sağa/sola oynat, uzaylıları vur. Ateş otomatik.
// Değiştirmek için: aşağıdaki AYARLAR bölümüne bak.
var AYAR = { can: 3, atesAraligi: 0.28, dusmanSatir: 3, dusmanSutun: 6, dusmanHiz: 28, gemiHiz: 230 };
var g = CSGame.create({ id: 'uzay', width: 360, height: 640, bg: '#070b1f', label: 'Uzay atışı oyunu' });
window.game = g;
g.music('muzik_arcade', { vol: 0.35 });
CSGame.addAssets({ uzayli: { k: 'anim', frames: ['uzayli_1', 'uzayli_2'], fps: 2 }, patlama: { k: 'anim', frames: ['patlama_1', 'patlama_2', 'patlama_3'], fps: 12 } });
var gemi, mermiler, dusmanlar, bombalar, efektler, yon, ates, can, skor, enIyi, bitti, bekle;

function dalgaKur() {
  dusmanlar = [];
  for (var r = 0; r < AYAR.dusmanSatir; r++) for (var c = 0; c < AYAR.dusmanSutun; c++) dusmanlar.push({ x: 44 + c * 54, y: 70 + r * 46, w: 30, h: 26 });
  yon = 1;
}
function yeniOyun() { gemi = { x: 180, y: 540, w: 30, h: 30 }; mermiler = []; bombalar = []; efektler = []; ates = 0; can = AYAR.can; skor = 0; bitti = false; bekle = 0; dalgaKur(); }

g.controls({ dpad: true });
g.scene('oyun', {
  enter: function () { enIyi = g.load('enIyi', 0); yeniOyun(); },
  update: function (g, dt) {
    if (bitti) { bekle -= dt; if (bekle < 0 && g.anyTap()) yeniOyun(); return; }
    var hareket = g.axisX() * AYAR.gemiHiz * dt;
    if (g.down && g.y < 540) hareket = Math.max(-AYAR.gemiHiz * dt, Math.min(AYAR.gemiHiz * dt, g.x - gemi.x));   // parmağı takip et
    gemi.x = g.clamp(gemi.x + hareket, 20, 340);
    ates -= dt; if (ates <= 0) { mermiler.push({ x: gemi.x, y: gemi.y - 20, w: 6, h: 16 }); ates = AYAR.atesAraligi; g.sfx('shoot'); }
    mermiler.forEach(function (m) { m.y -= 420 * dt; }); mermiler = mermiler.filter(function (m) { return m.y > -20; });
    var kenar = false; dusmanlar.forEach(function (d) { d.x += yon * AYAR.dusmanHiz * dt * (1 + skor / 400); if (d.x < 18 || d.x > 342) kenar = true; });
    if (kenar) { yon = -yon; dusmanlar.forEach(function (d) { d.y += 18; }); }
    if (dusmanlar.length && Math.random() < dt * 1.2) { var d = dusmanlar[g.irand(0, dusmanlar.length - 1)]; bombalar.push({ x: d.x, y: d.y + 16, w: 12, h: 14 }); }
    bombalar.forEach(function (b) { b.y += 170 * dt; }); bombalar = bombalar.filter(function (b) { return b.y < 660; });
    mermiler.forEach(function (m) { dusmanlar.forEach(function (d) {
      if (!m.o && !d.o && g.hit({ x: m.x - 3, y: m.y - 8, w: m.w, h: m.h }, { x: d.x - 15, y: d.y - 13, w: d.w, h: d.h })) { m.o = d.o = 1; skor += 10; efektler.push({ x: d.x, y: d.y, t: 0 }); g.burst(d.x, d.y, { n: 8 }); g.sfx('boom'); }
    }); });
    mermiler = mermiler.filter(function (m) { return !m.o; }); dusmanlar = dusmanlar.filter(function (d) { return !d.o; });
    bombalar.forEach(function (b) { if (!b.o && g.hit({ x: b.x - 6, y: b.y - 7, w: b.w, h: b.h }, { x: gemi.x - 15, y: gemi.y - 15, w: gemi.w, h: gemi.h })) { b.o = 1; can--; g.sfx('hit'); g.shake(8); g.vibrate(60); g.burst(gemi.x, gemi.y, { n: 14, color: '#ff7a00' }); } });
    bombalar = bombalar.filter(function (b) { return !b.o; });
    efektler.forEach(function (e) { e.t += dt; }); efektler = efektler.filter(function (e) { return e.t < 0.25; });
    if (!dusmanlar.length) { skor += 50; AYAR.dusmanHiz += 8; dalgaKur(); g.sfx('win'); }
    if (dusmanlar.some(function (d) { return d.y > 510; })) can = 0;
    if (can <= 0) { bitti = true; bekle = 0.6; if (skor > enIyi) { enIyi = skor; g.save('enIyi', enIyi); } g.sfx('lose'); }
    g.score = skor;
  },
  draw: function (g) {
    g.tile('uzay', 0, 0, 360, 640, { scale: 3.75, oy: 0 });
    dusmanlar.forEach(function (d) { g.sprite('uzayli', d.x, d.y, { w: 30, h: 30 }); });
    mermiler.forEach(function (m) { g.sprite('mermi', m.x, m.y, { w: 8, h: 20 }); });
    bombalar.forEach(function (b) { g.sprite('bomba', b.x, b.y, { w: 14, h: 14 }); });
    efektler.forEach(function (e) { g.sprite('patlama', e.x, e.y, { w: 36, h: 36, t: e.t }); });
    if (!bitti) g.sprite('uzay_gemisi', gemi.x, gemi.y, { w: 36, h: 36 });
    g.text('Skor ' + skor, 12, 10, { size: 20 }); g.text('En iyi ' + enIyi, 12, 34, { size: 14, color: '#bcd' });
    for (var i = 0; i < can; i++) g.sprite('kalp', 296 - i * 24, 22, { w: 20, h: 20 });
    if (bitti) { g.rect(40, 230, 280, 170, 'rgba(0,0,0,.7)'); g.text('Oyun bitti', 180, 250, { size: 30, align: 'center' }); g.text('Skor: ' + skor, 180, 300, { size: 22, align: 'center' }); g.text('Tekrar için dokun', 180, 350, { size: 16, align: 'center', color: '#ffd23f' }); }
  }
});
g.start('oyun');
