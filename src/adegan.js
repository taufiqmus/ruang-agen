/* Adegan 3D. Semua bentuk dibuat dari definisi ruang (dunia.js): tema, perangkat, dan spesialis.
   Dua mutu grafis:
     realistis : material PBR, pantulan lingkungan, bayangan lembut, tone mapping film
     ringan    : material sederhana, tanpa bayangan dan pantulan, resolusi layar 1x (untuk laptop berspesifikasi rendah)
   Berkas ini hanya menggambar. Keputusan agen ada di brain.js, alur permainan di game.js. */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lin = c => new THREE.Color(c).convertSRGBToLinear();
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const C = { ink: 0x1b1a2e, coral: 0xff5a47, blue: 0x2f5bff, yellow: 0xffc928, mint: 0x1fb67f, ungu: 0x8a4bff, putih: 0xf3f4f7, logam: 0xaab2c2, gelap: 0x24252f, kayu: 0xb98a5a, kayuTua: 0x7a5636 };
  const WARNA_SPES = [C.yellow, C.mint, C.coral, C.ungu];
  const WARNA_TIPE = { saklar: C.yellow, level: C.blue, buka: C.mint, mesin: C.coral };

  function buat(opsi) {
    const canvas = opsi.canvas, stage = opsi.stage, laju = opsi.kecepatan || (() => 1);
    let Q = opsi.kualitas === 'ringan' ? 'ringan' : 'realistis';
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q !== 'ringan', powerPreference: 'high-performance' });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const langit = new THREE.Color(), LANGIT_GELAP = lin(0x8d96aa), LANGIT_TERANG = lin(0xdfe7f3);
    scene.background = langit;

    const hemi = new THREE.HemisphereLight(lin(0xe6eeff), lin(0x6f665c), 0.4); scene.add(hemi);
    const sun = new THREE.DirectionalLight(lin(0xfff0dc), 0.4);
    sun.position.set(-7, 9.5, 6); sun.target.position.set(0.5, 0, -1); scene.add(sun, sun.target);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    let envTex = null;
    function terapkanMutu() {
      const real = Q === 'realistis';
      renderer.setPixelRatio(real ? Math.min(root.devicePixelRatio || 1, 2) : 1);
      renderer.shadowMap.enabled = real; sun.castShadow = real;
      sun.shadow.mapSize.set(2048, 2048);
      renderer.toneMappingExposure = real ? 1.15 : 1.25;
      if (real && !envTex) {
        // lingkungan pantulan buatan: kotak abu dengan beberapa panel terang, dipakai material logam dan kaca
        const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
        es.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x70757f, side: THREE.BackSide })));
        [[0, 4.9, 0, 5, 0xffffff], [-4.9, 1, 0, 3, 0xfff0dd], [0, 1, 4.9, 3, 0xdde8ff]].forEach(p => {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(p[3], p[3]), new THREE.MeshBasicMaterial({ color: p[4], side: THREE.DoubleSide }));
          m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); es.add(m);
        });
        envTex = pm.fromScene(es, 0.04).texture; pm.dispose();
      }
      scene.environment = real ? envTex : null;
      fit();
    }

    /* ---------- pabrik material dan bentuk ---------- */
    const mat = (c, o) => {
      o = o || {};
      const dasar = { color: lin(c), transparent: o.opacity != null, opacity: o.opacity != null ? o.opacity : 1, side: o.side || THREE.FrontSide };
      if (o.map) dasar.map = o.map;
      if (o.emissive != null) { dasar.emissive = lin(o.emissive); dasar.emissiveIntensity = o.ei != null ? o.ei : 0; }
      if (Q === 'ringan') return new THREE.MeshLambertMaterial(dasar);
      return new THREE.MeshStandardMaterial(Object.assign(dasar, { roughness: o.r != null ? o.r : 0.7, metalness: o.m || 0, envMapIntensity: o.env != null ? o.env : 0.9 }));
    };
    const logam = (c, r) => mat(c == null ? C.logam : c, { r: r == null ? 0.32 : r, m: 0.9 });
    const tambah = (m, x, y, z, p, bayang) => { m.position.set(x, y, z); if (Q === 'realistis') { m.castShadow = bayang !== false; m.receiveShadow = true; } p.add(m); return m; };
    const box = (w, h, d, m, x, y, z, p, b) => tambah(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y, z, p, b);
    const cyl = (rt, rb, h, m, x, y, z, p, seg) => tambah(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || (Q === 'ringan' ? 12 : 28)), m), x, y, z, p);
    const bola = (r, m, x, y, z, p) => tambah(new THREE.Mesh(new THREE.SphereGeometry(r, Q === 'ringan' ? 12 : 28, Q === 'ringan' ? 8 : 18), m), x, y, z, p);
    const torus = (R, r, m, x, y, z, p) => tambah(new THREE.Mesh(new THREE.TorusGeometry(R, r, Q === 'ringan' ? 6 : 12, Q === 'ringan' ? 20 : 48), m), x, y, z, p);
    function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    const papanTeks = [];
    function sign(w, h, draw, px) {
      const k = (px || 220) * (Q === 'ringan' ? 0.7 : 1);
      const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      const ctx = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = Q === 'ringan' ? 1 : 4;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true }));
      const redraw = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.scale(k / (px || 220), k / (px || 220)); draw(ctx, w * (px || 220), h * (px || 220)); tex.needsUpdate = true; };
      redraw(); const s = { mesh, redraw }; papanTeks.push(s); return s;
    }
    /* Tekstur prosedural (tanpa berkas gambar). Acak berbenih supaya hasilnya selalu sama. */
    function acak(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function teksturLantai(jenis) {
      const n = Q === 'ringan' ? 256 : 512, cv = document.createElement('canvas'); cv.width = cv.height = n;
      const x = cv.getContext('2d'), r = acak(7), k = n / 512;
      if (jenis === 'kayu') {
        for (let i = 0; i < 8; i++) {
          let u = -r() * 200 * k;
          while (u < n) {
            const w = (150 + r() * 160) * k, t = 108 + r() * 46;
            x.fillStyle = `rgb(${t + 62},${t + 18},${t - 30})`; x.fillRect(u, i * 64 * k, w - 2 * k, 64 * k - 2 * k);
            for (let j = 0; j < 9; j++) { x.strokeStyle = `rgba(70,40,15,${0.05 + r() * 0.09})`; x.lineWidth = k; const y = i * 64 * k + r() * 62 * k; x.beginPath(); x.moveTo(u, y); x.bezierCurveTo(u + w * 0.3, y + (r() - 0.5) * 6 * k, u + w * 0.6, y + (r() - 0.5) * 6 * k, u + w, y); x.stroke(); }
            u += w;
          }
        }
      } else if (jenis === 'beton') {
        x.fillStyle = '#8d9199'; x.fillRect(0, 0, n, n);
        for (let i = 0; i < 2600; i++) { const g = 90 + r() * 110; x.fillStyle = `rgba(${g},${g},${g + 6},${0.08 + r() * 0.14})`; const s = (1 + r() * 9) * k; x.fillRect(r() * n, r() * n, s, s); }
        x.strokeStyle = 'rgba(60,62,70,0.35)'; x.lineWidth = 2 * k; x.strokeRect(0, 0, n, n);
      } else {
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const g = (i + j) % 2 ? 212 : 226; x.fillStyle = `rgb(${g},${g + 3},${g + 9})`; x.fillRect(i * n / 2, j * n / 2, n / 2, n / 2); }
        for (let i = 0; i < 1400; i++) { const g = 150 + r() * 90; x.fillStyle = `rgba(${g},${g},${g},0.07)`; x.fillRect(r() * n, r() * n, 2 * k, 2 * k); }
        x.strokeStyle = 'rgba(120,128,145,0.8)'; x.lineWidth = 3 * k; for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * n / 2, 0); x.lineTo(i * n / 2, n); x.moveTo(0, i * n / 2); x.lineTo(n, i * n / 2); x.stroke(); }
      }
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = Q === 'ringan' ? 1 : 8;
      tex.repeat.set(jenis === 'kayu' ? 3 : jenis === 'beton' ? 4 : 6, jenis === 'kayu' ? 2.5 : jenis === 'beton' ? 3.3 : 5);
      return tex;
    }

    /* ---------- isi ruang (dibangun ulang tiap ganti ruang atau mutu) ---------- */
    let grup = null, R = null, anim = [], lampuTitik = [], tombol = {}, posTombol = {}, spes = {}, A = null, totem = null, papan = null, bukuSorot = null, cincinMesh = null;
    let labelA = null, router = null, st = null, rakAktif = 0, OP = { rute: [], spesialis: {}, agen: { nama: 'Agen', warna: '#2f5bff' } };
    const PAD = { HOME: { x: 0, z: 2.3 }, S: { x: -2.0, z: -3.6, hadap: [-2.0, -5] }, R: { x: -4.5, z: -2.5, hadap: [-5.65, -2.5] } };
    const SLOT_LANTAI = [[-3.5, -3.9], [2.6, -3.9], [4.4, -2.7], [-1.9, -4.35], [-5.0, 3.9], [5.2, 4.3]];
    const SLOT_KONSOL = [[-4.5, 1.3, Math.PI / 2], [-4.5, -0.4, Math.PI / 2], [4.6, 0.6, -Math.PI / 2], [4.6, 2.4, -Math.PI / 2]];
    const halus = (v, t, dt, k) => v + (t - v) * Math.min(1, dt * (k || 5));

    function buatRobot(warna, skala) {
      const g = new THREE.Group(), b = new THREE.Group(); g.add(b); grup.add(g);
      const putih = mat(C.putih, { r: 0.32, env: 1.1 }), gelap = mat(C.gelap, { r: 0.45, m: 0.4 }), aks = mat(warna, { r: 0.4 });
      cyl(0.37, 0.41, 0.16, gelap, 0, 0.08, 0, b);
      cyl(0.29, 0.36, 0.72, putih, 0, 0.56, 0, b);
      bola(0.29, putih, 0, 0.92, 0, b);
      const ban = torus(0.335, 0.035, aks, 0, 0.3, 0, b); ban.rotation.x = Math.PI / 2;
      const dada = bola(0.05, mat(warna, { emissive: warna, ei: 1.2 }), 0, 0.74, 0.3, b);
      const kepala = new THREE.Group(); kepala.position.set(0, 1.42, 0); b.add(kepala);
      const tengkorak = bola(0.3, putih, 0, 0, 0, kepala); tengkorak.scale.set(1, 0.84, 1);
      const seg = Q === 'ringan' ? 10 : 24;
      const visor = tambah(new THREE.Mesh(new THREE.SphereGeometry(0.308, seg, seg, Math.PI / 2 - 0.85, 1.7, 1.02, 0.78), mat(0x0c0d16, { r: 0.12, m: 0.6, env: 1.4 })), 0, 0, 0, kepala, false);
      visor.scale.set(1, 0.84, 1);
      const mata = [-0.11, 0.11].map(x => bola(0.042, mat(0x7dffd0, { emissive: 0x52ffc0, ei: 1.6 }), x, -0.02, 0.288, kepala));
      cyl(0.018, 0.018, 0.2, logam(), 0, 0.34, 0, kepala, 8);
      const antena = bola(0.05, mat(C.coral, { emissive: C.coral, ei: 0.8 }), 0, 0.46, 0, kepala);
      const lengan = sx => { const p = new THREE.Group(); p.position.set(sx * 0.37, 1.0, 0); b.add(p); bola(0.085, aks, 0, 0, 0, p); cyl(0.058, 0.05, 0.42, putih, 0, -0.25, 0, p, 14); bola(0.07, gelap, 0, -0.48, 0, p); return p; };
      const X = { g, badan: b, kepala, antena, dada, mata, lenganL: lengan(-1), lenganR: lengan(1), ph: 0, jalan: false, tekan: 0, fase: Math.random() * 6 };
      g.scale.setScalar(skala || 1);
      return X;
    }

    /* Pembuat bentuk perangkat. Tiap pembuat mengembalikan fungsi animasi(dt, keadaan, waktu). */
    const BENTUK = {
      lampu_berdiri(g, d) {
        cyl(0.3, 0.36, 0.06, logam(C.gelap, 0.4), 0, 0.03, 0, g); cyl(0.035, 0.035, 2.25, logam(), 0, 1.15, 0, g, 12);
        const kap = tambah(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.56, 0.66, Q === 'ringan' ? 14 : 32, 1, true), mat(0xfff3d6, { emissive: 0xffc56a, ei: 0, side: THREE.DoubleSide, r: 0.95 })), 0, 2.45, 0, g);
        const bohlam = bola(0.11, mat(0xfff6dd, { emissive: 0xffd28a, ei: 0 }), 0, 2.38, 0, g);
        let v = 0; titikLampu(g, 0, 2.3, 0.4, d);
        return (dt, x) => { v = halus(v, x.on ? 1 : 0, dt, 6); kap.material.emissiveIntensity = v * 1.1; bohlam.material.emissiveIntensity = v * 2.2; return v; };
      },
      lampu_gantung(g, d) {
        const kaps = [-1.5, 0, 1.5].map((x, i) => {
          cyl(0.012, 0.012, 2.0, mat(C.gelap), x, 4.2 - i * 0.0, 0, g, 6);
          const kap = tambah(new THREE.Mesh(new THREE.SphereGeometry(0.34, Q === 'ringan' ? 12 : 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x2c2a33, { r: 0.4, m: 0.6, side: THREE.DoubleSide })), x, 3.05, 0, g);
          return [kap, bola(0.1, mat(0xfff0cf, { emissive: 0xffc070, ei: 0 }), x, 3.08, 0, g)];
        });
        let v = 0; titikLampu(g, 0, 2.8, 0, d);
        return (dt, x) => { v = halus(v, x.on ? 1 : 0, dt, 6); kaps.forEach(k => { k[1].material.emissiveIntensity = v * 2.6; }); return v; };
      },
      ring_light(g, d) {
        [0, 2.1, 4.2].forEach(a => { const k = cyl(0.02, 0.02, 0.95, logam(C.gelap), Math.sin(a) * 0.28, 0.42, Math.cos(a) * 0.28, g, 8); k.rotation.set(Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6); });
        cyl(0.025, 0.025, 1.3, logam(C.gelap), 0, 1.4, 0, g, 10);
        const ring = torus(0.42, 0.05, mat(0xfffaf0, { emissive: 0xfff2dd, ei: 0 }), 0, 2.25, 0.02, g);
        box(0.12, 0.22, 0.02, mat(C.gelap, { r: 0.2, m: 0.5 }), 0, 2.25, 0.03, g);
        let v = 0; titikLampu(g, 0, 2.25, 0.6, d);
        return (dt, x) => { v = halus(v, x.on ? 1 : 0, dt, 6); ring.material.emissiveIntensity = v * 2.4; return v; };
      },
      tanda(g, d) {
        let nyala = false;
        box(1.5, 0.52, 0.1, mat(C.gelap, { r: 0.5 }), 0, 0, -0.03, g);
        const s = sign(1.4, 0.42, (ctx, w, h) => {
          ctx.fillStyle = nyala ? '#ff2d2d' : '#3a1418'; rrect(ctx, 0, 0, w, h, 12); ctx.fill();
          ctx.fillStyle = nyala ? '#fff' : '#7a4a4f'; ctx.font = '800 44px "Bricolage Grotesque", "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(d.nama.replace(/^tanda /i, '').toUpperCase().slice(0, 12), w / 2, h / 2 + 2);
        });
        s.mesh.position.set(0, 0, 0.03); g.add(s.mesh);
        return (dt, x) => { if (!!x.on !== nyala) { nyala = !!x.on; s.redraw(); } return nyala ? 1 : 0; };
      },
      kipas(g) {
        cyl(0.38, 0.44, 0.07, logam(C.gelap, 0.4), 0, 0.035, 0, g); cyl(0.045, 0.045, 1.5, logam(), 0, 0.8, 0, g, 12);
        const kepala = new THREE.Group(); kepala.position.set(0, 1.7, 0); g.add(kepala);
        torus(0.6, 0.03, logam(), 0, 0, 0.1, kepala); torus(0.6, 0.03, logam(), 0, 0, -0.1, kepala);
        for (let i = 0; i < 10; i++) { const s = cyl(0.008, 0.008, 1.18, logam(), 0, 0, 0.12, kepala, 5); s.rotation.z = i * Math.PI / 10; }
        cyl(0.13, 0.15, 0.3, mat(C.putih, { r: 0.35 }), 0, 0, -0.18, kepala).rotation.x = Math.PI / 2;
        const bilah = new THREE.Group(); kepala.add(bilah);
        cyl(0.09, 0.09, 0.1, mat(C.blue, { r: 0.35 }), 0, 0, 0.02, bilah).rotation.x = Math.PI / 2;
        for (let i = 0; i < 3; i++) { const p = new THREE.Group(); p.rotation.z = i * 2.094; bilah.add(p); const b = bola(0.26, mat(0x9fb6ff, { r: 0.25, opacity: 0.85 }), 0, 0.3, 0.02, p); b.scale.set(0.5, 1, 0.06); b.rotation.y = 0.35; }
        kepala.rotation.y = 0.35; let v = 0;
        return (dt, x, w) => { v = halus(v, x.on ? x.speed * 5 : 0, dt, 2); bilah.rotation.z -= v * dt; kepala.rotation.y = x.on ? 0.35 + Math.sin(w * 0.7) * 0.5 : halus(kepala.rotation.y, 0.35, dt, 2); return 0; };
      },
      ac(g, d) {
        box(1.5, 0.42, 0.3, mat(C.putih, { r: 0.3 }), 0, 0, 0.15, g); box(1.4, 0.03, 0.05, mat(0xcfd4dc), 0, 0.12, 0.31, g, false);
        const sirip = new THREE.Group(); sirip.position.set(0, -0.2, 0.26); g.add(sirip); box(1.4, 0.02, 0.16, mat(0xe4e7ec, { r: 0.3 }), 0, 0, 0.06, sirip, false);
        const led = [0, 1, 2].map(i => bola(0.022, mat(0x9effc8, { emissive: 0x34ff9a, ei: 0 }), 0.5 + i * 0.07, -0.08, 0.31, g));
        const angin = [0, 1, 2].map(i => { const m = box(1.2, 0.012, 0.012, mat(0xffffff, { opacity: 0 }), 0, -0.3, 0.4, g, false); m.userData.f = i / 3; return m; });
        let buka = 0;
        return (dt, x, w) => {
          buka = halus(buka, x.on ? 1 : 0, dt, 3); sirip.rotation.x = buka * 0.9;
          led.forEach((l, i) => { l.material.emissiveIntensity = x.on && i < Math.min(x.speed, 3) ? 2 : 0; });
          angin.forEach(a => { const f = (w * (0.5 + (x.speed || 1) * 0.25) + a.userData.f) % 1; a.position.set(0, -0.3 - f * 0.9, 0.4 + f * 0.6); a.material.opacity = buka * 0.35 * (1 - f); });
          return 0;
        };
      },
      speaker(g) {
        box(0.5, 1.15, 0.42, mat(0x23232b, { r: 0.6 }), 0, 0.6, 0, g); box(0.52, 0.04, 0.44, mat(C.kayuTua, { r: 0.5 }), 0, 1.19, 0, g);
        const kon = [[0.82, 0.11], [0.42, 0.19]].map(k => { const c = cyl(k[1], k[1] * 0.55, 0.06, mat(0x3a3a46, { r: 0.35, m: 0.3 }), 0, k[0], 0.21, g); c.rotation.x = Math.PI / 2; torus(k[1] + 0.012, 0.012, logam(), 0, k[0], 0.225, g); return c; });
        const led = bola(0.02, mat(0x8fd0ff, { emissive: 0x3aa8ff, ei: 0 }), 0.19, 1.08, 0.215, g);
        return (dt, x, w) => { const p = x.on ? 1 + Math.abs(Math.sin(w * (4 + x.speed * 1.5))) * 0.06 * x.speed : 1; kon.forEach(c => c.scale.set(p, 1, p)); led.material.emissiveIntensity = x.on ? 2 : 0; return 0; };
      },
      pintu(g) {
        const daun = box(1.5, 2.7, 0.09, mat(R.tema.aksen, { r: 0.45 }), 0.75, 1.35, 0, g);
        [[0.75, 2.0, 1.1, 0.9], [0.75, 0.75, 1.1, 1.1]].forEach(p => box(p[2], p[3], 0.02, mat(R.tema.aksen, { r: 0.6 }), p[0], p[1], 0.05, g, false));
        cyl(0.03, 0.03, 0.14, logam(), 1.3, 1.25, 0.09, g, 10).rotation.x = Math.PI / 2; bola(0.05, logam(), 1.3, 1.25, 0.17, g);
        let a = 0; void daun;
        return (dt, x) => { a = halus(a, x.open ? -1.35 : 0, dt, 3); g.rotation.y = a; return 0; };
      },
      tirai(g) {
        const kain = box(0.06, 1.9, 2.5, mat(R.tema.aksen, { r: 0.95 }), 0, 0, 0, g); let b = 0;
        return (dt, x) => { b = halus(b, x.open ? 1 : 0, dt, 3); kain.scale.z = 1 - b * 0.8; kain.position.z = -b * 1.0; return 0; };
      },
      lengan(g) {
        cyl(0.58, 0.68, 0.28, mat(C.gelap, { r: 0.5, m: 0.5 }), 0, 0.14, 0, g);
        const tur = new THREE.Group(); tur.position.y = 0.28; g.add(tur); cyl(0.38, 0.44, 0.38, logam(), 0, 0.19, 0, tur);
        const bahu = new THREE.Group(); bahu.position.y = 0.5; tur.add(bahu);
        const sendi = () => mat(C.coral, { r: 0.35 }), ruas = () => mat(C.yellow, { r: 0.35, env: 1 });
        cyl(0.2, 0.2, 0.42, sendi(), 0, 0, 0, bahu).rotation.x = Math.PI / 2; cyl(0.13, 0.15, 1.3, ruas(), 0, 0.65, 0, bahu);
        const siku = new THREE.Group(); siku.position.y = 1.3; bahu.add(siku);
        cyl(0.17, 0.17, 0.36, sendi(), 0, 0, 0, siku).rotation.x = Math.PI / 2; cyl(0.1, 0.12, 1.0, ruas(), 0, 0.5, 0, siku);
        cyl(0.12, 0.12, 0.1, logam(C.gelap), 0, 1.03, 0, siku); [-0.11, 0.11].forEach(x => box(0.04, 0.24, 0.1, logam(C.gelap), x, 1.18, 0, siku));
        let f = 0; const p = { t: 0, b: -0.2, s: 0.4 };
        return (dt, x) => {
          if (x.on) { f += dt * (x.speed / 22); const r = (clamp(x.angle, 10, 180) * Math.PI / 180) * 0.5; p.t = Math.sin(f) * r; p.b = -0.5 + Math.sin(f * 2) * 0.22; p.s = 0.9 + Math.sin(f * 2 + 1) * 0.3; }
          else { p.t = halus(p.t, 0, dt, 3); p.b = halus(p.b, -0.2, dt, 3); p.s = halus(p.s, 0.4, dt, 3); }
          tur.rotation.y = p.t; bahu.rotation.z = p.b; siku.rotation.z = p.s; return 0;
        };
      },
      mesin_kopi(g) {
        box(1.5, 0.92, 0.72, mat(C.kayuTua, { r: 0.55 }), 0, 0.46, 0, g); box(1.6, 0.06, 0.8, mat(0x2b2c33, { r: 0.25, m: 0.2 }), 0, 0.95, 0, g);
        box(0.72, 0.5, 0.5, logam(0xd7dbe2, 0.22), -0.2, 1.23, -0.05, g); box(0.76, 0.08, 0.54, mat(C.gelap, { r: 0.4 }), -0.2, 1.52, -0.05, g);
        cyl(0.07, 0.07, 0.1, logam(C.gelap), -0.2, 1.16, 0.2, g, 14); box(0.05, 0.03, 0.22, mat(C.gelap), -0.2, 1.1, 0.33, g, false);
        cyl(0.055, 0.045, 0.1, mat(0xfbfbfb, { r: 0.2 }), -0.2, 1.03, 0.2, g, 16);
        cyl(0.16, 0.13, 0.3, mat(0x3b2a20, { r: 0.4, opacity: 0.75 }), 0.5, 1.13, 0, g, 16); cyl(0.11, 0.11, 0.04, logam(), 0.5, 1.3, 0, g, 14);
        const led = bola(0.025, mat(0xffd27d, { emissive: 0xff9a2d, ei: 0 }), 0.08, 1.4, 0.21, g);
        const uap = [0, 1, 2, 3].map(i => { const u = bola(0.06, mat(0xffffff, { opacity: 0 }), -0.2, 1.1, 0.2, g); u.castShadow = false; u.userData.f = i / 4; return u; });
        return (dt, x, w) => {
          led.material.emissiveIntensity = x.on ? 2.2 : 0;
          uap.forEach(u => { const f = (w * (0.35 + (x.speed || 30) / 200) + u.userData.f) % 1; u.position.set(-0.2 + Math.sin(f * 6 + u.userData.f * 9) * 0.05, 1.12 + f * 0.7, 0.2); u.scale.setScalar(0.6 + f * 1.4); u.material.opacity = x.on ? 0.28 * (1 - f) : 0; });
          return 0;
        };
      },
      kamera(g) {
        [0, 2.1, 4.2].forEach(a => { const k = cyl(0.022, 0.03, 1.5, logam(C.gelap), Math.sin(a) * 0.36, 0.7, Math.cos(a) * 0.36, g, 8); k.rotation.set(Math.cos(a) * 0.48, 0, -Math.sin(a) * 0.48); });
        cyl(0.06, 0.06, 0.12, logam(C.gelap), 0, 1.42, 0, g, 12);
        const pan = new THREE.Group(); pan.position.y = 1.5; g.add(pan);
        cyl(0.03, 0.03, 0.3, logam(), 0.26, 0.12, 0, pan, 8); box(0.56, 0.04, 0.08, logam(), 0, -0.02, 0, pan);
        box(0.36, 0.24, 0.3, mat(0x1c1c22, { r: 0.4, m: 0.3 }), 0, 0.14, 0, pan);
        cyl(0.1, 0.11, 0.26, mat(0x101014, { r: 0.25, m: 0.6 }), 0, 0.14, 0.26, pan, 20).rotation.x = Math.PI / 2;
        cyl(0.085, 0.085, 0.01, mat(0x223355, { r: 0.05, m: 0.9, env: 1.6 }), 0, 0.14, 0.392, pan, 20).rotation.x = Math.PI / 2;
        const tally = bola(0.024, mat(0xff5a5a, { emissive: 0xff1e1e, ei: 0 }), 0.13, 0.23, 0.155, pan);
        let f = 0, y = 0;
        return (dt, x) => { if (x.on) { f += dt * (x.speed / 25); y = Math.sin(f) * (clamp(x.angle, 10, 180) * Math.PI / 180) * 0.5; } else y = halus(y, 0, dt, 3); pan.rotation.y = y; tally.material.emissiveIntensity = x.on ? 2.5 : 0; return 0; };
      },
      kotak(g, d) {
        box(0.7, 0.9, 0.6, mat(0x3a3d4a, { r: 0.5, m: 0.2 }), 0, 0.45, 0, g);
        const led = bola(0.05, mat(WARNA_TIPE[d.tipe], { emissive: WARNA_TIPE[d.tipe], ei: 0 }), 0, 0.98, 0, g);
        const s = sign(0.66, 0.2, (ctx, w, h) => { ctx.fillStyle = '#fff'; rrect(ctx, 0, 0, w, h, 8); ctx.fill(); ctx.fillStyle = hex(C.ink); ctx.font = '700 24px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(d.nama.toUpperCase().slice(0, 9), w / 2, h * 0.7); });
        s.mesh.position.set(0, 0.6, 0.31); g.add(s.mesh);
        return (dt, x) => { led.material.emissiveIntensity = x.on || x.open ? 2.2 : 0; return 0; };
      }
    };
    function titikLampu(g, x, y, z, d) {
      if (!(d.efek.cahaya > 0) || lampuTitik.length >= 2) return;
      const l = new THREE.PointLight(lin(0xffd9a6), 0, 16, 1.4); l.position.set(x, y, z); g.add(l); lampuTitik.push(l); g.userData.lampu = l;
    }

    function bangunRuang() {
      const T = R.tema, dinding = () => mat(T.dinding, { r: 0.92 }), trim = mat(0xffffff, { r: 0.6 });
      const lantai = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), mat(0xffffff, { map: teksturLantai(T.lantai), r: T.lantai === 'kayu' ? 0.45 : T.lantai === 'beton' ? 0.8 : 0.3, env: 0.7 }));
      lantai.rotation.x = -Math.PI / 2; lantai.receiveShadow = Q === 'realistis'; grup.add(lantai);
      box(13, 0.3, 11, mat(0x2a2b36, { r: 0.8 }), 0, -0.16, 0, grup, false);
      // dinding belakang dengan celah pintu (x -0.6 sampai 0.9)
      box(5.7, 4.2, 0.3, dinding(), -3.45, 2.1, -5.15, grup); box(5.4, 4.2, 0.3, dinding(), 3.6, 2.1, -5.15, grup); box(1.5, 1.5, 0.3, dinding(), 0.15, 3.45, -5.15, grup);
      // dinding kiri dengan jendela (z 1.6 sampai 3.8, y 1.1 sampai 3.0)
      box(0.3, 4.2, 6.75, dinding(), -6.15, 2.1, -1.775, grup); box(0.3, 4.2, 1.35, dinding(), -6.15, 2.1, 4.475, grup);
      box(0.3, 1.1, 2.2, dinding(), -6.15, 0.55, 2.7, grup); box(0.3, 1.2, 2.2, dinding(), -6.15, 3.6, 2.7, grup);
      box(0.34, 0.08, 2.3, trim, -6.12, 1.08, 2.7, grup); box(0.34, 0.08, 2.3, trim, -6.12, 3.02, 2.7, grup); box(0.2, 1.9, 0.07, trim, -6.12, 2.05, 2.7, grup);
      box(0.04, 1.9, 2.2, mat(0xcfe6ff, { opacity: 0.22, r: 0.05, m: 0.1, env: 1.5 }), -6.15, 2.05, 2.7, grup, false);
      const luarKiri = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), new THREE.MeshBasicMaterial({ color: lin(0xbfe0ff) })); luarKiri.rotation.y = Math.PI / 2; luarKiri.position.set(-6.6, 2.05, 2.7); grup.add(luarKiri);
      box(5.7, 0.14, 0.04, trim, -3.45, 0.07, -4.98, grup, false); box(5.4, 0.14, 0.04, trim, 3.6, 0.07, -4.98, grup, false); box(0.04, 0.14, 10, trim, -5.98, 0.07, 0, grup, false);
      // pemandangan dan kusen pintu
      const luar = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.9), new THREE.MeshBasicMaterial({ color: lin(0xbfe3ff) })); luar.position.set(0.15, 1.45, -5.6); grup.add(luar);
      const rumput = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.8), new THREE.MeshBasicMaterial({ color: lin(0x86cf98) })); rumput.position.set(0.15, 0.4, -5.58); grup.add(rumput);
      const kusen = mat(0x2b2c36, { r: 0.5 });
      box(0.12, 2.8, 0.34, kusen, -0.66, 1.4, -5.15, grup); box(0.12, 2.8, 0.34, kusen, 0.96, 1.4, -5.15, grup); box(1.74, 0.12, 0.34, kusen, 0.15, 2.8, -5.15, grup);
      // karpet, meja depan, tanaman
      const karpet = new THREE.Mesh(new THREE.CircleGeometry(2.3, Q === 'ringan' ? 24 : 48), mat(new THREE.Color(T.aksen).lerp(new THREE.Color(0xffffff), 0.62), { r: 1 }));
      karpet.rotation.x = -Math.PI / 2; karpet.position.set(0, 0.012, 0.6); karpet.receiveShadow = Q === 'realistis'; grup.add(karpet);
      box(3.2, 0.72, 0.8, mat(C.kayuTua, { r: 0.55 }), 0, 0.36, 3.7, grup); box(3.22, 0.05, 0.82, mat(T.aksen, { r: 0.5 }), 0, 0.12, 3.7, grup, false); box(3.36, 0.07, 0.92, mat(C.kayu, { r: 0.4 }), 0, 0.755, 3.7, grup);
      cyl(0.3, 0.22, 0.5, mat(0xd9d2c7, { r: 0.8 }), -5.2, 0.25, -4.3, grup, 16);
      const r = acak(11); for (let i = 0; i < 7; i++) { const d = bola(0.3 + r() * 0.16, mat(i % 2 ? 0x2f9e62 : 0x3bb273, { r: 0.8 }), -5.2 + (r() - 0.5) * 0.5, 0.85 + r() * 0.75, -4.3 + (r() - 0.5) * 0.5, grup); d.scale.y = 1.25; }

      // rak manual
      const rak = new THREE.Group(); rak.position.set(-5.65, 0, -2.5); rak.rotation.y = Math.PI / 2; grup.add(rak);
      const kayu = mat(C.kayu, { r: 0.5 });
      box(2.0, 2.4, 0.06, kayu, 0, 1.2, -0.22, rak); box(0.06, 2.4, 0.5, kayu, -0.97, 1.2, 0, rak); box(0.06, 2.4, 0.5, kayu, 0.97, 1.2, 0, rak); box(2.0, 0.06, 0.5, kayu, 0, 2.37, 0, rak);
      const warna = [C.coral, C.blue, C.yellow, C.mint, 0xf2efe6, C.ink, C.ungu];
      for (let b = 0; b < 3; b++) {
        box(1.9, 0.05, 0.48, kayu, 0, 0.3 + b * 0.7, 0, rak);
        for (let i = 0; i < 8; i++) {
          const t = 0.42 + ((i * 7 + b * 3) % 5) * 0.035, sorot = b === 1 && i === 3;
          const bk = box(0.16, t, 0.32, mat(warna[(i + b * 2) % warna.length], sorot ? { r: 0.6, emissive: 0xfff2a8, ei: 0 } : { r: 0.6 }), -0.78 + i * 0.22, 0.33 + b * 0.7 + t / 2, 0.02, rak);
          if (sorot) bukuSorot = bk;
        }
      }
      const sr = sign(1.5, 0.45, (ctx, w, h) => { ctx.fillStyle = hex(C.yellow); rrect(ctx, 0, 0, w, h, 10); ctx.fill(); ctx.fillStyle = hex(C.ink); ctx.font = '800 22px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('RAK MANUAL', w / 2, 30); ctx.font = '600 13px "JetBrains Mono", monospace'; ctx.fillText('pengetahuan dan memori agen', w / 2, 52); });
      sr.mesh.position.set(0, 2.72, 0.2); rak.add(sr.mesh);

      // papan sensor
      box(2.84, 1.64, 0.08, mat(C.gelap, { r: 0.35, m: 0.5 }), -2.0, 2.45, -4.98, grup);
      papan = sign(2.6, 1.4, (ctx, w, h) => {
        const s = st || { suhu: R.ambien.suhu, cahaya: R.ambien.cahaya };
        ctx.fillStyle = '#12121f'; rrect(ctx, 0, 0, w, h, 16); ctx.fill();
        ctx.fillStyle = '#9fb0ff'; ctx.font = '600 17px "JetBrains Mono", monospace'; ctx.textAlign = 'left'; ctx.fillText('PAPAN SENSOR', 18, 28);
        ctx.fillStyle = '#fff'; ctx.font = '800 54px "Bricolage Grotesque", sans-serif'; ctx.fillText(s.suhu.toFixed(1) + ' C', 18, 90);
        const lux = Math.round(s.cahaya);
        ctx.fillStyle = lux < 100 ? hex(C.coral) : lux < 250 ? hex(C.yellow) : '#6df0b8';
        ctx.font = '600 24px "JetBrains Mono", monospace'; ctx.fillText(lux + ' lux', 18, 128);
        Object.keys(R.perangkat).forEach((id, i) => {
          const x = s[id] || {}, on = !!(x.on || x.open), px = w - 222 + (i % 3) * 70, py = 44 + Math.floor(i / 3) * 62;
          ctx.fillStyle = on ? hex(C.mint) : '#3a3960'; rrect(ctx, px, py, 60, 50, 8); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '700 17px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(R.perangkat[id].nama.slice(0, 4).toUpperCase(), px + 30, py + 31);
        });
      }, 200);
      papan.mesh.position.set(-2.0, 2.45, -4.93); grup.add(papan.mesh);

      // totem router
      const RUTE = [['kontrol', 'KONTROL', C.blue], ['info', 'INFO', C.yellow], ['bahaya', 'BAHAYA', C.coral], ['obrol', 'OBROL', C.mint]].concat(OP.rute.map(r => [r.id, r.nama, parseInt(String(r.warna).slice(1), 16)]));
      box(1.6, 2.0, 0.08, mat(C.gelap, { r: 0.35, m: 0.5 }), -2.1, 1.55, 2.2, grup); cyl(0.05, 0.05, 0.6, logam(), -2.1, 0.3, 2.2, grup, 10); cyl(0.42, 0.46, 0.06, logam(C.gelap, 0.4), -2.1, 0.03, 2.2, grup);
      totem = sign(1.5, 1.9, (ctx, w, h) => {
        ctx.fillStyle = '#12121f'; rrect(ctx, 0, 0, w, h, 18); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '800 28px "Bricolage Grotesque", "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ROUTER', w / 2, 44);
        const langkah = Math.min(84, (h - 82) / RUTE.length), tinggi = langkah - 10, f = Math.max(11, Math.min(20, tinggi * 0.5));
        RUTE.forEach((r2, i) => {
          const y = 64 + i * langkah, aktif = router === r2[0];
          ctx.fillStyle = aktif ? hex(r2[2]) : '#2b2a44'; rrect(ctx, 16, y, w - 32, tinggi, 10); ctx.fill();
          ctx.fillStyle = aktif ? '#fff' : '#7b7fa3'; ctx.font = `600 ${f}px "JetBrains Mono", monospace`; ctx.textAlign = 'left'; ctx.fillText(r2[1].slice(0, 11), 44, y + tinggi / 2 + f * 0.35);
          ctx.beginPath(); ctx.arc(30, y + tinggi / 2, Math.min(8, tinggi / 4), 0, 7); ctx.fillStyle = aktif ? '#fff' : '#4a4970'; ctx.fill();
        });
      });
      totem.mesh.position.set(-2.1, 1.55, 2.25); grup.add(totem.mesh);

      cincinMesh = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.55, 32), new THREE.MeshBasicMaterial({ color: lin(C.coral), transparent: true, opacity: 0.85 }));
      cincinMesh.rotation.x = -Math.PI / 2; cincinMesh.position.y = 0.03; cincinMesh.visible = false; grup.add(cincinMesh);
    }

    function bangunPerangkat() {
      const P = R.perangkat, pakai = { lantai: 0, ac: 0, tanda: 0, gantung: 0, pintu: 0, tirai: 0 };
      const AC = [[3.4, 3.3, -5.0, 0], [-6.0, 3.5, -1.5, Math.PI / 2]], TANDA = [[0.15, 3.42, -4.96, 0], [-4.3, 3.7, -4.96, 0]], GANTUNG = [[0, 0, -1.4], [0, 0, 1.2]];
      Object.keys(P).forEach(id => {
        const d = P[id], g = new THREE.Group(); let b = d.bentuk;
        if (b === 'pintu' && pakai.pintu++) b = 'kotak';
        if (b === 'tirai' && pakai.tirai++) b = 'kotak';
        if (b === 'ac' && pakai.ac >= AC.length) b = 'kotak';
        if (b === 'tanda' && pakai.tanda >= TANDA.length) b = 'kotak';
        if (b === 'lampu_gantung' && pakai.gantung >= GANTUNG.length) b = 'lampu_berdiri';
        if (b === 'pintu') g.position.set(-0.6, 0, -5.0);
        else if (b === 'tirai') g.position.set(-5.95, 2.05, 2.7);
        else if (b === 'ac') { const s = AC[pakai.ac++]; g.position.set(s[0], s[1], s[2]); g.rotation.y = s[3]; }
        else if (b === 'tanda') { const s = TANDA[pakai.tanda++]; g.position.set(s[0], s[1], s[2]); }
        else if (b === 'lampu_gantung') { const s = GANTUNG[pakai.gantung++]; g.position.set(s[0], s[1], s[2]); }
        else {
          const s = SLOT_LANTAI[Math.min(pakai.lantai++, SLOT_LANTAI.length - 1)]; g.position.set(s[0], 0, s[1]);
          if (b !== 'lengan' && b !== 'kipas') g.rotation.y = Math.atan2(0 - s[0], 1.5 - s[1]);
        }
        grup.add(g);
        const f = BENTUK[b](g, d);
        anim.push({ id, f, lampu: g.userData.lampu || null });
      });
      // pintu statis bila ruang tidak punya perangkat berbentuk pintu
      if (!pakai.pintu) box(1.5, 2.7, 0.09, mat(R.tema.aksen, { r: 0.45 }), 0.15, 1.35, -5.0, grup);

      // konsol dan spesialis: satu konsol per spesialis, tombolnya perangkat yang ia pegang
      const nama = [...new Set(Object.keys(P).map(id => P[id].spesialis))].slice(0, 4);
      nama.forEach((n, i) => {
        const s = SLOT_KONSOL[i], devs = Object.keys(P).filter(id => P[id].spesialis === n), w = OP.spesialis[n] ? parseInt(String(OP.spesialis[n]).slice(1), 16) : WARNA_SPES[i];
        const g = new THREE.Group(); g.position.set(s[0], 0, s[1]); g.rotation.y = s[2]; grup.add(g);
        box(1.4, 0.88, 0.66, mat(C.gelap, { r: 0.45, m: 0.3 }), 0, 0.44, 0, g);
        const atas = box(1.44, 0.1, 0.84, logam(0xc3c9d6, 0.3), 0, 0.97, 0.02, g); atas.rotation.x = 0.35;
        box(1.4, 0.03, 0.02, mat(w, { emissive: w, ei: 0.9 }), 0, 0.3, 0.335, g, false);
        devs.forEach((d, j) => {
          const b = cyl(0.17, 0.17, 0.09, mat(WARNA_TIPE[P[d].tipe], { r: 0.3, emissive: WARNA_TIPE[P[d].tipe], ei: 0.15 }), (j - (devs.length - 1) / 2) * 0.5, 0.09, 0, atas, 20);
          tombol[d] = b;
        });
        cyl(0.03, 0.03, 0.9, logam(), 0, 1.45, -0.24, g, 8);
        const tulis = (ctx, w2, h) => { ctx.fillStyle = '#12121f'; rrect(ctx, 0, 0, w2, h, 10); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '800 21px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PANEL ' + n.toUpperCase(), w2 / 2, 32); ctx.fillStyle = '#9fb0ff'; ctx.font = '600 13px "JetBrains Mono", monospace'; ctx.fillText(devs.map(d => P[d].nama.toUpperCase()).join(' + ').slice(0, 30), w2 / 2, 56); };
        const s1 = sign(1.7, 0.55, tulis, 200); s1.mesh.position.set(0, 2.0, -0.2); g.add(s1.mesh);
        const s2 = sign(1.7, 0.55, tulis, 200); s2.mesh.rotation.y = Math.PI; s2.mesh.position.set(0, 2.0, -0.28); g.add(s2.mesh);
        g.updateMatrixWorld(true);
        devs.forEach(d => { const v = new THREE.Vector3(); tombol[d].getWorldPosition(v); posTombol[d] = [v.x, v.z]; });
        const X = buatRobot(w, 0.85), sx = s[0] < 0 ? 1 : -1;
        X.g.position.set(s[0] + sx * 1.12, 0, s[1]); X.g.rotation.y = Math.atan2(-sx, 0);
        const lbl = sign(1.1, 0.3, (ctx, w2, h) => { ctx.fillStyle = hex(w); rrect(ctx, 0, 0, w2, h, 8); ctx.fill(); ctx.fillStyle = hex(C.ink); ctx.font = '800 17px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n.toUpperCase(), w2 / 2, 21); }, 180);
        lbl.mesh.position.set(X.g.position.x, 1.78, X.g.position.z); grup.add(lbl.mesh);
        spes[n] = X;
      });
    }

    function buang() {
      if (!grup) return;
      grup.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      scene.remove(grup);
    }
    function bangun() {
      const pos = A ? [A.g.position.x, A.g.position.z, A.g.rotation.y] : [PAD.HOME.x, PAD.HOME.z, 0];
      buang();
      grup = new THREE.Group(); scene.add(grup);
      anim = []; lampuTitik = []; tombol = {}; posTombol = {}; spes = {}; papanTeks.length = 0; bukuSorot = null;
      bangunRuang(); bangunPerangkat();
      const wa = parseInt(String(OP.agen.warna).slice(1), 16) || C.blue;
      A = buatRobot(wa, 1); A.g.position.set(pos[0], 0, pos[1]); A.g.rotation.y = pos[2];
      const la = sign(1.2, 0.32, (ctx, w2, h) => { ctx.fillStyle = hex(wa); rrect(ctx, 0, 0, w2, h, 8); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '800 18px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(OP.agen.nama).toUpperCase().slice(0, 12), w2 / 2, 23); }, 180);
      labelA = la.mesh; grup.add(la.mesh);
    }
    function muatRuang(def, opsi) { R = def; OP = Object.assign({ rute: [], spesialis: {}, agen: { nama: 'Agen', warna: '#2f5bff' } }, opsi || {}); st = null; router = null; if (A) { A.g.position.set(PAD.HOME.x, 0, PAD.HOME.z); A.g.rotation.y = 0; } bangun(); }
    function setKualitas(k) { k = k === 'ringan' ? 'ringan' : 'realistis'; if (k === Q) return; Q = k; terapkanMutu(); if (R) bangun(); }

    /* ---------- kamera orbit ---------- */
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
    function fit() {
      const r = stage.getBoundingClientRect(); const w = Math.max(200, r.width), h = Math.max(200, r.height);
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      cam.base = clamp(7.8 / (0.384 * camera.aspect), 13.5, 32);
    }
    new ResizeObserver(fit).observe(stage);

    /* ---------- tween dan gerak ---------- */
    const tweens = [];
    const tween = (dur, fn) => new Promise(res => tweens.push({ t: 0, dur: Math.max(dur, 0.001), fn, res }));
    const tunggu = s => tween(s / laju(), () => {});
    const angLerp = (a, b, t) => { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
    async function hadapKe(x, z, X) { const g = (X || A).g; const target = Math.atan2(x - g.position.x, z - g.position.z); const a0 = g.rotation.y; await tween(0.3 / laju(), p => { g.rotation.y = angLerp(a0, target, p); }); }
    async function jalanKe(x, z) {
      const g = A.g, x0 = g.position.x, z0 = g.position.z, d = Math.hypot(x - x0, z - z0);
      if (d < 0.05) return;
      const target = Math.atan2(x - x0, z - z0), a0 = g.rotation.y, X = A;
      X.jalan = true;
      await tween(d / (2.5 * laju()), p => { const G = A.g; G.position.x = x0 + (x - x0) * p; G.position.z = z0 + (z - z0) * p; G.rotation.y = angLerp(a0, target, Math.min(1, p * 4)); });
      X.jalan = false; A.jalan = false;
    }
    async function tekan(dev, X) {
      X = X || A;
      await tween(0.25 / laju(), p => { X.tekan = p; });
      if (tombol[dev]) tombol[dev].material.emissiveIntensity = 2.2;
      await tunggu(0.25);
      await tween(0.25 / laju(), p => { X.tekan = 1 - p; });
      X.tekan = 0;
    }

    /* ---------- pembaruan tiap frame ---------- */
    let waktu = 0, tPapan = 0, terang = 0;
    const vec = new THREE.Vector3();
    function gerakRobot(X, dt, utama) {
      X.ph += dt * (X.jalan ? 9 * laju() : 0);
      const sw = X.jalan ? Math.sin(X.ph) : 0;
      X.badan.rotation.x = halus(X.badan.rotation.x, X.jalan ? 0.09 : 0, dt, 6);
      X.badan.position.y = Math.sin(waktu * 2 + X.fase) * 0.012 + (X.jalan ? Math.abs(Math.sin(X.ph)) * 0.03 : 0);
      X.lenganL.rotation.x = -sw * 0.35; X.lenganR.rotation.x = X.tekan > 0 ? -1.45 * X.tekan : sw * 0.35;
      X.kepala.rotation.y = utama ? 0 : Math.sin(waktu * 0.6 + X.fase) * 0.18;
      X.antena.material.emissiveIntensity = 0.6 + 0.5 * Math.sin(waktu * 4 + X.fase);
    }
    function update(dt, state) {
      waktu += dt; st = state;
      for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; const p = Math.min(w.t / w.dur, 1); w.fn(p); if (p >= 1) { tweens.splice(i, 1); w.res(); } }
      for (const a of anim) { const v = a.f(dt, state[a.id] || {}, waktu); if (a.lampu) a.lampu.intensity = v * (Q === 'realistis' ? 1.5 : 1.1); }
      terang = halus(terang, clamp(state.cahaya / 420, 0, 1), dt, 4);
      hemi.intensity = 0.34 + 0.5 * terang; sun.intensity = 0.3 + 0.55 * terang;
      langit.copy(LANGIT_GELAP).lerp(LANGIT_TERANG, terang);
      if (labelA) labelA.position.set(A.g.position.x, 2.25, A.g.position.z);
      gerakRobot(A, dt, true); for (const n in spes) gerakRobot(spes[n], dt, false);
      for (const k in tombol) { const m = tombol[k].material; if (m.emissiveIntensity > 0.15) m.emissiveIntensity = Math.max(0.15, m.emissiveIntensity - dt * 2.5); }
      if (cincinMesh.visible) { const k = 1 + Math.sin(waktu * 6) * 0.15; cincinMesh.scale.set(k, k, k); }
      rakAktif = Math.max(0, rakAktif - dt);
      if (bukuSorot) { bukuSorot.material.emissiveIntensity = rakAktif > 0 ? 0.9 + Math.sin(waktu * 8) * 0.5 : 0; bukuSorot.position.z = halus(bukuSorot.position.z, rakAktif > 0 ? 0.16 : 0.02, dt, 6); }
      tPapan += dt; if (tPapan > 0.4) { tPapan = 0; papan.redraw(); }
    }
    let fpsRata = 60;
    function render(dtNyata) {
      if (dtNyata > 0) fpsRata += (1 / dtNyata - fpsRata) * 0.05;
      pasangKamera(); renderer.render(scene, camera);
    }
    function proyeksiAgen() {
      vec.set(A.g.position.x, 2.35, A.g.position.z).project(camera);
      return { x: vec.x * 0.5 + 0.5, y: -vec.y * 0.5 + 0.5 };
    }

    terapkanMutu();
    return {
      muatRuang, setKualitas, kualitas: () => Q, update, render, proyeksiAgen, tween, tunggu, jalanKe, hadapKe, tekan, PAD,
      posTombol: d => posTombol[d], spesialis: n => spes[n], namaSpesialis: () => Object.keys(spes),
      cincin(p) { cincinMesh.visible = !!p; if (p) { cincinMesh.position.x = p.x; cincinMesh.position.z = p.z; } },
      setRouter(r) { router = r; totem.redraw(); },
      sorotRak(detik) { rakAktif = detik; },
      resetKamera() { cam.az = 0; cam.ph = 1.08; cam.zoom = 1; },
      gambarUlang() { papanTeks.forEach(s => s.redraw()); },
      fps: () => fpsRata, info: () => ({ mutu: Q, objek: (function () { let n = 0; grup.traverse(() => n++); return n; })(), panggilan: renderer.info.render.calls, segitiga: renderer.info.render.triangles })
    };
  }

  root.Adegan = { buat };
})(window);
