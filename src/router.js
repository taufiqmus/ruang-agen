/* Router semantik: memilih rute dengan membandingkan pesan ke CONTOH KALIMAT tiap rute (bukan regex).
   Dua cara mengukur kemiripan:
     ringan    : kata utuh dan potongan tiga huruf (tahan imbuhan dan salah ketik), tanpa model, tanpa internet
     embedding : vektor makna dari model embedding (misalnya embeddinggemma di Ollama), dihitung di brain-llm.js
   Fungsi murni tanpa DOM. Rute "tolak", guard, dan memori tetap dikerjakan aturan di depan router ini. */
(function (root) {
  'use strict';
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  /* Contoh kalimat bawaan per rute. Kata tanya sengaja dipertahankan: untuk intent, "apa" dan "berapa" penting. */
  const BAWAAN = {
    perangkat: ['nyalakan lampu', 'matikan kipas', 'buka pintu', 'tutup pintunya', 'tolong hidupkan', 'kecilkan dikit', 'naikkan levelnya', 'gerah banget', 'gelap nih', 'panas sekali di sini', 'bikin nyaman dong', 'udaranya pengap', 'dingin banget', 'jalankan mesinnya', 'matikan semua'],
    sensor: ['berapa suhu sekarang', 'suhunya berapa ya', 'lampunya nyala nggak', 'kondisi ruangan gimana', 'cahaya sekarang berapa lux', 'kipas masih nyala', 'status perangkat sekarang', 'pintunya kebuka atau tidak', 'panas nggak sekarang', 'lampu masih menyala atau sudah mati', 'kipasnya hidup?', 'keadaan perangkat gimana'],
    manual: ['berapa suhu nyaman', 'apa aturan ruangan ini', 'batas kecepatan berapa', 'jam buka kapan', 'sop nya bagaimana', 'resepnya apa', 'menurut manual apa', 'jadwal ruangan kapan', 'apa kata buku panduan', 'apa yang harus dilakukan sebelum', 'berapa batas maksimal', 'prosedurnya seperti apa'],
    kemampuan: ['apa yang bisa kamu lakukan', 'kamu bisa ngapain aja', 'kemampuanmu apa', 'fitur apa saja yang ada', 'bisa bantu apa', 'cara pakainya gimana', 'tugasmu apa', 'kamu itu bisa apa saja', 'fungsimu apa', 'perintah apa saja yang kamu paham', 'gimana cara menggunakan kamu'],
    obrol: ['halo', 'apa kabar', 'siapa penemu lampu pijar', 'kasih tips belajar dong', 'ceritakan lelucon', 'aku lagi sedih', 'menurutmu aku gimana', 'terima kasih banyak', 'kamu suka apa', 'rekomendasi film dong', 'jelaskan apa itu kecerdasan buatan', 'siapa presiden pertama indonesia', 'selamat pagi', 'kamu manusia atau robot', 'makanan favoritmu apa', 'kenapa langit biru', 'siapa penulis novel itu', 'ceritakan sesuatu yang lucu', 'aku bosan', 'bagaimana cara belajar efektif'],
    memori: ['ingat ya', 'tolong catat ini', 'namaku budi', 'siapa namaku', 'apa yang kamu ingat', 'ralat catatan tadi', 'hapus catatan itu']
  };
  /* Kelompok keputusan: salah pilih di dalam kelompok "parser" tidak berbahaya karena parser yang menentukan intent akhirnya. */
  const kelompok = r => (r === 'obrol' ? 'llm' : r === 'kemampuan' || r.startsWith('rute:') ? 'kode' : 'parser');
  const LABEL = { perangkat: 'atur perangkat', sensor: 'baca sensor', manual: 'tanya manual', kemampuan: 'kemampuan agen', obrol: 'obrolan', memori: 'memori' };

  /* Contoh dirakit dari data: bawaan + perangkat, keluhan, dan manual ruang aktif + contoh rute buatan semesta. */
  function susunContoh(R, U) {
    const c = [];
    const tambah = (rute, teks) => { const t = norm(teks); if (t) c.push({ rute, teks: t }); };
    for (const r of Object.keys(BAWAAN)) for (const t of BAWAAN[r]) tambah(r, t);
    if (R) {
      for (const id of Object.keys(R.perangkat)) {
        const k = R.perangkat[id].kata[0], tipe = R.perangkat[id].tipe;
        tambah('perangkat', (tipe === 'buka' ? 'buka ' : 'nyalakan ') + k); tambah('perangkat', (tipe === 'buka' ? 'tutup ' : 'matikan ') + k);
        tambah('sensor', k + ' nyala nggak');
      }
      for (const kel of R.keluhan || []) for (const kata of kel.kata.slice(0, 2)) tambah('perangkat', kata + ' banget');
      for (const a of Object.keys(R.alias || {}).slice(0, 6)) tambah('perangkat', a);
      for (const m of (R.manual || []).slice(0, 12)) tambah('manual', 'apa ' + m.judul);
    }
    if (U && U.router) for (const r of U.router.rute.filter(x => x.aksi !== 'tolak')) for (const t of (r.contoh && r.contoh.length ? r.contoh : r.kata)) tambah('rute:' + r.id, t);
    return c;
  }

  function fitur(s) {
    const t = norm(s), f = new Map(), add = (k, w) => f.set(k, (f.get(k) || 0) + w);
    for (const w of t.split(' ')) if (w) add('w:' + w, 1);
    const p = ' ' + t + ' ';
    for (let i = 0; i + 3 <= p.length; i++) add('c:' + p.slice(i, i + 3), 0.5);
    return f;
  }
  function kosinusPeta(a, b) {
    let d = 0, na = 0, nb = 0;
    for (const [k, v] of a) { na += v * v; const x = b.get(k); if (x) d += v * x; }
    for (const v of b.values()) nb += v * v;
    return na && nb ? d / Math.sqrt(na * nb) : 0;
  }
  function kosinus(a, b) {
    let d = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return na && nb ? d / Math.sqrt(na * nb) : 0;
  }

  /* Skor rute = kemiripan tertinggi dengan salah satu contohnya (tetangga terdekat). */
  function pilih(skorContoh, contoh) {
    const terbaik = {};
    skorContoh.forEach((s, i) => { const r = contoh[i].rute; if (!terbaik[r] || s > terbaik[r].skor) terbaik[r] = { rute: r, skor: s, contoh: contoh[i].teks }; });
    const urut = Object.values(terbaik).sort((a, b) => b.skor - a.skor);
    const atas = urut[0] || { rute: 'perangkat', skor: 0, contoh: '' };
    return { rute: atas.rute, skor: Math.round(atas.skor * 100) / 100, contoh: atas.contoh, kedua: urut[1] ? { rute: urut[1].rute, skor: Math.round(urut[1].skor * 100) / 100 } : null };
  }
  function klasifikasiRingan(pesan, contoh) {
    const q = fitur(pesan);
    return pilih(contoh.map(c => kosinusPeta(q, fitur(c.teks))), contoh);
  }
  function klasifikasiVektor(vPesan, vContoh, contoh) { return pilih(vContoh.map(v => kosinus(vPesan, v)), contoh); }
  const label = r => (r.startsWith('rute:') ? 'rute ' + r.slice(5) : LABEL[r] || r);

  const api = { kelompok, BAWAAN, susunContoh, klasifikasiRingan, klasifikasiVektor, kosinus, label, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RouterSemantik = api;
})(typeof window !== 'undefined' ? window : globalThis);
