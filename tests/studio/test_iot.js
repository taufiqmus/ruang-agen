require('../alat');   // pindah ke akar repo
/* Uji dunia IoT: katalog, pemeriksa, rangkaian kabel dan relay, daya, Wi-Fi, sensor, aktuator, simulasi. */
const I = require('../../src/studio/iot.js');
let gagal = 0;
const cek = (n, c, info) => { if (!c) { gagal++; console.log('GAGAL:', n, info !== undefined ? JSON.stringify(info).slice(0, 300) : ''); } else console.log('ok   :', n); };
const salin = x => JSON.parse(JSON.stringify(x));
const dunia = k => I.periksaDunia(salin(I.PRESET[k])).dunia;

for (const k of Object.keys(I.PRESET)) { const h = I.periksaDunia(salin(I.PRESET[k])); cek(`preset ${k} sah dan rangkaiannya tanpa masalah`, h.ok && Object.values(I.periksaRangkaian(h.dunia)).every(s => !s.masalah.length), h.galat); }
cek('katalog: setiap perangkat punya kategori, nama, harga, deskripsi', Object.values(I.KATALOG).every(k => k.kategori && k.nama && k.harga > 0 && k.deskripsi));
cek('katalog: setiap aktuator berarus besar wajib relay', Object.values(I.KATALOG).filter(k => k.kategori === 'aktuator' && k.arus > 40).every(k => k.butuhRelay));

/* pemeriksa: impor tidak dipercaya */
let h = I.periksaDunia({ area: [{ id: 'A!', tipe: 'kamar' }, { id: 'x1', tipe: 'kolam' }], perangkat: [{ id: 'p1', jenis: 'roket' }, { id: 'p2', jenis: 'dht22', nama: '<script>alert(1)</script>' }] });
cek('pemeriksa menolak id, tipe area, dan jenis yang salah', !h.ok && h.galat.length === 3, h.galat);
cek('pemeriksa membersihkan teks', !/[<>]/.test(h.dunia.perangkat[0].nama));
h = I.periksaDunia({ perangkat: Array.from({ length: 60 }, (_, i) => ({ id: 'p' + i, jenis: 'ldr' })) });
cek('batas jumlah perangkat untuk laptop lemah', h.dunia.perangkat.length === I.BATAS.perangkat && !h.ok);
h = I.periksaDunia({ area: [{ id: 'kamar', tipe: 'kamar', x: 999, w: 999 }] });
cek('ukuran dan posisi dipotong ke rentang aman', h.dunia.area[0].w <= 20 && h.dunia.area[0].x <= h.dunia.lebar);
cek('tidak ada rahasia di skema dunia', !/token|kunci|apiKey|password/i.test(JSON.stringify(dunia('rumah_kebun_kandang'))));

/* rangkaian */
let W = dunia('rumah_kecil');
W.perangkat.find(p => p.id === 'kipas_kamar').sambung = { esp: 'esp_kamar', pin: 'GPIO27' };
let rk = I.periksaRangkaian(W);
cek('kipas langsung ke pin ESP ditolak: wajib relay', /relay/i.test(rk.kipas_kamar.masalah[0]) && !rk.kipas_kamar.tersambung, rk.kipas_kamar);
W = dunia('rumah_kebun_kandang');
W.perangkat.find(p => p.id === 'soil_kebun').sambung.pin = 'GPIO13';
rk = I.periksaRangkaian(W);
cek('sensor analog di pin digital: masalah dijelaskan dan pin bentrok terdeteksi', rk.soil_kebun.masalah.some(m => /analog/.test(m)) && rk.ultra_tandon.masalah.some(m => /sudah dipakai/.test(m)), [rk.soil_kebun.masalah, rk.ultra_tandon.masalah]);
W = dunia('rumah_kebun_kandang');
W.perangkat.find(p => p.id === 'relay_rumah').sambung.pin = 'GPIO36';
rk = I.periksaRangkaian(W);
cek('pin input-saja tidak bisa menggerakkan relay, dan aktuator di belakangnya ikut mati', /hanya bisa input/.test(rk.relay_rumah.masalah[0]) && !rk.kipas_kamar.tersambung);
W = dunia('rumah_kebun_kandang');
W.perangkat.find(p => p.id === 'lampu_tamu').sambung.kanal = 1;
rk = I.periksaRangkaian(W);
cek('kanal relay ganda terdeteksi', rk.lampu_tamu.masalah.some(m => /sudah dipakai/.test(m)));
W = dunia('rumah_kecil');
delete W.perangkat.find(p => p.id === 'esp_kamar').daya;
let S = I.buatSim(W);
cek('ESP tanpa sumber daya: masalah dan sensor tidak terbaca', /sumber daya/.test(I.periksaRangkaian(W).esp_kamar.masalah[0]) && !I.bacaSensor(W, S, 'dht_kamar').ok);

/* Wi-Fi */
W = dunia('rumah_kebun_kandang');
cek('dinding dihitung saat sinyal menembus ruang', I.dindingDilewati(W, 1, 1, 20, 6) >= 2 && I.dindingDilewati(W, 30, 20, 35, 25) === 0);
const jauh = I.periksaDunia({ lebar: 60, dalam: 44, area: [], perangkat: [{ id: 'router', jenis: 'router', x: 1, z: 1 }, { id: 'esp', jenis: 'esp32', x: 58, z: 42, daya: 'ad' }, { id: 'ad', jenis: 'adaptor', x: 58, z: 41 }] }).dunia;
let wf = I.hitungWifi(jauh, true);
cek('ESP terlalu jauh dari router: offline', !wf.esp.online && wf.esp.rssi < I.AMBANG_WIFI, wf);
jauh.perangkat.push({ id: 'rep', jenis: 'repeater', x: 30, z: 22 });
wf = I.hitungWifi(jauh, true);
cek('repeater di tengah membuat ESP online', wf.esp.online && wf.esp.lewat === 'rep', wf);
W = dunia('rumah_kebun_kandang');
cek('ESP kandang online lewat repeater pada preset', I.hitungWifi(W, true).esp_kandang.lewat === 'repeater');
cek('listrik padam: router mati, semua ESP offline', Object.values(I.hitungWifi(W, false)).every(x => !x.online));

/* sensor dan aktuator */
S = I.buatSim(W);
let b = I.bacaSensor(W, S, 'dht_kandang');
cek('sensor terbaca dengan nilai wajar', b.ok && b.nilai.suhu > 15 && b.nilai.suhu < 40 && b.area === 'kandang', b);
S.kekacauan.sensorRusak = 'dht_kandang';
cek('sensor rusak: NaN', Number.isNaN(I.bacaSensor(W, S, 'dht_kandang').nilai.suhu));
S.kekacauan.sensorRusak = null; S.kekacauan.wifi = true;
b = I.bacaSensor(W, S, 'dht_kandang');
cek('Wi-Fi putus: sensor offline dengan alasan', !b.ok && /offline/.test(b.alasan), b);
S.kekacauan.wifi = false; S.kekacauan.listrik = true;
cek('listrik padam: ESP beradaptor mati, ESP bertenaga surya tetap hidup tapi offline karena router mati', !I.bacaSensor(W, S, 'dht_kandang').ok && /offline/.test(I.bacaSensor(W, S, 'soil_kebun').alasan));
S.kekacauan.listrik = false;
let a = I.aturAktuator(W, S, 'kipas_kandang', true, 3);
cek('aktuator menyala lewat relay', a.ok && S.alat.kipas_kandang.on && S.alat.kipas_kandang.level === 3);
cek('perintah ke sensor ditolak', !I.aturAktuator(W, S, 'dht_kandang', true).ok);
S.area.kandang.pakan = 3;
I.aturAktuator(W, S, 'servo_kandang', true);
cek('servo pakan mengisi tempat pakan lalu berhenti sendiri', S.area.kandang.pakan === 100 && !S.alat.servo_kandang.on);

/* simulasi */
W = dunia('rumah_kebun_kandang'); S = I.buatSim(W, { mulai: 13 * 60 });
const s0 = S.area.kandang.suhu;
for (let i = 0; i < 24; i++) I.langkah(W, S, 5);
const tanpaKipas = S.area.kandang.suhu;
const W2 = dunia('rumah_kebun_kandang'), S2 = I.buatSim(W2, { mulai: 13 * 60 });
I.aturAktuator(W2, S2, 'kipas_kandang', true, 3);
for (let i = 0; i < 24; i++) I.langkah(W2, S2, 5);
cek('kipas menurunkan suhu kandang dibanding tanpa kipas', S2.area.kandang.suhu < tanpaKipas - 1.5, { tanpaKipas, denganKipas: S2.area.kandang.suhu, s0 });
const t0 = S2.area.kebun.tanah;
I.aturAktuator(W2, S2, 'pompa_kebun', true);
const air0 = S2.tandon;
for (let i = 0; i < 6; i++) I.langkah(W2, S2, 5);
cek('pompa membasahi tanah dan memakai air tandon', S2.area.kebun.tanah > t0 + 20 && S2.tandon < air0, { t0, t: S2.area.kebun.tanah, air0, air: S2.tandon });
S2.tandon = 0.5; const t1 = S2.area.kebun.tanah;
for (let i = 0; i < 6; i++) I.langkah(W2, S2, 5);
cek('tandon kosong: pompa tidak membasahi tanah', S2.area.kebun.tanah <= t1);
const W3 = dunia('rumah_kebun_kandang'), S3 = I.buatSim(W3, { mulai: 6 * 60 });
for (let i = 0; i < 144; i++) I.langkah(W3, S3, 10);
cek('satu hari tanpa siram: tanah mengering, tanaman menurun', S3.area.kebun.tanah < 35 && S3.area.kebun.tanaman < 90, { tanah: S3.area.kebun.tanah, tanaman: S3.area.kebun.tanaman });
cek('siang lebih terang dari malam', (() => { const S4 = I.buatSim(W3, { mulai: 12 * 60 }); const siang = I.cahayaLuar(S4); S4.menit = 23 * 60; return siang > 500 && I.cahayaLuar(S4) === 0; })());
cek('sejarah sensor tercatat untuk dashboard', S3.sejarah.dht_kandang && S3.sejarah.dht_kandang.length > 100);
cek('baterai surya terisi siang dan terpakai malam (tetap dalam batas)', S3.baterai.surya_kebun >= 0 && S3.baterai.surya_kebun <= 20);
cek('dapur: gas naik saat jam masak', (() => { const S5 = I.buatSim(W3, { mulai: 6 * 60 + 30 }); for (let i = 0; i < 30; i++) I.langkah(W3, S5, 1); return S5.area.dapur.gas > 100; })());
cek('sambung otomatis memilih pin analog untuk sensor analog', (() => { const W6 = dunia('rumah_kecil'); W6.perangkat.push({ id: 'ldr1', jenis: 'ldr', x: 6, z: 6 }); I.sambungOtomatis(W6, 'ldr1'); const p = W6.perangkat.find(q => q.id === 'ldr1'); return I.pinAnalog('esp32', p.sambung.pin) && !I.periksaRangkaian(W6).ldr1.masalah.length; })());
cek('sambung otomatis aktuator besar memilih relay kosong', (() => { const W7 = dunia('rumah_kebun_kandang'); W7.perangkat.push({ id: 'lampu2', jenis: 'lampu', x: 12, z: 6 }); I.sambungOtomatis(W7, 'lampu2'); const p = W7.perangkat.find(q => q.id === 'lampu2'); return p.sambung.relay === 'relay_rumah' && p.sambung.kanal === 4 && !I.periksaRangkaian(W7).lampu2.masalah.length; })());

console.log(gagal ? `\n${gagal} gagal` : '\nsemua lulus');
process.exit(gagal ? 1 : 0);
