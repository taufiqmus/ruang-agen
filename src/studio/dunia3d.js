/* Studio Rumah Agen: dunia 3D (Three.js r128).
   Area (ruang berdinding rendah, kebun, kandang), perangkat dari katalog, kabel, cincin jangkauan Wi-Fi, LED status ESP,
   tanaman yang layu atau segar, ayam yang berkeliaran, siklus siang dan malam. Kamera orbit sederhana.
   Mode ringan untuk laptop lemah: tanpa bayangan, resolusi 1x, lebih sedikit segi. */
(function (root) {
  'use strict';
  function buat(o) {
    const THREE = root.THREE, I = root.IoT;
    const ringan = o.kualitas === 'ringan';
    const renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: !ringan, powerPreference: 'high-performance' });
    renderer.setPixelRatio(ringan ? 1 : Math.min(root.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !ringan;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
    const hemi = new THREE.HemisphereLight(0xdfefff, 0x6b7d52, 0.9); scene.add(hemi);
    const mentari = new THREE.DirectionalLight(0xfff3dd, 0.9); mentari.position.set(20, 40, 10); mentari.castShadow = !ringan;
    if (!ringan) { mentari.shadow.mapSize.set(1024, 1024); const c = mentari.shadow.camera; c.left = c.bottom = -40; c.right = c.top = 40; c.far = 120; }
    scene.add(mentari, mentari.target);
    const grup = new THREE.Group(); scene.add(grup);
    const seg = ringan ? 8 : 16;
    const M = (warna, ex) => new THREE.MeshStandardMaterial(Object.assign({ color: warna, roughness: 0.7, metalness: 0.05 }, ex || {}));
    const kotak = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = m.receiveShadow = !ringan; return m; };
    const silinder = (r1, r2, h, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.castShadow = !ringan; return m; };
    let W = null, lebar = 36, dalam = 26;
    const obj = {};      // id perangkat -> {g, led, baling, cahaya, label}
    const animasi = [];   // fungsi(t, S, st)
    const WARNA_LABEL = { papan: 'rgba(29,78,216,0.92)', sensor: 'rgba(13,148,136,0.92)', aktuator: 'rgba(234,88,12,0.92)', modul: 'rgba(2,132,199,0.92)', daya: 'rgba(22,163,74,0.92)', jaringan: 'rgba(124,58,237,0.92)' };
    let pilihan = null, sorotan = new Map();

    /* ---------- kamera orbit ---------- */
    const kam = { theta: -0.75, phi: 0.95, jarak: 46, target: new THREE.Vector3(18, 0, 13), aktif: true };
    function pasangKamera() {
      const x = kam.target.x + kam.jarak * Math.sin(kam.phi) * Math.sin(kam.theta), z = kam.target.z + kam.jarak * Math.sin(kam.phi) * Math.cos(kam.theta), y = kam.jarak * Math.cos(kam.phi);
      camera.position.set(x, y, z); camera.lookAt(kam.target);
    }
    let seret = null;
    o.canvas.addEventListener('pointerdown', e => { if (!kam.aktif) return; seret = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; });
    root.addEventListener('pointerup', () => { seret = null; });
    root.addEventListener('pointermove', e => {
      if (!seret || !kam.aktif) return;
      const dx = e.clientX - seret.x, dy = e.clientY - seret.y; seret.x = e.clientX; seret.y = e.clientY;
      if (seret.pan) { const s = kam.jarak / 600; kam.target.x -= (dx * Math.cos(kam.theta) + dy * Math.sin(kam.theta)) * s; kam.target.z -= (-dx * Math.sin(kam.theta) + dy * Math.cos(kam.theta)) * s; }
      else { kam.theta -= dx * 0.006; kam.phi = Math.max(0.25, Math.min(1.45, kam.phi - dy * 0.005)); }
      pasangKamera();
    });
    o.canvas.addEventListener('wheel', e => { e.preventDefault(); kam.jarak = Math.max(10, Math.min(110, kam.jarak * (e.deltaY > 0 ? 1.1 : 0.9))); pasangKamera(); }, { passive: false });
    o.canvas.addEventListener('contextmenu', e => e.preventDefault());

    /* ---------- tekstur label ---------- */
    /* layar = true: ukuran tetap di layar (label perangkat tetap terbaca saat kamera menjauh) */
    let lebarTeks = 1;
    function sprite(teks, warna, skala, layar) {
      const t = String(teks).slice(0, 22), c = document.createElement('canvas'); c.width = 320; c.height = 64; const g = c.getContext('2d');
      g.font = '600 30px Onest, sans-serif'; const w = Math.min(316, g.measureText(t).width + 28); lebarTeks = w / 320;
      g.fillStyle = warna || 'rgba(20,24,40,0.82)'; g.beginPath(); if (g.roundRect) g.roundRect((320 - w) / 2, 4, w, 56, 14); else g.rect((320 - w) / 2, 4, w, 56); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 160, 34);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true, sizeAttenuation: !layar }));
      if (layar) s.scale.set(0.115 * (skala || 1), 0.023 * (skala || 1), 1); else s.scale.set(3.2 * (skala || 1), 0.64 * (skala || 1), 1);
      s.renderOrder = 10; s.userData.lebar = lebarTeks; return s;
    }

    /* nama area ditulis rata di lantai (tidak menutupi perangkat) */
    function tulisanLantai(teks, lebarM) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
      g.font = '800 64px "Bricolage Grotesque", Onest, sans-serif'; g.fillStyle = 'rgba(15,23,42,0.55)'; g.textBaseline = 'middle'; g.fillText(String(teks).slice(0, 18), 8, 50);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(lebarM, lebarM * 96 / 512), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; return m;
    }

    /* ---------- bentuk perangkat ---------- */
    /* meja kecil tempat papan elektronik diletakkan (papan asli hanya 5 cm, di sini diperbesar supaya terlihat) */
    function meja(g, w, d, h) {
      const kayu = M(0xa47148), top = kotak(w, 0.05, d, kayu); top.position.y = h; g.add(top);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const k = kotak(0.04, h, 0.04, kayu); k.position.set(sx * (w / 2 - 0.04), h / 2, sz * (d / 2 - 0.04)); g.add(k); }
      return h + 0.025;
    }
    function pinBaris(g, n, x0, y, z, jarak) { const mat = M(0x111827), emas = M(0xd4a017, { metalness: 0.8, roughness: 0.3 }); const h = kotak(n * jarak, 0.04, 0.035, mat); h.position.set(x0 + (n - 1) * jarak / 2, y, z); g.add(h); if (!ringan) for (let i = 0; i < n; i += 2) { const pn = kotak(0.012, 0.05, 0.012, emas); pn.position.set(x0 + i * jarak, y + 0.04, z); g.add(pn); } }
    function bentuk(p) {
      const K = I.KATALOG[p.jenis], g = new THREE.Group(), x = { g };
      const b = K.bentuk;
      x.ujung = 0.05;   // tinggi titik kabel masuk
      if (b === 'papan') {
        const y = meja(g, 0.8, 0.5, 0.5), kecil = p.jenis === 'esp8266';
        const pcb = kotak(kecil ? 0.5 : 0.6, 0.03, 0.28, M(kecil ? 0x111827 : 0x1e293b)); pcb.position.set(0, y + 0.015, 0); g.add(pcb);
        const pelindung = kotak(0.2, 0.035, 0.17, M(0xc0c4cc, { metalness: 0.75, roughness: 0.3 })); pelindung.position.set(0.12, y + 0.045, 0); g.add(pelindung);
        const antena = kotak(0.08, 0.01, 0.17, M(0x1d4ed8)); antena.position.set(0.25, y + 0.035, 0); g.add(antena);
        const usb = kotak(0.07, 0.03, 0.08, M(0x9ca3af, { metalness: 0.7 })); usb.position.set(-0.28, y + 0.04, 0); g.add(usb);
        pinBaris(g, 15, -0.22, y + 0.04, -0.12, 0.028); pinBaris(g, 15, -0.22, y + 0.04, 0.12, 0.028);
        x.led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e })); x.led.position.set(-0.18, y + 0.05, 0.05); g.add(x.led);
        x.ujung = y + 0.04;
      } else if (b === 'router') {
        const y = meja(g, 0.8, 0.5, 0.7);
        const badan = kotak(0.55, 0.08, 0.36, M(0xf8fafc)); badan.position.y = y + 0.04; g.add(badan);
        for (const dx of [-0.2, 0, 0.2]) { const a = silinder(0.015, 0.015, 0.4, M(0x111827)); a.position.set(dx, y + 0.25, -0.16); g.add(a); }
        x.led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e })); x.led.position.set(0.18, y + 0.06, 0.18); g.add(x.led);
        x.ujung = y + 0.05;
      } else if (b === 'kipas') {
        const exhaust = p.jenis === 'exhaust';
        if (exhaust) {   // kipas dinding dalam bingkai persegi
          const bingkai = kotak(0.8, 0.8, 0.12, M(0xe5e7eb)); bingkai.position.y = 1.6; g.add(bingkai);
          const lubang = new THREE.Mesh(new THREE.CircleGeometry(0.33, seg * 2), M(0x1f2937)); lubang.position.set(0, 1.6, 0.065); g.add(lubang);
          x.baling = new THREE.Group(); x.baling.position.set(0, 1.6, 0.08); g.add(x.baling);
          const t = silinder(0.03, 0.03, 1.2, M(0x9ca3af)); t.position.y = 0.6; g.add(t);
        } else {         // kipas berdiri: alas, tiang, motor, kurungan, baling
          const alas = silinder(0.32, 0.36, 0.06, M(0x374151)); alas.position.y = 0.03; g.add(alas);
          const tiang = silinder(0.035, 0.035, 1.0, M(0x9ca3af, { metalness: 0.5 })); tiang.position.y = 0.55; g.add(tiang);
          const motor = silinder(0.11, 0.13, 0.22, M(0x374151)); motor.rotation.x = Math.PI / 2; motor.position.set(0, 1.12, -0.12); g.add(motor);
          const matK = M(0xd1d5db, { metalness: 0.4 });
          for (const dz of [0.05, 0.12]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.012, 4, seg * 2), matK); r.position.set(0, 1.12, dz); g.add(r); }
          if (!ringan) for (let i = 0; i < 8; i++) { const j = kotak(0.008, 0.8, 0.008, matK); j.position.set(0, 1.12, 0.12); j.rotation.z = i * Math.PI / 8; g.add(j); }
          x.baling = new THREE.Group(); x.baling.position.set(0, 1.12, 0.08); g.add(x.baling);
        }
        const hub = silinder(0.06, 0.06, 0.05, M(0x1f2937)); hub.rotation.x = Math.PI / 2; x.baling.add(hub);
        for (let i = 0; i < 3; i++) { const daun = new THREE.Mesh(new THREE.CircleGeometry(0.17, 10), M(0x60a5fa, { side: THREE.DoubleSide, transparent: true, opacity: 0.9 })); daun.scale.set(1, 0.55, 1); daun.position.x = 0.19; daun.rotation.y = 0.35; const s2 = new THREE.Group(); s2.rotation.z = i * 2.094; s2.add(daun); x.baling.add(s2); }
      } else if (b === 'lampu' || b === 'lampu_merah') {
        const merah = b === 'lampu_merah', tinggi = merah ? 1.5 : 2.2;
        const matT = M(0x4b5563, { metalness: 0.4 });
        const alas = silinder(0.15, 0.18, 0.05, matT); alas.position.set(-0.6, 0.025, 0); g.add(alas);
        const tiang = silinder(0.025, 0.025, 2.5, matT); tiang.position.set(-0.6, 1.25, 0); g.add(tiang);
        const lengan = kotak(0.62, 0.03, 0.03, matT); lengan.position.set(-0.3, 2.5, 0); g.add(lengan);
        const tali = silinder(0.008, 0.008, 2.5 - tinggi - 0.1, M(0x111827)); tali.position.y = (2.5 + tinggi + 0.1) / 2; g.add(tali);
        const kap = new THREE.Mesh(new THREE.ConeGeometry(merah ? 0.3 : 0.22, merah ? 0.3 : 0.18, seg, 1, true), M(merah ? 0xc0c4cc : 0x334155, { side: THREE.DoubleSide, metalness: merah ? 0.8 : 0.1, roughness: 0.3, emissive: merah ? 0xff4d1f : 0xffd27a, emissiveIntensity: 0 })); kap.position.y = tinggi + 0.12; g.add(kap); x.kap = kap;
        x.bohlam = new THREE.Mesh(new THREE.SphereGeometry(merah ? 0.13 : 0.1, seg, seg), new THREE.MeshStandardMaterial({ color: merah ? 0xff7849 : 0xfff7d6, emissive: merah ? 0xff3b1f : 0xffe8a3, emissiveIntensity: 0 }));
        x.bohlam.position.y = tinggi; g.add(x.bohlam);
        if (!ringan) { x.cahaya = new THREE.PointLight(merah ? 0xff6a3d : 0xffe2a8, 0, 7); x.cahaya.position.y = tinggi - 0.2; g.add(x.cahaya); }
        x.puncak = 2.55;
      } else if (b === 'pompa') {
        const dudukan = kotak(0.5, 0.06, 0.3, M(0x4b5563)); dudukan.position.y = 0.03; g.add(dudukan);
        const badan = silinder(0.15, 0.15, 0.32, M(0x2563eb)); badan.rotation.z = Math.PI / 2; badan.position.y = 0.21; g.add(badan);
        const pipa = silinder(0.04, 0.04, 0.35, M(0x9ca3af)); pipa.position.set(0.2, 0.4, 0); g.add(pipa);
        x.air = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0 })); x.air.position.set(0.45, 0.55, 0); x.air.rotation.z = -1.2; g.add(x.air);
      } else if (b === 'tandon') {
        const t = silinder(0.7, 0.7, 1.5, M(0x1e40af, { transparent: true, opacity: 0.45 })); t.position.y = 1.05; g.add(t);
        const tutup = silinder(0.72, 0.72, 0.08, M(0x1e3a8a)); tutup.position.y = 1.84; g.add(tutup);
        const kaki = silinder(0.6, 0.6, 0.3, M(0x6b7280)); kaki.position.y = 0.15; g.add(kaki);
        x.isi = silinder(0.66, 0.66, 1, M(0x38bdf8, { transparent: true, opacity: 0.75 })); x.isi.position.y = 0.7; g.add(x.isi);
        x.puncak = 1.9;
      } else if (b === 'relay') {
        const y = meja(g, 0.7, 0.45, 0.5), n = K.kanal || 1, w = 0.18 + n * 0.12;
        const pcb = kotak(w, 0.025, 0.26, M(0x1d4ed8)); pcb.position.y = y + 0.012; g.add(pcb);
        for (let i = 0; i < n; i++) {
          const xi = -w / 2 + 0.14 + i * 0.12;
          const rl = kotak(0.1, 0.09, 0.12, M(0x0f172a)); rl.position.set(xi, y + 0.07, -0.02); g.add(rl);
          const tb = kotak(0.1, 0.06, 0.05, M(0x16a34a)); tb.position.set(xi, y + 0.05, 0.1); g.add(tb);
        }
        x.ujung = y + 0.04;
      } else if (b === 'adaptor') {
        const stop = kotak(0.3, 0.08, 0.16, M(0xf8fafc)); stop.position.y = 0.04; g.add(stop);
        const a = kotak(0.16, 0.14, 0.11, M(0x111827)); a.position.set(-0.05, 0.15, 0); g.add(a);
        const lampu = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), new THREE.MeshBasicMaterial({ color: 0xef4444 })); lampu.position.set(0.1, 0.085, 0.05); g.add(lampu);
        x.ujung = 0.15;
      } else if (b === 'baterai' || b === 'surya') {
        if (b === 'surya') {
          const pn = kotak(1.2, 0.04, 0.8, M(0x1e3a8a, { metalness: 0.4, roughness: 0.3 })); pn.position.y = 1.1; pn.rotation.x = -0.5; g.add(pn);
          if (!ringan) for (let i = -2; i <= 2; i++) { const l = kotak(0.008, 0.045, 0.8, M(0xcbd5e1)); l.position.set(i * 0.24, 1.1, 0); l.rotation.x = -0.5; g.add(l); }
          const t = silinder(0.035, 0.035, 1.1, M(0x6b7280)); t.position.y = 0.55; g.add(t);
        }
        const bt = kotak(0.3, 0.16, 0.2, M(0x16a34a)); bt.position.y = 0.08; g.add(bt);
        for (const dx of [-0.07, 0.07]) { const t = silinder(0.02, 0.02, 0.04, M(dx < 0 ? 0xdc2626 : 0x111827)); t.position.set(dx, 0.18, 0); g.add(t); }
        x.ujung = 0.16;
      } else if (b === 'servo') {   // tempat pakan gantung: corong, servo di bawahnya, piring pakan
        const matT = M(0x9ca3af, { metalness: 0.4 });
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const k = silinder(0.02, 0.02, 1.0, matT); k.position.set(sx * 0.22, 0.5, sz * 0.22); g.add(k); }
        const corong = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.08, 0.45, seg, 1, true), M(0xf59e0b, { side: THREE.DoubleSide })); corong.position.y = 1.05; g.add(corong);
        const isi = silinder(0.27, 0.27, 0.05, M(0xd6b25e)); isi.position.y = 1.2; g.add(isi);
        const s2 = kotak(0.14, 0.1, 0.08, M(0x1d4ed8)); s2.position.set(0, 0.76, 0.1); g.add(s2);
        x.lengan = kotak(0.16, 0.02, 0.03, M(0xfafafa)); x.lengan.position.set(0.06, 0.8, 0.15); g.add(x.lengan);
        const piring = silinder(0.3, 0.25, 0.06, M(0xb45309)); piring.position.y = 0.03; g.add(piring);
        x.ujung = 0.76; x.puncak = 1.3;
      } else if (b === 'kunci') {
        const pintu = kotak(0.9, 1.9, 0.06, M(0x8b5e34)); pintu.position.y = 0.95; g.add(pintu);
        const k = kotak(0.16, 0.22, 0.08, M(0x374151, { metalness: 0.6 })); k.position.set(0.3, 1.0, 0.07); g.add(k);
        x.puncak = 1.95; x.ujung = 1.0;
      } else if (b === 'katup') {
        const pipa = silinder(0.05, 0.05, 0.9, M(0x9ca3af, { metalness: 0.5 })); pipa.rotation.z = Math.PI / 2; pipa.position.y = 0.2; g.add(pipa);
        const k = kotak(0.16, 0.16, 0.14, M(0x334155)); k.position.y = 0.2; g.add(k);
        const koil = silinder(0.07, 0.07, 0.14, M(0x111827)); koil.position.y = 0.36; g.add(koil);
        x.ujung = 0.3;
      } else if (b === 'tusuk') {
        const papanS = kotak(0.12, 0.08, 0.03, M(0x1d4ed8)); papanS.position.y = 0.2; g.add(papanS);
        for (const dx of [-0.03, 0.03]) { const t = kotak(0.02, 0.28, 0.01, M(0xd4a017, { metalness: 0.7 })); t.position.set(dx, 0.04, 0); g.add(t); }
        x.ujung = 0.2;
      } else if (b === 'timbangan') {
        const t = kotak(0.6, 0.06, 0.6, M(0x9ca3af, { metalness: 0.4 })); t.position.y = 0.03; g.add(t);
        const wadah = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.18, seg, 1, true), M(0xf97316, { side: THREE.DoubleSide })); wadah.position.y = 0.15; g.add(wadah);
        x.pakan = silinder(0.24, 0.24, 0.16, M(0xd6b25e)); x.pakan.position.y = 0.14; g.add(x.pakan);
      } else if (b === 'kubah') {
        const t = silinder(0.02, 0.02, 1.7, M(0x9ca3af)); t.position.y = 0.85; g.add(t);
        const badan = kotak(0.16, 0.1, 0.16, M(0x1d4ed8)); badan.position.y = 1.72; g.add(badan);
        const k = new THREE.Mesh(new THREE.SphereGeometry(0.09, seg, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf8fafc, { transparent: true, opacity: 0.9 })); k.position.y = 1.77; g.add(k);
      } else if (b === 'mata') {
        const t = silinder(0.02, 0.02, 2.0, M(0x9ca3af)); t.position.y = 1.0; g.add(t);
        const m = kotak(0.22, 0.1, 0.04, M(0x1d4ed8)); m.position.y = 2.0; g.add(m);
        for (const dx of [-0.055, 0.055]) { const e = silinder(0.035, 0.035, 0.04, M(0xc0c4cc, { metalness: 0.7 })); e.rotation.x = Math.PI / 2; e.position.set(dx, 2.0, 0.04); g.add(e); }
      } else if (b === 'sensor_kotak') {   // DHT22 (putih berkisi) atau MQ-2 (tabung berjaring) di tiang
        const t = silinder(0.02, 0.02, 1.2, M(0x9ca3af)); t.position.y = 0.6; g.add(t);
        if (p.jenis === 'mq2') { const pc = kotak(0.2, 0.02, 0.14, M(0x1d4ed8)); pc.position.y = 1.22; g.add(pc); const tb = silinder(0.07, 0.07, 0.09, M(0xc0c4cc, { metalness: 0.6 })); tb.position.y = 1.28; g.add(tb); }
        else {
          const bd = kotak(0.16, 0.24, 0.08, M(0xf8fafc)); bd.position.y = 1.32; g.add(bd);
          if (!ringan) for (let i = 0; i < 5; i++) { const k = kotak(0.12, 0.012, 0.01, M(0x94a3b8)); k.position.set(0, 1.25 + i * 0.035, 0.045); g.add(k); }
        }
      } else {   // sensor kecil: LDR, reed, ACS712, buzzer
        const t = silinder(0.02, 0.02, 1.0, M(0x9ca3af)); t.position.y = 0.5; g.add(t);
        const pc = kotak(0.16, 0.02, 0.1, M(p.jenis === 'buzzer' ? 0x111827 : 0x1d4ed8)); pc.position.y = 1.01; g.add(pc);
        if (p.jenis === 'ldr') { const d = silinder(0.03, 0.03, 0.02, M(0xb45309)); d.position.y = 1.04; g.add(d); }
        else if (p.jenis === 'buzzer') { const d = silinder(0.05, 0.05, 0.05, M(0x111827)); d.position.y = 1.05; g.add(d); }
        else if (p.jenis === 'reed') { const d = kotak(0.1, 0.03, 0.03, M(0xf8fafc)); d.position.y = 1.04; g.add(d); }
        else { const d = kotak(0.05, 0.03, 0.05, M(0x16a34a)); d.position.y = 1.04; g.add(d); }
      }
      // puncak model: label diletakkan tepat di atasnya
      g.updateMatrixWorld(true); const bx = new THREE.Box3().setFromObject(g);
      if (x.puncak == null) x.puncak = bx.max.y;
      // area klik tak terlihat seukuran model (minimal 0.35 m supaya benda kecil tetap mudah diklik, tidak menutupi kabel di sebelahnya)
      const hw = Math.max(0.35, bx.max.x - bx.min.x), hd = Math.max(0.35, bx.max.z - bx.min.z), hh = Math.max(0.35, x.puncak);
      const hit = kotak(hw, hh, hd, new THREE.MeshBasicMaterial({ visible: false })); hit.position.set((bx.max.x + bx.min.x) / 2, hh / 2, (bx.max.z + bx.min.z) / 2); hit.userData.id = p.id; g.add(hit); x.hit = hit;
      return x;
    }

    /* ---------- membangun adegan dari data dunia ---------- */
    const grupArea = {};
    function bersihkan() { for (const k of Object.keys(grupArea)) delete grupArea[k]; while (grup.children.length) { const c = grup.children.pop(); c.traverse(n => { if (n.geometry) n.geometry.dispose(); }); } for (const k of Object.keys(obj)) delete obj[k]; animasi.length = 0; }
    function muat(dunia, st) {
      W = dunia; lebar = W.lebar; dalam = W.dalam; bersihkan();
      const tanah = new THREE.Mesh(new THREE.PlaneGeometry(lebar, dalam), M(0x5f7d47)); tanah.rotation.x = -Math.PI / 2; tanah.position.set(lebar / 2, 0, dalam / 2); tanah.receiveShadow = !ringan; tanah.userData.lantai = true; grup.add(tanah);
      const tg = []; for (let i = 0; i <= lebar; i++) tg.push(i, 0.01, 0, i, 0.01, dalam); for (let j = 0; j <= dalam; j++) tg.push(0, 0.01, j, lebar, 0.01, j);
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(tg, 3));
      const grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0x4f6b3a, transparent: true, opacity: 0.35 })); grup.add(grid);
      for (const a of W.area) {
        const ga = new THREE.Group(); grup.add(ga); grupArea[a.id] = ga;
        const T = I.AREA[a.tipe];
        const lantai = new THREE.Mesh(new THREE.PlaneGeometry(a.w, a.d), M(new THREE.Color(T.warna).multiplyScalar(T.dinding ? 0.86 : 1))); lantai.rotation.x = -Math.PI / 2; lantai.position.set(a.x + a.w / 2, 0.02, a.z + a.d / 2); lantai.receiveShadow = !ringan; lantai.userData.area = a.id; ga.add(lantai);
        if (T.dinding) {
          const mat = M(0xece6dc, { emissive: 0x2a2620 }), t = 0.9;
          for (const [w, d, x, z] of [[a.w, 0.15, a.x + a.w / 2, a.z], [a.w, 0.15, a.x + a.w / 2, a.z + a.d], [0.15, a.d, a.x, a.z + a.d / 2], [0.15, a.d, a.x + a.w, a.z + a.d / 2]]) { const k = kotak(w, t, d, mat); k.position.set(x, t / 2, z); ga.add(k); }
        } else {
          const mat = M(0x8b6a43);
          for (let i = 0; i <= a.w; i += 1.5) for (const z of [a.z, a.z + a.d]) { const t = silinder(0.05, 0.05, 0.8, mat); t.position.set(a.x + i, 0.4, z); ga.add(t); }
          for (let i = 0; i <= a.d; i += 1.5) for (const x of [a.x, a.x + a.w]) { const t = silinder(0.05, 0.05, 0.8, mat); t.position.set(x, 0.4, a.z + i); ga.add(t); }
        }
        const lb = tulisanLantai(a.nama, Math.min(a.w - 0.6, 3.6)); lb.position.set(a.x + 0.3 + Math.min(a.w - 0.6, 3.6) / 2, 0.035, a.z + a.d - 0.45); ga.add(lb);
        if (T.tanaman) {
          const tan = [];
          for (let i = 0.8; i < a.w - 0.5; i += ringan ? 1.6 : 1.1) for (let j = 1; j < a.d - 0.5; j += ringan ? 1.8 : 1.3) {
            const t = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), M(0x22a34a)); t.scale.set(1, 0.7, 1); t.rotation.y = i * 1.7 + j; t.position.set(a.x + i, 0.2, a.z + j); ga.add(t); tan.push(t);
          }
          animasi.push((t, S) => { const A = S.area[a.id]; if (!A) return; const sehat = A.tanaman / 100, c = new THREE.Color().setHSL(0.08 + 0.25 * sehat, 0.65, 0.32 + 0.1 * (1 - sehat)); tan.forEach((m, i) => { m.material.color.copy(c); m.scale.y = 0.6 + 0.6 * sehat + Math.sin(t * 1.5 + i) * 0.02; }); lantai.material.color.setHSL(0.09, 0.35, 0.55 - 0.25 * (A.tanah || 0) / 100); });
        }
        if (T.hewan) {
          const ayam = [];
          for (let i = 0; i < (ringan ? 3 : 5); i++) {
            const g = new THREE.Group(); const badan = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), M(0xfaf5e9)); badan.scale.set(1.2, 1, 1); badan.position.y = 0.3; g.add(badan);
            const kepala = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), M(0xfaf5e9)); kepala.position.set(0.28, 0.5, 0); g.add(kepala);
            const jengger = kotak(0.08, 0.1, 0.04, M(0xdc2626)); jengger.position.set(0.3, 0.64, 0); g.add(jengger);
            g.position.set(a.x + 1 + Math.random() * (a.w - 2), 0, a.z + 1 + Math.random() * (a.d - 2)); ga.add(g);
            ayam.push({ g, tujuan: g.position.clone(), fase: Math.random() * 6 });
          }
          animasi.push((t, S, dt) => {
            const A = S.area[a.id], stres = A && (A.suhu > 31 || A.pakan < 5);
            for (const y of ayam) {
              if (y.g.position.distanceTo(y.tujuan) < 0.1 || Math.random() < 0.003) y.tujuan.set(a.x + 0.8 + Math.random() * (a.w - 1.6), 0, a.z + 0.8 + Math.random() * (a.d - 1.6));
              const arah = y.tujuan.clone().sub(y.g.position); const l = arah.length();
              if (l > 0.01) { arah.multiplyScalar(Math.min(l, dt * (stres ? 0.3 : 0.9)) / l); y.g.position.add(arah); y.g.rotation.y = Math.atan2(-arah.z, arah.x); }
              y.g.position.y = Math.abs(Math.sin(t * 6 + y.fase)) * (stres ? 0.01 : 0.05);
            }
          });
        }
      }
      for (const p of W.perangkat) {
        const x = bentuk(p); x.g.position.set(p.x, 0, p.z); x.g.userData.id = p.id; grup.add(x.g); obj[p.id] = x;
        // label nama: komponen kecil sulit dikenali tanpa label
        x.label = sprite(p.nama, WARNA_LABEL[I.KATALOG[p.jenis].kategori] || 'rgba(20,24,40,0.85)', 1, true); x.label.position.y = x.puncak + 0.12; x.label.center.set(0.5, 0); x.g.add(x.label);   // tepat di atas model; tumpukan diatur tataLabel()
        if (I.KATALOG[p.jenis].kategori === 'jaringan') {
          const cincin = [];
          for (const rssi of [-60, -70, I.AMBANG_WIFI]) {
            const r = Math.pow(10, (I.KATALOG[p.jenis].daya - rssi) / 26);
            const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.12, r, 48), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
            m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.05, p.z); grup.add(m); cincin.push(m);
          }
          x.cincin = cincin;
        }
      }
      kabel(st || I.status(W, I.buatSim(W)));
      if (pilihan) pilih(pilihan);
      pilihArea(areaPilih);
    }
    let grupKabel = null, kabelPilih = null;
    const daftarKabel = [];   // {kunci, dari, ke, jenis, m, hit}
    /* kurva polyline (sudut tajam) supaya kabel tidak melengkung liar seperti Catmull-Rom */
    class Polyline extends THREE.Curve {
      constructor(pts) { super(); this.pts = pts; this.pjg = [0]; for (let i = 1; i < pts.length; i++) this.pjg.push(this.pjg[i - 1] + pts[i].distanceTo(pts[i - 1])); }
      getPoint(t, out) {
        const v = out || new THREE.Vector3(), L = this.pjg[this.pjg.length - 1] * t;
        let i = 1; while (i < this.pjg.length - 1 && this.pjg[i] < L) i++;
        const a = this.pts[i - 1], b = this.pts[i], seg = this.pjg[i] - this.pjg[i - 1] || 1;
        return v.copy(a).lerp(b, (L - this.pjg[i - 1]) / seg);
      }
    }
    const WARNA_KABEL = { data: 0xeab308, daya: 0xdc2626, beban: 0x475569, relay: 0x16a34a, salah: 0xf97316 };
    function kabel(st, dunia) {
      if (dunia) W = dunia;   // studio bisa mengganti objek dunia (periksaDunia membuat salinan baru)
      if (grupKabel) { grup.remove(grupKabel); grupKabel.traverse(n => { if (n.geometry) n.geometry.dispose(); }); }
      grupKabel = new THREE.Group(); grup.add(grupKabel); daftarKabel.length = 0;
      const urutan = {};   // geser sejajar kabel yang berangkat dari perangkat yang sama
      const garis = (a, b, jenis, salah, kunci) => {
        const oa = obj[a.id], ob = obj[b.id]; if (!oa || !ob) return;
        const pa = oa.g.position, pb = ob.g.position;
        const n = urutan[b.id] = (urutan[b.id] || 0) + 1, geser = (n - 1) * 0.12 - 0.15;
        const h = 0.03 + n * 0.004, ya = oa.ujung, yb = ob.ujung;
        // kabel daya keluar dari sisi belakang papan supaya tidak bertumpuk dengan berkas kabel data di depan
        const ax = pa.x + (jenis === 'daya' ? -0.22 : 0), az = pa.z + (jenis === 'daya' ? -0.16 : 0.12);
        const tA = new THREE.Vector3(ax, ya, az), tB = new THREE.Vector3(pb.x + geser, yb, pb.z + 0.18);
        const pts = [tA, new THREE.Vector3(ax, h, az)];
        // jalur siku: sepanjang x dulu, lalu z
        pts.push(new THREE.Vector3(pb.x + geser, h, az), new THREE.Vector3(pb.x + geser, h, pb.z + 0.18), tB);
        const kur = new Polyline(pts.filter((q, i) => i === 0 || q.distanceTo(pts[i - 1]) > 0.001));
        const tebal = jenis === 'beban' ? 0.03 : 0.02;
        const m = new THREE.Mesh(new THREE.TubeGeometry(kur, Math.max(12, kur.pts.length * 8), tebal, 5, false), new THREE.MeshStandardMaterial({ color: salah ? WARNA_KABEL.salah : WARNA_KABEL[jenis], roughness: 0.5, emissive: 0x000000 }));
        const hit = new THREE.Mesh(new THREE.TubeGeometry(kur, Math.max(12, kur.pts.length * 8), 0.055, 4, false), new THREE.MeshBasicMaterial({ visible: false }));
        hit.userData.kabel = kunci; grupKabel.add(m, hit);
        daftarKabel.push({ kunci, dari: a.id, ke: b.id, jenis, salah, m, hit });
      };
      for (const p of W.perangkat) {
        const K = I.KATALOG[p.jenis], s = st.rk[p.id];
        const salah = !!(s && s.masalah.length);
        if (K.kategori === 'papan' && p.daya) { const d = W.perangkat.find(q => q.id === p.daya); if (d) garis(p, d, 'daya', false, p.id + '>daya'); }
        if (!p.sambung) continue;
        const tujuan = W.perangkat.find(q => q.id === (p.sambung.relay || p.sambung.esp)); if (!tujuan) continue;
        garis(p, tujuan, p.sambung.relay ? 'beban' : K.kanal ? 'relay' : 'data', salah, p.id + '>sambung');
      }
      if (kabelPilih && !daftarKabel.some(k => k.kunci === kabelPilih)) kabelPilih = null;
      pilihKabel(kabelPilih);
    }
    function pilihKabel(kunci) {
      kabelPilih = kunci || null;
      for (const k of daftarKabel) { const on = k.kunci === kabelPilih; k.m.material.emissive.setHex(on ? 0x38bdf8 : 0x000000); k.m.material.emissiveIntensity = on ? 0.9 : 0; k.m.scale.setScalar(1); }
    }
    function ambilKabel(cx, cy) { if (!grupKabel) return null; scene.updateMatrixWorld(); sinar(cx, cy); const hit = ray.intersectObjects(daftarKabel.map(k => k.hit), false)[0]; return hit ? hit.object.userData.kabel : null; }

    /* label perangkat tidak saling tumpuk: label yang bertabrakan di layar didorong ke atas */
    let labelAkhir = [];
    function tataLabel() {
      const r = o.canvas.getBoundingClientRect(), Hh = r.height || 1, Ww = r.width || 1, f = 1 / (2 * Math.tan(camera.fov * Math.PI / 360));
      const hPx = 0.023 * f * Hh, v = new THREE.Vector3(), kotakL = [];
      const daftar = Object.entries(obj).filter(([, x]) => x.label && x.label.visible).map(([id, x]) => {
        x.label.getWorldPosition(v); const jarak = v.distanceTo(camera.position); v.project(camera);
        return { id, x, sx: (v.x + 1) / 2 * Ww, sy: (1 - v.y) / 2 * Hh, w: 0.115 * f * Hh * (x.label.userData.lebar || 1), jarak, dpn: v.z < 1 };
      }).sort((a, b) => (b.id === pilihan) - (a.id === pilihan) || a.jarak - b.jarak);
      for (const L of daftar) {
        let naik = 0;
        const tabrak = () => kotakL.some(k => Math.abs(k.sx - L.sx) < (k.w + L.w) / 2 + 2 && Math.abs((k.sy - k.naik * (hPx + 2)) - (L.sy - naik * (hPx + 2))) < hPx + 1);
        while (naik < 3 && tabrak()) naik++;
        if (naik >= 3 && L.id !== pilihan) { L.x.label.visible = false; continue; }   // terlalu padat: sembunyikan yang jauh
        L.x.label.center.set(0.5, -naik * 1.09); L.naik = naik; kotakL.push(L);
      }
      labelAkhir = kotakL.map(L => ({ id: L.id, x: L.sx, y: L.sy - L.naik * (hPx + 2) - hPx / 2, w: L.w, h: hPx }));
    }

    /* ---------- pemilihan dan sorotan ---------- */
    let cincinPilih = null;
    function pilih(id) {
      pilihan = id;
      if (cincinPilih) { grup.remove(cincinPilih); cincinPilih = null; }
      const x = id && obj[id]; if (!x) return;
      cincinPilih = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 32), new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }));
      cincinPilih.rotation.x = -Math.PI / 2; cincinPilih.position.set(x.g.position.x, 0.07, x.g.position.z); grup.add(cincinPilih);
    }
    /* area terpilih: garis tepi kuning dan pegangan sudut untuk mengubah ukuran */
    let areaPilih = null, tepiArea = null, pegangan = null;
    function pilihArea(id, ukuran, salah) {
      areaPilih = id || null;
      for (const m of [tepiArea, pegangan]) if (m) { grup.remove(m); m.geometry.dispose(); }
      tepiArea = pegangan = null;
      const a = id && W && W.area.find(x => x.id === id); if (!a) return;
      const w = ukuran ? ukuran.w : a.w, d = ukuran ? ukuran.d : a.d, warna = salah ? 0xef4444 : 0xfacc15;
      const pts = [[0, 0], [w, 0], [w, d], [0, d], [0, 0]].map(([x, z]) => new THREE.Vector3(a.x + x, 0.08, a.z + z));
      tepiArea = new THREE.Mesh(new THREE.TubeGeometry(new Polyline(pts), 40, 0.06, 4, false), new THREE.MeshBasicMaterial({ color: warna }));
      pegangan = kotak(0.6, 0.3, 0.6, new THREE.MeshBasicMaterial({ color: warna })); pegangan.position.set(a.x + w, 0.15, a.z + d); pegangan.userData.pegangan = true;
      grup.add(tepiArea, pegangan);
    }
    /* pratinjau saat area diseret: grup area, garis tepi, dan pegangan ikut bergeser */
    function geserArea(id, dx, dz, salah) {
      if (grupArea[id]) grupArea[id].position.set(dx, 0, dz);
      for (const m of [tepiArea, pegangan]) if (m) { m.position.x = (m === pegangan ? m.userData.x0 : 0) + dx; m.position.z = (m === pegangan ? m.userData.z0 : 0) + dz; }
      if (tepiArea) tepiArea.material.color.setHex(salah ? 0xef4444 : 0xfacc15);
      if (pegangan) pegangan.material.color.setHex(salah ? 0xef4444 : 0xfacc15);
    }
    function mulaiGeserArea() { if (pegangan) { pegangan.userData.x0 = pegangan.position.x; pegangan.userData.z0 = pegangan.position.z; } }
    function ambilPegangan(cx, cy) { if (!pegangan) return false; scene.updateMatrixWorld(); sinar(cx, cy); return ray.intersectObject(pegangan, false).length > 0; }

    function sorot(ids) { const t = performance.now(); for (const id of ids || []) sorotan.set(id, t); }

    /* ---------- raycast ---------- */
    const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
    function sinar(cx, cy) { const r = o.canvas.getBoundingClientRect(); v2.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, camera); }
    function titikLantai(cx, cy) {
      sinar(cx, cy); const t = -ray.ray.origin.y / ray.ray.direction.y; if (!(t > 0)) return null;
      const p = ray.ray.origin.clone().add(ray.ray.direction.clone().multiplyScalar(t));
      if (p.x < 0 || p.z < 0 || p.x > lebar || p.z > dalam) return null;
      return { x: Math.round(p.x * 2) / 2, z: Math.round(p.z * 2) / 2 };
    }
    function ambilPerangkat(cx, cy) { scene.updateMatrixWorld(); sinar(cx, cy); const hit = ray.intersectObjects(Object.values(obj).map(x => x.hit), false)[0]; return hit ? hit.object.userData.id : null; }
    function layar(id) { const x = obj[id]; if (!x) return null; scene.updateMatrixWorld(); const v = x.g.position.clone(); v.y = Math.min(0.65, x.puncak / 2); v.project(camera); const r = o.canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }
    function pindah(id, x, z) { const o2 = obj[id]; if (o2) o2.g.position.set(x, 0, z); if (cincinPilih && pilihan === id) cincinPilih.position.set(x, 0.07, z); if (o2 && o2.cincin) o2.cincin.forEach(c => c.position.set(x, 0.05, z)); }

    /* ---------- animasi per frame ---------- */
    let t0 = performance.now();
    function perbarui(S, st) {
      const now = performance.now(), dt = Math.min(0.1, (now - t0) / 1000), t = now / 1000; t0 = now;
      if (!W) return;
      const terang = I.cahayaLuar(S) / 900, malam = 1 - terang;
      // malam tetap terlihat: cahaya bulan kebiruan sebagai batas bawah
      hemi.intensity = 0.62 + 0.18 * terang; mentari.intensity = 0.3 + 0.45 * terang;
      hemi.color.setHSL(0.6, 0.35 * malam, 0.82 + 0.1 * terang); mentari.color.setHSL(0.6 - 0.48 * terang, 0.25, 0.85);
      scene.background = new THREE.Color().setHSL(0.62, 0.42, 0.24 + 0.5 * terang);
      const j = I.jam(S); mentari.position.set(lebar / 2 + 30 * Math.cos((j - 6) / 12 * Math.PI), 10 + 30 * Math.max(0.1, Math.sin((j - 6) / 12 * Math.PI)), dalam / 2); mentari.target.position.set(lebar / 2, 0, dalam / 2);
      for (const p of W.perangkat) {
        const x = obj[p.id]; if (!x) continue; const al = S.alat[p.id], on = al && al.on;
        if (x.label) { const m = o.tampilLabel ? o.tampilLabel() : 'semua'; x.label.visible = m === 'semua' || (m === 'pilih' && pilihan === p.id); }
        if (x.baling && on) x.baling.rotation.z += dt * (6 + 5 * al.level);
        if (x.bohlam) { x.bohlam.material.emissiveIntensity = on ? 1.6 : 0; if (x.kap) x.kap.material.emissiveIntensity = on ? 0.5 : 0; if (x.cahaya) x.cahaya.intensity = on ? 1.2 + malam : 0; }
        if (x.air) x.air.material.opacity = on && S.tandon > 1 ? 0.55 + 0.2 * Math.sin(t * 12) : 0;
        if (x.isi) { const f = Math.max(0.02, S.tandon / 100); x.isi.scale.y = f * 1.6; x.isi.position.y = 0.2 + f * 0.8; }
        if (x.pakan) { const A = S.area[st.rk[p.id].area]; x.pakan.scale.y = A && A.pakan != null ? Math.max(0.05, A.pakan / 100) : 1; }
        if (x.led && st.papan[p.id]) { const b = st.papan[p.id]; x.led.material.color.setHex(!b.hidup ? 0xef4444 : b.online ? 0x22c55e : 0xf59e0b); x.led.visible = !b.hidup || Math.sin(t * (b.online ? 3 : 8)) > -0.3; }
        if (x.led && p.jenis === 'router') x.led.material.color.setHex(st.listrik ? 0x22c55e : 0xef4444);
        if (x.cincin) x.cincin.forEach((c, i) => { c.material.opacity = (st.listrik && !S.kekacauan.wifi ? 0.12 + 0.12 * Math.max(0, Math.sin(t * 2 - i)) : 0.02) * (o.tampilWifi() ? 1 : 0); });
        const s0 = sorotan.get(p.id);
        if (s0) { const u = (now - s0) / 1200; if (u > 1) { sorotan.delete(p.id); x.g.scale.setScalar(1); } else x.g.scale.setScalar(1 + 0.25 * Math.sin(u * Math.PI)); }
      }
      for (const f of animasi) f(t, S, dt);
      if (cincinPilih) cincinPilih.rotation.z += dt;
      if (kabelPilih) { const k = daftarKabel.find(q => q.kunci === kabelPilih); if (k) k.m.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 6); }
      tataLabel();
      renderer.render(scene, camera);
    }
    function ukur() { const r = o.canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); }
    function fokus(x, z, jarak, theta, phi) { kam.target.set(x, 0, z); if (jarak) kam.jarak = jarak; if (theta != null) kam.theta = theta; if (phi != null) kam.phi = phi; pasangKamera(); }
    function resetKamera() { kam.theta = -0.75; kam.phi = 0.9; kam.jarak = Math.max(lebar, dalam) * 1.05; kam.target.set(lebar / 2, 0, dalam / 2); pasangKamera(); }
    pasangKamera();
    /* titik layar pada kabel yang benar-benar bisa diklik (tidak tertutup perangkat) */
    function layarKabel(kunci) {
      const k = daftarKabel.find(q => q.kunci === kunci); if (!k) return null; scene.updateMatrixWorld();
      const r = o.canvas.getBoundingClientRect(), path = k.hit.geometry.parameters.path;
      for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.15, 0.85]) {
        const v = path.getPoint(t).clone(); v.project(camera); const q = { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
        if (!ambilPerangkat(q.x, q.y) && ambilKabel(q.x, q.y) === kunci) return q;
      }
      return null;
    }
    return { pilihArea, geserArea, mulaiGeserArea, ambilPegangan, areaTerpilih: () => areaPilih, labelTerlihat: () => labelAkhir, fokus, ambilKabel, pilihKabel, layarKabel, daftarKabel: () => daftarKabel.map(k => ({ kunci: k.kunci, dari: k.dari, ke: k.ke, jenis: k.jenis, salah: k.salah })), muat, kabel, perbarui, pilih, sorot, titikLantai, ambilPerangkat, layar, pindah, ukur, resetKamera, kamera: kam, renderer, kualitas: () => (ringan ? 'ringan' : 'realistis'), info: () => ({ segitiga: renderer.info.render.triangles, gambar: renderer.info.render.calls }) };
  }
  root.Dunia3D = { buat };
})(typeof window !== 'undefined' ? window : globalThis);
