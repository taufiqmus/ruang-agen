/* Rak manual (RAG): isi manual, retrieval TF-IDF tanpa API, dan pembacaan nilai dari teks manual.
   Fungsi murni tanpa DOM. Manual = array potongan {id, judul, teks}. */
(function (root) {
  'use strict';

  const MANUAL_AWAL = [
    { id: 'suhu', judul: 'Suhu nyaman', teks: 'Suhu nyaman ruangan adalah 24 sampai 26 C. Jika suhu di atas batas atas, nyalakan kipas. Jika perlu, buka pintu untuk sirkulasi udara.' },
    { id: 'cahaya', judul: 'Cahaya nyaman', teks: 'Cahaya nyaman untuk kerja minimal 200 lux. Jika papan sensor menunjukkan kurang dari itu, nyalakan lampu.' },
    { id: 'lengan', judul: 'Batas lengan robot', teks: 'Lengan robot maksimal 50 persen kecepatan dan sudut 90 derajat. Lengan harus mati sebelum pintu dibuka.' },
    { id: 'kipas', judul: 'Level kipas', teks: 'Kipas punya level 1 sampai 3. Level 1 pelan dan hemat, level 3 paling kencang.' },
    { id: 'pintu', judul: 'Pintu dan keselamatan', teks: 'Pintu tidak boleh dibuka saat lengan robot aktif. Tutup pintu setelah ruangan selesai dipakai.' },
    { id: 'jadwal', judul: 'Jadwal ruangan', teks: 'Ruangan dipakai pukul 08.00 sampai 16.00 pada hari kerja. Di luar jam itu lampu dan kipas dimatikan.' }
  ];

  const STOP = new Set('yang dan di ke dari untuk apa itu ini dengan atau saya aku kamu dong nih sih deh ya tolong bisa ada adalah pada dalam saat jika maka agar kalau sama juga lagi aja kok'.split(' '));
  /* Kata sehari-hari dipetakan ke istilah di manual, supaya "gerah" menemukan potongan suhu. */
  const SINONIM = { nyaman: 'suhu', gerah: 'suhu', panas: 'suhu', adem: 'suhu', sejuk: 'suhu', dingin: 'suhu', temperatur: 'suhu', lux: 'cahaya', gelap: 'cahaya', terang: 'cahaya', redup: 'cahaya', kapan: 'jadwal', jam: 'jadwal', robot: 'lengan', sudut: 'lengan', kecepatan: 'lengan', angin: 'kipas', level: 'kipas', aman: 'keselamatan', interlock: 'keselamatan' };

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function stem(w) {
    if (w.length > 5 && /(kan|nya)$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /(an|lah|kah)$/.test(w)) return w.slice(0, w.endsWith('an') ? -2 : -3);
    return w;
  }
  const token = s => norm(s).split(' ').filter(w => w.length > 1 && !STOP.has(w)).map(stem);
  const tokenQuery = s => { const t = token(s); const ekstra = t.map(w => SINONIM[w]).filter(Boolean); return t.concat(ekstra); };

  /* TF-IDF: skor = jumlah tf*idf istilah query pada potongan, dinormalkan panjang potongan. */
  function cari(pesan, manual, k, min) {
    const docs = (manual || []).map(m => ({ m, t: token(m.judul + ' ' + m.judul + ' ' + m.teks) }));
    if (!docs.length) return [];
    const df = {};
    for (const d of docs) for (const w of new Set(d.t)) df[w] = (df[w] || 0) + 1;
    const q = tokenQuery(pesan);
    const hasil = [];
    for (const d of docs) {
      let skor = 0;
      for (const w of q) {
        if (!df[w]) continue;
        const tf = d.t.filter(x => x === w).length;
        skor += tf * Math.log(1 + docs.length / df[w]);
      }
      const nilai = Math.round(skor / Math.sqrt(d.t.length) * 100) / 100;
      if (skor > 0 && nilai >= (min || 0)) hasil.push({ id: d.m.id, judul: d.m.judul, teks: d.m.teks, skor: nilai });
    }
    hasil.sort((a, b) => b.skor - a.skor);
    return hasil.slice(0, k || 2);
  }

  const ambilId = (manual, ids) => (manual || []).filter(m => ids.includes(m.id)).map(m => ({ id: m.id, judul: m.judul, teks: m.teks, skor: 1 }));

  /* Nilai dibaca dari TEKS manual, jadi mengedit teks mengubah perilaku agen. */
  function angka(s) { return parseFloat(String(s).replace(',', '.')); }
  function nilaiSuhu(manual) {
    const m = (manual || []).find(x => x.id === 'suhu'); if (!m) return null;
    const r = m.teks.match(/(\d+(?:[.,]\d+)?)\s*(?:sampai|hingga|-|s\.d\.?)\s*(\d+(?:[.,]\d+)?)\s*(?:c\b|derajat)/i);
    if (!r) return null;
    const a = angka(r[1]), b = angka(r[2]);
    if (!(a >= 10 && b <= 45 && a <= b)) return null;
    return { min: a, maks: b };
  }
  function nilaiCahaya(manual) {
    const m = (manual || []).find(x => x.id === 'cahaya'); if (!m) return null;
    const r = m.teks.match(/(\d+(?:[.,]\d+)?)\s*lux/i);
    return r ? { min: angka(r[1]) } : null;
  }

  /* Potongan dari klien disanitasi sebelum masuk prompt (dipakai juga oleh proxy). */
  function bersihkan(potongan, batasTotal) {
    const out = []; let sisa = batasTotal || 900;
    for (const p of Array.isArray(potongan) ? potongan.slice(0, 3) : []) {
      if (!p || typeof p !== 'object') continue;
      const judul = String(p.judul || '').replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
      let teks = String(p.teks || '').replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
      if (!teks || sisa <= 0) continue;
      teks = teks.slice(0, sisa); sisa -= teks.length;
      out.push({ id: String(p.id || '').slice(0, 20), judul, teks });
    }
    return out;
  }

  const api = { MANUAL_AWAL, cari, ambilId, nilaiSuhu, nilaiCahaya, bersihkan, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Manual = api;
})(typeof window !== 'undefined' ? window : globalThis);
