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
    function sprite(teks, warna, skala) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
      g.fillStyle = warna || 'rgba(20,24,40,0.82)'; g.beginPath(); if (g.roundRect) g.roundRect(0, 0, 256, 64, 14); else g.rect(0, 0, 256, 64); g.fill();
      g.fillStyle = '#fff'; g.font = '600 28px Onest, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(teks).slice(0, 18), 128, 33);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
      s.scale.set(2.6 * (skala || 1), 0.65 * (skala || 1), 1); s.renderOrder = 10; return s;
    }

    /* ---------- bentuk perangkat ---------- */
    function bentuk(p) {
      const K = I.KATALOG[p.jenis], g = new THREE.Group(), x = { g };
      const b = K.bentuk;
      if (b === 'papan') {
        const pcb = kotak(0.55, 0.06, 0.3, M(0x1d4ed8)); pcb.position.y = 0.55; g.add(pcb);
        const chip = kotak(0.2, 0.05, 0.18, M(0x9ca3af, { metalness: 0.6 })); chip.position.set(0.08, 0.6, 0); g.add(chip);
        const tiang = silinder(0.03, 0.03, 0.5, M(0x6b7280)); tiang.position.y = 0.26; g.add(tiang);
        x.led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e })); x.led.position.set(-0.2, 0.62, 0.1); g.add(x.led);
      } else if (b === 'router') {
        const badan = kotak(0.6, 0.12, 0.4, M(0xf8fafc)); badan.position.y = 0.9; g.add(badan);
        for (const dx of [-0.2, 0.2]) { const a = silinder(0.02, 0.02, 0.45, M(0x111827)); a.position.set(dx, 1.15, -0.15); g.add(a); }
        const meja = silinder(0.05, 0.05, 0.85, M(0x8b5e34)); meja.position.y = 0.42; g.add(meja);
        x.led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e })); x.led.position.set(0.2, 0.92, 0.21); g.add(x.led);
      } else if (b === 'kipas') {
        const tiang = silinder(0.05, 0.08, 1.1, M(0x374151)); tiang.position.y = 0.55; g.add(tiang);
        const rumah = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, seg * 2), M(0x9ca3af)); rumah.position.y = 1.25; g.add(rumah);
        x.baling = new THREE.Group(); x.baling.position.y = 1.25; g.add(x.baling);
        for (let i = 0; i < 3; i++) { const daun = kotak(0.36, 0.02, 0.12, M(0x60a5fa)); daun.position.x = 0.18; const s = new THREE.Group(); s.rotation.z = i * 2.09; s.add(daun); x.baling.add(s); }
        x.baling.rotation.y = 0; g.rotation.y = 0;
        x.baling.children.forEach(c => { c.rotation.x = Math.PI / 2; });
      } else if (b === 'lampu' || b === 'lampu_merah') {
        const kabel = silinder(0.01, 0.01, 0.6, M(0x111827)); kabel.position.y = 2.1; g.add(kabel);
        x.bohlam = new THREE.Mesh(new THREE.SphereGeometry(0.17, seg, seg), new THREE.MeshStandardMaterial({ color: b === 'lampu' ? 0xfff7d6 : 0xff7849, emissive: b === 'lampu' ? 0xffe8a3 : 0xff3b1f, emissiveIntensity: 0 }));
        x.bohlam.position.y = 1.75; g.add(x.bohlam);
        if (!ringan) { x.cahaya = new THREE.PointLight(b === 'lampu' ? 0xffe2a8 : 0xff6a3d, 0, 7); x.cahaya.position.y = 1.6; g.add(x.cahaya); }
      } else if (b === 'pompa') {
        const badan = silinder(0.22, 0.22, 0.35, M(0x2563eb)); badan.rotation.z = Math.PI / 2; badan.position.y = 0.25; g.add(badan);
        x.air = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0 })); x.air.position.set(0.5, 0.45, 0); x.air.rotation.z = -1.2; g.add(x.air);
      } else if (b === 'tandon') {
        const t = silinder(0.9, 0.9, 1.8, M(0xe5e7eb)); t.position.y = 1.1; g.add(t);
        x.isi = silinder(0.86, 0.86, 1, M(0x38bdf8, { transparent: true, opacity: 0.55 })); x.isi.position.y = 0.7; g.add(x.isi);
      } else if (b === 'relay') { const r = kotak(0.45, 0.12, 0.25, M(0x0ea5e9)); r.position.y = 0.55; g.add(r); const t = silinder(0.03, 0.03, 0.5, M(0x6b7280)); t.position.y = 0.25; g.add(t); }
      else if (b === 'adaptor') { const a = kotak(0.22, 0.25, 0.14, M(0x111827)); a.position.y = 0.4; g.add(a); }
      else if (b === 'baterai' || b === 'surya') {
        if (b === 'surya') { const pn = kotak(1.2, 0.05, 0.8, M(0x1e3a8a, { metalness: 0.4, roughness: 0.3 })); pn.position.y = 1.1; pn.rotation.x = -0.5; g.add(pn); const t = silinder(0.04, 0.04, 1.1, M(0x6b7280)); t.position.y = 0.55; g.add(t); }
        const bt = kotak(0.3, 0.18, 0.18, M(0x16a34a)); bt.position.y = 0.12; g.add(bt);
      } else if (b === 'servo') { const s = kotak(0.35, 0.3, 0.3, M(0xd97706)); s.position.y = 0.2; g.add(s); x.lengan = kotak(0.3, 0.04, 0.06, M(0xfafafa)); x.lengan.position.set(0.15, 0.38, 0); g.add(x.lengan); }
      else if (b === 'kunci') { const k = kotak(0.2, 0.3, 0.1, M(0x374151, { metalness: 0.5 })); k.position.y = 1; g.add(k); }
      else if (b === 'katup') { const k = silinder(0.08, 0.08, 0.5, M(0xb45309)); k.rotation.z = Math.PI / 2; k.position.y = 0.3; g.add(k); }
      else if (b === 'tusuk') { const t = kotak(0.06, 0.45, 0.12, M(0x15803d)); t.position.y = 0.2; g.add(t); }
      else if (b === 'timbangan') { const t = kotak(0.6, 0.08, 0.6, M(0x9ca3af, { metalness: 0.4 })); t.position.y = 0.05; g.add(t); x.pakan = kotak(0.5, 0.2, 0.5, M(0xd6b25e)); x.pakan.position.y = 0.2; g.add(x.pakan); }
      else if (b === 'kubah') { const k = new THREE.Mesh(new THREE.SphereGeometry(0.12, seg, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf8fafc)); k.position.y = 1.8; g.add(k); }
      else if (b === 'mata') { const m = kotak(0.3, 0.12, 0.08, M(0x2563eb)); m.position.y = 2.05; g.add(m); }
      else { const s = kotak(0.22, 0.14, 0.18, M(b === 'sensor_kotak' ? 0x0d9488 : 0x7c3aed)); s.position.y = 1.2; g.add(s); const t = silinder(0.02, 0.02, 1.15, M(0x9ca3af)); t.position.y = 0.58; g.add(t); }
      // area klik yang lebih besar dan tak terlihat
      const hit = kotak(0.9, 1.6, 0.9, new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.8; hit.userData.id = p.id; g.add(hit); x.hit = hit;
      return x;
    }

    /* ---------- membangun adegan dari data dunia ---------- */
    function bersihkan() { while (grup.children.length) { const c = grup.children.pop(); c.traverse(n => { if (n.geometry) n.geometry.dispose(); }); } for (const k of Object.keys(obj)) delete obj[k]; animasi.length = 0; }
    function muat(dunia, st) {
      W = dunia; lebar = W.lebar; dalam = W.dalam; bersihkan();
      const tanah = new THREE.Mesh(new THREE.PlaneGeometry(lebar, dalam), M(0x5f7d47)); tanah.rotation.x = -Math.PI / 2; tanah.position.set(lebar / 2, 0, dalam / 2); tanah.receiveShadow = !ringan; tanah.userData.lantai = true; grup.add(tanah);
      const grid = new THREE.GridHelper(Math.max(lebar, dalam), Math.max(lebar, dalam), 0x5f7a46, 0x6d8a52); grid.position.set(Math.max(lebar, dalam) / 2, 0.01, Math.max(lebar, dalam) / 2); grid.material.opacity = 0.35; grid.material.transparent = true; grup.add(grid);
      for (const a of W.area) {
        const T = I.AREA[a.tipe];
        const lantai = new THREE.Mesh(new THREE.PlaneGeometry(a.w, a.d), M(new THREE.Color(T.warna))); lantai.rotation.x = -Math.PI / 2; lantai.position.set(a.x + a.w / 2, 0.02, a.z + a.d / 2); lantai.receiveShadow = !ringan; grup.add(lantai);
        if (T.dinding) {
          const mat = M(0xf5f1ea), t = 1.3;
          for (const [w, d, x, z] of [[a.w, 0.15, a.x + a.w / 2, a.z], [a.w, 0.15, a.x + a.w / 2, a.z + a.d], [0.15, a.d, a.x, a.z + a.d / 2], [0.15, a.d, a.x + a.w, a.z + a.d / 2]]) { const k = kotak(w, t, d, mat); k.position.set(x, t / 2, z); grup.add(k); }
        } else {
          const mat = M(0x8b6a43);
          for (let i = 0; i <= a.w; i += 1.5) for (const z of [a.z, a.z + a.d]) { const t = silinder(0.05, 0.05, 0.8, mat); t.position.set(a.x + i, 0.4, z); grup.add(t); }
          for (let i = 0; i <= a.d; i += 1.5) for (const x of [a.x, a.x + a.w]) { const t = silinder(0.05, 0.05, 0.8, mat); t.position.set(x, 0.4, a.z + i); grup.add(t); }
        }
        const lb = sprite(a.nama, 'rgba(15,23,42,0.6)', 1.1); lb.position.set(a.x + a.w / 2, T.dinding ? 1.9 : 1.3, a.z + 0.4); grup.add(lb);
        if (T.tanaman) {
          const tan = [];
          for (let i = 0.8; i < a.w - 0.5; i += ringan ? 1.6 : 1.1) for (let j = 1; j < a.d - 0.5; j += ringan ? 1.8 : 1.3) {
            const t = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 6), M(0x22a34a)); t.position.set(a.x + i, 0.32, a.z + j); grup.add(t); tan.push(t);
          }
          animasi.push((t, S) => { const A = S.area[a.id]; if (!A) return; const sehat = A.tanaman / 100, c = new THREE.Color().setHSL(0.08 + 0.25 * sehat, 0.65, 0.32 + 0.1 * (1 - sehat)); tan.forEach((m, i) => { m.material.color.copy(c); m.scale.y = 0.6 + 0.6 * sehat + Math.sin(t * 1.5 + i) * 0.02; }); lantai.material.color.setHSL(0.09, 0.35, 0.55 - 0.25 * (A.tanah || 0) / 100); });
        }
        if (T.hewan) {
          const ayam = [];
          for (let i = 0; i < (ringan ? 3 : 5); i++) {
            const g = new THREE.Group(); const badan = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), M(0xfaf5e9)); badan.scale.set(1.2, 1, 1); badan.position.y = 0.3; g.add(badan);
            const kepala = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), M(0xfaf5e9)); kepala.position.set(0.28, 0.5, 0); g.add(kepala);
            const jengger = kotak(0.08, 0.1, 0.04, M(0xdc2626)); jengger.position.set(0.3, 0.64, 0); g.add(jengger);
            g.position.set(a.x + 1 + Math.random() * (a.w - 2), 0, a.z + 1 + Math.random() * (a.d - 2)); grup.add(g);
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
    }
    let grupKabel = null;
    function kabel(st) {
      if (grupKabel) { grup.remove(grupKabel); grupKabel.traverse(n => { if (n.geometry) n.geometry.dispose(); }); }
      grupKabel = new THREE.Group(); grup.add(grupKabel);
      const garis = (a, b, warna, tebal) => {
        const p1 = new THREE.Vector3(a.x, 0.06, a.z), p2 = new THREE.Vector3(b.x, 0.06, b.z), mid = p1.clone().lerp(p2, 0.5); mid.y = 0.06;
        const c = new THREE.CatmullRomCurve3([p1, new THREE.Vector3((p1.x + mid.x) / 2, 0.12, (p1.z + mid.z) / 2 + 0.2), mid, new THREE.Vector3((p2.x + mid.x) / 2, 0.12, (p2.z + mid.z) / 2 - 0.2), p2]);
        const m = new THREE.Mesh(new THREE.TubeGeometry(c, 20, tebal || 0.035, 5, false), new THREE.MeshStandardMaterial({ color: warna, roughness: 0.5 }));
        grupKabel.add(m); return m;
      };
      for (const p of W.perangkat) {
        const K = I.KATALOG[p.jenis], s = st.rk[p.id];
        const salah = s && s.masalah.length;
        if (K.kategori === 'papan' && p.daya) { const d = W.perangkat.find(q => q.id === p.daya); if (d) garis(p, d, 0xdc2626, 0.04); }
        if (!p.sambung) continue;
        const tujuan = W.perangkat.find(q => q.id === (p.sambung.relay || p.sambung.esp)); if (!tujuan) continue;
        garis(p, tujuan, salah ? 0xf97316 : p.sambung.relay ? 0x475569 : K.kanal ? 0x16a34a : 0xeab308, p.sambung.relay ? 0.05 : 0.035);
      }
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
    function ambilPerangkat(cx, cy) { sinar(cx, cy); const hit = ray.intersectObjects(Object.values(obj).map(x => x.hit), false)[0]; return hit ? hit.object.userData.id : null; }
    function layar(id) { const x = obj[id]; if (!x) return null; const v = x.g.position.clone(); v.y = 1.6; v.project(camera); const r = o.canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }
    function pindah(id, x, z) { const o2 = obj[id]; if (o2) o2.g.position.set(x, 0, z); if (cincinPilih && pilihan === id) cincinPilih.position.set(x, 0.07, z); }

    /* ---------- animasi per frame ---------- */
    let t0 = performance.now();
    function perbarui(S, st) {
      const now = performance.now(), dt = Math.min(0.1, (now - t0) / 1000), t = now / 1000; t0 = now;
      if (!W) return;
      const terang = I.cahayaLuar(S) / 900, malam = 1 - terang;
      hemi.intensity = 0.2 + 0.45 * terang; mentari.intensity = 0.08 + 0.62 * terang;
      scene.background = new THREE.Color().setHSL(0.6, 0.45, 0.12 + 0.62 * terang);
      const j = I.jam(S); mentari.position.set(lebar / 2 + 30 * Math.cos((j - 6) / 12 * Math.PI), 10 + 30 * Math.max(0.1, Math.sin((j - 6) / 12 * Math.PI)), dalam / 2); mentari.target.position.set(lebar / 2, 0, dalam / 2);
      for (const p of W.perangkat) {
        const x = obj[p.id]; if (!x) continue; const al = S.alat[p.id], on = al && al.on;
        if (x.baling && on) x.baling.rotation.z += dt * (6 + 5 * al.level);
        if (x.bohlam) { x.bohlam.material.emissiveIntensity = on ? 1.6 : 0; if (x.cahaya) x.cahaya.intensity = on ? 1.2 + malam : 0; }
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
      renderer.render(scene, camera);
    }
    function ukur() { const r = o.canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); }
    function resetKamera() { kam.theta = -0.75; kam.phi = 0.9; kam.jarak = Math.max(lebar, dalam) * 1.05; kam.target.set(lebar / 2, 0, dalam / 2); pasangKamera(); }
    pasangKamera();
    return { muat, kabel, perbarui, pilih, sorot, titikLantai, ambilPerangkat, layar, pindah, ukur, resetKamera, kamera: kam, renderer };
  }
  root.Dunia3D = { buat };
})(typeof window !== 'undefined' ? window : globalThis);
