/* Otak agen: parser aturan + intent router + validasi aksi (guardrail).
   Semua fungsi murni, tanpa DOM, supaya mudah diuji dan nanti bisa diganti LLM
   selama kontrak JSON keluarannya sama. */
(function (root) {
  'use strict';

  const PERANGKAT = {
    lampu:  { nama: 'Lampu',        panel: 'A' },
    kipas:  { nama: 'Kipas',        panel: 'A' },
    pintu:  { nama: 'Pintu',        panel: 'B' },
    lengan: { nama: 'Lengan robot', panel: 'B' }
  };
  const PANEL = {
    A: { nama: 'Panel Kenyamanan' },
    B: { nama: 'Panel Akses & Mesin' }
  };
  const BATAS = { lengan: { kecepatan: 50, sudut: 90 }, kipas: { level: 3 } };

  const POLA = {
    lampu:  /\b(lampu|lampunya|lamp|penerangan)\b/,
    kipas:  /\b(kipas|kipasnya|angin|fan)\b/,
    pintu:  /\b(pintu|pintunya)\b/,
    lengan: /\b(lengan|lengannya|robot|arm)\b/
  };

  const V_ON    = /\b(nyalakan|nyalain|nyala|hidupkan|hidupin|aktifkan|aktifin|jalankan|jalanin|putar|putarkan|gerakkan|gerakin|mulai|on)\b/;
  const V_OFF   = /\b(matikan|matiin|mati|padamkan|padamin|stop|berhenti|hentikan|nonaktifkan|off)\b/;
  const V_BUKA  = /\b(buka|bukain|bukakan|bukalah)\b/;
  const V_TUTUP = /\b(tutup|tutupin|tutupkan)\b/;
  const V_NAIK  = /\b(naikkan|kencangkan|besarkan|kencengin)\b/;
  const V_TURUN = /\b(turunkan|pelankan|kecilkan|pelanin)\b/;
  const VERBS = [['on', V_ON], ['off', V_OFF], ['buka', V_BUKA], ['tutup', V_TUTUP], ['naik', V_NAIK], ['turun', V_TURUN]];

  const INJEKSI = /\b(abaikan|lupakan|ignore|bypass|jailbreak|mode (admin|developer|dev|root)|pura pura|kamu sekarang|system prompt|tanpa (batas|aturan)|nonaktifkan (pengaman|aturan|safety)|matikan (pengaman|aturan|safety))\b/;
  const SAPA = /^(halo|hai|hi|hei|hello|woy|oy|p|assalamualaikum|selamat (pagi|siang|sore|malam))\b/;
  const TANYA_DIRI = /(siapa kamu|kamu siapa|kamu bisa apa|bisa apa|terima kasih|makasih|thanks|thx|keren)/;
  const INFO_KERAS = /\b(berapa|status|kondisi|cek|periksa|laporan|apakah|gimana|bagaimana|apa kabar)\b|\b(nyala|hidup|mati|terbuka|tertutup|aktif)\s*(nggak|ngga|gak|ga|enggak|tidak)\s*\??\s*$/;
  const INFO_LUNAK = /\b(suhu|temperatur|cahaya|lux)\b/;

  /* Orkestrasi: tiap perangkat punya agen spesialis. Urutan ("lalu", "setelah") dijalankan sekuensial,
     sisanya paralel. Pintu tidak boleh sepanggung dengan lengan karena interlock (hindari balapan). */
  const SPESIALIS = { lampu: 'Cahaya', kipas: 'Suhu', pintu: 'Keamanan', lengan: 'Keamanan' };
  const URUT = /\b(lalu|setelah|sesudah|terus|kemudian|habis itu|baru)\b/;
  const MANUAL_Q = /\b(manual|sop|aturan|prosedur|jadwal|jam|batas|standar|ketentuan|panduan|boleh|seharusnya|idealnya|ideal|sebaiknya|disarankan)\b|\bsuhu (yang )?(nyaman|ideal)\b/;
  /* Model fisika di game.js (papan sensor): suhu stabil = 31 - 2.2 x level kipas - 1.5 bila pintu terbuka. */
  const FISIKA = { ambien: 31, perLevel: 2.2, pintu: 1.5 };

  function stateAwal() {
    return {
      lampu: { on: false },
      kipas: { on: false, speed: 2 },
      pintu: { open: false },
      lengan: { on: false, speed: 30, angle: 60 },
      suhu: 31,
      cahaya: 20
    };
  }

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[,;&+]/g, ' dan ')
      .replace(/[^a-z0-9%\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const potong = (s, n) => (s.length > n ? s.slice(0, n - 1) + '...' : s);

  function cariVerb(c) {
    let best = null, idx = Infinity;
    for (const [nama, re] of VERBS) {
      const m = c.match(re);
      if (m && m.index < idx) { idx = m.index; best = nama; }
    }
    return best;
  }

  function levelKipas(c, v, state) {
    if (v === 'naik') return (state.kipas.on ? state.kipas.speed : 1) + 1;
    if (v === 'turun') return Math.max((state.kipas.on ? state.kipas.speed : 2) - 1, 1);
    let m = c.match(/(?:kecepatan|level|tingkat)\s*(\d{1,3})/);
    if (m) return +m[1];
    m = c.match(/(\d{1,4})\s*%/);
    if (m) { const p = +m[1]; return p <= 33 ? 1 : p <= 66 ? 2 : p <= 100 ? 3 : 9; }
    if (/\b(pelan|lambat)\b/.test(c)) return 1;
    if (/\b(sedang)\b/.test(c)) return 2;
    if (/\b(kencang|maksimal|max|penuh|full)\b/.test(c)) return 3;
    return 2;
  }
  function kecLengan(c) {
    let m = c.match(/(\d{1,4})\s*%/) || c.match(/kecepatan\s*(\d{1,4})/);
    if (m) return +m[1];
    if (/\b(maksimal|max|penuh|full)\b/.test(c)) return 100;
    if (/\b(cepat|kencang)\b/.test(c)) return 45;
    if (/\b(pelan|lambat)\b/.test(c)) return 20;
    return 30;
  }
  function sudutLengan(c) {
    const m = c.match(/sudut\s*(\d{1,3})/) || c.match(/(\d{1,3})\s*derajat/);
    return m ? +m[1] : 60;
  }

  function buatAksi(d, v, c, state) {
    const off = v === 'off' || v === 'tutup';
    switch (d) {
      case 'lampu':  return { device: 'lampu', op: off ? 'off' : 'on' };
      case 'pintu':  return { device: 'pintu', op: off ? 'close' : 'open' };
      case 'kipas':
        if (off) return { device: 'kipas', op: 'off' };
        return { device: 'kipas', op: 'on', speed: levelKipas(c, v, state) };
      case 'lengan':
        if (off) return { device: 'lengan', op: 'off' };
        if (v === 'naik' || v === 'turun') return null;
        return { device: 'lengan', op: 'on', speed: kecLengan(c), angle: sudutLengan(c) };
    }
    return null;
  }

  function aksiKlausa(c, verbWarisan, state) {
    let list = Object.keys(POLA).filter(k => POLA[k].test(c));
    const semua = /\bsemua(nya)?\b/.test(c);
    const verbSendiri = cariVerb(c);
    if (!list.length && (verbSendiri === 'buka' || verbSendiri === 'tutup')) list = ['pintu'];
    if (!list.length && semua) list = Object.keys(PERANGKAT);
    const v = verbSendiri || (list.length ? verbWarisan : null);
    const aksi = [];
    if (v) for (const d of list) { const a = buatAksi(d, v, c, state); if (a) aksi.push(a); }
    return { verb: verbSendiri || verbWarisan, aksi };
  }

  /* Paket "nyaman" yang angkanya dibaca dari manual (RAG). Mengubah teks manual mengubah perilaku agen. */
  function paketNyaman(state, M, manual) {
    const sh = M.nilaiSuhu(manual), cy = M.nilaiCahaya(manual);
    const lux = cy ? cy.min : 200;
    const aksi = []; const catatan = [];
    if (sh) {
      if (state.suhu > sh.maks) {
        let level = 0, pintu = false;
        for (let s = 1; s <= 3 && !level; s++) if (FISIKA.ambien - FISIKA.perLevel * s <= sh.maks) level = s;
        for (let s = 1; s <= 3 && !level; s++) if (FISIKA.ambien - FISIKA.perLevel * s - FISIKA.pintu <= sh.maks) { level = s; pintu = true; }
        if (!level) { level = 3; pintu = true; }
        const stabil = FISIKA.ambien - FISIKA.perLevel * level - (pintu ? FISIKA.pintu : 0);
        aksi.push({ device: 'kipas', op: 'on', speed: level });
        if (pintu) aksi.push({ device: 'pintu', op: 'open' });
        catatan.push(`manual: suhu nyaman ${sh.min} sampai ${sh.maks} C, suhu sekarang ${state.suhu.toFixed(1)} C, jadi kipas level ${level}${pintu ? ' dan pintu dibuka' : ''} (perkiraan stabil ${stabil.toFixed(1)} C)`);
      } else catatan.push(`manual: suhu nyaman ${sh.min} sampai ${sh.maks} C, suhu sekarang ${state.suhu.toFixed(1)} C, sudah cukup sejuk`);
    } else catatan.push('batas suhu di manual tidak terbaca, suhu dibiarkan');
    if (state.cahaya < lux) { aksi.push({ device: 'lampu', op: 'on' }); catatan.push(`cahaya ${Math.round(state.cahaya)} lux di bawah ${lux} lux, lampu dinyalakan`); }
    else catatan.push(`cahaya ${Math.round(state.cahaya)} lux sudah cukup`);
    return { aksi, catatan: catatan.join('; ') };
  }

  function cariGaul(teks, state, ctx) {
    const h = [];
    const suhu = state.suhu;
    if (/\b(gerah|gerahh+|panas|sumuk|kepanasan)\b/.test(teks))
      h.push({ kata: 'gerah', alasan: `suhu terakhir ${suhu.toFixed(1)} C`, aksi: [{ device: 'kipas', op: 'on', speed: suhu >= 28 ? 2 : 1 }] });
    if (/\b(gelap|redup|remang|suram)\b/.test(teks))
      h.push({ kata: 'gelap', alasan: 'ruangan kurang cahaya', aksi: [{ device: 'lampu', op: 'on' }] });
    if (/\b(silau|terlalu terang)\b/.test(teks))
      h.push({ kata: 'silau', alasan: 'cahaya berlebih', aksi: [{ device: 'lampu', op: 'off' }] });
    if (/\b(pengap|sesak|sumpek|kurang udara)\b/.test(teks))
      h.push({ kata: 'pengap', alasan: 'butuh sirkulasi udara', aksi: [{ device: 'pintu', op: 'open' }, { device: 'kipas', op: 'on', speed: 1 }] });
    if (/\b(nyaman|adem|sejuk|enak)\b/.test(teks)) {
      if (ctx && ctx.manual) {
        const p = paketNyaman(state, ctx.M, ctx.manual);
        h.push({ kata: 'nyaman', alasan: p.catatan, aksi: p.aksi, manual: true });
      } else h.push({ kata: 'nyaman', alasan: 'tanpa manual, angkanya kukarang sendiri: kipas level 2 dan lampu', aksi: [{ device: 'kipas', op: 'on', speed: 2 }, { device: 'lampu', op: 'on' }] });
    }
    if (/\b(dingin|kedinginan|menggigil)\b/.test(teks))
      h.push({ kata: 'dingin', alasan: 'suhu terasa rendah', aksi: [{ device: 'kipas', op: 'off' }] });
    return h;
  }

  function terapkan(s, a) {
    switch (a.device) {
      case 'lampu': s.lampu.on = a.op === 'on'; break;
      case 'kipas': s.kipas.on = a.op === 'on'; if (a.op === 'on') s.kipas.speed = a.speed; break;
      case 'pintu': s.pintu.open = a.op === 'open'; break;
      case 'lengan': s.lengan.on = a.op === 'on'; if (a.op === 'on') { s.lengan.speed = a.speed; s.lengan.angle = a.angle; } break;
    }
    return s;
  }

  function deskripsi(a) {
    switch (a.device) {
      case 'lampu': return a.op === 'on' ? 'lampu menyala' : 'lampu mati';
      case 'kipas': return a.op === 'on' ? `kipas berputar (level ${a.speed})` : 'kipas mati';
      case 'pintu': return a.op === 'open' ? 'pintu terbuka' : 'pintu tertutup';
      case 'lengan': return a.op === 'on' ? `lengan bergerak (${a.speed}%, sudut ${a.angle} derajat)` : 'lengan berhenti';
    }
    return '';
  }

  /* Guardrail lapis aksi: dijalankan di kode, tidak bergantung pada LLM. */
  function validasi(aksi, state) {
    const sim = JSON.parse(JSON.stringify(state));
    const ok = [], tolak = [];
    for (const a of aksi) {
      if (a.device === 'kipas' && a.op === 'on' && (a.speed > BATAS.kipas.level || a.speed < 1)) {
        tolak.push({ device: 'kipas', aturan: 'batas_kipas', pesan: `Kipas hanya punya level 1 sampai ${BATAS.kipas.level}, bukan ${a.speed}.` });
        continue;
      }
      if (a.device === 'lengan' && a.op === 'on') {
        if (a.speed > BATAS.lengan.kecepatan) {
          tolak.push({ device: 'lengan', aturan: 'batas_kecepatan', pesan: `Kecepatan lengan ${a.speed}% melebihi batas aman ${BATAS.lengan.kecepatan}%.` });
          continue;
        }
        if (a.angle > BATAS.lengan.sudut) {
          tolak.push({ device: 'lengan', aturan: 'batas_sudut', pesan: `Sudut ${a.angle} derajat melebihi batas ${BATAS.lengan.sudut} derajat.` });
          continue;
        }
      }
      if (a.device === 'pintu' && a.op === 'open' && sim.lengan.on) {
        tolak.push({ device: 'pintu', aturan: 'interlock', pesan: 'Interlock keselamatan: pintu tidak boleh dibuka saat lengan robot aktif.' });
        continue;
      }
      terapkan(sim, a);
      ok.push(a);
    }
    return { ok, tolak };
  }

  function laporSensor(state, fokus) {
    const suhu = `suhu ${state.suhu.toFixed(1)} C`;
    const lux = Math.round(state.cahaya);
    const cahaya = `cahaya ${lux} lux (${lux < 100 ? 'gelap' : lux < 250 ? 'redup' : 'terang'})`;
    if (fokus === 'suhu') return `Papan sensor menunjukkan ${suhu}.`;
    if (fokus === 'cahaya') return `Papan sensor menunjukkan ${cahaya}.`;
    const per = [
      state.lampu.on ? 'lampu nyala' : 'lampu mati',
      state.kipas.on ? `kipas level ${state.kipas.speed}` : 'kipas mati',
      state.pintu.open ? 'pintu terbuka' : 'pintu tertutup',
      state.lengan.on ? 'lengan aktif' : 'lengan diam'
    ].join(', ');
    return `Papan sensor: ${suhu}, ${cahaya}. Perangkat: ${per}.`;
  }

  const LABEL_INTENT = { kontrol: 'kontrol perangkat', info: 'tanya info', bahaya: 'bahaya', obrol: 'obrolan', tidak_paham: 'tidak dikenali' };

  function unik(aksi) {
    const out = [];
    for (const a of aksi) {
      const i = out.findIndex(x => x.device === a.device);
      if (i >= 0) out.splice(i, 1);
      out.push(a);
    }
    return out;
  }

  /* Membagi aksi menjadi tahap (sekuensial) berisi tugas per spesialis (paralel dalam satu tahap). */
  /* Perintah dipecah di kata urutan. "A setelah B" berarti B dulu. Perangkat yang disebut tiap segmen menentukan tahapnya. */
  function segmenUrut(teks) {
    const m = teks.match(/^(.*?)\s+(?:setelah|sesudah)\s+(.*)$/);
    const t2 = m ? `${m[2]} lalu ${m[1]}` : teks;
    return t2.split(/\s+(?:lalu|terus|kemudian|habis itu|setelah itu|baru)\s+/).map(c => {
      const d = new Set(Object.keys(POLA).filter(k => POLA[k].test(c)));
      if (/\b(buka|bukain|bukakan|tutup|tutupin|tutupkan)\b/.test(c)) d.add('pintu');
      if (/\bsemua(nya)?\b/.test(c)) Object.keys(POLA).forEach(k => d.add(k));
      return d;
    });
  }
  function bagiTugas(aksi, teks) {
    if (!aksi.length) return null;
    const urut = URUT.test(teks);
    const bentrok = (st, a) => st.some(x => (x.device === 'pintu' && x.op === 'open' && a.device === 'lengan') || (a.device === 'pintu' && a.op === 'open' && x.device === 'lengan'));
    let kelompok = null;
    if (urut) {
      const seg = segmenUrut(teks);
      if (aksi.every(a => seg.some(d => d.has(a.device)))) {
        kelompok = seg.map(() => []);
        for (const a of aksi) kelompok[seg.findIndex(d => d.has(a.device))].push(a);
        kelompok = kelompok.filter(k => k.length);
      }
    }
    // shortcut: bila perangkat tidak disebut di teks (misalnya keluhan "gerah lalu gelap"), tiap aksi menjadi tahap sendiri
    if (!kelompok) kelompok = urut ? aksi.map(a => [a]) : [aksi];
    const tahap = [];
    for (const k of kelompok) {
      let st = null;
      for (const a of k) { if (!st || bentrok(st, a)) { st = []; tahap.push(st); } st.push(a); }
    }
    const tugas = [];
    tahap.forEach((st, i) => {
      for (const nama of [...new Set(st.map(a => SPESIALIS[a.device]))]) tugas.push({ agen: nama, tahap: i, aksi: st.filter(a => SPESIALIS[a.device] === nama) });
    });
    return tugas;
  }
  function delegasiJejak(tugas) {
    if (!tugas || !tugas.length) return [];
    const n = Math.max(...tugas.map(t => t.tahap)) + 1;
    const baris = [`Orkestrator membagi ${tugas.reduce((s, t) => s + t.aksi.length, 0)} aksi ke ${new Set(tugas.map(t => t.agen)).size} spesialis dalam ${n} tahap.`];
    for (let i = 0; i < n; i++) {
      const dalam = tugas.filter(t => t.tahap === i);
      baris.push(`Tahap ${i + 1}${dalam.length > 1 ? ' (paralel)' : ''}: ` + dalam.map(t => `${t.agen} (${t.aksi.map(a => a.device + ' ' + a.op).join(', ')})`).join(' dan '));
    }
    return baris;
  }

  function kerangka(pesan) {
    const asli = String(pesan || '').trim();
    const teks = norm(asli);
    const out = { intent: 'tidak_paham', sub: '', diambil: [], didelegasikan_ke: null, pikiran: '', aksi: [], ditolak: [], baca: false, fokus: 'semua', balasan: '', jejak: [] };
    const J = out.jejak;
    J.push({ k: 'terima', t: `Pesan masuk: "${potong(asli, 70)}"` });
    const selesai = (tujuan) => {
      const router = { k: 'router', intent: out.intent, t: `Router: intent "${LABEL_INTENT[out.intent]}"${out.sub ? ' (' + out.sub + ')' : ''}${tujuan ? '. Tujuan: ' + tujuan : ''}` };
      J.splice(1, 0, router);
      let i = 2;
      if (out.pikiran) J.splice(i++, 0, { k: 'pikir', t: out.pikiran });
      if (out.diambil.length) J.splice(i++, 0, { k: 'ambil', t: 'Membuka rak manual: ' + out.diambil.map(d => `${d.judul} (skor ${d.skor})`).join('; ') });
      for (const d of delegasiJejak(out.didelegasikan_ke)) J.splice(i++, 0, { k: 'delegasi', t: d });
      for (const t of out.ditolak) J.push({ k: 'guard', t: `Guard (${t.aturan}): ${t.pesan}` });
      return out;
    };
    return { asli, teks, out, J, selesai };
  }

  /* Input guard: berjalan di kode, sebelum LLM dipanggil (hemat kuota dan lebih aman). */
  function cekInjeksi(pesan) {
    const { teks, out, selesai } = kerangka(pesan);
    const inj = teks.match(INJEKSI);
    if (!inj) return null;
    out.intent = 'bahaya'; out.sub = 'injeksi';
    out.pikiran = `Ada pola "${inj[0]}" yang mencoba mengubah aturanku. Itu tidak kuikuti.`;
    out.ditolak.push({ device: null, aturan: 'injeksi', pesan: `Pola injeksi "${inj[0]}" terdeteksi di input.` });
    out.balasan = 'Aku tidak bisa mengabaikan aturan keselamatan. Kalau mau mengendalikan perangkat, sebut saja namanya ya.';
    return selesai('tidak ada aksi');
  }

  function susunBalasan(v) {
    const bagian = [];
    if (v.ok.length) {
      const d = v.ok.map(deskripsi);
      bagian.push('Siap! ' + (d.length > 1 ? d.slice(0, -1).join(', ') + ' dan ' + d[d.length - 1] : d[0]) + '.');
    }
    for (const t of v.tolak) {
      let s = 'Aku tolak: ' + t.pesan;
      if (t.aturan === 'batas_kecepatan') s += ` Mau kupakai ${BATAS.lengan.kecepatan}%?`;
      if (t.aturan === 'interlock') s += ' Matikan lengan dulu, baru pintu boleh dibuka.';
      bagian.push(s);
    }
    return bagian.join(' ');
  }

  function pikir(pesan, state, opsi) {
    opsi = opsi || {};
    const M = root.Manual;
    const manual = M && opsi.rag !== false && Array.isArray(opsi.manual) ? opsi.manual : null;
    const ctx = manual ? { M, manual } : null;
    const { asli, teks, out, J, selesai } = kerangka(pesan);
    const plIn = cekInjeksi(pesan);
    if (plIn) return plIn;

    const perangkatAda = Object.keys(POLA).filter(k => POLA[k].test(teks));
    const punyaAngka = perangkatAda.length && /(kecepatan|level|tingkat|sudut|derajat|\d+\s*%)/.test(teks);
    const verbAda = cariVerb(teks) || (punyaAngka ? 'on' : null);

    // 2. Obrolan
    if (!verbAda && !perangkatAda.length && (SAPA.test(teks) || TANYA_DIRI.test(teks))) {
      out.intent = 'obrol';
      out.pikiran = 'Ini sapaan atau pertanyaan umum, tidak perlu menyentuh perangkat.';
      out.balasan = TANYA_DIRI.test(teks) && !SAPA.test(teks)
        ? 'Aku agen penjaga ruangan ini. Aku bisa mengatur lampu, kipas, pintu, dan lengan robot, atau membaca papan sensor.'
        : 'Halo! Aku siap menerima perintah. Coba: "nyalakan lampu" atau "gerah nih".';
      return selesai('tidak perlu berjalan');
    }

    // 2b. Pertanyaan tentang manual (SOP): agen ke rak manual, bukan ke papan sensor
    if (manual && !cariVerb(teks) && MANUAL_Q.test(teks)) {
      const hit = M.cari(teks, manual, 2, 0.8);
      if (hit.length) {
        out.intent = 'info'; out.sub = 'baca manual'; out.fokus = 'manual'; out.diambil = hit;
        out.pikiran = 'Ini pertanyaan tentang aturan ruangan. Aku cari jawabannya di rak manual, bukan menebak.';
        out.balasan = potong(`Menurut manual, ${hit[0].judul}: ${hit[0].teks}`, 260);
        return selesai('Rak Manual');
      }
    }

    // 3. Tentukan jenis
    const gaul = cariGaul(teks, state, ctx);
    let jenis;
    if (/(nggak|ngga|gak|ga|enggak|tidak)\s*\??\s*$/.test(teks) && INFO_KERAS.test(teks)) jenis = 'info';
    else if (verbAda) jenis = 'jelas';
    else if (INFO_KERAS.test(teks)) jenis = 'info';
    else if (gaul.length) jenis = 'ambigu';
    else if (INFO_LUNAK.test(teks)) jenis = 'info';
    else if (perangkatAda.length) jenis = 'tanya';
    else jenis = 'tidak_paham';

    if (jenis === 'info') {
      out.intent = 'info'; out.sub = 'baca sensor'; out.baca = true;
      out.fokus = /\b(suhu|temperatur)\b/.test(teks) && !/\b(cahaya|lux)\b/.test(teks) ? 'suhu'
        : /\b(cahaya|lux|terang)\b/.test(teks) && !/\b(suhu|temperatur)\b/.test(teks) ? 'cahaya' : 'semua';
      out.pikiran = 'Ini pertanyaan, bukan perintah. Aku perlu membaca papan sensor, bukan menebak.';
      return selesai('Papan Sensor');
    }
    if (jenis === 'tanya') {
      out.intent = 'tidak_paham'; out.sub = 'perlu klarifikasi';
      out.pikiran = `Kamu menyebut ${perangkatAda.map(d => PERANGKAT[d].nama.toLowerCase()).join(' dan ')} tapi tidak bilang mau diapakan.`;
      out.balasan = `Mau diapakan ${PERANGKAT[perangkatAda[0]].nama.toLowerCase()}-nya? Misalnya: "nyalakan", "matikan", atau "buka".`;
      return selesai('bertanya balik');
    }
    if (jenis === 'tidak_paham') {
      out.pikiran = 'Tidak ada kata perintah, nama perangkat, atau keluhan yang kukenali.';
      out.balasan = 'Hmm, aku belum paham. Sebut perangkatnya (lampu, kipas, pintu, lengan robot) atau bilang keluhanmu, misalnya "gerah" atau "gelap".';
      return selesai('bertanya balik');
    }

    let rencana = [];
    if (jenis === 'jelas') {
      out.sub = 'perintah jelas';
      let t2 = teks;
      const m = t2.match(/^(.*?)\s+setelah\s+(.*)$/);
      if (m) t2 = `${m[2]} lalu ${m[1]}`;
      const klausa = t2.split(/\s+(?:dan|lalu|terus|kemudian|sama|serta|habis itu|setelah itu)\s+/);
      let verbTerakhir = cariVerb(teks) ? null : verbAda;
      for (const c of klausa) {
        const r = aksiKlausa(c, verbTerakhir, state);
        if (r.verb) verbTerakhir = r.verb;
        rencana.push(...r.aksi);
      }
      rencana = unik(rencana);
      out.pikiran = `Ada kata perintah dan nama perangkat. Kupecah jadi ${rencana.length} langkah: ${rencana.map(a => a.device + ' ' + a.op).join(', ') || 'kosong'}${m ? ' (urutan dibalik karena "setelah")' : ''}.`;
    } else {
      out.sub = 'keluhan, perlu ditafsirkan';
      const peta = new Map();
      for (const g of gaul) for (const a of g.aksi) peta.set(a.device, a);
      rencana = [...peta.values()];
      if (gaul.some(g => g.manual)) out.diambil = M.ambilId(manual, ['suhu', 'cahaya']);
      if (!rencana.length && gaul.some(g => g.manual)) {
        out.intent = 'info'; out.sub = 'sudah nyaman (manual)';
        out.pikiran = gaul.map(g => g.alasan).join('; ') + '.';
        out.balasan = 'Ruangan sudah nyaman menurut manual, tidak ada yang perlu diubah.';
        return selesai('Rak Manual');
      }
      out.pikiran = gaul.map(g => `"${g.kata}" berarti ${g.alasan}`).join('; ') + `. Kutafsirkan menjadi: ${rencana.map(a => a.device + ' ' + a.op).join(', ')}.`;
    }

    if (!rencana.length) {
      out.intent = 'tidak_paham'; out.sub = 'perlu klarifikasi';
      out.balasan = 'Perangkat apa yang dimaksud? Pilih: lampu, kipas, pintu, atau lengan robot.';
      return selesai('bertanya balik');
    }

    const v = validasi(rencana, state);
    out.aksi = v.ok;
    out.ditolak = v.tolak;
    out.intent = v.ok.length ? 'kontrol' : 'bahaya';
    if (!v.ok.length) out.sub = 'ditolak oleh aturan';

    out.balasan = susunBalasan(v);
    out.didelegasikan_ke = bagiTugas(v.ok, teks);
    return selesai(tujuanSpesialis(out));
  }

  const tujuanSpesialis = out => (out.didelegasikan_ke ? 'spesialis ' + [...new Set(out.didelegasikan_ke.map(t => t.agen))].join(', ') : 'tidak ada aksi');

  /* Mengubah usulan dari LLM (sudah dinormalisasi) menjadi rencana yang sama bentuknya dengan parser.
     Guardrail aksi tetap dijalankan di kode: LLM hanya mengusulkan, tidak memutuskan. */
  function dariUsulan(pesan, u, state, opsi) {
    opsi = opsi || {};
    const { teks, out, selesai } = kerangka(pesan);
    out.pikiran = u.pikiran || '';
    out.diambil = Array.isArray(opsi.diambil) ? opsi.diambil : [];
    const ada = (u.aksi || []).length;
    if (u.intent === 'info' && u.fokus === 'manual' && u.balasan && out.diambil.length && MANUAL_Q.test(teks)) {
      out.intent = 'info'; out.sub = 'baca manual (LLM)'; out.fokus = 'manual'; out.balasan = u.balasan;
      return selesai('Rak Manual');
    }
    if (u.intent === 'info') {
      out.intent = 'info'; out.sub = 'baca sensor (LLM)'; out.baca = true; out.fokus = u.fokus === 'manual' ? 'semua' : u.fokus || 'semua';
      return selesai('Papan Sensor');
    }
    if (u.intent === 'obrol') {
      out.intent = 'obrol'; out.sub = 'LLM';
      out.balasan = u.balasan || 'Halo! Aku siap menerima perintah.';
      return selesai('tidak perlu berjalan');
    }
    if (u.intent !== 'kontrol' || !ada) {
      out.intent = 'tidak_paham'; out.sub = 'perlu klarifikasi (LLM)';
      out.balasan = u.balasan || 'Aku belum paham maksudmu. Sebut perangkatnya atau bilang keluhanmu.';
      return selesai('bertanya balik');
    }
    const v = validasi(u.aksi, state);
    out.aksi = v.ok; out.ditolak = v.tolak;
    out.intent = v.ok.length ? 'kontrol' : 'bahaya';
    out.sub = v.ok.length ? 'kontrol (LLM)' : 'ditolak oleh aturan';
    out.balasan = v.tolak.length || !u.balasan ? susunBalasan(v) : u.balasan;
    out.didelegasikan_ke = bagiTugas(v.ok, teks);
    return selesai(tujuanSpesialis(out));
  }

  const adaInjeksi = teks => INJEKSI.test(norm(teks));
  const api = { pikir, cekInjeksi, adaInjeksi, bagiTugas, SPESIALIS, dariUsulan, validasi, terapkan, deskripsi, laporSensor, stateAwal, norm, PERANGKAT, PANEL, BATAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Otak = api;
})(typeof window !== 'undefined' ? window : globalThis);
