/* Dunia: semua ruang didefinisikan sebagai DATA (objek JSON), bukan kode.
   Otak (brain.js), prompt LLM (prompt.js), dan adegan 3D (adegan.js) membaca definisi yang sama.
   Mau menambah ruang, perangkat, kata gaul, atau misi? Cukup ubah datanya (lihat PANDUAN.md, bagian "Membuat ruang sendiri").

   Empat TIPE perangkat (keadaan dan aksinya tetap, supaya guard di kode bisa memeriksa semuanya):
     saklar : {on}                 aksi on / off
     level  : {on, speed}          aksi on (speed 1 sampai maks) / off
     buka   : {open}               aksi open / close
     mesin  : {on, speed, angle}   aksi on (speed dalam persen, angle dalam derajat) / off, dijaga batasDaya dan batasSudut */
(function (root) {
  'use strict';
  const MAN = root.Manual || (typeof require === 'function' ? require('./manual.js') : null);

  const TIPE = {
    saklar: { ops: ['on', 'off'], awal: () => ({ on: false }) },
    level: { ops: ['on', 'off'], awal: d => ({ on: false, speed: Math.min(2, d.maks) }) },
    buka: { ops: ['open', 'close'], awal: () => ({ open: false }) },
    mesin: { ops: ['on', 'off'], awal: () => ({ on: false, speed: 30, angle: 60 }) }
  };
  /* Bentuk 3D yang tersedia per tipe. Bentuk lain digambar sebagai kotak berlabel. */
  const BENTUK = {
    saklar: ['lampu_berdiri', 'lampu_gantung', 'ring_light', 'tanda'],
    level: ['kipas', 'ac', 'speaker'],
    buka: ['pintu', 'tirai'],
    mesin: ['lengan', 'mesin_kopi', 'kamera']
  };

  const RUANG = {
    lab: {
      id: 'lab', nama: 'Lab Robotika', deskripsi: 'Ruang praktikum dengan lengan robot. Tempat belajar dasar agen.',
      tema: { lantai: 'ubin', dinding: '#eef1f6', aksen: '#2f5bff' },
      ambien: { suhu: 31, cahaya: 20 },
      perangkat: {
        lampu: { tipe: 'saklar', nama: 'Lampu', kata: ['lampu', 'lamp', 'penerangan'], spesialis: 'Cahaya', peran: 'cahaya', bentuk: 'lampu_berdiri', efek: { cahaya: 380 } },
        kipas: { tipe: 'level', nama: 'Kipas', kata: ['kipas', 'angin', 'fan'], spesialis: 'Suhu', peran: 'dingin', bentuk: 'kipas', maks: 3, efek: { suhu: -2.2 } },
        pintu: { tipe: 'buka', nama: 'Pintu', kata: ['pintu'], spesialis: 'Keamanan', peran: 'udara', bentuk: 'pintu', efek: { suhu: -1.5, cahaya: 60 } },
        lengan: { tipe: 'mesin', nama: 'Lengan robot', kata: ['lengan', 'robot', 'arm'], spesialis: 'Keamanan', bentuk: 'lengan', batasDaya: 50, batasSudut: 90, satuan: 'kecepatan' }
      },
      interlock: [{ larang: 'pintu', saat: 'lengan', pesan: 'Interlock keselamatan: pintu tidak boleh dibuka saat lengan robot aktif.', saran: 'Matikan lengan dulu, baru pintu boleh dibuka.' }],
      manual: MAN ? MAN.MANUAL_AWAL : [],
      contoh: ['nyalakan lampu dan kipas', 'gerah nih', 'bikin nyaman', 'berapa suhu nyaman?', 'putar lengan robot 200%', 'buka pintu setelah matikan lengan', 'ingat ya, suhu nyaman 27 sampai 29 C'],
      misiBawaan: true
    },

    kafe: {
      id: 'kafe', nama: 'Kafe Senja', deskripsi: 'Kafe tempat nugas. Agen jadi barista sekaligus penjaga vibes.',
      tema: { lantai: 'kayu', dinding: '#f3e9dc', aksen: '#c8703a' },
      ambien: { suhu: 30, cahaya: 30 },
      perangkat: {
        lampu: { tipe: 'saklar', nama: 'Lampu gantung', kata: ['lampu', 'lampu gantung'], spesialis: 'Cahaya', peran: 'cahaya', bentuk: 'lampu_gantung', efek: { cahaya: 260 } },
        ac: { tipe: 'level', nama: 'AC', kata: ['ac', 'pendingin'], spesialis: 'Suhu', peran: 'dingin', bentuk: 'ac', maks: 3, efek: { suhu: -2.5 } },
        speaker: { tipe: 'level', nama: 'Speaker', kata: ['speaker', 'musik', 'lagu', 'playlist'], spesialis: 'Vibes', bentuk: 'speaker', maks: 4 },
        pintu: { tipe: 'buka', nama: 'Pintu kafe', kata: ['pintu', 'kafe'], spesialis: 'Barista', peran: 'udara', bentuk: 'pintu', efek: { suhu: -1, cahaya: 80 } },
        espresso: { tipe: 'mesin', nama: 'Mesin espresso', kata: ['espresso', 'mesin kopi', 'kopi'], spesialis: 'Barista', bentuk: 'mesin_kopi', batasDaya: 70, satuan: 'daya' }
      },
      interlock: [],
      alias: { 'seduh kopi': 'nyalakan espresso', 'seduh': 'nyalakan espresso', 'bikinin kopi': 'nyalakan espresso', 'setel': 'nyalakan', 'volume': 'level' },
      keluhan: [
        { kata: ['sepi', 'gabut', 'boring', 'hening'], alasan: 'suasana butuh musik', aksi: [{ device: 'speaker', op: 'on', speed: 2 }] },
        { kata: ['ngantuk', 'lemes'], alasan: 'butuh kopi dan cahaya', aksi: [{ device: 'espresso', op: 'on', speed: 60 }, { device: 'lampu', op: 'on' }] },
        { kata: ['berisik', 'bising'], alasan: 'musik terlalu keras', aksi: [{ device: 'speaker', op: 'off' }] }
      ],
      kataManual: ['resep', 'menu', 'wifi', 'sandi', 'diskon', 'promo', 'happy hour'],
      manual: [
        { id: 'suhu', judul: 'Suhu nyaman', teks: 'Suhu nyaman kafe adalah 23 sampai 25 C supaya pelanggan betah nugas. Jika lebih panas, nyalakan AC.' },
        { id: 'cahaya', judul: 'Cahaya hangat', teks: 'Cahaya hangat minimal 150 lux. Jika kurang dari itu, nyalakan lampu gantung.' },
        { id: 'resep', judul: 'Resep kopi susu gula aren', teks: 'Resep kopi susu gula aren: 2 shot espresso, 150 ml susu segar, 20 ml gula aren, dan es batu. Mesin espresso cukup di daya 60 persen.' },
        { id: 'espresso', judul: 'Batas mesin espresso', teks: 'Mesin espresso maksimal daya 70 persen. Di atas itu tekanan terlalu tinggi dan kopi jadi pahit gosong.' },
        { id: 'musik', judul: 'Playlist dan volume', teks: 'Playlist sore berisi lo-fi dan indie folk di volume 2. Volume speaker maksimal 4 supaya obrolan tetap terdengar.' },
        { id: 'jam', judul: 'Jam buka dan happy hour', teks: 'Kafe buka pukul 10.00 sampai 22.00. Happy hour pukul 15.00 sampai 17.00, diskon 20 persen untuk semua kopi susu.' },
        { id: 'wifi', judul: 'Wifi pelanggan', teks: 'Wifi pelanggan bernama KafeSenja. Kata sandi tertulis di struk dan berlaku 3 jam per struk.' }
      ],
      contoh: ['buka kafe dan nyalakan lampu', 'sepi banget nih', 'seduh kopi', 'seduh kopi 90%', 'resep kopi susu gula aren apa?', 'happy hour jam berapa?', 'bikin nyaman'],
      misi: [
        { judul: 'Buka Kafe', base: 100, badge: 'barista', brief: 'Pelanggan pertama sudah antre. Nyalakan lampu gantung dan buka pintu kafe.',
          hints: ['Sebut dua perangkat dalam satu pesan.', 'Contoh: "nyalakan lampu dan buka pintu".'],
          target: { perangkat: { lampu: { on: true }, pintu: { open: true } } } },
        { judul: 'Vibes Sore', base: 150, brief: 'Kafe terasa sepi dan panas. Hidupkan musik lewat keluhan (bukan nama perangkat) dan turunkan suhu sampai 26 C atau kurang.',
          hints: ['Agen kafe paham kata gaul seperti "sepi" dan "gabut".', 'Untuk suhu, coba "gerah" atau "bikin nyaman".'],
          target: { perangkat: { speaker: { on: true } }, suhuMaks: 26 } },
        { judul: 'Barista Aman', base: 200, brief: 'Seduh kopi dengan daya yang aman, lalu buktikan guard menolak daya berlebih.',
          hints: ['Batas mesin espresso ada di rak manual: tanya "batas mesin espresso berapa?".', 'Coba "seduh kopi 90%" lalu "seduh kopi 60%".'],
          target: { perangkat: { espresso: { on: true } }, tolakMin: 1 } },
        { judul: 'Menu Rahasia', base: 250, brief: 'Tanyakan resep ke agen (jawabannya dari rak manual), lalu titipkan satu catatan baru dengan kata "ingat".',
          hints: ['Tanya: "resep kopi susu gula aren apa?"', 'Titip memori: "ingat ya, pelanggan meja 3 alergi susu".'],
          target: { ambil: 'resep', memoriMin: 1 } }
      ]
    },

    studio: {
      id: 'studio', nama: 'Studio Konten', deskripsi: 'Studio live streaming. Sekali ON AIR, pintu tidak boleh dibuka.',
      tema: { lantai: 'beton', dinding: '#e4e2ee', aksen: '#8a4bff' },
      ambien: { suhu: 29, cahaya: 25 },
      perangkat: {
        ringlight: { tipe: 'saklar', nama: 'Ring light', kata: ['ring light', 'ringlight', 'lampu'], spesialis: 'Cahaya', peran: 'cahaya', bentuk: 'ring_light', efek: { cahaya: 420 } },
        ac: { tipe: 'level', nama: 'AC', kata: ['ac', 'pendingin'], spesialis: 'Suhu', peran: 'dingin', bentuk: 'ac', maks: 3, efek: { suhu: -2.4 } },
        pintu: { tipe: 'buka', nama: 'Pintu studio', kata: ['pintu'], spesialis: 'Keamanan', peran: 'udara', bentuk: 'pintu', efek: { suhu: -1, cahaya: 40 } },
        onair: { tipe: 'saklar', nama: 'Tanda ON AIR', kata: ['on air', 'onair', 'siaran', 'live'], spesialis: 'Siaran', bentuk: 'tanda' },
        kamera: { tipe: 'mesin', nama: 'Gimbal kamera', kata: ['kamera', 'gimbal', 'cam'], spesialis: 'Siaran', bentuk: 'kamera', batasDaya: 40, batasSudut: 120, satuan: 'kecepatan' }
      },
      interlock: [{ larang: 'pintu', saat: 'onair', pesan: 'Pintu studio tidak boleh dibuka saat ON AIR, suara luar bocor ke siaran.', saran: 'Matikan tanda ON AIR dulu.' }],
      alias: { 'go live': 'nyalakan onair', 'mulai siaran': 'nyalakan onair', 'stop siaran': 'matikan onair' },
      keluhan: [
        { kata: ['burik', 'kusam', 'pecah'], alasan: 'gambar butuh cahaya', aksi: [{ device: 'ringlight', op: 'on' }] },
        { kata: ['shaky', 'goyang'], alasan: 'kamera perlu digerakkan pelan dan stabil', aksi: [{ device: 'kamera', op: 'on', speed: 20, angle: 60 }] }
      ],
      kataManual: ['hook', 'durasi', 'konten', 'unggah', 'upload', 'sesi'],
      manual: [
        { id: 'suhu', judul: 'Suhu nyaman', teks: 'Suhu nyaman studio adalah 22 sampai 24 C supaya talent tidak berkeringat di depan kamera.' },
        { id: 'cahaya', judul: 'Cahaya wajah', teks: 'Cahaya wajah minimal 300 lux. Jika kurang dari itu, nyalakan ring light.' },
        { id: 'siaran', judul: 'Urutan sebelum live', teks: 'Sebelum live: tutup pintu, nyalakan ring light, baru nyalakan tanda ON AIR. Selama ON AIR pintu tidak boleh dibuka.' },
        { id: 'kamera', judul: 'Batas gimbal kamera', teks: 'Gimbal kamera maksimal 40 persen kecepatan dan sudut 120 derajat supaya gambar tidak bikin pusing.' },
        { id: 'konten', judul: 'Resep konten pendek', teks: 'Hook video ada di 3 detik pertama. Durasi konten pendek yang disarankan 30 sampai 45 detik. Jam unggah terbaik pukul 19.00.' },
        { id: 'jadwal', judul: 'Jadwal studio', teks: 'Studio bisa dipesan pukul 09.00 sampai 21.00. Satu sesi berdurasi 2 jam.' }
      ],
      contoh: ['nyalakan ring light dan ac', 'go live', 'buka pintu', 'gambarnya burik', 'putar kamera 30% sudut 90', 'durasi konten berapa?', 'buka pintu setelah matikan on air'],
      misi: [
        { judul: 'Siap Live', base: 100, badge: 'kreator', brief: 'Talent sudah datang. Nyalakan ring light dan AC dengan satu pesan supaya dua spesialis bekerja bersamaan.',
          hints: ['Dua perangkat milik dua spesialis berbeda dikerjakan paralel.', 'Contoh: "nyalakan ring light dan ac".'],
          target: { perangkat: { ringlight: { on: true }, ac: { on: true } }, paralelMin: 2 } },
        { judul: 'On Air', base: 200, brief: 'Mulai siaran, lalu buktikan interlock: selama ON AIR pintu tidak boleh terbuka.',
          hints: ['Coba "go live", lalu "buka pintu".', 'Baca alasan penolakannya di tab Jejak (tag GUARD).'],
          target: { perangkat: { onair: { on: true }, pintu: { open: false } }, tolakMin: 1 } },
        { judul: 'Bidikan Sinematik', base: 250, brief: 'Tanyakan batas gimbal ke agen, lalu jalankan gimbal di dalam batas itu.',
          hints: ['Tanya: "batas gimbal kamera berapa?"', 'Lalu: "putar kamera 30% sudut 90".'],
          target: { perangkat: { kamera: { on: true } }, ambil: 'kamera' } },
        { judul: 'Tutup Studio', base: 250, brief: 'Siaran selesai. Dalam satu pesan berurutan: matikan ON AIR dulu, baru buka pintu.',
          hints: ['Kata "setelah" atau "lalu" membuat agen bekerja bertahap.', 'Contoh: "buka pintu setelah matikan on air".'],
          awal: { onair: { on: true } },
          target: { perangkat: { onair: { on: false }, pintu: { open: true } }, tahapMin: 2 } }
      ]
    }
  };

  /* Titik awal untuk ruang buatan sendiri. */
  const TEMPLAT = {
    id: 'kos', nama: 'Kamar Kos', deskripsi: 'Ruang buatanku. Ubah sesukamu.',
    tema: { lantai: 'kayu', dinding: '#eef0e6', aksen: '#1fb67f' },
    ambien: { suhu: 30, cahaya: 15 },
    perangkat: {
      lampu: { tipe: 'saklar', nama: 'Lampu', kata: ['lampu'], spesialis: 'Cahaya', peran: 'cahaya', bentuk: 'lampu_berdiri', efek: { cahaya: 300 } },
      kipas: { tipe: 'level', nama: 'Kipas', kata: ['kipas', 'angin'], spesialis: 'Suhu', peran: 'dingin', bentuk: 'kipas', maks: 3, efek: { suhu: -2 } },
      pintu: { tipe: 'buka', nama: 'Pintu', kata: ['pintu'], spesialis: 'Suhu', peran: 'udara', bentuk: 'pintu', efek: { suhu: -1, cahaya: 50 } },
      speaker: { tipe: 'level', nama: 'Speaker', kata: ['speaker', 'musik', 'lagu'], spesialis: 'Vibes', bentuk: 'speaker', maks: 5 }
    },
    interlock: [],
    alias: { 'setel': 'nyalakan' },
    keluhan: [{ kata: ['gabut', 'sepi'], alasan: 'butuh hiburan', aksi: [{ device: 'speaker', op: 'on', speed: 2 }] }],
    kataManual: ['kos', 'bayar', 'tamu'],
    manual: [
      { id: 'suhu', judul: 'Suhu nyaman', teks: 'Suhu nyaman kamar adalah 25 sampai 27 C.' },
      { id: 'cahaya', judul: 'Cahaya belajar', teks: 'Cahaya untuk belajar minimal 200 lux.' },
      { id: 'kos', judul: 'Aturan kos', teks: 'Tamu boleh berkunjung sampai pukul 21.00. Bayar kos paling lambat tanggal 5.' }
    ],
    contoh: ['nyalakan lampu', 'gabut nih', 'bikin nyaman', 'tamu boleh sampai jam berapa?'],
    misi: [
      { judul: 'Mode Nugas', base: 100, brief: 'Siapkan kamar untuk belajar: lampu menyala dan suhu 27 C atau kurang.', hints: ['Coba "bikin nyaman".'],
        target: { perangkat: { lampu: { on: true } }, suhuMaks: 27 } }
    ]
  };

  /* ---------- pemeriksa definisi ruang: pesan galat ramah, hasilnya dinormalkan ---------- */
  const punya = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const OK_ID = /^[a-z][a-z0-9_]{1,15}$/;
  const OK_KATA = /^[a-z0-9 ]{2,24}$/;
  const TERLARANG = ['suhu', 'cahaya', 'constructor', 'prototype'];
  const teks = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const bil = (v, a, b, d) => { const x = Number(v); return Number.isFinite(x) ? Math.max(a, Math.min(b, x)) : d; };
  const warna = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(String(v)) ? String(v) : d);

  function periksaAksi(a, P, di, G) {
    if (!a || typeof a !== 'object' || !punya(P, a.device)) { G.push(`${di}: perangkat "${teks(a && a.device, 20)}" tidak ada di ruang ini.`); return null; }
    const d = P[a.device];
    if (!TIPE[d.tipe].ops.includes(a.op)) { G.push(`${di}: aksi "${teks(a.op, 10)}" tidak cocok untuk ${a.device} (tipe ${d.tipe}: ${TIPE[d.tipe].ops.join(' atau ')}).`); return null; }
    const x = { device: a.device, op: a.op };
    if (d.tipe === 'level' && a.op === 'on') x.speed = bil(a.speed, 1, 99, Math.min(2, d.maks));
    if (d.tipe === 'mesin' && a.op === 'on') { x.speed = bil(a.speed, 1, 999, 30); x.angle = bil(a.angle, 0, 999, 60); }
    return x;
  }

  function periksa(def) {
    const G = [];
    if (!def || typeof def !== 'object' || Array.isArray(def)) return { ok: false, galat: ['Definisi ruang harus berupa objek JSON.'], ruang: null };
    const R = { id: String(def.id || ''), nama: teks(def.nama, 30), deskripsi: teks(def.deskripsi, 120) };
    if (!OK_ID.test(R.id)) G.push('"id" ruang: 2 sampai 16 huruf kecil, angka, atau garis bawah, diawali huruf.');
    if (!R.nama) G.push('"nama" ruang wajib diisi.');
    const t = def.tema || {};
    R.tema = { lantai: ['ubin', 'kayu', 'beton'].includes(t.lantai) ? t.lantai : 'ubin', dinding: warna(t.dinding, '#eef1f6'), aksen: warna(t.aksen, '#2f5bff') };
    const am = def.ambien || {};
    R.ambien = { suhu: bil(am.suhu, 15, 40, 30), cahaya: bil(am.cahaya, 0, 300, 20) };

    R.perangkat = {};
    const src = def.perangkat && typeof def.perangkat === 'object' ? def.perangkat : {};
    const ids = Object.keys(src);
    if (!ids.length) G.push('Ruang butuh minimal 1 perangkat di "perangkat".');
    if (ids.length > 6) G.push('Maksimal 6 perangkat per ruang.');
    const peranTerpakai = {};
    for (const id of ids.slice(0, 6)) {
      const s = src[id] || {}, di = `Perangkat "${teks(id, 20)}"`;
      if (!OK_ID.test(id) || TERLARANG.includes(id)) { G.push(`${di}: id tidak sah (huruf kecil, angka, garis bawah, dan bukan "suhu" atau "cahaya").`); continue; }
      if (!punya(TIPE, s.tipe)) { G.push(`${di}: "tipe" harus salah satu dari ${Object.keys(TIPE).join(', ')}.`); continue; }
      const d = { tipe: s.tipe, nama: teks(s.nama, 24) || id, spesialis: teks(s.spesialis, 12).replace(/[^A-Za-z0-9 ]/g, '') || 'Umum' };
      d.kata = (Array.isArray(s.kata) ? s.kata : []).map(k => String(k).toLowerCase().trim()).filter(k => OK_KATA.test(k)).slice(0, 8);
      if (!d.kata.length) { G.push(`${di}: "kata" butuh minimal 1 kata pengenal (huruf kecil, angka, spasi).`); continue; }
      d.bentuk = BENTUK[d.tipe].includes(s.bentuk) ? s.bentuk : 'kotak';
      if (s.bentuk && d.bentuk === 'kotak' && s.bentuk !== 'kotak') G.push(`${di}: bentuk "${teks(s.bentuk, 20)}" tidak tersedia untuk tipe ${d.tipe}. Pilihan: ${BENTUK[d.tipe].join(', ')}, atau kotak.`);
      if (['cahaya', 'dingin', 'udara'].includes(s.peran)) {
        const cocok = (s.peran === 'udara') === (d.tipe === 'buka') && d.tipe !== 'mesin';
        if (!cocok) G.push(`${di}: peran "${s.peran}" tidak cocok untuk tipe ${d.tipe} (udara untuk tipe buka; cahaya dan dingin untuk saklar atau level).`);
        else if (peranTerpakai[s.peran]) G.push(`${di}: peran "${s.peran}" sudah dipakai ${peranTerpakai[s.peran]}.`);
        else { d.peran = s.peran; peranTerpakai[s.peran] = id; }
      }
      const e = s.efek || {};
      d.efek = { suhu: bil(e.suhu, -6, 6, 0), cahaya: bil(e.cahaya, -500, 500, 0) };
      if (d.tipe === 'level') d.maks = Math.round(bil(s.maks, 1, 9, 3));
      if (d.tipe === 'mesin') {
        d.batasDaya = Math.round(bil(s.batasDaya, 1, 100, 50));
        if (s.batasSudut != null) d.batasSudut = Math.round(bil(s.batasSudut, 1, 360, 90));
        d.satuan = s.satuan === 'daya' ? 'daya' : 'kecepatan';
      }
      R.perangkat[id] = d;
    }
    const P = R.perangkat;
    const spes = [...new Set(Object.keys(P).map(id => P[id].spesialis))];
    if (spes.length > 4) G.push(`Maksimal 4 spesialis per ruang, sekarang ada ${spes.length}: ${spes.join(', ')}.`);

    R.interlock = [];
    for (const il of Array.isArray(def.interlock) ? def.interlock.slice(0, 6) : []) {
      if (!il || !punya(P, il.larang) || !punya(P, il.saat) || il.larang === il.saat) { G.push('Interlock: "larang" dan "saat" harus dua perangkat berbeda yang ada di ruang ini.'); continue; }
      R.interlock.push({ larang: il.larang, saat: il.saat, pesan: teks(il.pesan, 160) || `Interlock: ${P[il.larang].nama} tidak boleh dibuka atau dinyalakan saat ${P[il.saat].nama} aktif.`, saran: teks(il.saran, 120) });
    }

    R.alias = {};
    const al = def.alias && typeof def.alias === 'object' ? def.alias : {};
    for (const k of Object.keys(al).slice(0, 20)) {
      const a = String(k).toLowerCase().trim(), b = String(al[k]).toLowerCase().trim();
      if (OK_KATA.test(a) && /^[a-z0-9 %]{2,40}$/.test(b)) R.alias[a] = b; else G.push(`Alias "${teks(k, 20)}": pakai huruf kecil, angka, dan spasi saja.`);
    }

    R.keluhan = [];
    (Array.isArray(def.keluhan) ? def.keluhan.slice(0, 12) : []).forEach((k, i) => {
      const di = `Kata gaul ke-${i + 1}`;
      const kata = (Array.isArray(k && k.kata) ? k.kata : []).map(x => String(x).toLowerCase().trim()).filter(x => OK_KATA.test(x)).slice(0, 8);
      if (!kata.length) { G.push(`${di}: "kata" butuh minimal 1 kata.`); return; }
      const aksi = (Array.isArray(k.aksi) ? k.aksi.slice(0, 4) : []).map(a => periksaAksi(a, P, di, G)).filter(Boolean);
      if (aksi.length) R.keluhan.push({ kata, alasan: teks(k.alasan, 80) || 'kata gaul buatan', aksi });
    });

    R.kataManual = (Array.isArray(def.kataManual) ? def.kataManual : []).map(x => String(x).toLowerCase().trim()).filter(x => OK_KATA.test(x)).slice(0, 16);
    R.manual = (Array.isArray(def.manual) ? def.manual.slice(0, 16) : []).map((m, i) => ({ id: OK_ID.test(String(m && m.id)) ? String(m.id) : 'bab' + (i + 1), judul: teks(m && m.judul, 60) || 'Tanpa judul', teks: teks(m && m.teks, 300), koleksi: teks(m && m.koleksi, 16).toLowerCase().replace(/[^a-z0-9_]/g, '') })).filter(m => m.teks);
    R.contoh = (Array.isArray(def.contoh) ? def.contoh.slice(0, 8) : []).map(c => teks(c, 60)).filter(Boolean);
    R.misiBawaan = def.misiBawaan === true && R.id === 'lab';

    R.misi = [];
    (Array.isArray(def.misi) ? def.misi.slice(0, 8) : []).forEach((m, i) => {
      const di = `Misi ke-${i + 1}`, tg = (m && m.target) || {}, T = {};
      if (!m || !teks(m.judul, 40)) { G.push(`${di}: "judul" wajib diisi.`); return; }
      if (tg.perangkat && typeof tg.perangkat === 'object') {
        T.perangkat = {};
        for (const id of Object.keys(tg.perangkat)) {
          if (!punya(P, id)) { G.push(`${di}: target menyebut perangkat "${teks(id, 20)}" yang tidak ada.`); continue; }
          const c = tg.perangkat[id] || {}, x = {};
          if (typeof c.on === 'boolean' && P[id].tipe !== 'buka') x.on = c.on;
          if (typeof c.open === 'boolean' && P[id].tipe === 'buka') x.open = c.open;
          if (c.speed != null && P[id].tipe !== 'saklar' && P[id].tipe !== 'buka') x.speed = bil(c.speed, 1, 100, 1);
          if (Object.keys(x).length) T.perangkat[id] = x; else G.push(`${di}: target untuk "${id}" kosong (pakai on, open, atau speed sesuai tipenya).`);
        }
      }
      if (tg.suhuMaks != null) T.suhuMaks = bil(tg.suhuMaks, 10, 45, 27);
      if (tg.cahayaMin != null) T.cahayaMin = bil(tg.cahayaMin, 0, 1000, 200);
      for (const k of ['tolakMin', 'paralelMin', 'tahapMin', 'memoriMin']) if (tg[k] != null) T[k] = Math.round(bil(tg[k], 1, 5, 1));
      if (tg.maksPesan != null) T.maksPesan = Math.round(bil(tg.maksPesan, 1, 30, 5));
      if (Array.isArray(tg.urutan)) { const u = tg.urutan.filter(x => punya(P, x)).slice(0, 5); if (u.length !== tg.urutan.length) G.push(`${di}: "urutan" menyebut perangkat yang tidak ada.`); if (u.length) T.urutan = u; }
      for (const k of ['intent', 'rute', 'kejadian']) if (tg[k] != null) T[k] = teks(tg[k], 24);
      if (tg.ambil != null) T.ambil = tg.ambil === true ? true : teks(tg.ambil, 20);
      if (!Object.keys(T).length) { G.push(`${di}: "target" kosong, misi tidak bisa selesai.`); return; }
      const awal = {};
      if (m.awal && typeof m.awal === 'object') for (const id of Object.keys(m.awal)) if (punya(P, id)) awal[id] = { on: !!m.awal[id].on, open: !!m.awal[id].open };
      R.misi.push({ judul: teks(m.judul, 40), brief: teks(m.brief, 260), base: Math.round(bil(m.base, 10, 500, 100)), hints: (Array.isArray(m.hints) ? m.hints.slice(0, 3) : []).map(h => teks(h, 160)).filter(Boolean), badge: teks(m.badge, 16), target: T, awal });
    });

    return { ok: G.length === 0, galat: G, ruang: R };
  }

  function stateAwal(R, awal) {
    const s = { suhu: R.ambien.suhu, cahaya: R.ambien.cahaya };
    for (const id of Object.keys(R.perangkat)) {
      s[id] = TIPE[R.perangkat[id].tipe].awal(R.perangkat[id]);
      if (awal && awal[id]) { if ('open' in s[id]) s[id].open = !!awal[id].open; else s[id].on = !!awal[id].on; }
    }
    return s;
  }
  const aktif = x => !!(x && (x.on || x.open));

  /* Fisika sederhana: tiap perangkat aktif menggeser suhu dan cahaya menuju nilai stabil. */
  function nilaiStabil(R, s, ek) {
    let ts = R.ambien.suhu + (ek ? ek.suhu || 0 : 0), tc = R.ambien.cahaya + (ek ? ek.cahaya || 0 : 0);
    for (const id of Object.keys(R.perangkat)) {
      if (!aktif(s[id])) continue;
      const d = R.perangkat[id];
      ts += d.efek.suhu * (d.tipe === 'level' ? s[id].speed : 1);
      tc += d.efek.cahaya;
    }
    return { suhu: ts, cahaya: Math.max(0, tc) };
  }
  function langkahFisika(R, s, dt, ek) {
    const t = nilaiStabil(R, s, ek);
    s.suhu += (t.suhu - s.suhu) * (1 - Math.exp(-dt * 0.15));
    s.cahaya += (t.cahaya - s.cahaya) * (1 - Math.exp(-dt * 5));
    return s;
  }

  /* Misi deklaratif: mengubah "target" menjadi daftar syarat [teks, terpenuhi]. g = catatan sesi dari game. */
  function nilaiMisi(R, misi, s, g) {
    const T = misi.target, out = [], P = R.perangkat;
    for (const id of Object.keys(T.perangkat || {})) {
      const c = T.perangkat[id], n = P[id].nama, x = s[id];
      if ('on' in c) out.push([`${n} ${x.on ? 'menyala' : 'mati'} (target ${c.on ? 'menyala' : 'mati'})`, !!x.on === c.on]);
      if ('open' in c) out.push([`${n} ${x.open ? 'terbuka' : 'tertutup'} (target ${c.open ? 'terbuka' : 'tertutup'})`, !!x.open === c.open]);
      if ('speed' in c) out.push([`${n} di ${x.on ? x.speed : 'mati'} (target ${c.speed})`, !!x.on && x.speed === c.speed]);
    }
    if (T.suhuMaks != null) out.push([`Suhu ${s.suhu.toFixed(1)} C (target ${T.suhuMaks} atau kurang)`, s.suhu <= T.suhuMaks]);
    if (T.cahayaMin != null) out.push([`Cahaya ${Math.round(s.cahaya)} lux (target ${T.cahayaMin} atau lebih)`, s.cahaya >= T.cahayaMin]);
    if (T.tolakMin) out.push([`Penolakan guard ${g.tolak} dari ${T.tolakMin}`, g.tolak >= T.tolakMin]);
    if (T.paralelMin) out.push([`Spesialis bekerja paralel: ${g.paralel} (target ${T.paralelMin})`, g.paralel >= T.paralelMin]);
    if (T.tahapMin) out.push([`Rencana berurutan ${g.tahapMaks} tahap (target ${T.tahapMin})`, g.tahapMaks >= T.tahapMin]);
    if (T.ambil != null) { const ok = T.ambil === true ? g.ambil.length > 0 : g.ambil.includes(T.ambil); out.push([`Agen membuka rak manual${T.ambil === true ? '' : ' (bab "' + T.ambil + '")'}`, ok]); }
    if (T.memoriMin) out.push([`Catatan memori di rak: ${g.memori} (target ${T.memoriMin})`, g.memori >= T.memoriMin]);
    if (T.urutan) { const log = g.logAksi || []; let i = 0; for (const d of log) if (d === T.urutan[i]) i++; out.push([`Urutan aksi: ${T.urutan.map(d => P[d].nama).join(' lalu ')} (${Math.min(i, T.urutan.length)} dari ${T.urutan.length})`, i >= T.urutan.length]); }
    if (T.intent) out.push([`Pernah memicu intent "${T.intent}"`, (g.intents || []).includes(T.intent)]);
    if (T.rute) out.push([`Pernah memakai rute "${T.rute}"`, (g.rute || []).includes(T.rute)]);
    if (T.kejadian) out.push([`Mengalami kejadian "${T.kejadian}"`, (g.kejadian || []).includes(T.kejadian)]);
    if (T.maksPesan) out.push([`Pesan terpakai ${g.pesan || 0} (maksimal ${T.maksPesan})`, (g.pesan || 0) <= T.maksPesan]);
    return out;
  }

  const api = { TIPE, BENTUK, RUANG, TEMPLAT, teks, bil, warna, OK_ID, OK_KATA, periksa, stateAwal, aktif, nilaiStabil, langkahFisika, nilaiMisi, punya };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Dunia = api;
})(typeof window !== 'undefined' ? window : globalThis);
