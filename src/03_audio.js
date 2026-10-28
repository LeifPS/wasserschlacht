/* ===== KLANG: alles synthetisch per WebAudio (keine Dateien), Musik als kleine Schleife ===== */
const Snd = (() => {
  let ac = null, master = null, sfxBus = null, musBus = null, noiseBuf = null, musTimer = null, musKind = null, step = 0, nextT = 0, last = {};
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return true; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    master = ac.createGain(); const cm = ac.createDynamicsCompressor(); cm.threshold.value = -14; cm.ratio.value = 6; master.connect(cm); cm.connect(ac.destination);
    sfxBus = ac.createGain(); musBus = ac.createGain(); sfxBus.connect(master); musBus.connect(master);
    const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noiseBuf = nb;
    apply(); return true;
  }
  function apply() { if (!ac) return; master.gain.value = G.set.vol; sfxBus.gain.value = G.set.sfx ? 1 : 0; musBus.gain.value = G.set.music ? 0.32 : 0; }
  function osc(type, f0, t, dur, vol, o) {
    o = o || {}; const t0 = ac.currentTime + t, os = ac.createOscillator(), g = ac.createGain(); os.type = type; os.frequency.setValueAtTime(f0, t0); if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
    if (o.det) os.detune.value = o.det; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), t0 + (o.att || .008)); g.gain.exponentialRampToValueAtTime(.0002, t0 + dur);
    os.connect(g); g.connect(o.dest || sfxBus); os.start(t0); os.stop(t0 + dur + .05);
  }
  function noise(t, dur, vol, o) {
    o = o || {}; const t0 = ac.currentTime + t, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; s.loop = true; f.type = o.type || "bandpass"; f.frequency.setValueAtTime(o.f0 || 1500, t0); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur); f.Q.value = o.q || 1;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), t0 + (o.att || .01)); g.gain.exponentialRampToValueAtTime(.0002, t0 + dur); s.connect(f); f.connect(g); g.connect(o.dest || sfxBus); s.start(t0, Math.random()); s.stop(t0 + dur + .05);
  }
  const bell = (m, t, vol, dur, dest) => { osc("sine", mf(m), t, dur, vol, { dest, att: .004 }); osc("sine", mf(m) * 2.01, t, dur * .6, vol * .35, { dest, att: .004 }); osc("triangle", mf(m) * 3.99, t, dur * .25, vol * .15, { dest, att: .003 }); };
  const bub = (t, vol, f) => osc("sine", f || 500, t, .09, vol, { f1: (f || 500) * 2.2, att: .004 });

  const SFX = {
    click() { bub(0, .16, 700); },
    back() { osc("sine", 520, 0, .1, .14, { f1: 330 }); },
    err() { osc("square", 200, 0, .14, .08, { f1: 140 }); osc("square", 160, .12, .16, .08, { f1: 110 }); },
    coin() { bell(88, 0, .12, .25); bell(95, .07, .12, .35); },
    buy() { bell(84, 0, .13, .3); bell(88, .08, .13, .3); bell(91, .16, .14, .5); },
    shoot(w) { const k = { pistole: [1800, 800], flasche: [2200, 900], schlauch: [3000, 1500], ballon: [900, 400], scharf: [1400, 500], eis: [700, 250], reiniger: [2600, 700], minigun: [3200, 1800], tsunami: [500, 150], regenbogen: [1600, 900] }[w] || [1800, 800]; noise(0, .12, .16, { f0: k[0], f1: k[1], q: 1.6 }); bub(0, .08, 400 + k[1] * .3); },
    hit() { noise(0, .1, .22, { f0: 900, f1: 300, q: .8 }); osc("sine", 160, 0, .12, .22, { f1: 70 }); },
    hurt() { osc("sine", 300, 0, .2, .22, { f1: 110 }); noise(0, .12, .15, { f0: 600, f1: 200 }); },
    splash() { noise(0, .35, .25, { f0: 1200, f1: 300, q: .6 }); noise(.05, .3, .18, { type: "highpass", f0: 2400 }); bub(.05, .1, 380); bub(.12, .08, 520); },
    ko() { noise(0, .45, .3, { f0: 900, f1: 120 }); osc("sine", 400, 0, .4, .22, { f1: 80 }); },
    sup() { osc("sawtooth", 200, 0, .5, .12, { f1: 900 }); noise(0, .5, .16, { f0: 400, f1: 3000 }); bell(96, .35, .14, .6); },
    ability() { osc("triangle", 300, 0, .25, .16, { f1: 800 }); noise(0, .2, .12, { f0: 2000, f1: 600 }); },
    pick() { bell(96, 0, .11, .2); bell(103, .05, .1, .25); },
    perle() { bell(100, 0, .1, .25); },
    tick() { osc("square", 880, 0, .06, .08); },
    go() { osc("triangle", 660, 0, .35, .2, { f1: 990 }); bell(91, 0, .14, .6); },
    win() { [72, 76, 79, 84].forEach((m, i) => bell(m + 12, i * .13, .15, .7)); osc("triangle", mf(60), 0, .9, .1); },
    lose() { [67, 64, 60].forEach((m, i) => osc("triangle", mf(m), i * .2, .5, .12, { f1: mf(m) * .97 })); },
    drip() { bub(0, .2, 700); osc("sine", 900, 0, .22, .12, { f1: 400 }); },
    shake() { noise(0, .18, .12, { f0: 800, f1: 500, q: 2 }); osc("sine", 200, 0, .15, .1, { f1: 150 }); },
    burst(r) { noise(0, .6, .3, { f0: 500, f1: 4000, q: .5 }); osc("sawtooth", 150, 0, .7, .14, { f1: 600 }); const base = [72, 74, 76, 79, 84][r || 0]; [0, 4, 7, 12].forEach((m, i) => bell(base + m, .1 + i * .08, .14, 1 + r * .2)); if (r >= 3) [0, 7, 12, 16, 19].forEach((m, i) => bell(base + 12 + m, .5 + i * .07, .12, 1.2)); if (r >= 4) { noise(.2, 1.2, .18, { type: "highpass", f0: 3000, q: .3 }); [0, 4, 7, 11, 14, 17, 21].forEach((m, i) => bell(base + 12 + m, .8 + i * .09, .12, 1.4)); } },
    emote() { bub(0, .15, 600); bub(.08, .12, 800); },
    revive() { [60, 64, 67, 72].forEach((m, i) => bell(m + 12, i * .07, .12, .5)); }
  };
  function play(n, a) { if (!G.set.sfx) return; if (!init()) return; const now = performance.now(); if (last[n] && now - last[n] < 45) return; last[n] = now; try { SFX[n] && SFX[n](a); } catch (e) {} }

  /* Musik: kurze Schleifen mit Zupftönen, Bass und leichten Trommeln */
  const PROG = { lobby: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], match: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]] };
  function musTick() {
    if (!ac || !musKind) return; const spb = 60 / (musKind === "lobby" ? 96 : 124) / 2;
    while (nextT < ac.currentTime + .25) {
      const t = Math.max(0, nextT - ac.currentTime), bar = Math.floor(step / 8) % 4, st = step % 8, ch = PROG[musKind][bar];
      if (musKind === "lobby") { if (st % 2 === 0) bell(ch[(st / 2) % 3] + 12 + (st === 6 ? 12 : 0), t, .07, .9, musBus); if (st === 0) osc("triangle", mf(ch[0] - 12), t, spb * 7, .1, { dest: musBus, att: .05 }); if (st === 4 && bar % 2) bell(ch[2] + 24, t, .05, 1.2, musBus); }
      else {
        if (st % 4 === 0) { osc("sine", 120, t, .18, .22, { f1: 45, dest: musBus }); } if (st % 2 === 1) noise(t, .05, .06, { type: "highpass", f0: 7000, dest: musBus }); if (st === 4) noise(t, .12, .1, { type: "highpass", f0: 1800, dest: musBus });
        osc("triangle", mf(ch[0] - 24 + (st >= 4 ? 7 : 0)), t, spb * .9, .13, { dest: musBus, att: .01 }); if (st % 2 === 0) bell(ch[[0, 1, 2, 1][(st / 2) % 4]] + 12, t, .05, .35, musBus);
      }
      nextT += spb; step++;
    }
  }
  function music(kind) { if (!init()) return; if (musKind === kind) return; musKind = kind; step = 0; nextT = ac.currentTime + .1; if (!musTimer) musTimer = setInterval(musTick, 90); if (!kind) { clearInterval(musTimer); musTimer = null; } }
  return { init, apply, play, music };
})();
const sfx = (n, a) => Snd.play(n, a);
document.addEventListener("pointerdown", () => Snd.init(), { once: true });
