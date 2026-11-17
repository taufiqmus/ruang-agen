/* Tutorial interaktif (dipakai Ruang Agen dan Easy Agent Visualizer).
   Setiap langkah: judul, teks, target yang disorot, persiapan (pindah mode atau tab), dan pemeriksa keadaan.
   Langkah dengan pemeriksa baru selesai saat keadaan aplikasi benar-benar berubah (bukan sekadar klik).
   Sorotan tidak memblokir klik, jadi pemain tetap bisa memakai aplikasi. Esc atau Lewati menutup tutorial. */
(function (root) {
  'use strict';
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const baca = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const tulis = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } };
  let gayaDipasang = false;
  function pasangGaya() {
    if (gayaDipasang) return; gayaDipasang = true;
    const s = document.createElement('style');
    s.textContent = `
.tur-sorot { position: fixed; z-index: 40; border: 3px solid #ffc928; border-radius: 10px; box-shadow: 0 0 0 9999px rgba(15, 18, 35, 0.45); pointer-events: none; transition: all .25s ease; }
.tur-sorot.kosong { border: 0; width: 0; height: 0; left: 50%; top: 50%; }
.tur-gelembung { position: fixed; z-index: 41; width: min(340px, calc(100vw - 24px)); background: #fffdf8; color: #161a2e; border: 2px solid #161a2e; border-radius: 12px; box-shadow: 4px 4px 0 #161a2e; padding: 12px 14px; font: 400 14px/1.45 "Onest", system-ui, sans-serif; }
.tur-gelembung h4 { margin: 0 0 4px; font: 800 15px "Bricolage Grotesque", system-ui, sans-serif; }
.tur-gelembung .kecil { color: #5d6276; font-size: 12px; cursor: move; user-select: none; touch-action: none; }
.tur-gelembung .kecil::after { content: '  (seret di sini untuk memindah)'; opacity: .7; }
.tur-gelembung .status { margin-top: 6px; font-size: 12.5px; padding: 4px 8px; border-radius: 8px; background: #fff0c2; border: 1px dashed #161a2e; }
.tur-gelembung .status.ok { background: #d3f5e6; }
.tur-gelembung .tombol { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
.tur-gelembung button { border: 2px solid #161a2e; border-radius: 8px; background: #fff; padding: 3px 10px; cursor: pointer; font-weight: 600; }
.tur-gelembung button.pri { background: #2f5bff; color: #fff; }
.tur-gelembung button:disabled { opacity: .45; cursor: not-allowed; }
.tur-gelembung.tembus { opacity: .3; pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .tur-sorot { transition: none; } }`;
    document.head.appendChild(s);
  }

  /* langkah: [{ judul, teks, sorot: selector | () => Element | () => {x,y,w,h}, siapkan(), selesai(): bool, aksi: {label, jalan()} }] */
  function buat(o) {
    pasangGaya();
    const kunci = o.kunci || 'tutorial';
    let langkah = [], i = 0, aktif = false, tm = null, berhasil = false, posManual = null;
    const sorot = mk('div', 'tur-sorot'), gel = mk('div', 'tur-gelembung'); gel.setAttribute('role', 'dialog'); gel.setAttribute('aria-live', 'polite');
    function kotak(L) {
      let t = typeof L.sorot === 'function' ? L.sorot() : L.sorot ? document.querySelector(L.sorot) : null;
      if (!t) return null;
      if (t.getBoundingClientRect) { const r = t.getBoundingClientRect(); if (!r.width && !r.height) return null; return { x: r.left, y: r.top, w: r.width, h: r.height }; }
      return t;
    }
    function letakkan() {
      if (!aktif) return;
      const L = langkah[i], k = kotak(L), pad = 6, vw = window.innerWidth, vh = window.innerHeight;
      if (k) { sorot.classList.remove('kosong'); Object.assign(sorot.style, { left: (k.x - pad) + 'px', top: (k.y - pad) + 'px', width: (k.w + pad * 2) + 'px', height: (k.h + pad * 2) + 'px' }); }
      else { sorot.classList.add('kosong'); sorot.removeAttribute('style'); }
      const gw = gel.offsetWidth || 340, gh = gel.offsetHeight || 160;
      let x, y;
      if (posManual) { x = posManual.x; y = posManual.y; }
      else if (!k) { x = (vw - gw) / 2; y = (vh - gh) / 2; }
      else if (k.h > vh * 0.5 || k.w > vw * 0.5) { x = k.x + k.w + gw + 24 < vw ? k.x + k.w + 16 : vw - gw - 16; y = vh - gh - 16; }   // target besar (palet, papan, dunia 3D): gelembung di bawah, tidak menutupi tengah
      else if (k.x + k.w + gw + 24 < vw) { x = k.x + k.w + 16; y = k.y; }        // kanan target
      else if (k.x - gw - 24 > 0) { x = k.x - gw - 16; y = k.y; }                 // kiri target
      else if (k.y + k.h + gh + 24 < vh) { x = k.x; y = k.y + k.h + 16; }         // bawah target
      else { x = k.x; y = k.y - gh - 16; }                                        // atas target
      gel.style.left = Math.max(12, Math.min(vw - gw - 12, x)) + 'px';
      gel.style.top = Math.max(12, Math.min(vh - gh - 12, y)) + 'px';
    }
    function gambar() {
      const L = langkah[i]; gel.replaceChildren();
      const kepala = mk('div', 'kecil', `${o.judul ? o.judul + ' | ' : ''}langkah ${i + 1} dari ${langkah.length}`); gel.appendChild(kepala);
      kepala.onpointerdown = e => {
        e.preventDefault(); const r = gel.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
        const gerak = ev => { posManual = { x: ev.clientX - dx, y: ev.clientY - dy }; letakkan(); };
        const lepas = () => { window.removeEventListener('pointermove', gerak); window.removeEventListener('pointerup', lepas); };
        window.addEventListener('pointermove', gerak); window.addEventListener('pointerup', lepas);
      };
      gel.appendChild(mk('h4', '', L.judul));
      gel.appendChild(mk('div', '', L.teks));
      const st = mk('div', 'status'); st.id = 'turStatus';
      if (L.selesai) { st.textContent = berhasil ? 'Bagus, langkah ini selesai.' : 'Menunggu: lakukan langkah di atas.'; st.classList.toggle('ok', berhasil); gel.appendChild(st); }
      const tb = mk('div', 'tombol');
      const kembali = mk('button', '', 'Kembali'), lanjut = mk('button', 'pri', i === langkah.length - 1 ? 'Selesai' : 'Lanjut'), lewati = mk('button', '', 'Tutup');
      kembali.type = lanjut.type = lewati.type = 'button'; kembali.id = 'turKembali'; lanjut.id = 'turLanjut'; lewati.id = 'turTutup';
      kembali.disabled = i === 0; lanjut.disabled = !!L.selesai && !berhasil;
      kembali.onclick = () => ke(i - 1); lanjut.onclick = () => ke(i + 1); lewati.onclick = () => tutup(false);
      if (L.aksi) { const a = mk('button', '', L.aksi.label); a.type = 'button'; a.id = 'turAksi'; a.onclick = () => { L.aksi.jalan(); }; tb.appendChild(a); }
      tb.append(kembali, lanjut, lewati); gel.appendChild(tb);
      requestAnimationFrame(letakkan);
    }
    function ke(n) {
      if (n >= langkah.length) return tutup(true);
      i = Math.max(0, n); berhasil = false;
      const L = langkah[i];
      try { if (L.siapkan) L.siapkan(); } catch (e) { /* abaikan */ }
      tulis(kunci, { bab: o.babAktif && o.babAktif(), i });
      gambar(); setTimeout(letakkan, 120); setTimeout(letakkan, 400);
    }
    function periksa() {
      if (!aktif) return;
      const L = langkah[i];
      if (L.selesai && !berhasil) { let ok = false; try { ok = !!L.selesai(); } catch (e) { ok = false; } if (ok) { berhasil = true; gambar(); if (L.lanjutOtomatis !== false) setTimeout(() => { if (aktif && langkah[i] === L) ke(i + 1); }, 900); } }
      letakkan();
    }
    function mulai(daftar, dari) {
      langkah = daftar; aktif = true; posManual = null;
      document.body.append(sorot, gel);
      clearInterval(tm); tm = setInterval(periksa, 400);
      ke(dari || 0);
    }
    function tutup(selesai) {
      aktif = false; clearInterval(tm); sorot.remove(); gel.remove();
      tulis(kunci, null);
      if (o.onTutup) o.onTutup(!!selesai);
    }
    window.addEventListener('keydown', e => { if (aktif && e.key === 'Escape') tutup(false); });
    // selama pengguna menyeret (kabel, blok, kamera, seret-lepas palet), gelembung tembus supaya tidak menghalangi titik lepas
    let tekan = false;
    const tembus = on => gel.classList.toggle('tembus', on);
    // dilepas sesudah handler lain membaca titik lepas (elementFromPoint), bukan sebelumnya
    const lepasTembus = () => setTimeout(() => { if (!tekan) tembus(false); }, 0);
    window.addEventListener('pointerdown', e => { if (aktif && !gel.contains(e.target)) { tekan = true; tembus(true); } }, true);
    window.addEventListener('pointerup', () => { tekan = false; lepasTembus(); }, true);
    window.addEventListener('pointercancel', () => { tekan = false; lepasTembus(); }, true);
    window.addEventListener('dragstart', () => { if (aktif) tembus(true); }, true);
    // dragend bisa datang terlambat; jangan matikan tembus bila pengguna sedang menekan (misalnya menarik kabel)
    window.addEventListener('dragend', lepasTembus, true);
    window.addEventListener('drop', lepasTembus, true);
    window.addEventListener('resize', letakkan);
    return { mulai, tutup, aktif: () => aktif, langkahKe: () => i, simpanan: () => baca(kunci, null) };
  }
  root.Tutorial = { buat };
})(typeof window !== 'undefined' ? window : globalThis);
