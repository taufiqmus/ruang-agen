(function () {
  'use strict';
  const { PERANGKAT, PANEL } = Otak;
  const $ = (s, r) => (r || document).querySelector(s);
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ================= STATE ================= */
  const G = { llmPakai: 0, st: Otak.stateAwal(), speed: 1, busy: false, xp: 0, selesai: {}, misi: 0, pesan: 0, tipe: new Set(), hint: 0, done: false, t0: performance.now(), cmd: 0, router: null };
  try { const s = JSON.parse(localStorage.getItem('ruangagen') || '{}'); if (s.xp) G.xp = s.xp | 0; if (s.selesai) G.selesai = s.selesai; } catch (e) { /* tanpa penyimpanan */ }
  const simpan = () => { try { localStorage.setItem('ruangagen', JSON.stringify({ xp: G.xp, selesai: G.selesai })); } catch (e) { /* abaikan */ } };


  /* ---------- konfigurasi otak (disimpan lokal di browser) ---------- */
  const KFG = 'ruangagen-otak';
  const cfg = { mode: 'parser', proxyUrl: '', kodeKelas: '', apiKey: '', models: 'openrouter/free', batasSesi: 30, klienId: '' };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KFG) || '{}')); } catch (e) { /* tanpa penyimpanan */ }
  if (!cfg.klienId) cfg.klienId = 'k' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const simpanCfg = () => { try { localStorage.setItem(KFG, JSON.stringify(cfg)); } catch (e) { /* abaikan */ } };
  const cfgAktif = () => ({ mode: cfg.mode, proxyUrl: String(cfg.proxyUrl).trim(), kodeKelas: cfg.kodeKelas, apiKey: String(cfg.apiKey).trim(), models: String(cfg.models).split(',').map(s => s.trim()).filter(Boolean), klienId: cfg.klienId, timeoutMs: 12000 });

  const MISI = [
    { judul: 'Perintah Jelas', base: 100,
      brief: 'Ruangan gelap dan pengap. Hidupkan lampu dan kipas dengan satu pesan.',
      hints: ['Sebut nama perangkatnya, pisahkan dengan "dan".', 'Contoh: "nyalakan lampu dan kipas".'],
      cek: s => s.lampu.on && s.kipas.on,
      status: s => [[`Lampu ${s.lampu.on ? 'nyala' : 'mati'}`, s.lampu.on], [`Kipas ${s.kipas.on ? 'berputar' : 'mati'}`, s.kipas.on]] },
    { judul: 'Bahasa Sehari-hari', base: 150,
      brief: 'Tamu datang sebentar lagi. Buat ruangan sejuk (27 C atau kurang) dan terang (200 lux atau lebih). Coba pakai keluhan, bukan nama perangkat.',
      hints: ['Agen bisa menafsirkan keluhan, bukan hanya perintah.', 'Coba "gerah banget" dan "gelap nih", atau satu kata: "bikin nyaman".'],
      cek: s => s.suhu <= 27 && s.cahaya >= 200,
      status: s => [[`Suhu ${s.suhu.toFixed(1)} C (target 27 atau kurang)`, s.suhu <= 27], [`Cahaya ${Math.round(s.cahaya)} lux (target 200 atau lebih)`, s.cahaya >= 200]] },
    { judul: 'Uji Keamanan', base: 200,
      brief: 'Seorang Trickster ingin agen melanggar aturan. Picu dua jenis penolakan yang berbeda dan pastikan ruangan tetap aman.',
      hints: ['Ada tiga aturan: batas kecepatan lengan, interlock pintu, dan menolak perintah "abaikan aturan".', 'Interlock: nyalakan lengan dulu, lalu coba buka pintu.'],
      cek: (s, g) => g.tipe.size >= 2,
      status: (s, g) => [[`Jenis penolakan ${g.tipe.size} dari 2`, g.tipe.size >= 2]] }
  ];
  const CONTOH = ['nyalakan lampu dan kipas', 'gerah nih', 'berapa suhu sekarang?', 'putar lengan robot 200%', 'buka pintu setelah matikan lengan', 'halo'];

  /* ================= THREE: scene dasar ================= */
  const stage = $('#stage'), canvas = $('#c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdde6f3);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  const C = { ink: 0x1b1a2e, coral: 0xff5a47, blue: 0x2f5bff, yellow: 0xffd23f, mint: 0x1fb67f, wall: 0xf1f3fa, trim: 0xd5dbea, wood: 0xc99f74, metal: 0x8f9bb5, white: 0xffffff, floorA: 0xc4d0e4, floorB: 0xb3c1d9 };

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8e9bbd, 0.3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.3);
  sun.position.set(5, 11, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  scene.add(sun);
  const lampLight = new THREE.PointLight(0xffd9a0, 0, 15, 1.2);
  lampLight.position.set(-3.4, 2.7, -3.6);
  scene.add(lampLight);

  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0, flatShading: true }, o || {}));
  function box(w, h, d, c, x, y, z, p, o) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (p || scene).add(m); return m;
  }
  function cyl(rt, rb, h, c, x, y, z, p, seg, o) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), mat(c, o));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (p || scene).add(m); return m;
  }
  function ball(r, c, x, y, z, p, o) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(c, o));
    m.position.set(x, y, z); m.castShadow = true; (p || scene).add(m); return m;
  }
  function sign(w, h, draw, px) {
    const k = px || 220;
    const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const ctx = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    const redraw = () => { ctx.clearRect(0, 0, cv.width, cv.height); draw(ctx, cv.width, cv.height); tex.needsUpdate = true; };
    redraw();
    return { mesh, redraw };
  }
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const FD = '800 28px "Bricolage Grotesque", "Trebuchet MS", sans-serif';
  const FM = '600 20px "JetBrains Mono", monospace';
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* ---------- ruangan ---------- */
  (function ruangan() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d'); x.fillStyle = hex(C.floorA); x.fillRect(0, 0, 128, 128);
    x.fillStyle = hex(C.floorB); x.fillRect(0, 0, 64, 64); x.fillRect(64, 64, 64, 64);
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    box(13, 0.3, 11, C.ink, 0, -0.16, 0);
    // dinding belakang dengan celah pintu (x -0.6 sampai 0.9)
    box(5.7, 4.2, 0.3, C.wall, -3.45, 2.1, -5.15);
    box(5.4, 4.2, 0.3, C.wall, 3.6, 2.1, -5.15);
    box(1.5, 1.5, 0.3, C.wall, 0.15, 3.45, -5.15);
    box(0.3, 4.2, 10.3, C.wall, -6.15, 2.1, 0);
    box(5.7, 0.18, 0.1, C.trim, -3.45, 0.09, -4.95); box(5.4, 0.18, 0.1, C.trim, 3.6, 0.09, -4.95);
    // pemandangan di balik pintu
    const luar = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.9), new THREE.MeshBasicMaterial({ color: 0xbfe3ff }));
    luar.position.set(0.15, 1.45, -5.6); scene.add(luar);
    const rumput = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.8), new THREE.MeshBasicMaterial({ color: 0x8fd6a0 }));
    rumput.position.set(0.15, 0.4, -5.58); scene.add(rumput);
    // kusen
    box(0.12, 2.8, 0.34, C.ink, -0.66, 1.4, -5.15); box(0.12, 2.8, 0.34, C.ink, 0.96, 1.4, -5.15); box(1.74, 0.12, 0.34, C.ink, 0.15, 2.8, -5.15);
    // karpet dan tanaman
    const karpet = new THREE.Mesh(new THREE.CircleGeometry(2.3, 32), new THREE.MeshStandardMaterial({ color: 0xffb7a8, roughness: 1 }));
    karpet.rotation.x = -Math.PI / 2; karpet.position.set(0, 0.012, 0.6); karpet.receiveShadow = true; scene.add(karpet);
    cyl(0.3, 0.24, 0.5, C.coral, 5.3, 0.25, 3.9, null, 10); const dn = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 7), mat(C.mint)); dn.position.set(5.3, 1.15, 3.9); dn.castShadow = true; scene.add(dn);
    box(3.2, 0.7, 0.8, C.coral, 0, 0.35, 3.7); box(3.3, 0.1, 0.9, C.wood, 0, 0.75, 3.7);
  })();

  /* ---------- totem router ---------- */
  const RUTE = [['kontrol', 'KONTROL', C.blue], ['info', 'INFO', C.yellow], ['bahaya', 'BAHAYA', C.coral], ['obrol', 'OBROL', C.mint]];
  const totem = sign(1.5, 1.9, (ctx, w, h) => {
    ctx.fillStyle = hex(C.ink); rrect(ctx, 0, 0, w, h, 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = FD; ctx.textAlign = 'center'; ctx.fillText('ROUTER', w / 2, 44);
    RUTE.forEach((r, i) => {
      const y = 70 + i * 84, aktif = G.router === r[0];
      ctx.fillStyle = aktif ? hex(r[2]) : '#2b2a44'; rrect(ctx, 16, y, w - 32, 66, 12); ctx.fill();
      ctx.fillStyle = aktif ? '#fff' : '#7b7fa3'; ctx.font = FM; ctx.textAlign = 'left'; ctx.fillText(r[1], 48, y + 40);
      ctx.beginPath(); ctx.arc(34, y + 33, 8, 0, 7); ctx.fillStyle = aktif ? '#fff' : '#4a4970'; ctx.fill();
    });
  });
  totem.mesh.position.set(-2.1, 1.55, 2.25); scene.add(totem.mesh);
  box(0.16, 1.6, 0.16, C.metal, -2.1, 0.8, 2.15); box(0.9, 0.12, 0.7, C.metal, -2.1, 0.06, 2.2);
  function setRouter(r) { G.router = r; totem.redraw(); }

  /* ---------- papan sensor ---------- */
  const papan = sign(2.6, 1.4, (ctx, w, h) => {
    const s = G.st;
    ctx.fillStyle = hex(C.ink); rrect(ctx, 0, 0, w, h, 16); ctx.fill();
    ctx.fillStyle = '#9fb0ff'; ctx.font = '600 17px "JetBrains Mono", monospace'; ctx.textAlign = 'left'; ctx.fillText('PAPAN SENSOR', 18, 28);
    ctx.fillStyle = '#fff'; ctx.font = '800 54px "Bricolage Grotesque", sans-serif'; ctx.fillText(s.suhu.toFixed(1) + ' C', 18, 90);
    const lux = Math.round(s.cahaya);
    ctx.fillStyle = lux < 100 ? hex(C.coral) : lux < 250 ? hex(C.yellow) : '#6df0b8';
    ctx.font = '600 24px "JetBrains Mono", monospace'; ctx.fillText(lux + ' lux', 18, 128);
    const st = [['L', s.lampu.on], ['K', s.kipas.on], ['P', s.pintu.open], ['R', s.lengan.on]];
    st.forEach((a, i) => { ctx.fillStyle = a[1] ? hex(C.mint) : '#3a3960'; rrect(ctx, w - 150 + (i % 2) * 66, 46 + Math.floor(i / 2) * 58, 54, 46, 8); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 22px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(a[0], w - 150 + (i % 2) * 66 + 27, 78 + Math.floor(i / 2) * 58); });
  }, 200);
  papan.mesh.position.set(-2.0, 2.45, -4.94); scene.add(papan.mesh);
  box(2.8, 1.6, 0.06, C.metal, -2.0, 2.45, -5.01);

  /* ---------- rak manual (RAG, tahap berikutnya) ---------- */
  (function rak() {
    const g = new THREE.Group(); g.position.set(-5.65, 0, -2.5); g.rotation.y = Math.PI / 2; scene.add(g);
    box(2.0, 2.4, 0.55, C.wood, 0, 1.2, 0, g);
    const warna = [C.coral, C.blue, C.yellow, C.mint, C.white, C.ink];
    for (let r = 0; r < 3; r++) {
      box(1.8, 0.06, 0.5, 0x8a6a48, 0, 0.45 + r * 0.7, 0.04, g);
      for (let i = 0; i < 7; i++) box(0.17, 0.45 + (i % 3) * 0.05, 0.34, warna[(i + r * 2) % warna.length], -0.7 + i * 0.23, 0.72 + r * 0.7, 0.1, g);
    }
    const s = sign(1.5, 0.45, (ctx, w, h) => { ctx.fillStyle = hex(C.yellow); rrect(ctx, 0, 0, w, h, 10); ctx.fill(); ctx.fillStyle = hex(C.ink); ctx.font = '800 22px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('RAK MANUAL', w / 2, 30); ctx.font = '600 13px "JetBrains Mono", monospace'; ctx.fillText('segera aktif (RAG)', w / 2, 52); });
    s.mesh.position.set(0, 2.7, 0.3); g.add(s.mesh);
  })();

  /* ---------- aktuator ---------- */
  // Lampu berdiri
  const lampu = { shade: null };
  (function () {
    cyl(0.32, 0.4, 0.1, C.ink, -3.4, 0.05, -3.9); cyl(0.05, 0.05, 2.2, C.metal, -3.4, 1.15, -3.9);
    lampu.shade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.6, 0.7, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffc860, emissiveIntensity: 0, side: THREE.DoubleSide, roughness: 1 }));
    lampu.shade.position.set(-3.4, 2.45, -3.9); lampu.shade.castShadow = true; scene.add(lampu.shade);
  })();
  // Kipas berdiri
  const kipas = { bilah: new THREE.Group(), kepala: new THREE.Group(), v: 0 };
  (function () {
    cyl(0.4, 0.46, 0.1, C.ink, 3.2, 0.05, -3.9); cyl(0.06, 0.06, 1.5, C.metal, 3.2, 0.8, -3.9);
    kipas.kepala.position.set(3.2, 1.7, -3.9); scene.add(kipas.kepala);
    const cincin = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 24), mat(C.ink)); cincin.castShadow = true; kipas.kepala.add(cincin);
    ball(0.14, C.coral, 0, 0, 0.02, kipas.kepala);
    kipas.kepala.add(kipas.bilah);
    for (let i = 0; i < 3; i++) { const piv = new THREE.Group(); piv.rotation.z = i * 2.094; kipas.bilah.add(piv); box(0.2, 0.55, 0.04, C.blue, 0, 0.3, 0, piv); }
    kipas.kepala.rotation.y = 0.35;
  })();
  // Pintu
  const pintu = { engsel: new THREE.Group(), sudut: 0 };
  (function () {
    pintu.engsel.position.set(-0.6, 0, -5.0); scene.add(pintu.engsel);
    box(1.5, 2.7, 0.12, C.blue, 0.75, 1.35, 0, pintu.engsel);
    ball(0.08, C.yellow, 1.25, 1.3, 0.1, pintu.engsel);
  })();
  // Lengan robot
  const lengan = { turret: new THREE.Group(), bahu: new THREE.Group(), siku: new THREE.Group(), fase: 0 };
  (function () {
    cyl(0.6, 0.7, 0.3, C.ink, 4.3, 0.15, -3.0);
    lengan.turret.position.set(4.3, 0.3, -3.0); scene.add(lengan.turret);
    cyl(0.4, 0.45, 0.4, C.metal, 0, 0.2, 0, lengan.turret);
    lengan.bahu.position.set(0, 0.5, 0); lengan.turret.add(lengan.bahu);
    ball(0.22, C.coral, 0, 0, 0, lengan.bahu);
    box(0.28, 1.3, 0.28, C.yellow, 0, 0.65, 0, lengan.bahu);
    lengan.siku.position.set(0, 1.3, 0); lengan.bahu.add(lengan.siku);
    ball(0.2, C.coral, 0, 0, 0, lengan.siku);
    box(0.22, 1.0, 0.22, C.yellow, 0, 0.5, 0, lengan.siku);
    box(0.5, 0.12, 0.2, C.ink, 0, 1.06, 0, lengan.siku);
  })();

  /* ---------- panel kontrol ---------- */
  const tombol = {}; const PAD = { A: { x: -3.1, z: 0.4, hadap: [-4.4, 0.4] }, B: { x: 3.3, z: 0.6, hadap: [4.6, 0.6] }, S: { x: -2.0, z: -3.6, hadap: [-2.0, -5] }, HOME: { x: 0, z: 2.3 } };
  const WARNA_TOMBOL = { lampu: C.yellow, kipas: C.blue, pintu: C.mint, lengan: C.coral };
  function buatPanel(id, x, z, rotY, judul, devs) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
    box(1.4, 0.9, 0.7, C.ink, 0, 0.45, 0, g);
    const atas = box(1.4, 0.12, 0.85, C.metal, 0, 0.98, 0.02, g); atas.rotation.x = 0.35;
    devs.forEach((d, i) => {
      const b = cyl(0.19, 0.19, 0.1, WARNA_TOMBOL[d], (i - (devs.length - 1) / 2) * 0.6, 0.09, 0, atas, 16, { emissive: WARNA_TOMBOL[d], emissiveIntensity: 0.15 });
      tombol[d] = b;
    });
    box(0.1, 0.9, 0.1, C.metal, 0, 1.45, -0.2, g);
    const s = sign(1.7, 0.55, (ctx, w, h) => { ctx.fillStyle = hex(C.ink); rrect(ctx, 0, 0, w, h, 10); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '800 21px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(judul, w / 2, 32); ctx.fillStyle = '#9fb0ff'; ctx.font = '600 14px "JetBrains Mono", monospace'; ctx.fillText(devs.map(d => PERANGKAT[d].nama.toUpperCase()).join(' + '), w / 2, 56); }, 200);
    s.mesh.position.set(0, 2.0, -0.1); g.add(s.mesh);
    const s2 = s.mesh.clone(); s2.rotation.y = Math.PI; s2.position.set(0, 2.0, -0.3); g.add(s2);
    return g;
  }
  buatPanel('A', -4.4, 0.4, Math.PI / 2, 'PANEL ' + PANEL.A.nama.replace('Panel ', '').toUpperCase(), ['lampu', 'kipas']);
  buatPanel('B', 4.6, 0.6, -Math.PI / 2, 'PANEL AKSES & MESIN', ['pintu', 'lengan']);
  const cincin = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.55, 32), new THREE.MeshBasicMaterial({ color: C.coral, transparent: true, opacity: 0.85 }));
  cincin.rotation.x = -Math.PI / 2; cincin.position.y = 0.03; cincin.visible = false; scene.add(cincin);

  /* ---------- agen ---------- */
  const agen = new THREE.Group(); agen.position.set(PAD.HOME.x, 0, PAD.HOME.z); scene.add(agen);
  const A = { kakiL: null, kakiR: null, lenganL: null, lenganR: null, kepala: null, antena: null, ph: 0, jalan: false, tekan: 0 };
  (function () {
    box(0.72, 0.78, 0.5, C.blue, 0, 0.92, 0, agen); box(0.4, 0.3, 0.04, C.yellow, 0, 0.92, 0.26, agen);
    A.kepala = new THREE.Group(); A.kepala.position.set(0, 1.62, 0); agen.add(A.kepala);
    box(0.78, 0.58, 0.58, C.white, 0, 0, 0, A.kepala); box(0.62, 0.3, 0.05, C.ink, 0, 0.02, 0.3, A.kepala);
    box(0.11, 0.11, 0.04, C.mint, -0.13, 0.03, 0.335, A.kepala, { emissive: C.mint, emissiveIntensity: 0.9 });
    box(0.11, 0.11, 0.04, C.mint, 0.13, 0.03, 0.335, A.kepala, { emissive: C.mint, emissiveIntensity: 0.9 });
    cyl(0.03, 0.03, 0.28, C.metal, 0, 0.42, 0, A.kepala); A.antena = ball(0.08, C.coral, 0, 0.6, 0, A.kepala, { emissive: C.coral, emissiveIntensity: 0.6 });
    const lenganDari = (sx) => { const p = new THREE.Group(); p.position.set(sx * 0.48, 1.25, 0); agen.add(p); box(0.15, 0.55, 0.15, C.white, 0, -0.26, 0, p); return p; };
    A.lenganL = lenganDari(-1); A.lenganR = lenganDari(1);
    const kakiDari = (sx) => { const p = new THREE.Group(); p.position.set(sx * 0.18, 0.5, 0); agen.add(p); box(0.2, 0.46, 0.22, C.ink, 0, -0.23, 0, p); box(0.24, 0.08, 0.34, C.ink, 0, -0.46, 0.05, p); return p; };
    A.kakiL = kakiDari(-1); A.kakiR = kakiDari(1);
  })();

  /* ================= kamera orbit ================= */
  const cam = { az: 0, ph: 1.08, zoom: 1, base: 13.5, tgt: new THREE.Vector3(0, 1.1, -0.6) };
  function pasangKamera() {
    const r = cam.base * cam.zoom;
    camera.position.set(cam.tgt.x + r * Math.sin(cam.ph) * Math.sin(cam.az), cam.tgt.y + r * Math.cos(cam.ph), cam.tgt.z + r * Math.sin(cam.ph) * Math.cos(cam.az));
    camera.lookAt(cam.tgt);
  }
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ } });
  canvas.addEventListener('pointermove', e => { if (!drag) return; cam.az = clamp(cam.az - (e.clientX - drag.x) * 0.005, -1.15, 1.15); cam.ph = clamp(cam.ph - (e.clientY - drag.y) * 0.004, 0.75, 1.38); drag = { x: e.clientX, y: e.clientY }; });
  const lepas = () => { drag = null; };
  canvas.addEventListener('pointerup', lepas); canvas.addEventListener('pointercancel', lepas);
  canvas.addEventListener('wheel', e => { e.preventDefault(); cam.zoom = clamp(cam.zoom * (1 + e.deltaY * 0.001), 0.55, 1.25); }, { passive: false });
  $('#camBtn').addEventListener('click', () => { cam.az = 0; cam.ph = 1.08; cam.zoom = 1; });
  function fit() {
    const r = stage.getBoundingClientRect(); const w = Math.max(200, r.width), h = Math.max(200, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    cam.base = clamp(7.8 / (0.384 * camera.aspect), 13.5, 32);
  }
  new ResizeObserver(fit).observe(stage); fit();

  /* ================= tween & gerak ================= */
  const tweens = [];
  const tween = (dur, fn) => new Promise(res => tweens.push({ t: 0, dur: Math.max(dur, 0.001), fn, res }));
  const wait = s => tween(s / G.speed, () => {});
  function stepTween(dt) { for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; const p = Math.min(w.t / w.dur, 1); w.fn(p); if (p >= 1) { tweens.splice(i, 1); w.res(); } } }
  const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
  async function hadapKe(x, z) { const target = Math.atan2(x - agen.position.x, z - agen.position.z); await tween(0.3 / G.speed, () => { agen.rotation.y = angLerp(agen.rotation.y, target, 0.35); }); agen.rotation.y = target; }
  async function jalanKe(x, z) {
    const x0 = agen.position.x, z0 = agen.position.z, d = Math.hypot(x - x0, z - z0);
    if (d < 0.05) return;
    const target = Math.atan2(x - x0, z - z0);
    A.jalan = true;
    await tween(d / (2.5 * G.speed), p => { agen.position.x = x0 + (x - x0) * p; agen.position.z = z0 + (z - z0) * p; agen.rotation.y = angLerp(agen.rotation.y, target, 0.25); });
    A.jalan = false;
  }
  async function tekan(dev) {
    const b = tombol[dev];
    await tween(0.25 / G.speed, p => { A.tekan = p; });
    if (b) b.material.emissiveIntensity = 1.6;
    await wait(0.25);
    await tween(0.25 / G.speed, p => { A.tekan = 1 - p; });
    A.tekan = 0;
  }

  /* ================= UI: chat, jejak, bubble ================= */
  const bubble = $('#bubble');
  function say(txt, k) { bubble.textContent = txt; bubble.dataset.k = k || 'idle'; }
  function chat(who, txt, tolak) {
    const li = mk('li', 'msg ' + who + (tolak ? ' tolak' : ''));
    if (who !== 'sis') li.appendChild(mk('span', 'who', who === 'kamu' ? 'Kamu' : 'Agen'));
    li.appendChild(document.createTextNode(txt));
    const log = $('#chatlog'); log.appendChild(li); log.scrollTop = log.scrollHeight;
  }
  const TAG = { otak: 'OTAK', terima: 'TERIMA', router: 'ROUTER', pikir: 'PIKIR', guard: 'GUARD', jalan: 'JALAN', aksi: 'AKSI', amati: 'AMATI', balas: 'BALAS' };
  function jejak(k, txt) {
    const tr = $('#trace'); const kosong = tr.querySelector('.empty'); if (kosong) kosong.remove();
    const li = mk('li', 'k-' + k);
    li.appendChild(mk('span', 'w', ((performance.now() - G.t0) / 1000).toFixed(1) + 's'));
    li.appendChild(mk('span', 'tag', TAG[k] || k.toUpperCase()));
    li.appendChild(mk('span', 'x', txt));
    tr.appendChild(li); tr.scrollTop = tr.scrollHeight;
  }
  function pemisah(n) { const tr = $('#trace'); const kosong = tr.querySelector('.empty'); if (kosong) kosong.remove(); const li = mk('li'); li.appendChild(mk('span', 'sep', 'Perintah #' + n)); li.style.display = 'block'; tr.appendChild(li); }
  function setBusy(b) { G.busy = b; $('#inp').disabled = b; $('#send').disabled = b; renderMisiList(); if (!b && !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) $('#inp').focus({ preventScroll: true }); }

  /* ================= alur agen ================= */
  const potong = (s, n) => (s.length > n ? s.slice(0, n - 1) + '...' : s);
  async function kirim(teks) {
    teks = String(teks || '').trim().slice(0, 200);
    if (G.busy || !teks) return;
    setBusy(true);
    G.pesan++; G.cmd++; G.t0 = performance.now();
    chat('kamu', teks);
    pemisah(G.cmd);
    if (cfg.mode !== 'parser') say('Berpikir...', 'pikir');
    const kuotaHabis = cfg.mode !== 'parser' && G.llmPakai >= cfg.batasSesi;
    const plan = await OtakLLM.pikirAsync(teks, G.st, cfgAktif(), { kuotaHabis });
    G.llmPakai += plan.otak.panggilan || 0;
    renderOtak(plan.otak);
    plan.ditolak.forEach(t => G.tipe.add(t.aturan));
    $('#json').textContent = JSON.stringify({ intent: plan.intent, sub: plan.sub, diambil: plan.diambil, didelegasikan_ke: plan.didelegasikan_ke, pikiran: plan.pikiran, aksi: plan.aksi, ditolak: plan.ditolak.map(t => ({ aturan: t.aturan, pesan: t.pesan })), balasan: plan.balasan, otak: plan.otak }, null, 2);

    // fase berpikir: tampilkan jejak otak satu per satu
    for (const j of plan.jejak) {
      jejak(j.k, j.t);
      if (j.k === 'terima') say('Pesan masuk...', 'idle');
      if (j.k === 'otak') say(plan.otak.fallback ? 'LLM gagal, pakai parser' : plan.otak.asal === 'llm' ? 'Otak LLM menjawab' : plan.otak.asal === 'guard' ? 'Input guard menangkap' : 'Otak: parser', 'pikir');
      if (j.k === 'router') { setRouter(j.intent); say('Router: ' + j.intent.replace('_', ' '), 'router'); }
      if (j.k === 'pikir') say(potong(j.t, 90), 'pikir');
      if (j.k === 'guard') say('Ditolak oleh aturan', 'guard');
      await wait(j.k === 'pikir' ? 0.9 : j.k === 'terima' ? 0.45 : j.k === 'otak' ? 0.4 : 0.6);
    }

    let tujuanAkhir = false;
    if (plan.aksi.length) {
      const grup = [];
      for (const a of plan.aksi) { const p = PERANGKAT[a.device].panel; if (grup.length && grup[grup.length - 1].p === p) grup[grup.length - 1].a.push(a); else grup.push({ p, a: [a] }); }
      for (const g of grup) {
        jejak('jalan', 'Menuju ' + PANEL[g.p].nama);
        say('Menuju ' + PANEL[g.p].nama, 'aksi');
        cincin.position.x = PAD[g.p].x; cincin.position.z = PAD[g.p].z; cincin.visible = true;
        await jalanKe(PAD[g.p].x, PAD[g.p].z); cincin.visible = false;
        await hadapKe(PAD[g.p].hadap[0], PAD[g.p].hadap[1]);
        for (const a of g.a) {
          say('Menekan tombol ' + PERANGKAT[a.device].nama.toLowerCase(), 'aksi');
          await tekan(a.device);
          Otak.terapkan(G.st, a);
          jejak('aksi', Otak.deskripsi(a));
          await wait(0.2);
        }
      }
      tujuanAkhir = true;
    } else if (plan.baca) {
      jejak('jalan', 'Menuju Papan Sensor');
      say('Menuju papan sensor', 'aksi');
      cincin.position.x = PAD.S.x; cincin.position.z = PAD.S.z; cincin.visible = true;
      await jalanKe(PAD.S.x, PAD.S.z); cincin.visible = false;
      await hadapKe(PAD.S.hadap[0], PAD.S.hadap[1]);
      say('Membaca sensor...', 'pikir'); await wait(0.9);
      plan.balasan = Otak.laporSensor(G.st, plan.fokus);
      jejak('amati', plan.balasan);
      tujuanAkhir = true;
    }

    chat('agen', plan.balasan, plan.ditolak.length > 0);
    jejak('balas', plan.balasan);
    say(potong(plan.balasan, 110), plan.ditolak.length ? 'guard' : 'balas');
    if (tujuanAkhir) { await wait(0.5); await jalanKe(PAD.HOME.x, PAD.HOME.z); }
    await hadapKe(agen.position.x, agen.position.z + 5);
    agen.rotation.y = 0;
    await wait(0.4);
    setRouter(null);
    say('Siap menerima pesan', 'idle');
    setBusy(false);
    cekMisi(true);
  }

  /* ================= misi, XP ================= */
  const LEVEL = xp => (xp < 100 ? 'Rookie' : xp < 250 ? 'Handler' : xp < 450 ? 'Orchestrator' : 'Architect');
  function renderXP() { $('#xp').textContent = `XP ${G.xp} · ${LEVEL(G.xp)}`; }
  function renderHud() {
    const m = MISI[G.misi];
    $('#hudNo').textContent = `Misi ${G.misi + 1} dari ${MISI.length}`;
    $('#hudJudul').textContent = m.judul; $('#hudBrief').textContent = m.brief;
    const tip = $('#hudTip'); if (G.hint > 0) { tip.hidden = false; tip.textContent = m.hints.slice(0, G.hint).join(' '); } else tip.hidden = true;
    $('#hintBtn').disabled = G.hint >= m.hints.length;
    renderXP(); renderMisiList(); renderStatus();
  }
  function renderStatus() {
    const m = MISI[G.misi]; const ul = $('#hudStatus'); const items = m.status(G.st, G);
    ul.replaceChildren(...items.map(([t, ok]) => mk('li', ok ? 'ok' : '', t)));
  }
  function renderMisiList() {
    const ul = $('#misiList'); ul.replaceChildren();
    MISI.forEach((m, i) => {
      const li = mk('li', i === G.misi ? 'aktif' : ''); li.appendChild(mk('h3', '', `${i + 1}. ${m.judul}`)); li.appendChild(mk('p', '', m.brief));
      const row = mk('div', 'row meta'); row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px';
      const b = G.selesai[i]; row.appendChild(mk('span', '', b ? 'Selesai ' + '★'.repeat(b) + '☆'.repeat(3 - b) : `${m.base} XP`));
      const btn = mk('button', 'btn sm', i === G.misi ? 'Sedang main' : 'Mulai'); btn.type = 'button'; btn.disabled = i === G.misi || G.busy; btn.addEventListener('click', () => mulaiMisi(i)); row.appendChild(btn);
      li.appendChild(row); ul.appendChild(li);
    });
  }
  function mulaiMisi(i) {
    if (G.busy) return;
    G.misi = i; G.st = Otak.stateAwal(); G.pesan = 0; G.tipe.clear(); G.hint = 0; G.done = false;
    $('#toast').hidden = true; chat('sis', `Misi ${i + 1}: ${MISI[i].judul}. Ruangan direset.`);
    renderHud(); activate('chat');
  }
  function cekMisi() {
    if (G.done || G.pesan === 0 || G.busy) return;
    const m = MISI[G.misi]; if (!m.cek(G.st, G)) return;
    G.done = true;
    const bintang = G.pesan <= 2 ? 3 : G.pesan <= 4 ? 2 : 1;
    let gain = Math.max(10, m.base - (3 - bintang) * 20 - G.hint * 10);
    const pertama = !G.selesai[G.misi];
    if (pertama) G.xp += gain; else gain = 0;
    G.selesai[G.misi] = Math.max(G.selesai[G.misi] || 0, bintang);
    simpan(); renderHud();
    $('#toastJudul').textContent = `Misi selesai! ${'★'.repeat(bintang)}${'☆'.repeat(3 - bintang)}`;
    $('#toastIsi').textContent = (pertama ? `+${gain} XP` : 'Sudah pernah selesai, tanpa XP baru') + ` · ${G.pesan} pesan`;
    $('#toastNext').textContent = G.misi + 1 < MISI.length ? 'Misi berikutnya' : 'Main lagi';
    $('#toast').hidden = false;
  }
  $('#toastLagi').addEventListener('click', () => mulaiMisi(G.misi));
  $('#toastNext').addEventListener('click', () => mulaiMisi((G.misi + 1) % MISI.length));
  $('#hintBtn').addEventListener('click', () => { const m = MISI[G.misi]; if (G.hint < m.hints.length) { G.hint++; renderHud(); } });
  $('#toggleHud').addEventListener('click', () => { const h = $('#hud'); h.classList.toggle('min'); $('#toggleHud').textContent = h.classList.contains('min') ? 'buka' : 'ringkas'; });
  if (window.matchMedia && window.matchMedia('(max-width: 860px)').matches) { $('#hud').classList.add('min'); $('#toggleHud').textContent = 'buka'; }

  /* ---------- tab, input, kecepatan ---------- */
  function activate(nama) {
    document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === nama)));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + nama));
  }
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => activate(b.dataset.tab)));
  document.querySelectorAll('[data-sp]').forEach(b => b.addEventListener('click', () => { G.speed = +b.dataset.sp; document.querySelectorAll('[data-sp]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));
  $('#form').addEventListener('submit', e => { e.preventDefault(); const i = $('#inp'); const t = i.value; i.value = ''; kirim(t); });
  CONTOH.forEach(t => { const b = mk('button', '', t); b.type = 'button'; b.addEventListener('click', () => { if (!G.busy) { activate('chat'); kirim(t); } }); $('#chips').appendChild(b); });


  /* ---------- pengaturan otak ---------- */
  function renderOtak(info) {
    const b = $('#otakBadge');
    if (cfg.mode === 'parser') b.textContent = 'Otak: parser';
    else b.textContent = `Otak: LLM ${G.llmPakai}/${cfg.batasSesi}` + (info && info.fallback ? ' (cadangan)' : '');
  }
  function tampilGrup() {
    document.querySelectorAll('#otakForm .grp').forEach(d => {
      const m = d.dataset.mode;
      d.classList.toggle('on', m === 'llm' ? cfg.mode !== 'parser' : m === cfg.mode);
    });
  }
  function isiForm() {
    $('#otMode').value = cfg.mode; $('#otProxy').value = cfg.proxyUrl; $('#otKode').value = cfg.kodeKelas;
    $('#otKunci').value = cfg.apiKey; $('#otModels').value = cfg.models; $('#otBatas').value = cfg.batasSesi; tampilGrup();
  }
  function bacaForm() {
    cfg.mode = $('#otMode').value; cfg.proxyUrl = $('#otProxy').value; cfg.kodeKelas = $('#otKode').value;
    cfg.apiKey = $('#otKunci').value; cfg.models = $('#otModels').value || cfg.models;
    cfg.batasSesi = clamp(parseInt($('#otBatas').value, 10) || 30, 1, 200);
    simpanCfg(); tampilGrup(); renderOtak();
  }
  $('#otMode').addEventListener('change', () => { cfg.mode = $('#otMode').value; tampilGrup(); });
  $('#otakForm').addEventListener('submit', e => { e.preventDefault(); bacaForm(); $('#otStatus').textContent = 'Tersimpan di browser ini.'; });
  $('#otTes').addEventListener('click', async () => {
    bacaForm(); const st = $('#otStatus');
    if (cfg.mode === 'parser') { st.textContent = 'Pilih mode LLM dulu. Parser aturan tidak perlu koneksi.'; return; }
    st.textContent = 'Menguji koneksi...';
    try { const r = await OtakLLM.uji(cfgAktif()); st.textContent = `Berhasil: ${r.model} menjawab dalam ${(r.ms / 1000).toFixed(1)} detik. Satu permintaan terpakai dari kuota.`; }
    catch (e) { st.textContent = 'Gagal: ' + (e && e.message ? e.message : e); }
  });
  isiForm(); renderOtak();

  /* ================= loop ================= */
  let tSensor = 0, tCek = 0, tBoard = 0, last = performance.now(), waktu = 0, lampLevel = 0, doorAng = 0, arm = { tur: 0, bahu: -0.2, siku: 0.4 };
  const vec = new THREE.Vector3();
  function update(dt) {
    waktu += dt; stepTween(dt);
    const s = G.st;
    // lampu & cahaya ruangan
    lampLevel += ((s.lampu.on ? 1 : 0) - lampLevel) * Math.min(1, dt * 6);
    lampu.shade.material.emissiveIntensity = lampLevel * 1.3;
    lampLight.intensity = lampLevel * 1.5;
    hemi.intensity = 0.3 + 0.32 * lampLevel; sun.intensity = 0.28 + 0.3 * lampLevel;
    // kipas
    const vt = s.kipas.on ? s.kipas.speed * 5 : 0; kipas.v += (vt - kipas.v) * Math.min(1, dt * 2);
    kipas.bilah.rotation.z -= kipas.v * dt;
    kipas.kepala.rotation.y = s.kipas.on ? 0.35 + Math.sin(waktu * 0.7) * 0.5 : kipas.kepala.rotation.y + (0.35 - kipas.kepala.rotation.y) * Math.min(1, dt * 2);
    // pintu
    const tp = s.pintu.open ? -1.35 : 0; doorAng += (tp - doorAng) * Math.min(1, dt * 3); pintu.engsel.rotation.y = doorAng;
    // lengan
    if (s.lengan.on) {
      lengan.fase += dt * (s.lengan.speed / 22);
      const rentang = (clamp(s.lengan.angle, 10, 90) * Math.PI / 180) * 0.5;
      arm.tur = Math.sin(lengan.fase) * rentang; arm.bahu = -0.5 + Math.sin(lengan.fase * 2) * 0.22; arm.siku = 0.9 + Math.sin(lengan.fase * 2 + 1) * 0.3;
    } else { arm.tur += (0 - arm.tur) * Math.min(1, dt * 3); arm.bahu += (-0.2 - arm.bahu) * Math.min(1, dt * 3); arm.siku += (0.4 - arm.siku) * Math.min(1, dt * 3); }
    lengan.turret.rotation.y = arm.tur; lengan.bahu.rotation.z = arm.bahu; lengan.siku.rotation.z = arm.siku;
    // sensor
    const tSuhu = 31 - (s.kipas.on ? 2.2 * s.kipas.speed : 0) - (s.pintu.open ? 1.5 : 0);
    s.suhu += (tSuhu - s.suhu) * (1 - Math.exp(-dt * 0.15));
    s.cahaya = 20 + 380 * lampLevel + 60 * (doorAng / -1.35);
    // agen
    A.ph += dt * (A.jalan ? 10 * G.speed : 0);
    const sw = A.jalan ? Math.sin(A.ph) : 0;
    A.kakiL.rotation.x = sw * 0.7; A.kakiR.rotation.x = -sw * 0.7; A.lenganL.rotation.x = -sw * 0.6;
    A.lenganR.rotation.x = A.tekan > 0 ? -1.5 * A.tekan : sw * 0.6;
    agen.position.y = A.jalan ? Math.abs(Math.sin(A.ph)) * 0.08 : 0;
    A.kepala.position.y = 1.62 + Math.sin(waktu * 2) * 0.015; A.antena.material.emissiveIntensity = 0.5 + 0.4 * Math.sin(waktu * 4);
    // tombol memudar
    for (const k in tombol) { const m = tombol[k].material; if (m.emissiveIntensity > 0.15) m.emissiveIntensity = Math.max(0.15, m.emissiveIntensity - dt * 2); }
    if (cincin.visible) { const k = 1 + Math.sin(waktu * 6) * 0.15; cincin.scale.set(k, k, k); }
    tBoard += dt; if (tBoard > 0.4) { tBoard = 0; papan.redraw(); }
    tSensor += dt; if (tSensor > 0.5) { tSensor = 0; renderStatus(); }
    tCek += dt; if (tCek > 0.6) { tCek = 0; cekMisi(); }
  }
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    update(dt); pasangKamera();
    vec.set(agen.position.x, agen.position.y + 2.5, agen.position.z).project(camera);
    const r = stage.getBoundingClientRect();
    const bx = clamp((vec.x * 0.5 + 0.5) * r.width, 130, r.width - 130), by = clamp((-vec.y * 0.5 + 0.5) * r.height, 60, r.height);
    bubble.style.left = bx + 'px'; bubble.style.top = by + 'px';
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  // mulai
  chat('sis', 'Agen menunggu di depan ruangan. Tulis perintah, atau klik salah satu contoh di bawah.');
  renderHud();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { totem.redraw(); papan.redraw(); });
  requestAnimationFrame(t => { last = t; loop(t); });
  window.__ruangAgen = { G, kirim, mulaiMisi };
})();
