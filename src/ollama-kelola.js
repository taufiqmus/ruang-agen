/* Pengelola model Ollama: katalog, kecocokan dengan laptop, dan unduhan model lewat API Ollama (/api/pull).
   Dipakai game (tab Otak) dan Easy Agent Visualizer (tab Model), jadi mahasiswa memilih dan menambah model tanpa terminal. */
(function (root) {
  'use strict';
  /* ram = RAM minimum (GB). gpu = VRAM (GB) supaya nyaman cepat; tanpa itu model tetap jalan di CPU, hanya lebih lambat. */
  const KATALOG = [
    { nama: 'qwen2.5:1.5b', gb: 1.0, ram: 4, gpu: 0, alat: false, ket: 'Ringan, jalan di CPU. Cukup untuk praktikum. Jarang bisa memakai alat.' },
    { nama: 'qwen2.5:3b', gb: 1.9, ram: 8, gpu: 4, alat: false, ket: 'Sedang. Lebih paham kalimat bebas.' },
    { nama: 'qwen2.5:7b', gb: 4.7, ram: 16, gpu: 6, alat: true, ket: 'Bisa memakai alat (tool calling). Paling nyaman dengan kartu grafis.' },
    { nama: 'gemma4:e4b', gb: 6.6, ram: 16, gpu: 8, alat: true, ket: 'Bisa memakai alat, paling andal di uji Studio. Butuh laptop kuat.' },
    { nama: 'embeddinggemma', gb: 0.6, ram: 4, gpu: 0, alat: false, tambahan: true, ket: 'Tambahan: router embedding dan RAG hibrida.' },
    { nama: 'llama-guard3:1b', gb: 1.6, ram: 4, gpu: 0, alat: false, tambahan: true, ket: 'Tambahan: guard model untuk konten berbahaya.' }
  ];

  const bersih = u => String(u || 'http://localhost:11434').trim().replace(/\/+$/, '');
  const sama = (a, b) => a === b || a === b + ':latest' || a + ':latest' === b;

  /* hw = { ram, vram } dalam GB, bisa kosong (browser tidak membaca VRAM). Hasil: cocok, pas, berat, atau ? */
  function kecocokan(m, hw) {
    if (!hw || !hw.ram) return '?';
    if (hw.ram < m.ram) return 'berat';
    if (m.gpu && !(hw.vram >= m.gpu)) return 'pas';
    return 'cocok';
  }
  /* Model utama terbesar yang masih "cocok". Bila tak ada yang cocok, model termurah. */
  function saran(hw) {
    const utama = KATALOG.filter(m => !m.tambahan);
    const ok = utama.filter(m => kecocokan(m, hw) === 'cocok');
    return (ok.length ? ok[ok.length - 1] : utama[0]).nama;
  }

  async function tersedia(base, ambil) {
    const f = ambil || root.fetch;
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctl && setTimeout(() => ctl.abort(), 4000);
    try {
      const r = await f(bersih(base) + '/api/tags', ctl ? { signal: ctl.signal } : {});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return ((await r.json()).models || []).map(m => ({ nama: m.name, gb: (m.size || 0) / 1e9 })).sort((a, b) => a.gb - b.gb);
    } finally { if (t) clearTimeout(t); }
  }

  /* Mengunduh model. onProgres({ status, persen }) dipanggil tiap baris NDJSON dari Ollama. */
  async function tarik(base, nama, onProgres, opsi) {
    opsi = opsi || {};
    const f = opsi.ambil || root.fetch;
    const r = await f(bersih(base) + '/api/pull', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: nama, name: nama, stream: true }), signal: opsi.signal });
    if (!r.ok) throw new Error('Ollama menolak unduhan (HTTP ' + r.status + ')');
    const baca = (r.body && r.body.getReader) ? r.body.getReader() : null;
    const dec = new TextDecoder();
    let sisa = '', selesai = false;
    const proses = baris => {
      if (!baris.trim()) return;
      let d; try { d = JSON.parse(baris); } catch (e) { return; }
      if (d.error) throw new Error(d.error);
      if (d.status === 'success') selesai = true;
      if (onProgres) onProgres({ status: d.status || '', persen: d.total ? Math.min(100, Math.round(100 * (d.completed || 0) / d.total)) : null });
    };
    if (baca) {
      for (;;) {
        const { done, value } = await baca.read();
        if (done) break;
        sisa += dec.decode(value, { stream: true });
        const bagian = sisa.split('\n'); sisa = bagian.pop();
        bagian.forEach(proses);
      }
      proses(sisa);
    } else { (await r.text()).split('\n').forEach(proses); }
    if (!selesai) throw new Error('Unduhan berhenti sebelum selesai. Periksa internet, lalu coba lagi (unduhan dilanjutkan dari bagian yang sudah ada).');
  }

  /* Info laptop: dari server MULAI (/_info, bisa membaca RAM dan VRAM), cadangannya dari browser. */
  async function infoLaptop(ambil) {
    const f = ambil || root.fetch;
    const loc = root.location;
    if (loc && /^https?:$/.test(loc.protocol) && ['127.0.0.1', 'localhost'].includes(loc.hostname)) {
      try { const r = await f(loc.origin + '/_info'); if (r.ok) { const d = await r.json(); if (d && d.ram) return { ram: d.ram, vram: d.vram || 0, gpu: d.gpu || '', cpu: d.cpu || 0, dari: 'server' }; } } catch (e) { /* tidak ada server MULAI */ }
    }
    const nav = root.navigator || {};
    return { ram: nav.deviceMemory || 0, vram: 0, gpu: '', cpu: nav.hardwareConcurrency || 0, dari: 'browser' };
  }

  /* Panel di DOM. o = { base(), aktif(), pakai(nama), setelahUbah?() } */
  function panel(wadah, o) {
    const D = root.document;
    const mk = (tag, cls, txt) => { const e = D.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const tombol = (txt, fn) => { const b = mk('button', 'btn sm', txt); b.type = 'button'; b.style.cssText = 'padding:3px 9px;white-space:nowrap'; b.onclick = fn; return b; };
    const kini = { daftar: [], hw: null, galat: '', unduh: {} };   // unduh[nama] = { persen, status, batal }
    const status = mk('p', 'note'); status.setAttribute('role', 'status');
    const info = mk('p', 'note');
    const tabel = mk('div'); tabel.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin:6px 0';
    const bebas = mk('input'); bebas.type = 'text'; bebas.placeholder = 'nama model lain, misalnya llama3.2:1b'; bebas.setAttribute('aria-label', 'Nama model Ollama lain');
    const barisBebas = mk('div'); barisBebas.style.cssText = 'display:flex;gap:6px';
    barisBebas.append(bebas, tombol('Unduh', () => { const n = bebas.value.trim(); if (n) { mulaiUnduh(n); bebas.value = ''; } }));
    wadah.replaceChildren(status, info, tabel, barisBebas);

    const terpasang = n => kini.daftar.some(d => sama(d.nama, n));
    function baris(m) {
      const b = mk('div'); b.style.cssText = 'display:flex;flex-direction:column;gap:3px;padding:6px 8px;border:1px solid var(--line,#8884);border-radius:8px';
      const atas = mk('div'); atas.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';
      const nama = mk('b', '', m.nama); nama.style.flex = '1 1 auto';
      const gb = mk('span', 'note', (m.gb ? m.gb.toFixed(1) : '?') + ' GB');
      atas.append(nama, gb);
      const cocok = m.kat ? kecocokan(m.kat, kini.hw) : '?';
      if (m.kat) {
        const label = { cocok: 'cocok untuk laptopmu', pas: 'bisa, tetapi lambat', berat: 'terlalu berat', '?': 'kecocokan tidak diketahui' }[cocok];
        const t = mk('span', 'note', (m.kat.nama === kini.saran ? 'DISARANKAN, ' : '') + label); if (cocok === 'berat') t.style.color = 'var(--bad,#c33)';
        atas.appendChild(t);
      }
      const u = kini.unduh[m.nama];
      if (u) { atas.appendChild(tombol('Batal', () => u.batal())); }
      else if (terpasang(m.nama)) {
        if (!(m.kat && m.kat.tambahan)) atas.appendChild(tombol(sama(o.aktif(), m.nama) ? 'Dipakai' : 'Pakai', () => { o.pakai(m.nama); render(); }));
        atas.appendChild(mk('span', 'note', 'terpasang'));
      } else atas.appendChild(tombol('Unduh', () => mulaiUnduh(m.nama)));
      b.appendChild(atas);
      if (m.kat) b.appendChild(mk('span', 'note', m.kat.ket));
      if (u) {
        const p = mk('progress'); p.max = 100; if (u.persen != null) p.value = u.persen; p.style.width = '100%'; p.setAttribute('aria-label', 'Kemajuan unduhan ' + m.nama);
        b.append(p, mk('span', 'note', (u.persen != null ? u.persen + '% ' : '') + (u.status || 'memulai...')));
      }
      if (kini.galatModel && kini.galatModel[m.nama]) { const g = mk('span', 'note', kini.galatModel[m.nama]); g.style.color = 'var(--bad,#c33)'; b.appendChild(g); }
      return b;
    }
    function render() {
      const daftar = KATALOG.map(k => ({ nama: k.nama, gb: k.gb, kat: k }));
      kini.daftar.forEach(d => { if (!KATALOG.some(k => sama(d.nama, k.nama))) daftar.push({ nama: d.nama, gb: d.gb }); });
      Object.keys(kini.unduh).concat(Object.keys(kini.galatModel || {})).forEach(n => { if (!daftar.some(d => sama(d.nama, n))) daftar.push({ nama: n, gb: 0 }); });
      kini.saran = saran(kini.hw);
      const hw = kini.hw;
      info.textContent = hw && hw.ram ? `Laptopmu: ${hw.cpu ? hw.cpu + ' inti CPU, ' : ''}RAM ${hw.ram}${hw.dari === 'browser' ? ' GB atau lebih (perkiraan browser)' : ' GB'}${hw.vram ? ', kartu grafis ' + hw.vram.toFixed(0) + ' GB' : hw.dari === 'server' ? ', tanpa kartu grafis NVIDIA' : ', kartu grafis tidak terbaca'}. Penilaian "cocok" hanya perkiraan.` : 'Spesifikasi laptop tidak terbaca, jadi kecocokan tidak ditampilkan. Mulai dari model terkecil.';
      tabel.replaceChildren(...daftar.map(baris));
      status.textContent = kini.galat || `Ollama berjalan, ${kini.daftar.length} model terpasang. Unduh model baru kapan saja bila laptopmu masih kuat.`;
    }
    async function muat() {
      status.textContent = 'Memeriksa Ollama...';
      try { kini.daftar = await tersedia(o.base()); kini.galat = ''; }
      catch (e) { kini.daftar = []; kini.galat = 'Ollama tidak terjangkau. Pasang Ollama dari ollama.com/download dan buka aplikasinya, lalu klik Periksa lagi. Buka game lewat MULAI.bat, bukan klik dua kali berkas, supaya Ollama mengizinkannya.'; }
      render();
    }
    async function mulaiUnduh(nama) {
      if (kini.unduh[nama]) return;
      const ctl = new AbortController();
      const u = kini.unduh[nama] = { persen: null, status: '', batal: () => ctl.abort() };
      kini.galatModel = kini.galatModel || {}; delete kini.galatModel[nama];
      render();
      try {
        await tarik(o.base(), nama, p => { u.persen = p.persen != null ? p.persen : u.persen; u.status = p.status; render(); }, { signal: ctl.signal });
      } catch (e) { kini.galatModel[nama] = ctl.signal.aborted ? 'Unduhan dibatalkan.' : 'Gagal: ' + (e && e.message ? e.message : e); }
      delete kini.unduh[nama];
      await muat();
      if (o.setelahUbah) o.setelahUbah();
    }
    const ulang = tombol('Periksa lagi', muat); ulang.id = 'oklPeriksa';
    wadah.appendChild(ulang);
    infoLaptop().then(h => { kini.hw = h; render(); });
    muat();
    return { muat };
  }

  const api = { KATALOG, kecocokan, saran, tersedia, tarik, infoLaptop, panel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OllamaKelola = api;
})(typeof window !== 'undefined' ? window : globalThis);
