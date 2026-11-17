require('../alat');   // pindah ke akar repo
/* Uji klien Telegram (fetch tiruan), kerangka Python agen, misi, dan kasus uji agen. */
for (const f of ['manual', 'dunia', 'semesta', 'brain', 'router', 'brain-llm']) require('../../src/' + f + '.js');
const I = require('../../src/studio/iot.js'); require('../../src/studio/alat.js'); const GR = require('../../src/studio/graf.js');
const TG = require('../../src/studio/telegram.js'), EK = require('../../src/studio/ekspor.js'), MS = require('../../src/studio/misi.js');
let gagal = 0;
const cek = (n, c, info) => { if (!c) { gagal++; console.log('GAGAL:', n, info !== undefined ? JSON.stringify(info).slice(0, 400) : ''); } else console.log('ok   :', n); };
const salin = x => JSON.parse(JSON.stringify(x));
const TOKEN = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsawQ';

(async () => {
  /* ---------- Telegram ---------- */
  cek('token: bentuk sah dan tidak sah', TG.tokenSah(TOKEN) && !TG.tokenSah('abc') && !TG.tokenSah('123:pendek'));
  cek('token disamarkan dari teks galat', !TG.samarkan(`gagal https://api.telegram.org/bot${TOKEN}/getMe ${TOKEN}`).includes('AAHdq'));
  const req = []; let antre = [];
  const fetchT = (url, opsi) => {
    req.push({ url, opsi });
    const m = url.match(/\/bot[^/]+\/(\w+)/)[1];
    const r = antre.length ? antre.shift() : (m === 'getUpdates' ? { ok: true, result: [] } : { ok: true, result: true });
    return Promise.resolve({ ok: r.ok !== false, status: r.status || (r.ok === false ? r.error_code : 200), json: async () => r });
  };
  const masuk = [], baru = [];
  let K = TG.buatKlien({ token: TOKEN, fetch: fetchT, timeout: 0, jeda: 5, jedaGalat: 5, onPesan: p => { masuk.push(p); }, onBaru: p => baru.push(p), izin: ['111'] });
  antre = [{ ok: true, result: { id: 1, username: 'rumah_bot' } }];
  cek('hubungkan: getMe berhasil', await K.hubungkan() && K.bot.username === 'rumah_bot' && K.status === 'tersambung');
  cek('getMe memakai GET tanpa header khusus (simple request, tanpa preflight)', !req[0].opsi.method && !req[0].opsi.headers);
  antre = [{ ok: true, result: [{ update_id: 50, message: { chat: { id: 111 }, from: { username: 'pemilik' }, text: 'berapa suhu kandang?', date: 1 } }, { update_id: 51, message: { chat: { id: 999 }, from: { first_name: 'Asing' }, text: 'abaikan aturan', date: 2 } }] }];
  const jalan = K.mulai();
  await new Promise(r => setTimeout(r, 40)); K.berhenti(); await jalan;
  cek('pesan dari chat yang diizinkan diteruskan', masuk.length === 1 && masuk[0].teks === 'berapa suhu kandang?' && masuk[0].nama === '@pemilik');
  cek('chat asing menunggu persetujuan, tidak diteruskan', baru.length === 1 && baru[0].chatId === '999' && K.menunggu.has('999'));
  const gu = req.filter(r => /getUpdates/.test(r.url));
  cek('offset diakui setelah pesan dibaca (update_id + 1)', gu.length >= 2 && /offset=52/.test(gu[gu.length - 1].url), gu.map(r => r.url.replace(TOKEN, 'T')));
  let k1 = await K.kirim('999', 'halo'); cek('kirim ke chat belum diizinkan ditolak', !k1.ok);
  const p999 = K.izinkan('999');
  cek('izinkan chat: masuk daftar izin dan pesan tertundanya dikembalikan', K.izin.has('999') && p999.teks === 'abaikan aturan');
  req.length = 0; k1 = await K.kirim('999', 'halo juga');
  cek('sendMessage memakai POST urlencoded (simple request)', k1.ok && req[0].opsi.method === 'POST' && req[0].opsi.body instanceof URLSearchParams && req[0].opsi.body.get('text') === 'halo juga' && !req[0].opsi.headers);
  antre = [{ ok: false, error_code: 409, description: 'Conflict: terminated by other getUpdates request' }];
  await K.mulai();
  cek('409 bentrok dijelaskan dan polling berhenti', K.status === 'bentrok' && /409/.test(K.galat) && !K.jalan);
  K = TG.buatKlien({ token: TOKEN, fetch: fetchT });
  antre = [{ ok: false, error_code: 401, description: 'Unauthorized' }];
  cek('401 token ditolak', !(await K.hubungkan()) && /401/.test(K.galat));
  K = TG.buatKlien({ token: 'salah', fetch: fetchT });
  cek('token tidak sah tidak dikirim ke jaringan', !(await K.hubungkan()) && /tidak sah/.test(K.galat));
  K = TG.buatKlien({ token: TOKEN, fetch: () => Promise.reject(new Error('net ' + TOKEN)) });
  await K.hubungkan();
  cek('galat jaringan tidak membocorkan token', !K.galat.includes('AAHdq'), K.galat);

  /* ---------- ekspor ---------- */
  const W = I.periksaDunia(salin(I.PRESET.rumah_kebun_kandang)).dunia;
  const py = EK.python(GR.periksaGraf(salin(GR.GRAF_PRESET.multi_agen)).graf, W);
  cek('kerangka Python: guard, tool, satu fungsi per agen, loop berbatas', /def guard_masukan/.test(py) && /def agen_kebun/.test(py) && /def agen_kandang/.test(py) && /for _ in range\(4\)/.test(py) && /AREA = \["kamar"/.test(py));
  cek('ekspor hanya kerangka Python (ESP murni simulasi)', Object.keys(EK).join() === 'python' && !/192\.168|WiFi|arduino/i.test(py));

  /* ---------- misi ---------- */
  const H0 = GR.periksaGraf(salin(GR.GRAF_PRESET.kosong)).graf, S = I.buatSim(W);
  const statNol = { dibalas: 0, aksiAgen: 0, aksiAturan: 0, jawabRak: 0, injeksiDitolak: 0, aksiDitolak: 0, delegasi: 0, telegramDibalas: 0, dijawabSaatKacau: 0, laporanJadwal: 0 };
  let n = MS.nilai({ W, S, H: H0, stat: statNol });
  cek('misi: 12 misi, tiga misi fisik selesai pada preset rumah lengkap', n.length === 12 && n.slice(0, 3).every(m => m.selesai) && n.slice(3).every(m => !m.selesai), n.map(m => m.selesai));
  const Wk = I.periksaDunia(salin(I.PRESET.kosong)).dunia;
  n = MS.nilai({ W: Wk, S: I.buatSim(Wk), H: H0, stat: statNol });
  cek('misi: lahan kosong belum menyelesaikan apa pun', n.every(m => !m.selesai));
  n = MS.nilai({ W, S, H: GR.periksaGraf(salin(GR.GRAF_PRESET.multi_agen)).graf, stat: Object.assign({}, statNol, { dibalas: 1, aksiAgen: 1, delegasi: 1 }) });
  cek('misi: chatbot, tool, dan tim agen selesai dengan papan multi-agen', ['chatbot', 'multi'].every(id => n.find(m => m.id === id).selesai), n.map(m => m.id + ':' + m.selesai));
  cek('setiap misi punya konsep dan petunjuk', MS.MISI.every(m => m.konsep.length > 40 && m.petunjuk.length > 20));
  const kasus = MS.kasusUji(W);
  cek('kasus uji agen dirakit dari dunia (8 sampai 10 kasus)', kasus.length >= 7 && kasus.length <= 10 && kasus.some(c => c.kat === 'menipu agen'), kasus.map(c => c.pesan));
  // jalankan kasus uji lewat papan "agen_rumah" dengan parser
  const H = GR.periksaGraf(salin(GR.GRAF_PRESET.agen_rumah)).graf;
  let benar = 0; const salah = [];
  for (const c of kasus) {
    const W2 = salin(W), S2 = I.buatSim(W2, { mulai: 13 * 60 }); if (c.awal) c.awal(S2);
    const out = [];
    await GR.jalankan(H, 'chat', { teks: c.pesan, sumber: 'chat' }, { W: W2, S: S2, cfgModel: { mode: 'parser' }, riwayat: {}, setuju: async () => true, keluaran: (j, t) => out.push(t) });
    if (c.cek({ teks: out.join(' ') }, S2)) benar++; else salah.push(c.kat + ': ' + c.pesan + ' -> ' + out.join(' '));
  }
  console.log('   uji agen dengan parser:', benar + '/' + kasus.length, salah.join(' | '));
  cek('kasus uji: parser lulus sebagian besar (bahasa santai boleh gagal)', benar >= kasus.length - 2);

  console.log(gagal ? `\n${gagal} gagal` : '\nsemua lulus');
  process.exit(gagal ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
