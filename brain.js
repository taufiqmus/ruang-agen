/* Otak agen: parser aturan + intent router + validasi aksi (guardrail) + pembagian tugas.
   Tidak ada nama perangkat yang ditulis mati di sini: semuanya dibaca dari definisi ruang (dunia.js).
   Tanpa DOM, supaya mudah diuji. Otak LLM boleh menggantikan parser selama kontrak JSON keluarannya sama:
   {intent, sub, diambil[], didelegasikan_ke, memori, pikiran, aksi[], ditolak[], baca, fokus, balasan, jejak[], otak} */
(function (root) {
  'use strict';
  const D = root.Dunia || (typeof require === 'function' ? require('./dunia.js') : null);

  /* ---------- kosakata bahasa Indonesia (berlaku di semua ruang) ---------- */
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
  const URUT = /\b(lalu|setelah|sesudah|terus|kemudian|habis itu|baru)\b/;
  const MANUAL_Q_DASAR = '\\b(manual|sop|aturan|prosedur|jadwal|jam|batas|standar|ketentuan|panduan|boleh|seharusnya|idealnya|ideal|sebaiknya|disarankan)\\b|\\bsuhu (yang )?(nyaman|ideal)\\b';
  const MEMORI = /^\s*(?:tolong\s+)?(?:ingat|inget|catat|simpan)(?:\s+ya|\s+bahwa|\s+dong)?\s*[:,]?\s+(.{3,160})$/i;
  const LABEL_INTENT = { kontrol: 'kontrol perangkat', info: 'tanya info', bahaya: 'bahaya', obrol: 'obrolan', tidak_paham: 'tidak dikenali' };

  /* ---------- ruang aktif dan turunan yang dihitung sekali ---------- */
  let R = null, P = {}, POLA = {}, ALIAS = [], KELUHAN = [], MANUAL_Q = null;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function aturRuang(def) {
    const h = D.periksa(def);
    if (!h.ok) return h;
    R = h.ruang; P = R.perangkat; POLA = {};
    for (const id of Object.keys(P)) POLA[id] = new RegExp('\\b(' + P[id].kata.map(k => esc(k) + '(nya)?').join('|') + ')\\b');
    ALIAS = Object.keys(R.alias).sort((a, b) => b.length - a.length).map(k => [new RegExp('\\b' + esc(k) + '\\b', 'g'), R.alias[k]]);
    KELUHAN = R.keluhan.map(k => ({ re: new RegExp('\\b(' + k.kata.map(esc).join('|') + ')\\b'), k }));
    MANUAL_Q = new RegExp(MANUAL_Q_DASAR + (R.kataManual.length ? '|\\b(' + R.kataManual.map(esc).join('|') + ')\\b' : ''));
    return h;
  }
  const ids = () => Object.keys(P);
  const nm = id => P[id].nama.toLowerCase();
  const peran = p => ids().find(id => P[id].peran === p) || null;
  const pertama = tipe => ids().find(id => P[id].tipe === tipe) || null;
  const daftar = (a, kata) => (a.length > 1 ? a.slice(0, -1).join(', ') + (a.length > 2 ? ',' : '') + ' ' + kata + ' ' + a[a.length - 1] : a[0] || '');
  const stateAwal = awal => D.stateAwal(R, awal);

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
  /* Alias ruang: "seduh kopi" menjadi "nyalakan espresso". Diterapkan SETELAH input guard membaca teks asli. */
  const pakaiAlias = t => { for (const [re, ke] of ALIAS) t = t.replace(re, ke); return t; };

  function cariVerb(c) {
    let best = null, idx = Infinity;
    for (const [nama, re] of VERBS) {
      const m = c.match(re);
      if (m && m.index < idx) { idx = m.index; best = nama; }
    }
    return best;
  }

  /* ---------- angka dari kalimat ---------- */
  function levelDari(c, v, state, id) {
    const maks = P[id].maks, s = state[id];
    if (v === 'naik') return (s.on ? s.speed : 1) + 1;
    if (v === 'turun') return Math.max((s.on ? s.speed : 2) - 1, 1);
    let m = c.match(/(?:kecepatan|level|tingkat|volume)\s*(\d{1,3})/);
    if (m) return +m[1];
    m = c.match(/(\d{1,4})\s*%/);
    if (m) { const p = +m[1]; return p > 100 ? maks + 6 : Math.max(1, Math.ceil(p / 100 * maks)); }
    if (/\b(pelan|lambat)\b/.test(c)) return 1;
    if (/\b(sedang)\b/.test(c)) return Math.ceil(maks / 2);
    if (/\b(kencang|maksimal|max|penuh|full)\b/.test(c)) return maks;
    return Math.min(2, maks);
  }
  function dayaDari(c, id) {
    const b = P[id].batasDaya;
    const m = c.match(/(\d{1,4})\s*%/) || c.match(/(?:kecepatan|daya)\s*(\d{1,4})/);
    if (m) return +m[1];
    if (/\b(maksimal|max|penuh|full)\b/.test(c)) return 100;
    if (/\b(cepat|kencang)\b/.test(c)) return Math.round(b * 0.9);
    if (/\b(pelan|lambat)\b/.test(c)) return Math.round(b * 0.4);
    return Math.round(b * 0.6);
  }
  function sudutDari(c) {
    const m = c.match(/sudut\s*(\d{1,3})/) || c.match(/(\d{1,3})\s*derajat/);
    return m ? +m[1] : 60;
  }

  function buatAksi(id, v, c, state) {
    const off = v === 'off' || v === 'tutup';
    switch (P[id].tipe) {
      case 'saklar': return { device: id, op: off ? 'off' : 'on' };
      case 'buka': return { device: id, op: off ? 'close' : 'open' };
      case 'level':
        if (off) return { device: id, op: 'off' };
        return { device: id, op: 'on', speed: levelDari(c, v, state, id) };
      case 'mesin':
        if (off) return { device: id, op: 'off' };
        if (v === 'naik' || v === 'turun') return null;
        return { device: id, op: 'on', speed: dayaDari(c, id), angle: sudutDari(c) };
    }
    return null;
  }

  function aksiKlausa(c, verbWarisan, state) {
    let list = ids().filter(k => POLA[k].test(c));
    const semua = /\bsemua(nya)?\b/.test(c);
    const verbSendiri = cariVerb(c);
    if (!list.length && (verbSendiri === 'buka' || verbSendiri === 'tutup') && pertama('buka')) list = [pertama('buka')];
    if (!list.length && semua) list = ids();
    const v = verbSendiri || (list.length ? verbWarisan : null);
    const aksi = [];
    if (v) for (const d of list) { const a = buatAksi(d, v, c, state); if (a) aksi.push(a); }
    return { verb: verbSendiri || verbWarisan, aksi };
  }

  /* Paket "nyaman": angkanya dibaca dari manual (RAG) dan dihitung dengan fisika ruang.
     Mengubah teks manual, atau menitip catatan memori, mengubah perilaku agen. */
  function paketNyaman(state, M, manual) {
    const sh = M.nilaiSuhu(manual), cy = M.nilaiCahaya(manual);
    const lux = cy ? cy.min : 200;
    const iD = peran('dingin'), iU = peran('udara'), iC = peran('cahaya');
    const aksi = [], catatan = [];
    if (sh && iD) {
      const amb = R.ambien.suhu, per = -P[iD].efek.suhu, maks = P[iD].tipe === 'level' ? P[iD].maks : 1, bu = iU ? -P[iU].efek.suhu : 0;
      if (state.suhu > sh.maks) {
        let level = 0, buka = false;
        for (let s = 1; s <= maks && !level; s++) if (amb - per * s <= sh.maks) level = s;
        if (iU) for (let s = 1; s <= maks && !level; s++) if (amb - per * s - bu <= sh.maks) { level = s; buka = true; }
        if (!level) { level = maks; buka = !!iU; }
        const stabil = amb - per * level - (buka ? bu : 0);
        aksi.push(P[iD].tipe === 'level' ? { device: iD, op: 'on', speed: level } : { device: iD, op: 'on' });
        if (buka) aksi.push({ device: iU, op: 'open' });
        catatan.push(`manual: suhu nyaman ${sh.min} sampai ${sh.maks} C, suhu sekarang ${state.suhu.toFixed(1)} C, jadi ${nm(iD)} level ${level}${buka ? ' dan ' + nm(iU) + ' dibuka' : ''} (perkiraan stabil ${stabil.toFixed(1)} C)`);
      } else catatan.push(`manual: suhu nyaman ${sh.min} sampai ${sh.maks} C, suhu sekarang ${state.suhu.toFixed(1)} C, sudah cukup sejuk`);
    } else catatan.push(sh ? 'ruang ini tidak punya pendingin, suhu dibiarkan' : 'batas suhu di manual tidak terbaca, suhu dibiarkan');
    if (iC) {
      if (state.cahaya < lux) { aksi.push({ device: iC, op: 'on' }); catatan.push(`cahaya ${Math.round(state.cahaya)} lux di bawah ${lux} lux, ${nm(iC)} dinyalakan`); }
      else catatan.push(`cahaya ${Math.round(state.cahaya)} lux sudah cukup`);
    }
    return { aksi, catatan: catatan.join('; '), sumber: [sh ? sh.sumber : 'suhu', 'cahaya'] };
  }

  /* Keluhan sehari-hari. Yang bawaan memakai PERAN perangkat (cahaya, dingin, udara), sisanya dari "keluhan" milik ruang. */
  function cariGaul(teks, state, ctx) {
    const h = [], iD = peran('dingin'), iU = peran('udara'), iC = peran('cahaya');
    const onD = sp => (P[iD].tipe === 'level' ? { device: iD, op: 'on', speed: Math.min(sp, P[iD].maks) } : { device: iD, op: 'on' });
    if (iD && /\b(gerah|gerahh+|panas|sumuk|kepanasan)\b/.test(teks))
      h.push({ kata: 'gerah', alasan: `suhu terakhir ${state.suhu.toFixed(1)} C`, aksi: [onD(state.suhu >= 28 ? 2 : 1)] });
    if (iC && /\b(gelap|redup|remang|suram)\b/.test(teks))
      h.push({ kata: 'gelap', alasan: 'ruangan kurang cahaya', aksi: [{ device: iC, op: 'on' }] });
    if (iC && /\b(silau|terlalu terang)\b/.test(teks))
      h.push({ kata: 'silau', alasan: 'cahaya berlebih', aksi: [{ device: iC, op: 'off' }] });
    if ((iU || iD) && /\b(pengap|sesak|sumpek|kurang udara)\b/.test(teks))
      h.push({ kata: 'pengap', alasan: 'butuh sirkulasi udara', aksi: [].concat(iU ? [{ device: iU, op: 'open' }] : [], iD ? [onD(1)] : []) });
    if ((iD || iC) && /\b(nyaman|adem|sejuk|enak)\b/.test(teks)) {
      if (ctx && ctx.manual) {
        const p = paketNyaman(state, ctx.M, ctx.manual);
        h.push({ kata: 'nyaman', alasan: p.catatan, aksi: p.aksi, manual: true, sumber: p.sumber });
      } else {
        const aksi = [].concat(iD ? [onD(2)] : [], iC ? [{ device: iC, op: 'on' }] : []);
        h.push({ kata: 'nyaman', alasan: `tanpa manual, angkanya kukarang sendiri: ${aksi.map(a => nm(a.device) + (a.speed ? ' level ' + a.speed : '')).join(' dan ')}`, aksi });
      }
    }
    if (iD && /\b(dingin|kedinginan|menggigil)\b/.test(teks))
      h.push({ kata: 'dingin', alasan: 'suhu terasa rendah', aksi: [{ device: iD, op: 'off' }] });
    for (const { re, k } of KELUHAN) if (re.test(teks)) h.push({ kata: k.kata[0], alasan: k.alasan, aksi: k.aksi.map(a => Object.assign({}, a)) });
    return h;
  }

  function terapkan(s, a) {
    const x = s[a.device];
    switch (P[a.device].tipe) {
      case 'saklar': x.on = a.op === 'on'; break;
      case 'level': x.on = a.op === 'on'; if (x.on) x.speed = a.speed; break;
      case 'buka': x.open = a.op === 'open'; break;
      case 'mesin': x.on = a.op === 'on'; if (x.on) { x.speed = a.speed; x.angle = a.angle; } break;
    }
    return s;
  }

  function deskripsi(a) {
    const n = nm(a.device), d = P[a.device];
    switch (d.tipe) {
      case 'saklar': return a.op === 'on' ? `${n} menyala` : `${n} mati`;
      case 'level': return a.op === 'on' ? `${n} menyala (level ${a.speed})` : `${n} mati`;
      case 'buka': return a.op === 'open' ? `${n} terbuka` : `${n} tertutup`;
      case 'mesin': return a.op === 'on' ? `${n} bekerja (${a.speed}%${d.batasSudut ? ', sudut ' + a.angle + ' derajat' : ''})` : `${n} berhenti`;
    }
    return '';
  }

  /* Guardrail lapis aksi: dijalankan di kode, tidak bergantung pada LLM. Batasnya dibaca dari definisi ruang. */
  function validasi(aksi, state) {
    const sim = JSON.parse(JSON.stringify(state));
    const ok = [], tolak = [];
    for (const a of aksi) {
      const d = P[a.device], N = d.nama;
      if (d.tipe === 'level' && a.op === 'on' && !(a.speed >= 1 && a.speed <= d.maks)) {
        tolak.push({ device: a.device, aturan: 'batas_level', pesan: `${N} hanya punya level 1 sampai ${d.maks}, bukan ${a.speed}.` });
        continue;
      }
      if (d.tipe === 'mesin' && a.op === 'on') {
        if (!(a.speed <= d.batasDaya)) {
          tolak.push({ device: a.device, aturan: 'batas_kecepatan', pesan: `${d.satuan === 'daya' ? 'Daya' : 'Kecepatan'} ${nm(a.device)} ${a.speed}% melebihi batas aman ${d.batasDaya}%.`, saran: `Mau kupakai ${d.batasDaya}%?` });
          continue;
        }
        if (d.batasSudut && !(a.angle <= d.batasSudut)) {
          tolak.push({ device: a.device, aturan: 'batas_sudut', pesan: `Sudut ${nm(a.device)} ${a.angle} derajat melebihi batas ${d.batasSudut} derajat.` });
          continue;
        }
      }
      const il = (a.op === 'open' || a.op === 'on') && R.interlock.find(x => x.larang === a.device && D.aktif(sim[x.saat]));
      if (il) { tolak.push({ device: a.device, aturan: 'interlock', pesan: il.pesan, saran: il.saran }); continue; }
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
    const per = ids().map(id => {
      const x = state[id], n = nm(id);
      switch (P[id].tipe) {
        case 'saklar': return `${n} ${x.on ? 'nyala' : 'mati'}`;
        case 'level': return x.on ? `${n} level ${x.speed}` : `${n} mati`;
        case 'buka': return `${n} ${x.open ? 'terbuka' : 'tertutup'}`;
        default: return `${n} ${x.on ? 'aktif' : 'diam'}`;
      }
    }).join(', ');
    return `Papan sensor: ${suhu}, ${cahaya}. Perangkat: ${per}.`;
  }

  function unik(aksi) {
    const out = [];
    for (const a of aksi) {
      const i = out.findIndex(x => x.device === a.device);
      if (i >= 0) out.splice(i, 1);
      out.push(a);
    }
    return out;
  }

  /* ---------- orkestrasi: aksi dibagi menjadi tahap (berurutan) berisi tugas per spesialis (paralel) ---------- */
  /* Perintah dipecah di kata urutan. "A setelah B" berarti B dulu. Perangkat yang disebut tiap segmen menentukan tahapnya. */
  function segmenUrut(teks) {
    const m = teks.match(/^(.*?)\s+(?:setelah|sesudah)\s+(.*)$/);
    const t2 = m ? `${m[2]} lalu ${m[1]}` : teks;
    return t2.split(/\s+(?:lalu|terus|kemudian|habis itu|setelah itu|baru)\s+/).map(c => {
      const d = new Set(ids().filter(k => POLA[k].test(c)));
      if (pertama('buka') && /\b(buka|bukain|bukakan|tutup|tutupin|tutupkan)\b/.test(c)) d.add(pertama('buka'));
      if (/\bsemua(nya)?\b/.test(c)) ids().forEach(k => d.add(k));
      return d;
    });
  }
  function bagiTugas(aksi, teksPesan) {
    if (!aksi.length) return null;
    const teks = pakaiAlias(norm(teksPesan));
    const urut = URUT.test(teks);
    // dua aksi yang terikat interlock tidak boleh satu tahap (hindari balapan antar spesialis)
    const terikat = (x, a) => R.interlock.some(il => (x.device === il.larang && (x.op === 'open' || x.op === 'on') && a.device === il.saat) || (a.device === il.larang && (a.op === 'open' || a.op === 'on') && x.device === il.saat));
    const bentrok = (st, a) => st.some(x => terikat(x, a));
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
      for (const nama of [...new Set(st.map(a => P[a.device].spesialis))]) tugas.push({ agen: nama, tahap: i, aksi: st.filter(a => P[a.device].spesialis === nama) });
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
    const mentah = norm(asli), teks = pakaiAlias(mentah);
    const out = { intent: 'tidak_paham', sub: '', diambil: [], didelegasikan_ke: null, memori: null, pikiran: '', aksi: [], ditolak: [], baca: false, fokus: 'semua', balasan: '', jejak: [] };
    const J = out.jejak;
    J.push({ k: 'terima', t: `Pesan masuk: "${potong(asli, 70)}"` });
    const selesai = (tujuan) => {
      const router = { k: 'router', intent: out.intent, t: `Router: intent "${LABEL_INTENT[out.intent]}"${out.sub ? ' (' + out.sub + ')' : ''}${tujuan ? '. Tujuan: ' + tujuan : ''}` };
      J.splice(1, 0, router);
      let i = 2;
      if (out.pikiran) J.splice(i++, 0, { k: 'pikir', t: out.pikiran });
      if (out.diambil.length) J.splice(i++, 0, { k: 'ambil', t: 'Membuka rak manual: ' + out.diambil.map(d => `${d.judul} (skor ${d.skor})`).join('; ') });
      if (out.memori) J.splice(i++, 0, { k: 'catat', t: `Menulis catatan baru ke rak manual: "${potong(out.memori.teks, 80)}"` });
      for (const d of delegasiJejak(out.didelegasikan_ke)) J.splice(i++, 0, { k: 'delegasi', t: d });
      for (const t of out.ditolak) J.push({ k: 'guard', t: `Guard (${t.aturan}): ${t.pesan}` });
      return out;
    };
    return { asli, mentah, teks, out, J, selesai };
  }

  /* Input guard: berjalan di kode, sebelum LLM dipanggil (hemat kuota dan lebih aman). Membaca teks sebelum alias. */
  function cekInjeksi(pesan) {
    const { mentah, out, selesai } = kerangka(pesan);
    const inj = mentah.match(INJEKSI);
    if (!inj) return null;
    out.intent = 'bahaya'; out.sub = 'injeksi';
    out.pikiran = `Ada pola "${inj[0]}" yang mencoba mengubah aturanku. Itu tidak kuikuti.`;
    out.ditolak.push({ device: null, aturan: 'injeksi', pesan: `Pola injeksi "${inj[0]}" terdeteksi di input.` });
    out.balasan = 'Aku tidak bisa mengabaikan aturan keselamatan. Kalau mau mengendalikan perangkat, sebut saja namanya ya.';
    return selesai('tidak ada aksi');
  }
  const adaInjeksi = teks => INJEKSI.test(norm(teks));
  const adaMemori = pesan => MEMORI.test(String(pesan || '').trim());

  function susunBalasan(v) {
    const bagian = [];
    if (v.ok.length) bagian.push('Siap! ' + daftar(v.ok.map(deskripsi), 'dan').replace(/, dan /, ' dan ') + '.');
    for (const t of v.tolak) bagian.push('Aku tolak: ' + t.pesan + (t.saran ? ' ' + t.saran : ''));
    return bagian.join(' ');
  }
  const tujuanSpesialis = out => (out.didelegasikan_ke ? 'spesialis ' + [...new Set(out.didelegasikan_ke.map(t => t.agen))].join(', ') : 'tidak ada aksi');

  function pikir(pesan, state, opsi) {
    opsi = opsi || {};
    const M = root.Manual;
    const manual = M && opsi.rag !== false && Array.isArray(opsi.manual) ? opsi.manual : null;
    const k = Math.max(1, Math.min(3, opsi.k | 0 || 2));
    const ctx = manual ? { M, manual } : null;
    const { asli, teks, out, selesai } = kerangka(pesan);
    const plIn = cekInjeksi(pesan);
    if (plIn) return plIn;
    const nama = ids().map(nm);

    // 1. Memori: "ingat ..." menulis catatan baru ke rak manual (RAG sebagai ingatan jangka panjang)
    const mm = asli.match(MEMORI);
    if (mm) {
      out.intent = 'obrol'; out.sub = 'simpan memori';
      if (!manual) { out.pikiran = 'Kamu memintaku mengingat sesuatu, tapi akses ke rak manual sedang dimatikan.'; out.balasan = 'Aku tidak bisa mencatat karena rak manual (RAG) sedang dimatikan.'; return selesai('tidak perlu berjalan'); }
      out.memori = { teks: mm[1].replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim() };
      out.pikiran = 'Ini bukan perintah perangkat. Kamu menitip informasi, jadi kutulis sebagai catatan di rak manual supaya bisa kubaca lagi nanti.';
      out.balasan = `Oke, kucatat di rak manual: "${potong(out.memori.teks, 120)}"`;
      return selesai('Rak Manual');
    }

    const perangkatAda = ids().filter(id => POLA[id].test(teks));
    const punyaAngka = perangkatAda.length && /(kecepatan|daya|level|tingkat|volume|sudut|derajat|\d+\s*%)/.test(teks);
    const verbAda = cariVerb(teks) || (punyaAngka ? 'on' : null);

    // 2. Obrolan
    if (!verbAda && !perangkatAda.length && (SAPA.test(teks) || TANYA_DIRI.test(teks))) {
      out.intent = 'obrol';
      out.pikiran = 'Ini sapaan atau pertanyaan umum, tidak perlu menyentuh perangkat.';
      out.balasan = TANYA_DIRI.test(teks) && !SAPA.test(teks)
        ? `Aku agen penjaga ${R.nama}. Aku bisa mengatur ${daftar(nama, 'dan')}, membaca papan sensor, atau membuka rak manual.`
        : `Halo! Aku siap menerima perintah. Coba: "nyalakan ${nama[0]}" atau "gerah nih".`;
      return selesai('tidak perlu berjalan');
    }

    // 2b. Pertanyaan tentang manual (SOP): agen ke rak manual, bukan ke papan sensor
    const jawabManual = (hit) => {
      out.intent = 'info'; out.sub = 'baca manual'; out.fokus = 'manual'; out.diambil = hit;
      out.pikiran = 'Ini pertanyaan tentang aturan atau pengetahuan ruangan. Aku cari jawabannya di rak manual, bukan menebak.';
      out.balasan = potong(`Menurut manual, ${hit[0].judul}: ${hit[0].teks}`, 260);
      return selesai('Rak Manual');
    };
    if (manual && !cariVerb(teks) && MANUAL_Q.test(teks)) {
      const hit = M.cari(teks, manual, k, 0.8);
      if (hit.length) return jawabManual(hit);
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
      out.pikiran = `Kamu menyebut ${perangkatAda.map(nm).join(' dan ')} tapi tidak bilang mau diapakan.`;
      out.balasan = `Mau diapakan ${nm(perangkatAda[0])}-nya? Misalnya: "nyalakan", "matikan", atau "buka".`;
      return selesai('bertanya balik');
    }
    if (jenis === 'tidak_paham') {
      // tidak ada kata perintah atau perangkat, tapi mungkin jawabannya ada di rak manual (ambang skor lebih ketat)
      if (manual) { const hit = M.cari(teks, manual, k, 1.2); if (hit.length) return jawabManual(hit); }
      out.pikiran = 'Tidak ada kata perintah, nama perangkat, atau keluhan yang kukenali.';
      out.balasan = `Hmm, aku belum paham. Sebut perangkatnya (${nama.join(', ')}) atau bilang keluhanmu, misalnya "gerah" atau "gelap".`;
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
      const gm = gaul.find(g => g.manual);
      if (gm) out.diambil = M.ambilId(manual, gm.sumber);
      if (!rencana.length && gm) {
        out.intent = 'info'; out.sub = 'sudah nyaman (manual)';
        out.pikiran = gaul.map(g => g.alasan).join('; ') + '.';
        out.balasan = 'Ruangan sudah nyaman menurut manual, tidak ada yang perlu diubah.';
        return selesai('Rak Manual');
      }
      out.pikiran = gaul.map(g => `"${g.kata}" berarti ${g.alasan}`).join('; ') + `. Kutafsirkan menjadi: ${rencana.map(a => a.device + ' ' + a.op).join(', ')}.`;
    }

    if (!rencana.length) {
      out.intent = 'tidak_paham'; out.sub = 'perlu klarifikasi';
      out.balasan = `Perangkat apa yang dimaksud? Pilih: ${daftar(nama, 'atau')}.`;
      return selesai('bertanya balik');
    }

    const v = validasi(rencana, state);
    out.aksi = v.ok;
    out.ditolak = v.tolak;
    out.intent = v.ok.length ? 'kontrol' : 'bahaya';
    if (!v.ok.length) out.sub = 'ditolak oleh aturan';
    out.balasan = susunBalasan(v);
    out.didelegasikan_ke = bagiTugas(v.ok, pesan);
    return selesai(tujuanSpesialis(out));
  }

  /* Mengubah usulan dari LLM (sudah dinormalisasi) menjadi rencana yang sama bentuknya dengan parser.
     Guardrail aksi tetap dijalankan di kode: LLM hanya mengusulkan, tidak memutuskan. */
  function dariUsulan(pesan, u, state, opsi) {
    opsi = opsi || {};
    const { teks, out, selesai } = kerangka(pesan);
    out.pikiran = u.pikiran || '';
    out.diambil = Array.isArray(opsi.diambil) ? opsi.diambil : [];
    const ada = (u.aksi || []).length;
    if (u.intent === 'info' && u.fokus === 'manual' && u.balasan && out.diambil.length && (MANUAL_Q.test(teks) || !INFO_LUNAK.test(teks))) {
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
    out.didelegasikan_ke = bagiTugas(v.ok, pesan);
    return selesai(tujuanSpesialis(out));
  }

  aturRuang(D.RUANG.lab);
  const api = { pikir, cekInjeksi, adaInjeksi, adaMemori, bagiTugas, dariUsulan, validasi, terapkan, deskripsi, laporSensor, stateAwal, norm, aturRuang, ruang: () => R };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Otak = api;
})(typeof window !== 'undefined' ? window : globalThis);
