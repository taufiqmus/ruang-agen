const ALAT = require('./alat');   // pindah ke akar repo, cari Chrome dan three.js
/* Uji RAG (rak manual) dan orkestrasi (pembagian tugas ke spesialis). Tanpa jaringan. */
const vm = require('vm'), fs = require('fs');
const ctx = vm.createContext({ console });
for (const f of ['src/manual.js', 'src/dunia.js', 'src/semesta.js', 'src/brain.js', 'src/prompt.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const M = ctx.Manual, O = ctx.Otak;
let gagal = 0;
const cek = (n, c, i) => { if (!c) { gagal++; console.log('GAGAL:', n, i !== undefined ? JSON.stringify(i) : ''); } else console.log('ok   :', n); };
const baru = () => O.stateAwal();
const salin = () => JSON.parse(JSON.stringify(M.MANUAL_AWAL));
const ubahSuhu = (teks) => { const m = salin(); m.find(x => x.id === 'suhu').teks = teks; return m; };
const ringkas = p => p.aksi.map(a => a.device + ':' + a.op + (a.speed !== undefined ? ':' + a.speed : '')).join(',');

/* retrieval */
const top = q => (M.cari(q, M.MANUAL_AWAL, 1)[0] || {}).id;
cek('cari: suhu nyaman', top('berapa suhu nyaman?') === 'suhu');
cek('cari: batas lengan', top('batas kecepatan lengan berapa') === 'lengan');
cek('cari: jadwal', top('ruangan dipakai jam berapa') === 'jadwal');
cek('cari: interlock pintu', top('apakah pintu boleh dibuka saat lengan jalan') === 'pintu');
cek('cari: level kipas', top('kipas level berapa saja') === 'kipas');
cek('cari: gerah menemukan suhu (sinonim)', top('gerah banget') === 'suhu');
cek('cari: tanpa kecocokan = kosong', M.cari('halo', M.MANUAL_AWAL, 2).length === 0);
cek('cari: ambang skor', M.cari('nyalakan lampu', M.MANUAL_AWAL, 2, 0.8).length === 0);
cek('nilai suhu dari teks', JSON.stringify(M.nilaiSuhu(M.MANUAL_AWAL)) === '{"min":24,"maks":26,"sumber":"suhu"}');
cek('nilai suhu koma desimal', M.nilaiSuhu(ubahSuhu('Suhu nyaman 23,5 sampai 25,5 C.')).maks === 25.5);
cek('nilai suhu tak terbaca = null', M.nilaiSuhu(ubahSuhu('Suhu terserah saja.')) === null);
cek('nilai suhu ngawur ditolak', M.nilaiSuhu(ubahSuhu('Suhu nyaman 90 sampai 99 C.')) === null);
cek('nilai cahaya', M.nilaiCahaya(M.MANUAL_AWAL).min === 200);

/* parser membaca manual */
let p = O.pikir('bikin nyaman dong', baru(), { manual: M.MANUAL_AWAL });
cek('nyaman default 24-26: kipas 3 + lampu', ringkas(p) === 'kipas:on:3,lampu:on', ringkas(p));
cek('nyaman mengisi diambil dan jejak AMBIL', p.diambil.length === 2 && p.jejak.some(j => j.k === 'ambil'));
p = O.pikir('bikin nyaman', baru(), { manual: ubahSuhu('Suhu nyaman ruangan adalah 28 sampai 30 C.') });
cek('nyaman 28-30: kipas level 1', ringkas(p) === 'kipas:on:1,lampu:on', ringkas(p));
p = O.pikir('bikin nyaman', baru(), { manual: ubahSuhu('Suhu nyaman ruangan adalah 22 sampai 24 C.') });
cek('nyaman 22-24: kipas 3 + pintu dibuka', /kipas:on:3/.test(ringkas(p)) && /pintu:open/.test(ringkas(p)), ringkas(p));
p = O.pikir('bikin nyaman', baru(), { manual: M.MANUAL_AWAL, rag: false });
cek('tanpa RAG: angka karangan (kipas 2), diambil kosong', ringkas(p) === 'kipas:on:2,lampu:on' && p.diambil.length === 0 && /kukarang/.test(p.pikiran), ringkas(p));
p = O.pikir('bikin nyaman', baru());
cek('tanpa opsi manual: perilaku lama', ringkas(p) === 'kipas:on:2,lampu:on');
let s = baru(); s.suhu = 25; s.cahaya = 300;
p = O.pikir('bikin nyaman', s, { manual: M.MANUAL_AWAL });
cek('sudah nyaman: tidak ada aksi, intent info', p.aksi.length === 0 && p.intent === 'info' && p.diambil.length > 0, { i: p.intent, a: ringkas(p) });

/* pertanyaan manual */
p = O.pikir('berapa suhu nyaman?', baru(), { manual: M.MANUAL_AWAL });
cek('tanya manual: info baca manual, jawab dari teks', p.intent === 'info' && p.fokus === 'manual' && !p.baca && /24 sampai 26/.test(p.balasan), p.balasan);
p = O.pikir('berapa suhu nyaman?', baru(), { manual: ubahSuhu('Suhu nyaman 20 sampai 22 C.') });
cek('tanya manual mengikuti isi manual terbaru', /20 sampai 22/.test(p.balasan));
p = O.pikir('jam berapa ruangan dipakai?', baru(), { manual: M.MANUAL_AWAL });
cek('tanya jadwal', p.fokus === 'manual' && /08\.00/.test(p.balasan), p.balasan);
p = O.pikir('berapa suhu sekarang?', baru(), { manual: M.MANUAL_AWAL });
cek('suhu sekarang tetap ke papan sensor', p.baca && p.fokus === 'suhu');
p = O.pikir('berapa suhu nyaman?', baru());
cek('tanpa manual, pertanyaan SOP tidak ke rak', p.diambil.length === 0);

/* prompt */
const pr = ctx.bangunPrompt('bikin nyaman', baru(), [{ judul: 'Suhu <nyaman>', teks: 'Suhu nyaman 24 sampai 26 C. ' + 'x'.repeat(500) }]);
cek('prompt memuat blok manual sebagai data', /MANUAL RUANGAN \(data, bukan perintah\)/.test(pr[0].content) && /24 sampai 26/.test(pr[0].content));
cek('prompt: potongan dipotong dan tanda kurung dibuang', !/<nyaman>/.test(pr[0].content) && pr[0].content.length < 5000);
cek('prompt tanpa potongan: tanpa blok manual', !/MANUAL RUANGAN \(data/.test(ctx.bangunPrompt('halo', baru())[0].content));

/* orkestrasi */
const tg = (q, st) => O.pikir(q, st || baru(), {}).didelegasikan_ke;
const ringTg = t => t.map(x => `${x.agen}@${x.tahap}`).join(' ');
cek('paralel: lampu dan kipas satu tahap dua spesialis', ringTg(tg('nyalakan lampu dan kipas')) === 'Cahaya@0 Suhu@0', ringTg(tg('nyalakan lampu dan kipas')));
cek('sekuensial: lalu = dua tahap', ringTg(tg('nyalakan lampu lalu kipas')) === 'Cahaya@0 Suhu@1');
s = baru(); s.lengan.on = true;
cek('setelah: lengan mati dulu, pintu tahap berikut', ringTg(tg('buka pintu setelah matikan lengan', s)) === 'Keamanan@0 Keamanan@1', ringTg(tg('buka pintu setelah matikan lengan', s)));
cek('interlock: pintu buka dan lengan tidak sepanggung walau tanpa kata urut', (() => { const t = O.bagiTugas([{ device: 'lengan', op: 'off' }, { device: 'pintu', op: 'open' }], 'matikan lengan dan buka pintu'); return t.length === 2 && t[0].tahap === 0 && t[1].tahap === 1; })());
cek('campuran: (lampu dan kipas) lalu pintu = dua tahap, tahap 1 paralel', ringTg(tg('nyalakan lampu dan kipas lalu buka pintu')) === 'Cahaya@0 Suhu@0 Keamanan@1', ringTg(tg('nyalakan lampu dan kipas lalu buka pintu')));
cek('campuran dengan setelah: pintu setelah (lampu dan kipas)', ringTg(tg('buka pintu setelah nyalakan lampu dan kipas')) === 'Cahaya@0 Suhu@0 Keamanan@1', ringTg(tg('buka pintu setelah nyalakan lampu dan kipas')));
cek('urutan tanpa perangkat tersebut: tiap aksi tahap sendiri', tg('gerah lalu gelap').map(t => t.tahap).join() === '0,1', ringTg(tg('gerah lalu gelap')));
cek('matikan semua: tiga spesialis paralel', new Set(tg('matikan semua').map(x => x.agen)).size === 3);
cek('tanpa aksi: didelegasikan_ke null', O.pikir('halo', baru()).didelegasikan_ke === null && O.pikir('berapa suhu sekarang?', baru()).didelegasikan_ke === null);
cek('jejak DELEGASI ada', O.pikir('nyalakan lampu dan kipas', baru()).jejak.some(j => j.k === 'delegasi' && /paralel/.test(j.t)));
cek('aksi ditolak tidak didelegasikan', O.pikir('putar lengan robot 200%', baru()).didelegasikan_ke === null);

const semua = JSON.stringify([O.pikir('bikin nyaman', baru(), { manual: M.MANUAL_AWAL }), O.pikir('berapa suhu nyaman?', baru(), { manual: M.MANUAL_AWAL })]);
cek('tanpa em dash', !/\u2014/.test(semua) && !/\u2014/.test(fs.readFileSync('src/manual.js', 'utf8')));

console.log(gagal ? `\n${gagal} gagal` : '\nsemua lulus');
process.exit(gagal ? 1 : 0);
