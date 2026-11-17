/* Easy Agent Visualizer: PAPAN OTAK sebagai graf blok.
   Setiap blok punya port bertipe. Sambungan hanya boleh antar port bertipe sama:
     pesan       : aliran pesan (pemicu -> proses -> keluaran)
     alat        : blok Alat -> port "alat" pada Agen
     pengetahuan : blok RAG -> Agen
     memori      : blok Memori -> Agen
     pengaman    : blok Guard Aksi -> Agen
     tugas       : Orkestrator -> Agen pekerja
   Mesin graf menjalankan pesan dari pemicu, dengan batas langkah dan anggaran panggilan AI per pesan. */
(function (root) {
  'use strict';
  const VERSI = 1;
  const A = () => root.AlatStudio;
  const potong = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '...' : s; };

  /* kelompok: pemicu | proses | otak | alat | pendukung | keluaran */
  const JENIS = {
    chat: { kelompok: 'pemicu', judul: 'Chat', warna: '#2f5bff', keluar: [['keluar', 'pesan']], konsep: 'Pemicu: pesan yang kamu ketik di panel chat masuk ke papan otak lewat blok ini.' },
    telegram: { kelompok: 'pemicu', judul: 'Telegram', warna: '#229ed9', keluar: [['keluar', 'pesan']], konsep: 'Pemicu dari bot Telegram sungguhan. Pesan dari orang asing tidak dipercaya: pakai daftar izin dan Guard Masukan.' },
    jadwal: { kelompok: 'pemicu', judul: 'Jadwal', warna: '#7a5af8', keluar: [['keluar', 'pesan']], cfg: { jam: '06:00', pesan: 'Laporkan kondisi rumah pagi ini.' }, konsep: 'Pemicu berdasarkan waktu, seperti cron di server.' },
    pemicu_sensor: { kelompok: 'pemicu', judul: 'Pemicu Sensor', warna: '#e0408a', keluar: [['keluar', 'pesan']], cfg: { sensor: '', variabel: 'suhu', op: '>', nilai: 32, pesan: 'Peringatan otomatis: {sensor} {variabel} {nilai}.' }, konsep: 'Pemicu berbasis kejadian: agen bangun sendiri saat nilai sensor melewati ambang.' },
    guard_masukan: { kelompok: 'proses', judul: 'Guard Masukan', warna: '#ff5a47', masuk: [['masuk', 'pesan']], keluar: [['lolos', 'pesan'], ['tolak', 'pesan']], cfg: { regex: true, model: '' }, konsep: 'Menangkap upaya menipu agen ("abaikan aturan") sebelum sampai ke AI. Bisa ditambah guard model (Llama Guard).' },
    penyamar: { kelompok: 'proses', judul: 'Penyamar Data Pribadi', warna: '#ff8a3d', masuk: [['masuk', 'pesan']], keluar: [['keluar', 'pesan']], konsep: 'Menyamarkan nomor HP, email, dan NIK sebelum diproses AI (privasi).' },
    router: { kelompok: 'proses', judul: 'Router', warna: '#8a4bff', masuk: [['masuk', 'pesan']], keluar: 'dinamis', cfg: { mode: 'kata', rute: [{ nama: 'kebun', kata: ['kebun', 'tanaman', 'siram', 'tanah'] }, { nama: 'kandang', kata: ['kandang', 'ayam', 'pakan'] }] }, konsep: 'Memilih jalur berdasarkan isi pesan: kata kunci atau kemiripan makna (semantik).' },
    aturan: { kelompok: 'proses', judul: 'Aturan JIKA-MAKA', warna: '#1f9e6e', masuk: [['masuk', 'pesan']], keluar: [['keluar', 'pesan']], cfg: { sensor: '', variabel: 'suhu', op: '>', nilai: 30, aktuator: '', aksi: 'nyala', sebaliknya: true }, konsep: 'Otomasi tanpa AI. Untuk keputusan sederhana, aturan lebih cepat, murah, dan pasti daripada AI.' },
    orkestrator: { kelompok: 'otak', judul: 'Orkestrator', warna: '#0f766e', masuk: [['masuk', 'pesan']], keluar: [['keluar', 'pesan'], ['tugas', 'tugas']], cfg: { mode: 'otomatis' }, konsep: 'Membagi pesan ke beberapa agen pekerja (multi-agen), lalu menggabungkan jawabannya.' },
    agen: { kelompok: 'otak', judul: 'Agen', warna: '#16a34a', masuk: [['masuk', 'pesan'], ['tugas', 'tugas'], ['alat', 'alat'], ['pengetahuan', 'pengetahuan'], ['memori', 'memori'], ['pengaman', 'pengaman']], keluar: [['keluar', 'pesan']], cfg: { nama: 'Agen Rumah', persona: 'asisten rumah yang ramah', model: '', hemat: true, maksLangkah: 4 }, konsep: 'Otak yang berpikir dengan model AI (atau parser) dan memanggil alat yang tersambung ke port "alat".' },
    rak: { kelompok: 'pendukung', judul: 'RAG', warna: '#ca8a04', keluar: [['keluar', 'pengetahuan']], cfg: { preset: 'rumah', tulis: false }, konsep: 'RAG (Retrieval-Augmented Generation): dokumen yang dicari dan dibaca agen sebelum menjawab. Bila diizinkan, agen bisa menambah, meralat, dan menghapus dokumen lewat chat.' },
    memori: { kelompok: 'pendukung', judul: 'Memori', warna: '#9333ea', keluar: [['keluar', 'memori']], cfg: { konteks: 4 }, konsep: 'Context window: beberapa pesan terakhir ikut diingat agen.' },
    guard_aksi: { kelompok: 'pendukung', judul: 'Guard Aksi', warna: '#dc2626', keluar: [['keluar', 'pengaman']], cfg: { batas: true, persetujuan: true }, konsep: 'Batas aman di kode: pemanas di atas 33 C, pompa saat tandon kosong, kipas dan pemanas bersamaan, plus persetujuan manusia untuk aksi berisiko.' },
    alat_sensor: { kelompok: 'alat', judul: 'Alat Sensor', warna: '#0891b2', keluar: [['keluar', 'alat']], cfg: { lingkup: 'semua' }, konsep: 'Tool baca_sensor: membaca sensor lewat ESP.' },
    alat_aktuator: { kelompok: 'alat', judul: 'Alat Aktuator', warna: '#0891b2', keluar: [['keluar', 'alat']], cfg: { lingkup: 'semua', persetujuan: false }, konsep: 'Tool atur_perangkat: menyalakan atau mematikan perangkat lewat ESP dan relay.' },
    alat_kalender: { kelompok: 'alat', judul: 'Kalender', warna: '#0891b2', keluar: [['keluar', 'alat']], konsep: 'Tool kalender: jadwal panen, vaksin ayam, servis pompa. Bisa diekspor ke .ics.' },
    alat_kalkulator: { kelompok: 'alat', judul: 'Kalkulator', warna: '#0891b2', keluar: [['keluar', 'alat']], konsep: 'Tool hitung: AI buruk berhitung, jadi serahkan ke kalkulator.' },
    alat_cuaca: { kelompok: 'alat', judul: 'Cuaca', warna: '#0891b2', keluar: [['keluar', 'alat']], cfg: { nyata: false, lat: -7.8, lon: 110.36 }, konsep: 'Tool cuaca: simulasi, atau data nyata dari Open-Meteo (gratis, tanpa kunci).' },
    alat_logger: { kelompok: 'alat', judul: 'Logger', warna: '#0891b2', keluar: [['keluar', 'alat']], konsep: 'Tool tulis_log: mencatat kejadian penting, seperti logging di server.' },
    alat_telegram: { kelompok: 'alat', judul: 'Kirim Telegram', warna: '#0891b2', keluar: [['keluar', 'alat']], konsep: 'Tool kirim_telegram: agen mengirim notifikasi ke HP pemilik rumah.' },
    alat_waktu: { kelompok: 'alat', judul: 'Jam', warna: '#0891b2', keluar: [['keluar', 'alat']], konsep: 'Tool waktu: AI tidak tahu jam sekarang tanpa tool.' },
    alat_penjadwal: { kelompok: 'alat', judul: 'Penjadwal', warna: '#0891b2', keluar: [['keluar', 'alat']], konsep: 'Tool buat_pengingat: agen membuat pengingat harian sendiri.' },
    balas: { kelompok: 'keluaran', judul: 'Balas', warna: '#334155', masuk: [['masuk', 'pesan']], konsep: 'Mengirim jawaban kembali ke asal pesan (chat atau Telegram).' },
    kirim_telegram: { kelompok: 'keluaran', judul: 'Kirim ke Telegram', warna: '#229ed9', masuk: [['masuk', 'pesan']], konsep: 'Mengirim pesan ke chat pemilik di Telegram (misalnya laporan pagi).' },
    log: { kelompok: 'keluaran', judul: 'Log', warna: '#64748b', masuk: [['masuk', 'pesan']], konsep: 'Menulis pesan ke log, tanpa membalas siapa pun.' }
  };
  const KELOMPOK = { pemicu: 'Pemicu', proses: 'Proses', otak: 'Otak', pendukung: 'Pendukung otak', alat: 'Alat (tool)', keluaran: 'Keluaran' };

  /* Dokumen RAG bawaan (bisa diedit di inspektur). */
  const RAK = {
    rumah: [
      { id: 'r_suhu', judul: 'Suhu nyaman rumah', teks: 'Suhu nyaman kamar 24 sampai 28 C. Di atas 29 C nyalakan kipas level 2. Malam hari kipas cukup level 1.' },
      { id: 'r_listrik', judul: 'Hemat listrik', teks: 'Matikan lampu ruangan kosong. Exhaust cukup menyala 15 menit setelah memasak. Pemakaian listrik di atas 500 watt perlu dicek.' },
      { id: 'r_gas', judul: 'Kebocoran gas', teks: 'Bila gas dapur di atas 300 ppm: nyalakan exhaust, jangan menyalakan api, buka pintu, kabari pemilik.' }
    ],
    kebun: [
      { id: 'k_siram', judul: 'Jadwal siram', teks: 'Siram kebun pagi pukul 06.00 dan sore pukul 16.00. Siram bila kelembapan tanah di bawah 40 persen, hentikan di 70 persen.' },
      { id: 'k_panen', judul: 'Panen sayur', teks: 'Selada dipanen 30 sampai 35 hari setelah tanam. Kangkung 25 hari. Panen pagi hari supaya segar.' },
      { id: 'k_hama', judul: 'Hama kebun', teks: 'Daun berlubang biasanya ulat. Semprot pestisida nabati dari bawang putih dan cabai sore hari.' }
    ],
    ternak: [
      { id: 't_suhu', judul: 'Suhu kandang ayam', teks: 'Ayam dewasa nyaman di 20 sampai 30 C. Anak ayam umur 1 sampai 7 hari butuh 32 sampai 35 C dari lampu pemanas. Di atas 32 C ayam dewasa stres panas: nyalakan kipas.' },
      { id: 't_pakan', judul: 'Pakan ayam', teks: 'Ayam dewasa makan sekitar 110 gram per ekor per hari, dibagi pagi dan sore. Isi ulang tempat pakan bila sisa di bawah 20 persen.' },
      { id: 't_vaksin', judul: 'Vaksin ayam', teks: 'Vaksin ND (tetelo) umur 4 hari dan diulang umur 21 hari. Catat jadwal vaksin di kalender.' }
    ]
  };

  /* ---------- pemeriksa graf (impor tidak dipercaya) ---------- */
  const teks = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const OK_ID = /^[a-z][a-z0-9_]{0,23}$/;
  function portKeluar(n) {
    const J = JENIS[n.jenis];
    if (J.keluar === 'dinamis') return (n.cfg.rute || []).map((r, i) => ['r' + i, 'pesan']).concat([['lain', 'pesan']]);
    return J.keluar || [];
  }
  const portMasuk = n => JENIS[n.jenis].masuk || [];
  function bersihCfg(jenis, c) {
    const d = JSON.parse(JSON.stringify(JENIS[jenis].cfg || {})), x = Object.assign(d, c && typeof c === 'object' ? c : {});
    for (const k of Object.keys(x)) {
      if (typeof x[k] === 'string') x[k] = teks(x[k], k === 'persona' || k === 'pesan' ? 200 : 60);
      else if (typeof x[k] === 'number') x[k] = Number.isFinite(x[k]) ? Math.max(-1000, Math.min(100000, x[k])) : 0;
      else if (typeof x[k] === 'boolean') { /* ok */ }
      else if (k === 'rute' && Array.isArray(x[k])) x[k] = x[k].slice(0, 6).map(r => ({ nama: teks(r && r.nama, 16) || 'rute', kata: (Array.isArray(r && r.kata) ? r.kata : []).slice(0, 12).map(w => teks(w, 24).toLowerCase()).filter(Boolean), contoh: (Array.isArray(r && r.contoh) ? r.contoh : []).slice(0, 8).map(w => teks(w, 80).toLowerCase()).filter(Boolean) }));
      else if (k === 'dokumen' && Array.isArray(x[k])) x[k] = x[k].slice(0, 16).map((d2, i) => ({ id: 'd' + i, judul: teks(d2 && d2.judul, 50) || 'Dokumen', teks: teks(d2 && d2.teks, 400) }));
      else delete x[k];
    }
    if (/token|apikey|api_key|kunci_api|password/i.test(JSON.stringify(x))) for (const k of Object.keys(x)) if (/token|apikey|api_key|password/i.test(k)) delete x[k];
    return x;
  }
  function periksaGraf(def) {
    const G = [];
    if (!def || typeof def !== 'object' || Array.isArray(def)) return { ok: false, galat: ['Graf harus berupa objek JSON.'], graf: null };
    const H = { versi: VERSI, nama: teks(def.nama, 40) || 'Papan otak', blok: [], kabel: [] };
    for (const n of (Array.isArray(def.blok) ? def.blok : []).slice(0, 40)) {
      if (!n || !OK_ID.test(String(n.id))) { G.push(`Blok "${teks(n && n.id, 20)}": id huruf kecil, angka, garis bawah.`); continue; }
      if (!JENIS[n.jenis]) { G.push(`Blok ${n.id}: jenis "${teks(n.jenis, 20)}" tidak dikenal.`); continue; }
      if (H.blok.some(b => b.id === n.id)) { G.push(`Blok ${n.id} ganda.`); continue; }
      H.blok.push({ id: n.id, jenis: n.jenis, x: Math.max(0, Math.min(3000, +n.x || 0)), y: Math.max(0, Math.min(2000, +n.y || 0)), cfg: bersihCfg(n.jenis, n.cfg) });
    }
    if ((def.blok || []).length > 40) G.push('Maksimal 40 blok.');
    for (const e of (Array.isArray(def.kabel) ? def.kabel : []).slice(0, 80)) {
      const v = cekKabel(H, e);
      if (v) { G.push(v); continue; }
      if (H.kabel.some(k => k.dari === e.dari && k.port === e.port && k.ke === e.ke && k.portKe === e.portKe)) continue;
      H.kabel.push({ dari: e.dari, port: e.port, ke: e.ke, portKe: e.portKe });
    }
    const sk = siklus(H);
    if (sk) G.push(`Ada putaran pesan ${sk}. Pesan bisa berputar tanpa henti.`);
    return { ok: G.length === 0, galat: G, graf: H };
  }
  /* Validasi satu kabel; dipakai juga saat menyeret kabel di papan. */
  function cekKabel(H, e) {
    if (!e) return 'Kabel kosong.';
    const a = H.blok.find(b => b.id === e.dari), b = H.blok.find(x => x.id === e.ke);
    if (!a || !b) return 'Kabel menyambung blok yang tidak ada.';
    if (a === b) return 'Blok tidak bisa disambung ke dirinya sendiri.';
    const pk = portKeluar(a).find(p => p[0] === e.port), pm = portMasuk(b).find(p => p[0] === e.portKe);
    if (!pk) return `${JENIS[a.jenis].judul} tidak punya port keluar "${teks(e.port, 12)}".`;
    if (!pm) return `${JENIS[b.jenis].judul} tidak punya port masuk "${teks(e.portKe, 12)}".`;
    if (pk[1] !== pm[1]) return `Tipe tidak cocok: ${JENIS[a.jenis].judul} mengeluarkan "${pk[1]}", tetapi port ${JENIS[b.jenis].judul} menerima "${pm[1]}".`;
    return null;
  }
  function siklus(H) {
    const adj = {}; H.blok.forEach(b => { adj[b.id] = []; });
    H.kabel.filter(k => portMasuk(H.blok.find(b => b.id === k.ke)).find(p => p[0] === k.portKe)[1] === 'pesan').forEach(k => adj[k.dari].push(k.ke));
    const warna = {};
    const dfs = u => { warna[u] = 1; for (const v of adj[u]) { if (warna[v] === 1) return u + ' ke ' + v; if (!warna[v]) { const r = dfs(v); if (r) return r; } } warna[u] = 2; return null; };
    for (const b of H.blok) if (!warna[b.id]) { const r = dfs(b.id); if (r) return r; }
    return null;
  }

  /* ---------- saran (linter) untuk pembelajaran ---------- */
  function saran(H) {
    const s = [];
    const ag = H.blok.filter(b => b.jenis === 'agen');
    const ke = (id, port) => H.kabel.filter(k => k.ke === id && k.portKe === port);
    const dari = id => H.kabel.filter(k => k.dari === id);
    if (!H.blok.some(b => JENIS[b.jenis].kelompok === 'pemicu')) s.push({ tingkat: 'galat', teks: 'Belum ada pemicu. Mulai dengan blok Chat.' });
    for (const a of ag) {
      if (!ke(a.id, 'masuk').length && !ke(a.id, 'tugas').length) s.push({ tingkat: 'galat', teks: `${a.cfg.nama}: belum menerima pesan. Sambungkan pemicu ke port "masuk".` });
      if (!dari(a.id).length && !ke(a.id, 'tugas').length) s.push({ tingkat: 'galat', teks: `${a.cfg.nama}: jawabannya tidak dikirim ke mana pun. Sambungkan ke blok Balas.` });
      if (!ke(a.id, 'alat').length) s.push({ tingkat: 'info', teks: `${a.cfg.nama}: belum punya alat. Tanpa alat, agen hanya bisa mengobrol.` });
      if (ke(a.id, 'alat').some(k => H.blok.find(b => b.id === k.dari).jenis === 'alat_aktuator') && !ke(a.id, 'pengaman').length) s.push({ tingkat: 'peringatan', teks: `${a.cfg.nama}: mengendalikan perangkat tanpa Guard Aksi (mode rentan).` });
    }
    if (H.blok.some(b => b.jenis === 'rak' && b.cfg.tulis) && !H.blok.some(b => b.jenis === 'guard_masukan')) s.push({ tingkat: 'peringatan', teks: 'RAG bisa ditulis lewat chat, tetapi belum ada Guard Masukan. Siapa pun yang bisa mengirim pesan bisa mengubah pengetahuan agen.' });
    const pemicuLuar = H.blok.filter(b => b.jenis === 'telegram');
    for (const t of pemicuLuar) if (!dari(t.id).some(k => H.blok.find(b => b.id === k.ke).jenis === 'guard_masukan')) s.push({ tingkat: 'peringatan', teks: 'Pesan Telegram langsung masuk tanpa Guard Masukan. Orang asing bisa mencoba menipu agen.' });
    return s;
  }

  /* ---------- mesin eksekusi ----------
     ctx: { W, S, cfgModel, jejak(k, t, blokId), keluaran(jenis, teks, pesan), setuju(), kirimTelegram(), riwayat, anggaranLLM } */
  async function jalankan(H, pemicuId, pesan, ctx) {
    const hasil = { langkah: 0, keluaran: [], panggilanLLM: 0 };
    const batasLangkah = ctx.batasLangkah || 30;
    ctx.anggaranLLM = ctx.anggaranLLM || { n: 0, maks: ctx.maksLLM || 8 };
    const blok = id => H.blok.find(b => b.id === id);
    const keluarDari = (id, port) => H.kabel.filter(k => k.dari === id && k.port === port);
    const sambunganAgen = id => {
      const ke = port => H.kabel.filter(k => k.ke === id && k.portKe === port).map(k => blok(k.dari));
      const alat = {}; ke('alat').forEach(b => { alat[b.jenis] = b.cfg || {}; });
      const rak = [].concat(...ke('pengetahuan').map(b => (b.cfg.dokumen && b.cfg.dokumen.length ? b.cfg.dokumen : RAK[b.cfg.preset] || [])));
      const mem = ke('memori')[0], pg = ke('pengaman')[0];
      return { alat, rak, rakBlok: ke('pengetahuan'), memori: mem ? mem.cfg : null, pengaman: pg ? pg.cfg : null };
    };
    const jejak = (k, t, id) => ctx.jejak && ctx.jejak(k, t, id);
    async function kirim(id, port, msg) { for (const k of keluarDari(id, port)) await kunjungi(k.ke, msg, k); }
    async function kunjungi(id, msg, dariKabel) {
      if (++hasil.langkah > batasLangkah) { if (hasil.langkah === batasLangkah + 1) jejak('guard', `Batas ${batasLangkah} langkah per pesan tercapai. Eksekusi dihentikan.`, id); return; }
      const b = blok(id); if (!b) return;
      const J = JENIS[b.jenis];
      if (ctx.lewatKabel && dariKabel) ctx.lewatKabel(dariKabel, msg);
      jejak('blok', `${J.judul}${b.cfg && b.cfg.nama ? ' (' + b.cfg.nama + ')' : ''}`, id);
      if (b.jenis === 'guard_masukan') {
        const inj = b.cfg.regex !== false && root.Otak && root.Otak.adaInjeksi(msg.teks);
        if (inj) { jejak('guard', 'Guard Masukan: pola menipu agen terdeteksi. Pesan ditolak.', id); return kirim(id, 'tolak', Object.assign({}, msg, { teks: 'Maaf, pesan itu tidak bisa kuproses.', ditolak: true })); }
        if (b.cfg.model && ctx.cekGuardModel) {
          try { const g = await ctx.cekGuardModel(msg.teks, b.cfg.model); if (!g.aman) { jejak('guard', `Guard model ${b.cfg.model}: tidak aman (${g.kategori}).`, id); return kirim(id, 'tolak', Object.assign({}, msg, { teks: 'Maaf, aku tidak bisa membantu permintaan itu.', ditolak: true })); } jejak('pengaman', `Guard model: aman (${g.ms} ms).`, id); }
          catch (e) { jejak('pengaman', `Guard model tidak bisa dipakai (${potong(e.message, 60)}). Hanya regex.`, id); }
        }
        return kirim(id, 'lolos', msg);
      }
      if (b.jenis === 'penyamar') {
        const t = String(msg.teks).replace(/(\+62|0)8\d{7,12}/g, '[NOMOR HP]').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]').replace(/\b\d{16}\b/g, '[NIK]');
        if (t !== msg.teks) jejak('guard', 'Penyamar: data pribadi disamarkan sebelum diproses.', id);
        return kirim(id, 'keluar', Object.assign({}, msg, { teks: t }));
      }
      if (b.jenis === 'router') {
        const ruteL = b.cfg.rute || [];
        let pilih = -1, alasan = '';
        if (b.cfg.mode === 'semantik' && root.RouterSemantik) {
          const contoh = []; ruteL.forEach((r, i) => (r.contoh.length ? r.contoh : r.kata).forEach(t => contoh.push({ rute: 'r' + i, teks: t })));
          const h = contoh.length ? root.RouterSemantik.klasifikasiRingan(msg.teks, contoh) : null;
          if (h && h.skor >= 0.3) { pilih = +h.rute.slice(1); alasan = `semantik, mirip "${h.contoh}" (skor ${h.skor})`; }
        } else {
          const t = String(msg.teks).toLowerCase();
          pilih = ruteL.findIndex(r => r.kata.some(w => w && new RegExp('(^|\\W)' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(t)));
          if (pilih >= 0) alasan = 'kata kunci';
        }
        jejak('router', pilih >= 0 ? `Router memilih rute "${ruteL[pilih].nama}" (${alasan}).` : 'Router: tidak ada rute cocok, lewat jalur "lain".', id);
        return kirim(id, pilih >= 0 ? 'r' + pilih : 'lain', msg);
      }
      if (b.jenis === 'aturan') {
        const c = b.cfg, I = root.IoT;
        const sen = c.sensor && ctx.W.perangkat.find(p => p.id === c.sensor), akt = c.aktuator && ctx.W.perangkat.find(p => p.id === c.aktuator);
        if (!sen || !akt) { jejak('guard', 'Aturan belum lengkap: pilih sensor dan aktuator di inspektur.', id); return kirim(id, 'keluar', Object.assign({}, msg, { teks: 'Aturan belum lengkap.' })); }
        const r = I.bacaSensor(ctx.W, ctx.S, sen.id);
        const x = r.ok ? r.nilai[c.variabel] : NaN;
        if (!Number.isFinite(x)) { jejak('guard', `Aturan: ${sen.nama} tidak terbaca (${r.alasan || 'NaN'}). Tidak ada aksi.`, id); return kirim(id, 'keluar', Object.assign({}, msg, { teks: `${sen.nama} tidak terbaca, aturan tidak dijalankan.` })); }
        const kena = c.op === '<' ? x < c.nilai : x > c.nilai;
        const nyala = kena ? c.aksi !== 'mati' : (c.sebaliknya ? c.aksi === 'mati' : null);
        jejak('pikir', `Aturan: ${c.variabel} ${x} ${c.op} ${c.nilai}? ${kena ? 'ya' : 'tidak'}.`, id);
        let teksH = `${sen.nama}: ${c.variabel} ${x}. `;
        // guard aksi juga berlaku untuk aturan: batas aman diperiksa di kode, bukan diserahkan ke pembuat aturan
        const g = nyala ? A().cekGuardAksi(ctx.W, ctx.S, I.status(ctx.W, ctx.S), akt, true, null) : null;
        if (g) { jejak('guard', `Guard aksi menolak aturan: ${g}`, id); return kirim(id, 'keluar', Object.assign({}, msg, { teks: (teksH + `${akt.nama} tidak dinyalakan: ${g}`).trim() })); }
        if (nyala !== null) { const a = I.aturAktuator(ctx.W, ctx.S, akt.id, nyala); teksH += a.ok ? `${akt.nama} ${nyala ? 'dinyalakan' : 'dimatikan'}.` : `${akt.nama} gagal: ${a.alasan}.`; if (a.ok) (hasil.aksi = hasil.aksi || []).push({ perangkat: akt.id, nyala }); jejak('aksi', teksH, id); }
        return kirim(id, 'keluar', Object.assign({}, msg, { teks: teksH.trim() }));
      }
      if (b.jenis === 'agen') {
        const sb = sambunganAgen(id);
        const r = await A().jalankanAgen(b.cfg, msg, sb, Object.assign({}, ctx, { jejak: (k, t) => jejak(k, t, id) }));
        hasil.panggilanLLM += r.panggilan; (hasil.aksi = hasil.aksi || []).push(...r.aksi);
        jejak('balas', `${b.cfg.nama}: ${potong(r.balasan, 140)}`, id);
        const keluarMsg = Object.assign({}, msg, { teks: r.balasan, agen: b.cfg.nama, asal: r.asal });
        if (msg.untukOrkestrator) return keluarMsg;
        return kirim(id, 'keluar', keluarMsg);
      }
      if (b.jenis === 'orkestrator') {
        const pekerja = keluarDari(id, 'tugas').map(k => blok(k.ke)).filter(x => x && x.jenis === 'agen');
        if (!pekerja.length) { jejak('guard', 'Orkestrator belum punya agen pekerja. Sambungkan port "tugas" ke Agen.', id); return kirim(id, 'keluar', Object.assign({}, msg, { teks: 'Belum ada agen pekerja.' })); }
        const t = String(msg.teks).toLowerCase();
        const cocok = pekerja.filter(p => { const sb = sambunganAgen(p.id); const lk = [sb.alat.alat_sensor, sb.alat.alat_aktuator].filter(Boolean).map(c => c.lingkup).filter(l => l && l !== 'semua'); const kata = [String(p.cfg.nama).toLowerCase()].concat(...lk.map(l => l === 'rumah' ? ['rumah', 'kamar', 'tamu', 'dapur', 'gudang'] : (A().KATA_AREA[((ctx.W.area.find(a => a.id === l) || {}).tipe) || l] || [l]))); return kata.some(w => w && t.includes(w.replace(/^agen\s+/, ''))); });
        let dipilih = b.cfg.mode === 'semua' || !cocok.length ? pekerja : cocok;
        // perintah menulis RAG cukup dikerjakan satu agen, supaya catatan tidak tertulis berkali-kali
        if (A().perintahRAG(msg.teks)) { const rakTulis = p => sambunganAgen(p.id).rakBlok.some(r => r && r.cfg.tulis); dipilih = [dipilih.find(rakTulis) || pekerja.find(rakTulis) || dipilih[0]]; }
        jejak('delegasi', `Orkestrator membagi tugas ke: ${dipilih.map(p => p.cfg.nama).join(', ')} (${b.cfg.mode === 'semua' ? 'semua' : cocok.length ? 'sesuai wilayah' : 'tidak ada yang cocok, semua dilibatkan'}).`, id);
        const jawab = [];
        for (const p of dipilih) { const r = await kunjungi(p.id, Object.assign({}, msg, { untukOrkestrator: true }), { dari: id, port: 'tugas', ke: p.id, portKe: 'tugas' }); if (r && r.teks) jawab.push(`${r.agen}: ${r.teks}`); }
        return kirim(id, 'keluar', Object.assign({}, msg, { teks: jawab.join('\n') || 'Tidak ada jawaban.', untukOrkestrator: false }));
      }
      if (J.kelompok === 'keluaran') {
        hasil.keluaran.push({ jenis: b.jenis, teks: msg.teks, pesan: msg, blok: id });
        if (ctx.keluaran) await ctx.keluaran(b.jenis, msg.teks, msg);
        return;
      }
      if (J.kelompok === 'pemicu') return kirim(id, 'keluar', msg);
    }
    jejak('terima', `Pesan dari ${pesan.sumber || 'chat'}: "${potong(pesan.teks, 80)}"`, pemicuId);
    await kunjungi(pemicuId, pesan, null);
    if (!hasil.keluaran.length) jejak('guard', 'Pesan selesai tanpa keluaran. Apakah blok Balas sudah tersambung?', pemicuId);
    return hasil;
  }

  /* ---------- graf preset (titik awal belajar) ---------- */
  const b = (id, jenis, x, y, cfg) => ({ id, jenis, x, y, cfg: cfg || {} });
  const k = (dari, port, ke, portKe) => ({ dari, port, ke, portKe });
  const GRAF_PRESET = {
    kosong: { nama: 'Kanvas kosong', blok: [], kabel: [] },
    chatbot: { nama: 'Chatbot pertama', blok: [b('chat', 'chat', 40, 120), b('agen', 'agen', 280, 100), b('balas', 'balas', 560, 120)], kabel: [k('chat', 'keluar', 'agen', 'masuk'), k('agen', 'keluar', 'balas', 'masuk')] },
    agen_rumah: {
      nama: 'Agen rumah lengkap',
      blok: [b('chat', 'chat', 20, 40), b('guard', 'guard_masukan', 230, 40), b('agen', 'agen', 480, 40, { nama: 'Agen Rumah' }), b('balas', 'balas', 720, 40), b('tolak', 'balas', 720, 200),
        b('sensor', 'alat_sensor', 230, 200), b('aktuator', 'alat_aktuator', 230, 300), b('pengaman', 'guard_aksi', 230, 400), b('rak', 'rak', 20, 260, { preset: 'rumah' }), b('memori', 'memori', 20, 360)],
      kabel: [k('chat', 'keluar', 'guard', 'masuk'), k('guard', 'lolos', 'agen', 'masuk'), k('guard', 'tolak', 'tolak', 'masuk'), k('agen', 'keluar', 'balas', 'masuk'),
        k('sensor', 'keluar', 'agen', 'alat'), k('aktuator', 'keluar', 'agen', 'alat'), k('rak', 'keluar', 'agen', 'pengetahuan'), k('memori', 'keluar', 'agen', 'memori'), k('pengaman', 'keluar', 'agen', 'pengaman')]
    },
    multi_agen: {
      nama: 'Multi-agen: rumah, kebun, kandang',
      blok: [b('chat', 'chat', 20, 60), b('guard', 'guard_masukan', 230, 60), b('ork', 'orkestrator', 460, 60), b('balas', 'balas', 460, 260), b('tolak', 'balas', 230, 260),
        b('s_kebun', 'alat_sensor', 700, 0, { lingkup: 'kebun' }), b('x_kebun', 'alat_aktuator', 700, 95, { lingkup: 'kebun' }), b('rk_kebun', 'rak', 700, 190, { preset: 'kebun' }),
        b('s_kandang', 'alat_sensor', 700, 320, { lingkup: 'kandang' }), b('x_kandang', 'alat_aktuator', 700, 415, { lingkup: 'kandang' }), b('rk_ternak', 'rak', 700, 510, { preset: 'ternak' }), b('pg', 'guard_aksi', 460, 420),
        b('s_rumah', 'alat_sensor', 700, 640, { lingkup: 'rumah' }), b('x_rumah', 'alat_aktuator', 700, 735, { lingkup: 'rumah' }), b('rk_rumah', 'rak', 700, 830, { preset: 'rumah' }),
        b('a_kebun', 'agen', 940, 20, { nama: 'Agen Kebun', persona: 'petani hidroponik yang teliti' }), b('a_kandang', 'agen', 940, 330, { nama: 'Agen Kandang', persona: 'peternak ayam yang sabar' }), b('a_rumah', 'agen', 940, 640, { nama: 'Agen Rumah', persona: 'pengurus rumah yang hemat listrik' })],
      kabel: [k('chat', 'keluar', 'guard', 'masuk'), k('guard', 'lolos', 'ork', 'masuk'), k('guard', 'tolak', 'tolak', 'masuk'), k('ork', 'keluar', 'balas', 'masuk'), k('ork', 'tugas', 'a_kebun', 'tugas'), k('ork', 'tugas', 'a_kandang', 'tugas'),
        k('s_kebun', 'keluar', 'a_kebun', 'alat'), k('x_kebun', 'keluar', 'a_kebun', 'alat'), k('rk_kebun', 'keluar', 'a_kebun', 'pengetahuan'), k('s_kandang', 'keluar', 'a_kandang', 'alat'), k('x_kandang', 'keluar', 'a_kandang', 'alat'), k('rk_ternak', 'keluar', 'a_kandang', 'pengetahuan'),
        k('pg', 'keluar', 'a_kebun', 'pengaman'), k('pg', 'keluar', 'a_kandang', 'pengaman'), k('pg', 'keluar', 'a_rumah', 'pengaman'),
        k('ork', 'tugas', 'a_rumah', 'tugas'), k('s_rumah', 'keluar', 'a_rumah', 'alat'), k('x_rumah', 'keluar', 'a_rumah', 'alat'), k('rk_rumah', 'keluar', 'a_rumah', 'pengetahuan')]
    }
  };

  const api = { VERSI, JENIS, KELOMPOK, RAK, GRAF_PRESET, periksaGraf, cekKabel, portKeluar, portMasuk, saran, jalankan, bersihCfg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Graf = api;
})(typeof window !== 'undefined' ? window : globalThis);
