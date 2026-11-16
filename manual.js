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
  /* opsi.stop dan opsi.sinonim menambah kosakata bawaan (diatur per semesta). Peta sinonim: kata -> istilah di rak. */
  const token = (s, op) => { const stop = op && op.stop && op.stop.length ? new Set(op.stop) : null; return norm(s).split(' ').filter(w => w.length > 1 && !STOP.has(w) && !(stop && stop.has(w))).map(stem); };
  const tokenQuery = (s, op) => { const t = token(s, op); const sin = op && op.sinonim ? op.sinonim : null; const ekstra = t.map(w => (sin && sin[w]) || SINONIM[w]).filter(Boolean).map(w => stem(norm(w))); return t.concat(ekstra); };

  /* TF-IDF: skor = jumlah tf*idf istilah query pada potongan, dinormalkan panjang potongan. */
  function cari(pesan, manual, k, min, opsi) {
    const koleksi = opsi && opsi.koleksi;
    const docs = (manual || []).filter(m => !koleksi || m.koleksi === koleksi).map(m => ({ m, t: token(m.judul + ' ' + m.judul + ' ' + m.teks, opsi) }));
    if (!docs.length) return [];
    const df = {};
    for (const d of docs) for (const w of new Set(d.t)) df[w] = (df[w] || 0) + 1;
    const q = tokenQuery(pesan, opsi);
    const hasil = [];
    for (const d of docs) {
      let skor = 0;
      for (const w of q) {
        if (!df[w]) continue;
        const tf = d.t.filter(x => x === w).length;
        skor += tf * Math.log(1 + docs.length / df[w]);
      }
      const nilai = Math.round(skor / Math.sqrt(d.t.length) * 100) / 100;
      if (skor > 0 && nilai >= (min || 0)) hasil.push({ id: d.m.id, judul: d.m.judul, teks: d.m.teks, koleksi: d.m.koleksi || '', skor: nilai });
    }
    hasil.sort((a, b) => b.skor - a.skor);
    return hasil.slice(0, k || 2);
  }

  const ambilId = (manual, ids) => (manual || []).filter(m => ids.includes(m.id)).map(m => ({ id: m.id, judul: m.judul, teks: m.teks, skor: 1 }));

  /* Nilai dibaca dari TEKS manual, jadi mengedit teks mengubah perilaku agen. */
  function angka(s) { return parseFloat(String(s).replace(',', '.')); }
  const RENTANG_SUHU = /(\d+(?:[.,]\d+)?)\s*(?:sampai|hingga|-|s\.d\.?)\s*(\d+(?:[.,]\d+)?)\s*(?:c\b|derajat)/i;
  const adalahCatatan = m => /^catatan/.test(m.id);
  /* Catatan memori terbaru menang atas bab "suhu": preferensi pengguna mengalahkan SOP umum. */
  function nilaiSuhu(manual) {
    const semua = manual || [];
    const calon = semua.filter(adalahCatatan).reverse().concat(semua.filter(x => x.id === 'suhu'));
    for (const m of calon) {
      const r = m.teks.match(RENTANG_SUHU);
      if (!r) continue;
      const a = angka(r[1]), b = angka(r[2]);
      if (a >= 10 && b <= 45 && a <= b) return { min: a, maks: b, sumber: m.id };
    }
    return null;
  }
  /* Untuk belajar: skor tiap potongan terhadap sebuah pertanyaan, beserta kata yang cocok. */
  function jelaskan(pesan, manual, opsi) {
    const q = [...new Set(tokenQuery(pesan, opsi))];
    const skor = {}; for (const h of cari(pesan, manual, 99, 0, opsi)) skor[h.id] = h.skor;
    return (manual || []).map(m => {
      const t = new Set(token(m.judul + ' ' + m.teks, opsi));
      return { id: m.id, judul: m.judul, skor: skor[m.id] || 0, cocok: q.filter(w => t.has(w)) };
    }).sort((a, b) => b.skor - a.skor);
  }
  function nilaiCahaya(manual) {
    const m = (manual || []).find(x => x.id === 'cahaya'); if (!m) return null;
    const r = m.teks.match(/(\d+(?:[.,]\d+)?)\s*lux/i);
    return r ? { min: angka(r[1]) } : null;
  }

  const api = { MANUAL_AWAL, cari, ambilId, nilaiSuhu, nilaiCahaya, jelaskan, adalahCatatan, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Manual = api;
})(typeof window !== 'undefined' ? window : globalThis);
