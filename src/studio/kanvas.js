/* Studio Rumah Agen: papan otak (SVG).
   Seret blok, tarik kabel dari titik keluar (kanan) ke titik masuk (kiri), geser papan, zoom dengan roda mouse.
   Setiap kabel divalidasi Graf.cekKabel: tipe port harus sama, jadi rakitan yang salah tidak bisa dipasang. */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attr, ortu) => { const e = document.createElementNS(NS, tag); for (const k in attr || {}) e.setAttribute(k, attr[k]); if (ortu) ortu.appendChild(e); return e; };
  const WARNA_TIPE = { pesan: '#334155', alat: '#0891b2', pengetahuan: '#ca8a04', memori: '#9333ea', pengaman: '#dc2626', tugas: '#0f766e' };
  const LEBAR = 172;

  function buat(o) {
    const svg = o.svg, Gr = root.Graf;
    let H = { blok: [], kabel: [] }, pilihan = null, kabelPilih = null;
    const view = { x: 20, y: 20, z: 1 };
    const defs = el('defs', {}, svg);
    const pola = el('pattern', { id: 'titikGrid', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, defs); el('circle', { cx: 2, cy: 2, r: 1.2, fill: 'rgba(100,116,139,0.35)' }, pola);
    const latar = el('rect', { x: -5000, y: -5000, width: 10000, height: 10000, fill: 'url(#titikGrid)', class: 'latar' }, svg);
    const dunia = el('g', {}, svg);
    const lapKabel = el('g', {}, dunia), lapBlok = el('g', {}, dunia);
    const sementara = el('path', { class: 'kabel sementara', fill: 'none', stroke: '#64748b', 'stroke-width': 2.5, 'stroke-dasharray': '6 4' }, dunia); sementara.style.display = 'none';
    const terapView = () => { dunia.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.z})`); latar.setAttribute('transform', `translate(${view.x % (24 * view.z)},${view.y % (24 * view.z)}) scale(${view.z})`); };
    function keKanvas(cx, cy) { const r = svg.getBoundingClientRect(); return { x: (cx - r.left - view.x) / view.z, y: (cy - r.top - view.y) / view.z }; }
    const tinggi = b => 64 + 20 * Math.max(Gr.portMasuk(b).length, Gr.portKeluar(b).length, 1);
    function posPort(b, port, keluar) {
      const daftar = keluar ? Gr.portKeluar(b) : Gr.portMasuk(b), i = daftar.findIndex(p => p[0] === port);
      return { x: b.x + (keluar ? LEBAR : 0), y: b.y + 62 + i * 20 };
    }
    const labelPort = (b, p, keluar) => {
      if (keluar && b.jenis === 'router' && /^r\d+$/.test(p[0])) return (b.cfg.rute[+p[0].slice(1)] || {}).nama || p[0];
      return p[0];
    };
    const kurva = (a, b) => { const dx = Math.max(40, Math.abs(b.x - a.x) / 2); return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`; };
    function subjudul(b) {
      const c = b.cfg || {};
      if (b.jenis === 'agen') return (c.nama || 'Agen') + (c.model ? ' | ' + c.model : '');
      if (b.jenis === 'alat_sensor' || b.jenis === 'alat_aktuator') return 'lingkup: ' + (c.lingkup || 'semua');
      if (b.jenis === 'rak') return c.dokumen && c.dokumen.length ? c.dokumen.length + ' dokumen' : 'bawaan ' + (c.preset || '');
      if (b.jenis === 'jadwal') return 'jam ' + c.jam;
      if (b.jenis === 'router') return (c.mode === 'semantik' ? 'semantik' : 'kata kunci') + ', ' + (c.rute || []).length + ' rute';
      if (b.jenis === 'memori') return c.konteks + ' pesan terakhir';
      if (b.jenis === 'aturan' || b.jenis === 'pemicu_sensor') return `${c.variabel || ''} ${c.op || ''} ${c.nilai == null ? '' : c.nilai}`;
      if (b.jenis === 'guard_masukan') return c.model ? 'regex + ' + c.model : 'regex';
      if (b.jenis === 'orkestrator') return c.mode === 'semua' ? 'semua agen' : 'sesuai wilayah';
      return Gr.KELOMPOK[Gr.JENIS[b.jenis].kelompok];
    }

    function gambar() {
      lapKabel.replaceChildren(); lapBlok.replaceChildren();
      for (const k of H.kabel) {
        const a = H.blok.find(b => b.id === k.dari), b = H.blok.find(x => x.id === k.ke); if (!a || !b) continue;
        const tipe = (Gr.portKeluar(a).find(p => p[0] === k.port) || [])[1];
        const p = el('path', { d: kurva(posPort(a, k.port, true), posPort(b, k.portKe, false)), class: 'kabel' + (kabelPilih === k ? ' dipilih' : ''), fill: 'none', stroke: WARNA_TIPE[tipe] || '#334155', 'stroke-width': 3, 'data-dari': k.dari, 'data-ke': k.ke, 'data-port': k.port, 'data-portke': k.portKe }, lapKabel);
        if (tipe !== 'pesan') p.setAttribute('stroke-dasharray', '7 5');
        const hit = el('path', { d: p.getAttribute('d'), fill: 'none', stroke: 'transparent', 'stroke-width': 14, class: 'kabel-hit' }, lapKabel);
        hit.addEventListener('pointerdown', e => { e.stopPropagation(); kabelPilih = k; pilihan = null; gambar(); o.onPilihKabel && o.onPilihKabel(k); });
      }
      for (const b of H.blok) {
        const J = Gr.JENIS[b.jenis], h = tinggi(b);
        const g = el('g', { class: 'blok' + (pilihan === b.id ? ' dipilih' : ''), transform: `translate(${b.x},${b.y})`, 'data-id': b.id }, lapBlok);
        el('rect', { width: LEBAR, height: h, rx: 10, class: 'badan' }, g);
        el('rect', { width: LEBAR, height: 30, rx: 10, fill: J.warna, class: 'kepala' }, g);
        el('rect', { y: 20, width: LEBAR, height: 10, fill: J.warna }, g);
        const t = el('text', { x: 10, y: 20, class: 'judul' }, g); t.textContent = J.judul;
        const s = el('text', { x: 10, y: 42, class: 'sub' }, g); s.textContent = subjudul(b).slice(0, 26);
        Gr.portMasuk(b).forEach((p, i) => {
          const c = el('circle', { cx: 0, cy: 62 + i * 20, r: 7, class: 'port masuk', fill: '#fff', stroke: WARNA_TIPE[p[1]], 'stroke-width': 3, 'data-blok': b.id, 'data-port': p[0] }, g);
          c.style.cursor = 'crosshair';
          const lt = el('text', { x: 12, y: 50 + i * 20 + 12, class: 'lport' }, g); lt.textContent = p[0];
          lt.setAttribute('y', 62 + i * 20 + 4);
        });
        Gr.portKeluar(b).forEach((p, i) => {
          const c = el('circle', { cx: LEBAR, cy: 62 + i * 20, r: 7, class: 'port keluar', fill: WARNA_TIPE[p[1]], 'data-blok': b.id, 'data-port': p[0] }, g);
          c.style.cursor = 'crosshair';
          const lt = el('text', { x: LEBAR - 12, y: 62 + i * 20 + 4, class: 'lport kanan', 'text-anchor': 'end' }, g); lt.textContent = labelPort(b, p, true);
          c.addEventListener('pointerdown', e => mulaiKabel(e, b, p));
        });
        g.addEventListener('pointerdown', e => { if (e.target.classList.contains('port')) return; mulaiGeser(e, b); });
      }
    }

    /* ---------- interaksi ---------- */
    let aksi = null;
    function mulaiGeser(e, b) {
      e.stopPropagation(); pilihan = b.id; kabelPilih = null; o.onPilih && o.onPilih(b.id);
      const p = keKanvas(e.clientX, e.clientY);
      aksi = { jenis: 'geser', b, dx: p.x - b.x, dy: p.y - b.y, gerak: false };
      gambar();
    }
    function mulaiKabel(e, b, p) {
      e.stopPropagation();
      aksi = { jenis: 'kabel', b, port: p[0], tipe: p[1], awal: posPort(b, p[0], true) };
      sementara.style.display = ''; sementara.setAttribute('stroke', WARNA_TIPE[p[1]]);
      svg.querySelectorAll('.port.masuk').forEach(c => { const bb = H.blok.find(x => x.id === c.dataset.blok); const pm = Gr.portMasuk(bb).find(x => x[0] === c.dataset.port); c.classList.toggle('cocok', pm && pm[1] === p[1] && bb !== b); });
    }
    svg.addEventListener('pointerdown', e => { if (e.target === svg || e.target === latar) { aksi = { jenis: 'pan', x: e.clientX, y: e.clientY }; pilihan = null; kabelPilih = null; o.onPilih && o.onPilih(null); gambar(); } });
    root.addEventListener('pointermove', e => {
      if (!aksi) return;
      if (aksi.jenis === 'pan') { view.x += e.clientX - aksi.x; view.y += e.clientY - aksi.y; aksi.x = e.clientX; aksi.y = e.clientY; terapView(); }
      else if (aksi.jenis === 'geser') { const p = keKanvas(e.clientX, e.clientY); aksi.b.x = Math.max(0, Math.round(p.x - aksi.dx)); aksi.b.y = Math.max(0, Math.round(p.y - aksi.dy)); aksi.gerak = true; gambar(); }
      else if (aksi.jenis === 'kabel') { const p = keKanvas(e.clientX, e.clientY); sementara.setAttribute('d', kurva(aksi.awal, p)); }
    });
    root.addEventListener('pointerup', e => {
      if (!aksi) return;
      if (aksi.jenis === 'kabel') {
        sementara.style.display = 'none';
        svg.querySelectorAll('.port.cocok').forEach(c => c.classList.remove('cocok'));
        const t = document.elementFromPoint(e.clientX, e.clientY);
        if (t && t.classList && t.classList.contains('masuk')) {
          const k = { dari: aksi.b.id, port: aksi.port, ke: t.dataset.blok, portKe: t.dataset.port };
          const g = Gr.cekKabel(H, k);
          if (g) o.onGalat && o.onGalat(g);
          else if (!H.kabel.some(x => x.dari === k.dari && x.port === k.port && x.ke === k.ke && x.portKe === k.portKe)) {
            H.kabel.push(k);
            const sk = Gr.periksaGraf(H); if (sk.galat.some(x => /putaran/.test(x))) { H.kabel.pop(); o.onGalat && o.onGalat('Kabel itu membuat pesan berputar tanpa henti.'); }
            else o.onUbah && o.onUbah(H, 'kabel');
          }
        }
        gambar();
      } else if (aksi.jenis === 'geser' && aksi.gerak) o.onUbah && o.onUbah(H, 'geser');
      aksi = null;
    });
    svg.addEventListener('wheel', e => { e.preventDefault(); const r = svg.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, z0 = view.z; view.z = Math.max(0.4, Math.min(1.8, view.z * (e.deltaY > 0 ? 0.9 : 1.1))); view.x = mx - (mx - view.x) * view.z / z0; view.y = my - (my - view.y) * view.z / z0; terapView(); }, { passive: false });

    /* ---------- API ---------- */
    function idBaru(jenis) { const dasar = jenis.replace(/^alat_/, '').slice(0, 14); let i = 1; while (H.blok.some(b => b.id === dasar + i)) i++; return dasar + i; }
    function tambahBlok(jenis, x, y, cfg) {
      if (!Gr.JENIS[jenis]) return null;
      if (H.blok.length >= 40) { o.onGalat && o.onGalat('Maksimal 40 blok.'); return null; }
      const b = { id: idBaru(jenis), jenis, x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)), cfg: Gr.bersihCfg(jenis, cfg || {}) };
      H.blok.push(b); pilihan = b.id; gambar(); o.onUbah && o.onUbah(H, 'tambah'); o.onPilih && o.onPilih(b.id); return b.id;
    }
    function hapusBlok(id) { H.blok = H.blok.filter(b => b.id !== id); H.kabel = H.kabel.filter(k => k.dari !== id && k.ke !== id); if (pilihan === id) pilihan = null; gambar(); o.onUbah && o.onUbah(H, 'hapus'); }
    function hapusKabel(k) { H.kabel = H.kabel.filter(x => x !== k); kabelPilih = null; gambar(); o.onUbah && o.onUbah(H, 'hapus'); }
    function sorot(id) { const g = svg.querySelector(`.blok[data-id="${id}"]`); if (g) { g.classList.remove('aktif'); void g.getBoundingClientRect(); g.classList.add('aktif'); setTimeout(() => g.classList.remove('aktif'), 1100); } }
    function sorotKabel(k) { const p = svg.querySelector(`.kabel[data-dari="${k.dari}"][data-ke="${k.ke}"][data-port="${k.port}"]`); if (p) { p.classList.remove('alir'); void p.getBoundingClientRect(); p.classList.add('alir'); setTimeout(() => p.classList.remove('alir'), 1200); } }
    function muat(h) { H = h; pilihan = null; kabelPilih = null; gambar(); pas(); }
    /* Muat papan dengan zoom yang pas: semua blok terlihat. */
    function pas() {
      const r = svg.getBoundingClientRect();
      if (!H.blok.length || !r.width) { view.x = 20; view.y = 20; view.z = 1; return terapView(); }
      const x0 = Math.min(...H.blok.map(b => b.x)), y0 = Math.min(...H.blok.map(b => b.y)), x1 = Math.max(...H.blok.map(b => b.x + LEBAR)), y1 = Math.max(...H.blok.map(b => b.y + tinggi(b)));
      view.z = Math.max(0.45, Math.min(1, (r.width - 40) / (x1 - x0 + 40), (r.height - 110) / (y1 - y0 + 40)));
      view.x = 20 - x0 * view.z; view.y = 70 - y0 * view.z; terapView();
    }
    function rapikan() { view.x = 20; view.y = 20; view.z = 1; terapView(); }
    terapView();
    return { muat, pas, gambar, tambahBlok, hapusBlok, hapusKabel, keKanvas, sorot, sorotKabel, rapikan, pilih: id => { pilihan = id; gambar(); }, graf: () => H, kabelTerpilih: () => kabelPilih };
  }
  root.Kanvas = { buat, WARNA_TIPE };
})(typeof window !== 'undefined' ? window : globalThis);
