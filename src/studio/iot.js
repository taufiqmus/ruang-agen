/* Studio Rumah Agen: dunia IoT sebagai DATA.
   Katalog perangkat (papan ESP, sensor, aktuator, modul relay, daya, jaringan), pemeriksa dunia, rangkaian kabel,
   kelistrikan, sinyal Wi-Fi, dan mesin simulasi (waktu, cuaca, suhu, cahaya, tanah, pakan, gas, tanaman, ayam).
   Fungsi murni tanpa DOM, supaya bisa diuji di Node. */
(function (root) {
  'use strict';
  const VERSI = 1;
  const BATAS = { area: 10, perangkat: 48, nama: 24, lebar: 60, dalam: 44 };
  const ESP32_DIGITAL = [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33];
  const ESP32_ADC = [32, 33, 34, 35, 36, 39];
  const ESP32_INPUT = [34, 35, 36, 39];   // hanya input, tidak bisa menggerakkan relay

  /* ---------- tipe area ---------- */
  const AREA = {
    kamar: { nama: 'Kamar', dinding: true, warna: '#e9e4f5', lantai: 'kayu', luar: false },
    ruang_tamu: { nama: 'Ruang tamu', dinding: true, warna: '#f1e8dc', lantai: 'kayu', luar: false },
    dapur: { nama: 'Dapur', dinding: true, warna: '#e3eef2', lantai: 'ubin', luar: false },
    gudang: { nama: 'Gudang', dinding: true, warna: '#e6e2d8', lantai: 'beton', luar: false },
    kebun: { nama: 'Kebun', dinding: false, warna: '#cfe8b8', lantai: 'tanah', luar: true, tanaman: true },
    kandang: { nama: 'Kandang ayam', dinding: false, warna: '#efdfb6', lantai: 'jerami', luar: true, hewan: true }
  };

  /* ---------- katalog perangkat ----------
     kategori: papan | sensor | aktuator | modul | daya | jaringan
     sensor  : baca (variabel), sinyal (digital|analog), vcc, derau
     aktuator: efek per variabel saat menyala, arus (mA), watt, butuhRelay, level (opsional) */
  const KATALOG = {
    esp32: { kategori: 'papan', nama: 'ESP32 DevKit', harga: 65000, bentuk: 'papan', deskripsi: 'Mikrokontroler dengan Wi-Fi. Pin digital dan analog (ADC).', watt: 0.5 },
    esp8266: { kategori: 'papan', nama: 'ESP8266 NodeMCU', harga: 35000, bentuk: 'papan', deskripsi: 'Lebih murah, pin lebih sedikit, hanya satu pin analog (A0).', watt: 0.4 },
    dht22: { kategori: 'sensor', nama: 'DHT22', harga: 45000, bentuk: 'sensor_kotak', baca: ['suhu', 'lembap'], sinyal: 'digital', vcc: '3V3', derau: { suhu: 0.3, lembap: 1.5 }, deskripsi: 'Sensor suhu dan kelembapan udara.' },
    soil: { kategori: 'sensor', nama: 'Sensor kelembapan tanah', harga: 15000, bentuk: 'tusuk', baca: ['tanah'], sinyal: 'analog', vcc: '3V3', derau: { tanah: 1.5 }, deskripsi: 'Mengukur kelembapan tanah (persen). Pakai pin analog.' },
    ldr: { kategori: 'sensor', nama: 'Sensor cahaya LDR', harga: 5000, bentuk: 'sensor_kecil', baca: ['cahaya'], sinyal: 'analog', vcc: '3V3', derau: { cahaya: 15 }, deskripsi: 'Mengukur cahaya (lux). Pakai pin analog.' },
    pir: { kategori: 'sensor', nama: 'Sensor gerak PIR', harga: 15000, bentuk: 'kubah', baca: ['gerak'], sinyal: 'digital', vcc: '5V', derau: {}, deskripsi: 'Mendeteksi gerakan orang atau hewan.' },
    mq2: { kategori: 'sensor', nama: 'Sensor gas MQ-2', harga: 25000, bentuk: 'sensor_kotak', baca: ['gas'], sinyal: 'analog', vcc: '5V', derau: { gas: 8 }, deskripsi: 'Mendeteksi gas dan asap (ppm). Butuh 5 V.' },
    ultrasonik: { kategori: 'sensor', nama: 'Sensor jarak ultrasonik', harga: 20000, bentuk: 'mata', baca: ['air'], sinyal: 'digital', vcc: '5V', derau: { air: 1 }, deskripsi: 'Dipasang di tandon untuk mengukur tinggi air (persen).' },
    loadcell: { kategori: 'sensor', nama: 'Timbangan load cell HX711', harga: 60000, bentuk: 'timbangan', baca: ['pakan'], sinyal: 'digital', vcc: '3V3', derau: { pakan: 0.8 }, deskripsi: 'Menimbang sisa pakan di tempat pakan (persen).' },
    reed: { kategori: 'sensor', nama: 'Sensor pintu (reed switch)', harga: 8000, bentuk: 'sensor_kecil', baca: ['pintu'], sinyal: 'digital', vcc: '3V3', derau: {}, deskripsi: 'Mendeteksi pintu terbuka atau tertutup.' },
    arus: { kategori: 'sensor', nama: 'Sensor arus ACS712', harga: 35000, bentuk: 'sensor_kecil', baca: ['listrik'], sinyal: 'analog', vcc: '5V', derau: { listrik: 3 }, deskripsi: 'Mengukur pemakaian listrik rumah (watt).' },
    kipas: { kategori: 'aktuator', nama: 'Kipas angin', harga: 150000, bentuk: 'kipas', efek: { suhu: -3.5 }, arus: 300, watt: 45, butuhRelay: true, level: 3, deskripsi: 'Mendinginkan area. Arus besar, wajib lewat relay.' },
    lampu: { kategori: 'aktuator', nama: 'Lampu LED 220 V', harga: 30000, bentuk: 'lampu', efek: { cahaya: 320, suhu: 0.3 }, arus: 50, watt: 9, butuhRelay: true, deskripsi: 'Lampu rumah. Tegangan 220 V, wajib lewat relay.' },
    pemanas: { kategori: 'aktuator', nama: 'Lampu pemanas kandang', harga: 55000, bentuk: 'lampu_merah', efek: { suhu: 7, cahaya: 120 }, arus: 450, watt: 100, butuhRelay: true, berisiko: true, deskripsi: 'Menghangatkan anak ayam. Berisiko panas berlebih.' },
    pompa: { kategori: 'aktuator', nama: 'Pompa air 12 V', harga: 85000, bentuk: 'pompa', efek: { tanah: 2.2 }, arus: 800, watt: 18, butuhRelay: true, pakaiAir: 0.8, deskripsi: 'Menyiram kebun dari tandon. Wajib lewat relay.' },
    valve: { kategori: 'aktuator', nama: 'Solenoid valve isi tandon', harga: 70000, bentuk: 'katup', efek: { air: 3 }, arus: 500, watt: 8, butuhRelay: true, deskripsi: 'Membuka keran PDAM untuk mengisi tandon.' },
    exhaust: { kategori: 'aktuator', nama: 'Exhaust fan', harga: 120000, bentuk: 'kipas', efek: { gas: -40, suhu: -1 }, arus: 250, watt: 30, butuhRelay: true, deskripsi: 'Membuang asap dan gas dari dapur.' },
    servo_pakan: { kategori: 'aktuator', nama: 'Servo pemberi pakan', harga: 40000, bentuk: 'servo', efek: {}, arus: 20, watt: 2, butuhRelay: false, isiPakan: true, deskripsi: 'Membuka tempat pakan sebentar. Sinyal PWM langsung dari ESP.' },
    buzzer: { kategori: 'aktuator', nama: 'Buzzer alarm', harga: 5000, bentuk: 'sensor_kecil', efek: {}, arus: 25, watt: 0.2, butuhRelay: false, deskripsi: 'Alarm bunyi. Arus kecil, langsung ke pin ESP.' },
    kunci: { kategori: 'aktuator', nama: 'Kunci pintu solenoid', harga: 90000, bentuk: 'kunci', efek: {}, arus: 600, watt: 7, butuhRelay: true, berisiko: true, deskripsi: 'Membuka kunci pintu. Berisiko keamanan rumah.' },
    relay1: { kategori: 'modul', nama: 'Modul relay 1 kanal', harga: 12000, bentuk: 'relay', kanal: 1, deskripsi: 'Saklar elektrik yang dikendalikan pin ESP untuk beban besar.' },
    relay4: { kategori: 'modul', nama: 'Modul relay 4 kanal', harga: 38000, bentuk: 'relay', kanal: 4, deskripsi: 'Empat saklar elektrik dalam satu modul.' },
    adaptor: { kategori: 'daya', nama: 'Adaptor 5 V', harga: 25000, bentuk: 'adaptor', deskripsi: 'Daya dari listrik rumah. Mati saat listrik padam.' },
    baterai: { kategori: 'daya', nama: 'Baterai 18650 + modul', harga: 60000, bentuk: 'baterai', kapasitas: 10, deskripsi: 'Cadangan daya 10 Wh. Habis bila tidak diisi.' },
    surya: { kategori: 'daya', nama: 'Panel surya 10 W + baterai', harga: 180000, bentuk: 'surya', kapasitas: 20, watt: 10, deskripsi: 'Mengisi baterai saat siang. Cocok untuk kebun dan kandang.' },
    router: { kategori: 'jaringan', nama: 'Router Wi-Fi', harga: 250000, bentuk: 'router', daya: -32, deskripsi: 'Pusat jaringan. Sinyal melemah oleh jarak dan dinding.' },
    repeater: { kategori: 'jaringan', nama: 'Repeater Wi-Fi', harga: 120000, bentuk: 'router', daya: -36, deskripsi: 'Memperluas jangkauan. Harus berada dalam jangkauan router.' },
    tandon: { kategori: 'modul', nama: 'Tandon air', harga: 350000, bentuk: 'tandon', deskripsi: 'Penampung air untuk pompa kebun.' }
  };
  const VAR = { suhu: { satuan: 'C', nama: 'suhu' }, lembap: { satuan: '%', nama: 'kelembapan udara' }, cahaya: { satuan: 'lux', nama: 'cahaya' }, tanah: { satuan: '%', nama: 'kelembapan tanah' }, gerak: { satuan: '', nama: 'gerakan' }, gas: { satuan: 'ppm', nama: 'gas' }, air: { satuan: '%', nama: 'air tandon' }, pakan: { satuan: '%', nama: 'sisa pakan' }, pintu: { satuan: '', nama: 'pintu' }, listrik: { satuan: 'W', nama: 'pemakaian listrik' } };

  const pinAda = (papan, pin) => (papan === 'esp8266' ? /^(D[0-8]|A0)$/.test(pin) : /^GPIO\d+$/.test(pin) && ESP32_DIGITAL.concat(ESP32_ADC).includes(+pin.slice(4)));
  const pinAnalog = (papan, pin) => (papan === 'esp8266' ? pin === 'A0' : ESP32_ADC.includes(+String(pin).slice(4)));
  const pinInputSaja = (papan, pin) => papan === 'esp32' && ESP32_INPUT.includes(+String(pin).slice(4));
  function daftarPin(papan) { return papan === 'esp8266' ? ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'A0'] : ESP32_DIGITAL.concat(ESP32_ADC.filter(x => !ESP32_DIGITAL.includes(x))).sort((a, b) => a - b).map(n => 'GPIO' + n); }

  /* ---------- pemeriksa dunia (impor tidak dipercaya) ---------- */
  const teks = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const angka = (v, a, b, d) => { const x = Number(v); return Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : d; };
  const OK_ID = /^[a-z][a-z0-9_]{1,23}$/;
  function periksaDunia(def) {
    const G = [];
    if (!def || typeof def !== 'object' || Array.isArray(def)) return { ok: false, galat: ['Dunia harus berupa objek JSON.'], dunia: null };
    const W = { versi: VERSI, nama: teks(def.nama, 40) || 'Rumahku', lebar: angka(def.lebar, 16, BATAS.lebar, 36), dalam: angka(def.dalam, 12, BATAS.dalam, 26), area: [], perangkat: [] };
    const area = Array.isArray(def.area) ? def.area : [];
    if (area.length > BATAS.area) G.push(`Maksimal ${BATAS.area} area.`);
    for (const a of area.slice(0, BATAS.area)) {
      if (!a || !OK_ID.test(String(a.id))) { G.push(`Area "${teks(a && a.id, 20)}": id huruf kecil, angka, garis bawah.`); continue; }
      if (!AREA[a.tipe]) { G.push(`Area ${a.id}: tipe "${teks(a.tipe, 16)}" tidak dikenal.`); continue; }
      if (W.area.some(x => x.id === a.id)) { G.push(`Area ${a.id} ganda.`); continue; }
      W.area.push({ id: a.id, tipe: a.tipe, nama: teks(a.nama, BATAS.nama) || AREA[a.tipe].nama, x: angka(a.x, 0, W.lebar - 2, 0), z: angka(a.z, 0, W.dalam - 2, 0), w: angka(a.w, 2, 20, 6), d: angka(a.d, 2, 20, 5) });
    }
    const pr = Array.isArray(def.perangkat) ? def.perangkat : [];
    if (pr.length > BATAS.perangkat) G.push(`Maksimal ${BATAS.perangkat} perangkat (supaya ringan di laptop lemah).`);
    for (const p of pr.slice(0, BATAS.perangkat)) {
      if (!p || !OK_ID.test(String(p.id))) { G.push(`Perangkat "${teks(p && p.id, 20)}": id huruf kecil, angka, garis bawah.`); continue; }
      if (!KATALOG[p.jenis]) { G.push(`Perangkat ${p.id}: jenis "${teks(p.jenis, 16)}" tidak ada di katalog.`); continue; }
      if (W.perangkat.some(x => x.id === p.id)) { G.push(`Perangkat ${p.id} ganda.`); continue; }
      const x = { id: p.id, jenis: p.jenis, nama: teks(p.nama, BATAS.nama) || KATALOG[p.jenis].nama, x: angka(p.x, 0, W.lebar, 1), z: angka(p.z, 0, W.dalam, 1) };
      if (p.sambung && typeof p.sambung === 'object') x.sambung = { esp: teks(p.sambung.esp, 24), pin: teks(p.sambung.pin, 8), relay: teks(p.sambung.relay, 24), kanal: Math.round(angka(p.sambung.kanal, 1, 4, 1)) };
      if (p.daya) x.daya = teks(p.daya, 24);
      W.perangkat.push(x);
    }
    return { ok: G.length === 0, galat: G, dunia: W };
  }

  const areaDi = (W, x, z) => W.area.find(a => x >= a.x && x <= a.x + a.w && z >= a.z && z <= a.z + a.d) || null;
  const cari = (W, id) => W.perangkat.find(p => p.id === id);

  /* ---------- rangkaian: kabel, relay, daya ----------
     Mengembalikan status tiap perangkat: masalah (daftar kalimat), dayaOk, tersambung. */
  function periksaRangkaian(W) {
    const st = {};
    const pakai = {};   // esp -> pin -> id
    for (const p of W.perangkat) st[p.id] = { masalah: [], tersambung: false, area: (areaDi(W, p.x, p.z) || {}).id || null };
    for (const p of W.perangkat) {
      const K = KATALOG[p.jenis], s = st[p.id];
      if (K.kategori === 'papan') {
        const d = p.daya && cari(W, p.daya);
        if (!d || KATALOG[d.jenis].kategori !== 'daya') s.masalah.push('Belum punya sumber daya (pasang adaptor, baterai, atau panel surya, lalu sambungkan).');
        s.tersambung = !!d;
        continue;
      }
      if (K.kategori !== 'sensor' && K.kategori !== 'aktuator' && !(K.kategori === 'modul' && K.kanal)) continue;
      const sb = p.sambung;
      if (K.kategori === 'aktuator' && K.butuhRelay) {
        if (!sb || !sb.relay) { s.masalah.push(`Arus ${K.arus} mA terlalu besar untuk pin ESP (maks 40 mA). Sambungkan lewat modul relay.`); continue; }
        const r = cari(W, sb.relay);
        if (!r || !KATALOG[r.jenis].kanal) { s.masalah.push('Relay yang dipilih tidak ada.'); continue; }
        if (sb.kanal > KATALOG[r.jenis].kanal) { s.masalah.push(`Relay ${r.nama} hanya punya ${KATALOG[r.jenis].kanal} kanal.`); continue; }
        const lain = W.perangkat.find(q => q !== p && q.sambung && q.sambung.relay === r.id && q.sambung.kanal === sb.kanal);
        if (lain) { s.masalah.push(`Kanal ${sb.kanal} relay sudah dipakai ${lain.nama}.`); continue; }
        s.relay = r.id;
        s.tersambung = true;   // status akhir mengikuti relay (dicek di bawah)
        continue;
      }
      if (!sb || !sb.esp) { s.masalah.push('Belum disambungkan ke ESP.'); continue; }
      const e = cari(W, sb.esp);
      if (!e || KATALOG[e.jenis].kategori !== 'papan') { s.masalah.push('ESP yang dipilih tidak ada.'); continue; }
      if (!pinAda(e.jenis, sb.pin)) { s.masalah.push(`Pin ${sb.pin || '(kosong)'} tidak ada di ${KATALOG[e.jenis].nama}.`); continue; }
      if (K.sinyal === 'analog' && !pinAnalog(e.jenis, sb.pin)) { s.masalah.push(`${K.nama} butuh pin analog (ADC), tetapi ${sb.pin} digital. Bacaan menjadi NaN.`); s.salahPin = true; }
      if ((K.kategori === 'aktuator' || K.kanal) && pinInputSaja(e.jenis, sb.pin)) { s.masalah.push(`${sb.pin} hanya bisa input, tidak bisa menggerakkan ${K.nama}.`); s.salahPin = true; }
      pakai[e.id] = pakai[e.id] || {};
      if (pakai[e.id][sb.pin]) { s.masalah.push(`Pin ${sb.pin} sudah dipakai ${cari(W, pakai[e.id][sb.pin]).nama}.`); s.salahPin = true; }
      else pakai[e.id][sb.pin] = p.id;
      s.esp = e.id; s.tersambung = !s.salahPin;
    }
    // aktuator lewat relay mengikuti ESP milik relay
    for (const p of W.perangkat) {
      const s = st[p.id];
      if (s.relay) { const r = st[s.relay]; if (!r.esp) { s.masalah.push('Relay belum disambungkan ke ESP.'); s.tersambung = false; } else { s.esp = r.esp; s.tersambung = r.tersambung; } }
    }
    return st;
  }

  /* ---------- Wi-Fi: RSSI dari jarak dan dinding yang ditembus ---------- */
  function dindingDilewati(W, x1, z1, x2, z2) {
    let n = 0;
    for (const a of W.area) {
      if (!AREA[a.tipe].dinding) continue;
      const dalam1 = x1 >= a.x && x1 <= a.x + a.w && z1 >= a.z && z1 <= a.z + a.d;
      const dalam2 = x2 >= a.x && x2 <= a.x + a.w && z2 >= a.z && z2 <= a.z + a.d;
      if (dalam1 && dalam2) continue;
      // hitung perpotongan ruas dengan keempat sisi persegi
      const sisi = [[a.x, a.z, a.x + a.w, a.z], [a.x + a.w, a.z, a.x + a.w, a.z + a.d], [a.x, a.z + a.d, a.x + a.w, a.z + a.d], [a.x, a.z, a.x, a.z + a.d]];
      for (const [p1, q1, p2, q2] of sisi) if (potong(x1, z1, x2, z2, p1, q1, p2, q2)) n++;
    }
    return n;
  }
  function potong(ax, ay, bx, by, cx, cy, dx, dy) {
    const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(d) < 1e-9) return false;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
    return t > 0 && t < 1 && u >= 0 && u <= 1;
  }
  const AMBANG_WIFI = -78;
  function rssiDari(W, sumber, x, z) {
    const d = Math.max(1, Math.hypot(sumber.x - x, sumber.z - z));
    return Math.round(KATALOG[sumber.jenis].daya - 26 * Math.log10(d) - 6 * dindingDilewati(W, sumber.x, sumber.z, x, z));
  }
  /* Repeater hanya memancar bila ia sendiri dapat sinyal router. Mengembalikan peta id -> {rssi, online, lewat}. */
  function hitungWifi(W, listrikAda) {
    const routers = W.perangkat.filter(p => p.jenis === 'router');
    const aktif = listrikAda === false ? [] : routers.slice();
    for (const r of W.perangkat.filter(p => p.jenis === 'repeater')) {
      if (listrikAda === false) break;
      const terbaik = Math.max(-120, ...routers.map(s => rssiDari(W, s, r.x, r.z)));
      if (terbaik >= AMBANG_WIFI) aktif.push(r);
    }
    const hasil = {};
    for (const p of W.perangkat) {
      if (KATALOG[p.jenis].kategori !== 'papan' && p.jenis !== 'repeater') continue;
      let best = -120, lewat = null;
      for (const s of aktif) { if (s === p) continue; const v = rssiDari(W, s, p.x, p.z); if (v > best) { best = v; lewat = s.id; } }
      hasil[p.id] = { rssi: best, online: best >= AMBANG_WIFI, lewat };
    }
    return hasil;
  }

  /* ---------- simulasi ---------- */
  function acak(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function buatSim(W, opsi) {
    opsi = opsi || {};
    const S = {
      menit: angka(opsi.mulai, 0, 1439, 9 * 60), hari: 1, cuaca: 'cerah', listrik: true, rnd: acak(opsi.seed || 7),
      area: {}, alat: {}, baterai: {}, tandon: 70, log: [], sejarah: {}, kekacauan: { wifi: false, sensorRusak: null, listrik: false }
    };
    for (const a of W.area) {
      const T = AREA[a.tipe];
      S.area[a.id] = { suhu: T.luar ? 29 : 27, lembap: 70, cahaya: 0, tanah: T.tanaman ? 55 : null, pakan: T.hewan ? 80 : null, gas: a.tipe === 'dapur' ? 20 : 5, gerak: false, pintu: false, tanaman: T.tanaman ? 90 : null, ayam: T.hewan ? 90 : null };
    }
    for (const p of W.perangkat) {
      const K = KATALOG[p.jenis];
      if (K.kategori === 'aktuator') S.alat[p.id] = { on: false, level: K.level ? 2 : 1, sejak: 0 };
      if (K.kapasitas) S.baterai[p.id] = K.kapasitas * 0.8;
    }
    return S;
  }
  const jam = S => (S.menit % 1440) / 60;
  function cahayaLuar(S) { const j = jam(S); const t = Math.max(0, Math.sin((j - 6) / 12 * Math.PI)); return Math.round(t * (S.cuaca === 'hujan' ? 350 : S.cuaca === 'berawan' ? 600 : 900)); }
  function suhuLuar(S) { const j = jam(S); return 27 + 5 * Math.sin((j - 9) / 24 * 2 * Math.PI) - (S.cuaca === 'hujan' ? 3 : 0); }

  /* Status menyeluruh: rangkaian + daya + Wi-Fi. Dipakai sensor, aktuator, 3D, dan dashboard. */
  function status(W, S) {
    const rk = periksaRangkaian(W);
    const listrik = S.listrik && !S.kekacauan.listrik;
    const wifi = S.kekacauan.wifi ? {} : hitungWifi(W, listrik);
    const papan = {};
    for (const p of W.perangkat) {
      if (KATALOG[p.jenis].kategori !== 'papan') continue;
      const d = p.daya && cari(W, p.daya);
      let hidup = false;
      if (d) hidup = d.jenis === 'adaptor' ? listrik : (S.baterai[d.id] || 0) > 0.05;
      const w = wifi[p.id] || { rssi: -120, online: false };
      papan[p.id] = { hidup, rssi: w.rssi, online: hidup && w.online, lewat: w.lewat || null };
    }
    return { rk, papan, listrik };
  }

  /* Membaca satu sensor seperti ESP sungguhan: null bila ESP mati atau offline, NaN bila salah sambung. */
  function bacaSensor(W, S, id, st) {
    const p = cari(W, id); if (!p) return { ok: false, alasan: 'sensor tidak ada' };
    const K = KATALOG[p.jenis]; if (K.kategori !== 'sensor') return { ok: false, alasan: 'bukan sensor' };
    st = st || status(W, S);
    const r = st.rk[id];
    if (!r.tersambung && !r.salahPin) return { ok: false, alasan: r.masalah[0] || 'belum tersambung' };
    const pb = st.papan[r.esp];
    if (!pb || !pb.hidup) return { ok: false, alasan: 'ESP tidak menyala (cek sumber daya)' };
    if (!pb.online) return { ok: false, alasan: `ESP offline (sinyal ${pb.rssi} dBm terlalu lemah)` };
    const nilai = {};
    for (const v of K.baca) {
      if (r.salahPin || S.kekacauan.sensorRusak === id) { nilai[v] = NaN; continue; }
      let x;
      if (v === 'air') x = S.tandon;
      else if (v === 'listrik') x = dayaTerpakai(W, S);
      else { const A = S.area[r.area]; x = A ? A[v] : null; }
      if (x == null) { nilai[v] = null; continue; }
      if (typeof x === 'boolean') { nilai[v] = x; continue; }
      const dr = (K.derau || {})[v] || 0;
      nilai[v] = Math.round((x + (S.rnd() * 2 - 1) * dr) * 10) / 10;
    }
    return { ok: true, nilai, area: r.area, esp: r.esp, rssi: pb.rssi };
  }
  const dayaTerpakai = (W, S) => Math.round(W.perangkat.reduce((t, p) => t + (S.alat[p.id] && S.alat[p.id].on ? KATALOG[p.jenis].watt || 0 : 0), 0) + 60);

  /* Menjalankan perintah ke aktuator. Guard batas dan persetujuan ada di alat.js; di sini hanya fisika rangkaian. */
  function aturAktuator(W, S, id, nyala, level, st) {
    const p = cari(W, id); if (!p) return { ok: false, alasan: 'perangkat tidak ada' };
    const K = KATALOG[p.jenis]; if (K.kategori !== 'aktuator') return { ok: false, alasan: 'bukan aktuator' };
    st = st || status(W, S);
    const r = st.rk[id];
    if (!r.tersambung) return { ok: false, alasan: r.masalah[0] || 'belum tersambung' };
    const pb = st.papan[r.esp];
    if (!pb || !pb.hidup) return { ok: false, alasan: 'ESP tidak menyala (cek sumber daya)' };
    if (!pb.online) return { ok: false, alasan: `ESP offline (sinyal ${pb.rssi} dBm)` };
    if (K.butuhRelay && !st.listrik) return { ok: false, alasan: 'listrik padam, beban 220 V tidak bisa menyala' };
    const a = S.alat[id];
    a.on = !!nyala; a.sejak = S.menit;
    if (K.level && level != null) a.level = Math.max(1, Math.min(K.level, Math.round(level)));
    if (K.isiPakan && a.on) { const A = S.area[r.area]; if (A && A.pakan != null) A.pakan = 100; a.on = false; }
    return { ok: true, area: r.area };
  }

  /* Satu langkah simulasi (dt dalam menit). */
  function langkah(W, S, dt) {
    dt = dt || 1;
    const st = status(W, S);
    S.menit += dt; if (S.menit >= S.hari * 1440) { S.hari++; }
    const luar = suhuLuar(S), terang = cahayaLuar(S);
    const listrik = st.listrik;
    for (const a of W.area) {
      const A = S.area[a.id], T = AREA[a.tipe];
      let target = T.luar ? luar + (T.hewan ? 1 : 0) : luar - 1.5, cahaya = T.luar ? terang : terang * 0.25, tanah = 0, gas = 0;
      for (const p of W.perangkat) {
        const al = S.alat[p.id]; if (!al || !al.on) continue;
        const K = KATALOG[p.jenis], r = st.rk[p.id];
        if (r.area !== a.id) continue;
        if (K.butuhRelay && !listrik) continue;
        const f = K.level ? al.level / 2 : 1;
        if (K.efek.suhu) target += K.efek.suhu * f;
        if (K.efek.cahaya) cahaya += K.efek.cahaya;
        if (K.efek.gas) gas += K.efek.gas * f;
        if (K.efek.tanah) { if (S.tandon > 1) { tanah += K.efek.tanah; S.tandon = Math.max(0, S.tandon - (K.pakaiAir || 0) * dt); } }
      }
      A.suhu += (target - A.suhu) * Math.min(1, dt / 25);
      A.cahaya = Math.round(cahaya);
      A.lembap = Math.max(30, Math.min(98, (S.cuaca === 'hujan' ? 92 : 88 - (A.suhu - 22) * 2.2)));
      if (A.tanah != null) A.tanah = Math.max(0, Math.min(100, A.tanah + (tanah - (S.cuaca === 'hujan' ? -0.25 : 0.022 + Math.max(0, A.suhu - 25) * 0.004) * 1) * dt));
      if (A.pakan != null && jam(S) > 5.5 && jam(S) < 18.5) A.pakan = Math.max(0, A.pakan - 0.035 * dt);
      if (a.tipe === 'dapur') { const masak = (jam(S) >= 6.5 && jam(S) < 7.2) || (jam(S) >= 17.5 && jam(S) < 18.3); A.gas = Math.max(5, A.gas + ((masak ? 25 : 0) + gas - (A.gas - 20) * 0.08) * dt); }
      A.gerak = !T.luar ? (jam(S) >= 18 && jam(S) < 22.5 ? S.rnd() < 0.6 : S.rnd() < 0.05) : (T.hewan ? S.rnd() < 0.7 : S.rnd() < 0.1);
      if (A.tanaman != null) A.tanaman = Math.max(0, Math.min(100, A.tanaman + (A.tanah >= 35 && A.tanah <= 85 ? 0.02 : -0.06) * dt));
      if (A.ayam != null) { const nyaman = A.suhu >= 20 && A.suhu <= 31 && A.pakan > 5; A.ayam = Math.max(0, Math.min(100, A.ayam + (nyaman ? 0.03 : -0.08) * dt)); }
    }
    for (const p of W.perangkat) {
      const al = S.alat[p.id];
      if (al && al.on && p.jenis === 'valve') S.tandon = Math.min(100, S.tandon + KATALOG.valve.efek.air * dt * (listrik ? 1 : 0));
      if (S.baterai[p.id] != null) {
        const K = KATALOG[p.jenis];
        const pakai = W.perangkat.filter(q => q.daya === p.id).reduce((t, q) => t + (KATALOG[q.jenis].watt || 0.5), 0);
        const isi = K.watt ? K.watt * (terang / 900) : 0;
        S.baterai[p.id] = Math.max(0, Math.min(K.kapasitas, S.baterai[p.id] + (isi - pakai) * dt / 60));
      }
    }
    // rekam sejarah sensor (setiap 10 menit simulasi)
    if (Math.floor(S.menit / 10) !== Math.floor((S.menit - dt) / 10)) {
      for (const p of W.perangkat) {
        if (KATALOG[p.jenis].kategori !== 'sensor') continue;
        const b = bacaSensor(W, S, p.id, st);
        const h = S.sejarah[p.id] = S.sejarah[p.id] || [];
        h.push({ t: S.menit, v: b.ok ? b.nilai : null });
        if (h.length > 288) h.shift();
      }
    }
    return S;
  }

  /* ---------- preset ---------- */
  const PRESET = {
    kosong: { nama: 'Lahan kosong', lebar: 36, dalam: 26, area: [], perangkat: [] },
    rumah_kecil: {
      nama: 'Rumah kecil', lebar: 36, dalam: 26,
      area: [{ id: 'kamar', tipe: 'kamar', x: 4, z: 4, w: 6, d: 5 }, { id: 'ruang_tamu', tipe: 'ruang_tamu', x: 10, z: 4, w: 7, d: 5 }],
      perangkat: [
        { id: 'router', jenis: 'router', x: 13, z: 6 },
        { id: 'esp_kamar', jenis: 'esp32', x: 5, z: 5, daya: 'adaptor_kamar' }, { id: 'adaptor_kamar', jenis: 'adaptor', x: 5.9, z: 5 },
        { id: 'dht_kamar', jenis: 'dht22', nama: 'DHT22 kamar', x: 6, z: 6, sambung: { esp: 'esp_kamar', pin: 'GPIO4' } },
        { id: 'relay_kamar', jenis: 'relay1', x: 5, z: 6, sambung: { esp: 'esp_kamar', pin: 'GPIO26' } },
        { id: 'kipas_kamar', jenis: 'kipas', nama: 'Kipas kamar', x: 8, z: 7, sambung: { relay: 'relay_kamar', kanal: 1 } }
      ]
    },
    rumah_kebun_kandang: {
      nama: 'Rumah, kebun, dan kandang', lebar: 40, dalam: 30,
      area: [{ id: 'kamar', tipe: 'kamar', x: 3, z: 3, w: 6, d: 5 }, { id: 'ruang_tamu', tipe: 'ruang_tamu', x: 9, z: 3, w: 7, d: 5 }, { id: 'dapur', tipe: 'dapur', x: 16, z: 3, w: 5, d: 5 },
        { id: 'kebun', tipe: 'kebun', x: 3, z: 13, w: 12, d: 9 }, { id: 'kandang', tipe: 'kandang', x: 23, z: 12, w: 9, d: 7 }],
      perangkat: [
        { id: 'router', jenis: 'router', x: 12, z: 5 },
        { id: 'esp_rumah', jenis: 'esp32', nama: 'ESP rumah', x: 10, z: 6.5, daya: 'adaptor_rumah' }, { id: 'adaptor_rumah', jenis: 'adaptor', x: 10, z: 7.4 },
        { id: 'dht_kamar', jenis: 'dht22', nama: 'DHT22 kamar', x: 5, z: 5, sambung: { esp: 'esp_rumah', pin: 'GPIO4' } },
        { id: 'mq2_dapur', jenis: 'mq2', nama: 'Gas dapur', x: 18, z: 5, sambung: { esp: 'esp_rumah', pin: 'GPIO34' } },
        { id: 'relay_rumah', jenis: 'relay4', nama: 'Relay rumah', x: 11.1, z: 6.5, sambung: { esp: 'esp_rumah', pin: 'GPIO26' } },
        { id: 'kipas_kamar', jenis: 'kipas', nama: 'Kipas kamar', x: 7, z: 6, sambung: { relay: 'relay_rumah', kanal: 1 } },
        { id: 'lampu_tamu', jenis: 'lampu', nama: 'Lampu ruang tamu', x: 12, z: 4.5, sambung: { relay: 'relay_rumah', kanal: 2 } },
        { id: 'exhaust_dapur', jenis: 'exhaust', nama: 'Exhaust dapur', x: 19, z: 7, sambung: { relay: 'relay_rumah', kanal: 3 } },
        { id: 'esp_kebun', jenis: 'esp32', nama: 'ESP kebun', x: 8, z: 14, daya: 'surya_kebun' }, { id: 'surya_kebun', jenis: 'surya', x: 9, z: 14 },
        { id: 'soil_kebun', jenis: 'soil', nama: 'Tanah kebun', x: 10, z: 17, sambung: { esp: 'esp_kebun', pin: 'GPIO35' } },
        { id: 'tandon', jenis: 'tandon', x: 5, z: 14 },
        { id: 'ultra_tandon', jenis: 'ultrasonik', nama: 'Level tandon', x: 5.5, z: 14.5, sambung: { esp: 'esp_kebun', pin: 'GPIO13' } },
        { id: 'relay_kebun', jenis: 'relay1', x: 7, z: 14.5, sambung: { esp: 'esp_kebun', pin: 'GPIO27' } },
        { id: 'pompa_kebun', jenis: 'pompa', nama: 'Pompa kebun', x: 6, z: 16, sambung: { relay: 'relay_kebun', kanal: 1 } },
        { id: 'repeater', jenis: 'repeater', x: 20, z: 10 },
        { id: 'esp_kandang', jenis: 'esp32', nama: 'ESP kandang', x: 25, z: 13, daya: 'adaptor_kandang' }, { id: 'adaptor_kandang', jenis: 'adaptor', x: 25, z: 13.8 },
        { id: 'dht_kandang', jenis: 'dht22', nama: 'DHT22 kandang', x: 27, z: 15, sambung: { esp: 'esp_kandang', pin: 'GPIO4' } },
        { id: 'pakan_kandang', jenis: 'loadcell', nama: 'Timbangan pakan', x: 29, z: 17, sambung: { esp: 'esp_kandang', pin: 'GPIO16' } },
        { id: 'servo_kandang', jenis: 'servo_pakan', nama: 'Pemberi pakan', x: 30, z: 17, sambung: { esp: 'esp_kandang', pin: 'GPIO18' } },
        { id: 'relay_kandang', jenis: 'relay4', nama: 'Relay kandang', x: 26, z: 13.5, sambung: { esp: 'esp_kandang', pin: 'GPIO25' } },
        { id: 'pemanas_kandang', jenis: 'pemanas', nama: 'Pemanas kandang', x: 28, z: 14, sambung: { relay: 'relay_kandang', kanal: 1 } },
        { id: 'kipas_kandang', jenis: 'kipas', nama: 'Kipas kandang', x: 31, z: 14, sambung: { relay: 'relay_kandang', kanal: 2 } }
      ]
    }
  };

  /* Sambung otomatis: pilih pin bebas yang cocok (analog untuk sensor analog, bukan pin input-saja untuk output). */
  function sambungOtomatis(W, id) {
    const p = cari(W, id); if (!p) return false;
    const K = KATALOG[p.jenis];
    if (K.kategori === 'papan') { const d = W.perangkat.filter(q => KATALOG[q.jenis].kategori === 'daya').sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (d) { p.daya = d.id; return true; } return false; }
    const terdekat = (f) => W.perangkat.filter(f).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (K.kategori === 'aktuator' && K.butuhRelay) {
      for (const r of W.perangkat.filter(q => KATALOG[q.jenis].kanal).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))) {
        for (let k = 1; k <= KATALOG[r.jenis].kanal; k++) if (!W.perangkat.some(q => q.sambung && q.sambung.relay === r.id && q.sambung.kanal === k)) { p.sambung = { relay: r.id, kanal: k }; return true; }
      }
      return false;
    }
    const e = terdekat(q => KATALOG[q.jenis].kategori === 'papan'); if (!e) return false;
    const dipakai = new Set(W.perangkat.filter(q => q.sambung && q.sambung.esp === e.id && q !== p).map(q => q.sambung.pin));
    const butuhAnalog = K.sinyal === 'analog', output = K.kategori === 'aktuator' || !!K.kanal;
    const pin = daftarPin(e.jenis).find(x => !dipakai.has(x) && (butuhAnalog ? pinAnalog(e.jenis, x) : !pinAnalog(e.jenis, x) || e.jenis === 'esp32') && !(output && pinInputSaja(e.jenis, x)) && !(butuhAnalog === false && pinInputSaja(e.jenis, x) && output));
    if (!pin) return false;
    p.sambung = { esp: e.id, pin };
    return true;
  }

  /* Memutus semua kabel milik satu perangkat. Kabel perangkat lain yang tersambung KE perangkat ini juga putus,
     misalnya ESP dihapus kabelnya: sensor tetap tercatat menuju ESP itu (supaya terlihat salah), tetapi daya ESP lepas. */
  function putuskan(W, id) {
    const p = cari(W, id); if (!p) return { ok: false, alasan: 'perangkat tidak ada' };
    const ada = !!(p.sambung || p.daya);
    delete p.sambung; delete p.daya;
    return ada ? { ok: true } : { ok: false, alasan: 'perangkat ini belum punya kabel' };
  }
  /* Menyambung perangkat ke tujuan yang dipilih di 3D: ESP (pin bebas yang cocok), relay (kanal bebas), atau sumber daya. */
  function sambungKe(W, id, tujuanId) {
    const p = cari(W, id), t = cari(W, tujuanId);
    if (!p || !t) return { ok: false, alasan: 'perangkat tidak ada' };
    if (p === t) return { ok: false, alasan: 'tidak bisa menyambung ke dirinya sendiri' };
    const K = KATALOG[p.jenis], KT = KATALOG[t.jenis];
    if (K.kategori === 'papan') {
      if (KT.kategori !== 'daya') return { ok: false, alasan: `${K.nama} disambung ke sumber daya (adaptor, baterai, panel surya), bukan ke ${KT.nama}` };
      p.daya = t.id; return { ok: true, teks: `${p.nama} mendapat daya dari ${t.nama}` };
    }
    if (K.kategori === 'aktuator' && K.butuhRelay) {
      if (!KT.kanal) return { ok: false, alasan: `${K.nama} berarus ${K.arus} mA, jadi harus disambung ke modul relay, bukan ke ${KT.nama}` };
      for (let k = 1; k <= KT.kanal; k++) if (!W.perangkat.some(q => q !== p && q.sambung && q.sambung.relay === t.id && q.sambung.kanal === k)) { p.sambung = { relay: t.id, kanal: k }; return { ok: true, teks: `${p.nama} tersambung ke ${t.nama} kanal ${k}` }; }
      return { ok: false, alasan: `semua kanal ${t.nama} sudah terpakai` };
    }
    if (K.kategori === 'sensor' || K.kategori === 'aktuator' || K.kanal) {
      if (KT.kategori !== 'papan') return { ok: false, alasan: `${K.nama} disambung ke ESP, bukan ke ${KT.nama}` };
      const dipakai = new Set(W.perangkat.filter(q => q !== p && q.sambung && q.sambung.esp === t.id).map(q => q.sambung.pin));
      const output = K.kategori === 'aktuator' || !!K.kanal;
      // pin digital murni didahulukan untuk sensor digital, supaya pin analog tetap tersedia untuk sensor analog
      const urut = daftarPin(t.jenis).sort((a, b) => (K.sinyal === 'analog' ? 0 : (pinAnalog(t.jenis, a) ? 1 : 0) - (pinAnalog(t.jenis, b) ? 1 : 0)));
      const pin = urut.find(x => !dipakai.has(x) && (K.sinyal === 'analog' ? pinAnalog(t.jenis, x) : true) && !(output && pinInputSaja(t.jenis, x)));
      if (!pin) return { ok: false, alasan: K.sinyal === 'analog' ? `tidak ada pin analog bebas di ${t.nama}` : `tidak ada pin bebas di ${t.nama}` };
      p.sambung = { esp: t.id, pin }; return { ok: true, teks: `${p.nama} tersambung ke ${t.nama} pin ${pin}` };
    }
    return { ok: false, alasan: `${K.nama} tidak memakai kabel data` };
  }

  /* Penempatan area: tidak boleh keluar lahan atau menimpa area lain (bersentuhan di tepi boleh). */
  function areaBentrok(W, a) {
    if (a.x < 0 || a.z < 0 || a.x + a.w > W.lebar + 1e-6 || a.z + a.d > W.dalam + 1e-6) return { alasan: 'keluar dari lahan' };
    const lain = W.area.find(b => b.id !== a.id && a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.z < b.z + b.d - 1e-6 && b.z < a.z + a.d - 1e-6);
    return lain ? { alasan: 'menimpa ' + lain.nama, lain } : null;
  }
  /* Titik bebas terdekat dari (x, z) untuk area berukuran a.w x a.d; null bila lahan penuh. */
  function tempatBebas(W, a, x, z) {
    let terbaik = null, jarak = Infinity;
    for (let zz = 0; zz + a.d <= W.dalam + 1e-6; zz += 0.5) for (let xx = 0; xx + a.w <= W.lebar + 1e-6; xx += 0.5) {
      const d = (xx - x) ** 2 + (zz - z) ** 2; if (d >= jarak) continue;
      if (!areaBentrok(W, { id: a.id, x: xx, z: zz, w: a.w, d: a.d })) { terbaik = { x: xx, z: zz }; jarak = d; }
    }
    return terbaik;
  }

  const api = { areaBentrok, tempatBebas, putuskan, sambungKe, VERSI, BATAS, AREA, KATALOG, VAR, AMBANG_WIFI, PRESET, periksaDunia, periksaRangkaian, hitungWifi, dindingDilewati, rssiDari, buatSim, langkah, status, bacaSensor, aturAktuator, areaDi, daftarPin, pinAnalog, sambungOtomatis, jam, suhuLuar, cahayaLuar, dayaTerpakai };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.IoT = api;
})(typeof window !== 'undefined' ? window : globalThis);
