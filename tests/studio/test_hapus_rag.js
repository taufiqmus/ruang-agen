const ALAT = require('../alat');   // pindah ke akar repo, cari Chrome dan three.js
/* Hapus lewat keyboard (perangkat, area, blok, kabel papan) dengan Ctrl+Z, dan editor RAG dengan tombol Simpan. */
const { chromium } = require(require.resolve(ALAT.PW, { paths: [ALAT.AKAR] }));
let gagal = 0;
const cek = (n, c, info) => { if (!c) { gagal++; console.log('GAGAL:', n, info !== undefined ? JSON.stringify(info).slice(0, 300) : ''); } else console.log('ok   :', n); };

(async () => {
  const browser = await chromium.launch({ executablePath: ALAT.CHROME });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 880 }, acceptDownloads: true });
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); if (/three(\.min)?\.js/.test(u)) return r.fulfill({ path: ALAT.THREE, contentType: 'application/javascript' }); return r.abort(); });
  await ctx.addInitScript(() => { try { localStorage.setItem('studio-wizard', 'true'); } catch (e) { /* abaikan */ } });
  const page = await ctx.newPage(); const galat = []; page.on('pageerror', e => galat.push(String(e)));
  await page.goto(require('url').pathToFileURL(ALAT.AKAR + '/studio.html').href + '?grafis=ringan&jam=11&cepat=0&awal=rumah_kebun_kandang&graf=agen_rumah&tanpaTutorial=1');
  await page.waitForFunction(() => window.__studio && window.__studio.W.perangkat.length > 10);
  const S = (f, a) => page.evaluate(f, a);
  const ada = id => S(id => window.__studio.W.perangkat.some(p => p.id === id), id);
  const kirim = async t => { const n = await page.$$eval('#chatlog li', e => e.length); await page.click('[data-tab="chat"]'); await page.fill('#inp', t); await page.click('#kirim'); await page.waitForFunction(n => document.querySelectorAll('#chatlog li').length > n + 1 && !document.querySelector('#kirim').disabled, n, { timeout: 15000 }); return page.textContent('#chatlog li:last-child'); };

  /* 1. Delete perangkat, Ctrl+Z */
  await S(() => window.__studio.D3.fokus(27, 15, 12, -0.6, 0.85)); await page.waitForTimeout(300);
  let t = await S(() => window.__studio.D3.layar('dht_kandang')); await page.mouse.click(t.x, t.y);
  await page.keyboard.press('Delete');
  cek('Delete menghapus perangkat terpilih', !(await ada('dht_kandang')));
  cek('toast menawarkan Ctrl+Z', /Ctrl\+Z/.test(await page.textContent('#toast')));
  await page.keyboard.press('Control+z');
  cek('Ctrl+Z mengembalikan perangkat beserta kabelnya', await ada('dht_kandang') && await S(() => !!window.__studio.W.perangkat.find(p => p.id === 'dht_kandang').sambung));
  t = await S(() => window.__studio.D3.layar('esp_kandang')); await page.mouse.click(t.x, t.y); await page.keyboard.press('Backspace');
  cek('Backspace juga menghapus; kabel ke ESP itu ikut lepas', !(await ada('esp_kandang')) && await S(() => !window.__studio.W.perangkat.find(p => p.id === 'dht_kandang').sambung));
  await page.keyboard.press('Control+z');
  cek('Ctrl+Z setelah hapus ESP: kabel sensor kembali', await S(() => (window.__studio.W.perangkat.find(p => p.id === 'dht_kandang').sambung || {}).esp === 'esp_kandang'));

  /* 2. Delete tidak bekerja saat mengetik di kolom isian */
  t = await S(() => window.__studio.D3.layar('dht_kandang')); await page.mouse.click(t.x, t.y);
  await page.click('#inspektur input[type=text]'); await page.keyboard.press('End'); await page.keyboard.press('Backspace');
  cek('Backspace di kolom Nama tidak menghapus perangkat', await ada('dht_kandang'));

  /* 3. Delete area */
  await page.mouse.dblclick(...await S(() => { const D = window.__studio.D3; D.fokus(27, 15, 12, -0.6, 0.85); const c = document.querySelector('#c3d').getBoundingClientRect(); for (let y = c.top + 60; y < c.bottom - 20; y += 25) for (let x = c.left + 20; x < c.right - 20; x += 25) { if (D.ambilPerangkat(x, y) || D.ambilKabel(x, y)) continue; const p = D.titikLantai(x, y); if (p && p.x > 24 && p.x < 31 && p.z > 13 && p.z < 18) return [x, y]; } return [0, 0]; }));
  cek('klik dua kali lantai memilih area', /Area: Kandang/.test(await page.textContent('#inspektur')), await page.textContent('#inspektur'));
  await page.keyboard.press('Delete');
  cek('Delete menghapus area terpilih', !(await S(() => window.__studio.W.area.some(a => a.id === 'kandang'))));
  await page.keyboard.press('Control+z');
  cek('Ctrl+Z mengembalikan area', await S(() => window.__studio.W.area.some(a => a.id === 'kandang')));

  /* 4. mode Otak: Delete blok dan kabel papan */
  await page.click('[data-mode="otak"]'); await page.waitForTimeout(200);
  const nBlok = await S(() => window.__studio.H.blok.length);
  await page.click('#svgPapan .blok[data-id="memori"]');
  await page.keyboard.press('Delete');
  cek('Delete menghapus blok terpilih beserta kabelnya', !(await S(() => window.__studio.H.blok.some(b => b.id === 'memori') || window.__studio.H.kabel.some(k => k.dari === 'memori'))));
  await page.keyboard.press('Control+z');
  cek('Ctrl+Z mengembalikan blok dan kabelnya', (await S(() => window.__studio.H.blok.length)) === nBlok && await S(() => window.__studio.H.kabel.some(k => k.dari === 'memori')));
  // Ctrl+Z tidak boleh membatalkan pekerjaan lain sesudah penghapusan
  await page.click('#svgPapan .blok[data-id="memori"]'); await page.keyboard.press('Delete');
  await S(() => { const s = window.__studio; s.KV.muat(s.H); });
  await page.click('#svgPapan .blok[data-id="agen"]'); await page.fill('#inspektur label:text-is("Nama agen") + input', 'Agen Baru'); await page.press('#inspektur label:text-is("Nama agen") + input', 'Tab');
  await S(() => document.activeElement.blur()); await page.keyboard.press('Control+z');
  cek('Ctrl+Z sesudah ada perubahan lain: ditolak, perubahan baru aman', await S(() => window.__studio.H.blok.find(b => b.id === 'agen').cfg.nama === 'Agen Baru' && !window.__studio.H.blok.some(b => b.id === 'memori')) && /Tidak bisa mengurungkan/.test(await page.textContent('#toast')), await page.textContent('#toast'));
  // Ctrl+Z blok tidak mengembalikan perubahan rumah
  await page.click('#svgPapan .blok[data-id="pengaman"]'); await page.keyboard.press('Delete');
  await S(() => { const s = window.__studio; s.W.perangkat.find(p => p.id === 'dht_kandang').nama = 'DHT ubah'; });
  await page.keyboard.press('Control+z');
  cek('Ctrl+Z blok hanya mengembalikan papan, rumah tidak tersentuh', await S(() => window.__studio.H.blok.some(b => b.id === 'pengaman') && window.__studio.W.perangkat.find(p => p.id === 'dht_kandang').nama === 'DHT ubah'));
  await S(() => { const s = window.__studio; s.W.perangkat.find(p => p.id === 'dht_kandang').nama = 'DHT22 kandang'; });
  await page.click('[data-mode="bangun"]'); await page.click('[data-mode="otak"]');

  /* 5. RAG: nama baru, editor, tombol Simpan */
  cek('blok bernama RAG di palet', await page.isVisible('.item[data-drag="blok:rak"]:has-text("RAG")'));
  await page.click('#svgPapan .blok[data-id="rak"]');
  cek('Inspektur RAG: tombol Simpan RAG tampil, nonaktif saat belum ada perubahan', await page.isDisabled('#ragSimpan'));
  await page.fill('#ragUji', 'gimana cara hemat listrik?'); await page.press('#ragUji', 'Enter'); await page.waitForTimeout(100);
  cek('Uji pencarian menunjukkan dokumen yang dibaca', /Hemat listrik/.test(await page.textContent('#ragHasil')), await page.textContent('#ragHasil'));
  await page.click('#ragTambah');
  await page.fill('#inspektur .ragDok:last-child .ragJudul', 'Jadwal sampah');
  await page.fill('#inspektur .ragDok:last-child .ragIsi', 'Sampah organik diangkut setiap Selasa dan Jumat pukul 07.00. Sampah plastik setiap Sabtu.');
  cek('status: ada perubahan yang belum disimpan', /belum disimpan/.test(await page.textContent('#ragStatus')) && !(await page.isDisabled('#ragSimpan')));
  await page.click('[data-mode="main"]');
  let r = await kirim('kapan jadwal sampah organik diangkut?');
  cek('sebelum Simpan: agen belum tahu isi baru', !/Selasa/.test(r), r);
  await page.click('[data-mode="otak"]'); await page.click('#svgPapan .blok[data-id="rak"]');
  cek('draf belum hilang saat pindah mode', /belum disimpan/.test(await page.textContent('#ragStatus')));
  await page.click('#ragSimpan');
  cek('Simpan RAG: status tersimpan', /Tersimpan/.test(await page.textContent('#ragStatus')), await page.textContent('#ragStatus'));
  await page.click('[data-mode="main"]');
  r = await kirim('kapan jadwal sampah organik diangkut?');
  cek('setelah Simpan: agen menjawab dari dokumen baru', /Selasa/.test(r), r);
  r = await kirim('bagaimana cara hemat listrik?');
  cek('dokumen bawaan tetap ada setelah menambah', /Hemat listrik/.test(r), r);

  /* 6. tersimpan setelah muat ulang (localStorage) */
  await page.goto(require('url').pathToFileURL(ALAT.AKAR + '/studio.html').href + '?grafis=ringan&cepat=0&tanpaTutorial=1'); await page.waitForFunction(() => window.__studio && window.__studio.H);   // tanpa ?graf supaya papan dibaca dari penyimpanan
  cek('isi RAG bertahan setelah muat ulang', await S(() => window.__studio.H.blok.find(b => b.id === 'rak').cfg.dokumen.some(d => /sampah/i.test(d.judul))));

  /* 7. Batalkan perubahan */
  await page.click('[data-mode="otak"]'); await page.click('#svgPapan .blok[data-id="rak"]');
  const n = await page.$$eval('#inspektur .ragDok', e => e.length);
  await page.click('#inspektur .ragDok:first-child .btn:has-text("Hapus")');
  await page.click('#inspektur .btn:has-text("Batalkan perubahan")');
  cek('Batalkan perubahan mengembalikan isi tersimpan', (await page.$$eval('#inspektur .ragDok', e => e.length)) === n);

  /* 8. menulis RAG lewat chat */
  await page.click('[data-mode="main"]');
  r = await kirim('ingat ya, kunci gudang disimpan di laci dapur');
  cek('chat: RAG hanya-baca menolak dengan petunjuk', /hanya bisa dibaca/.test(r), r);
  await page.click('[data-mode="otak"]'); await page.click('#svgPapan .blok[data-id="rak"]');
  await page.check('#inspektur label.cek:has-text("Agen boleh menulis lewat chat") input');
  await page.click('[data-mode="main"]');
  r = await kirim('ingat ya, kunci gudang disimpan di laci dapur');
  cek('chat: ingat menulis ke RAG', /kucatat/.test(r), r);
  cek('Jejak mencatat CATAT', /Menulis dokumen RAG baru/.test(await page.textContent('#jejak')));
  r = await kirim('di mana kunci gudang disimpan');
  cek('chat: pengetahuan baru dipakai menjawab', /laci dapur/.test(r), r);
  await page.click('[data-mode="otak"]'); await page.click('#svgPapan .blok[data-id="rak"]');
  cek('Inspektur RAG menampilkan dokumen dari chat, status tersimpan', (await page.$$eval('#inspektur .ragIsi', e => e.map(x => x.value))).some(v => /laci dapur/.test(v)) && /Tersimpan/.test(await page.textContent('#ragStatus')));
  await page.click('[data-mode="main"]');
  r = await kirim('hapus catatan kunci gudang');
  cek('chat: hapus catatan', /kuhapus/.test(r) && !(await S(() => window.__studio.H.blok.find(b => b.id === 'rak').cfg.dokumen.some(d => /laci/.test(d.teks)))), r);

  /* 9. ekspor lalu impor proyek: isi RAG, izin tulis, aksi rute, strategi orkestrator ikut; berkas format lama tetap terbaca */
  await S(() => { const s = window.__studio, H = s.H;
    H.blok.push({ id: 'rt', jenis: 'router', x: 900, y: 500, cfg: { mode: 'semantik', ambang: 0.4, rute: [{ nama: 'jual', kata: ['jual'], contoh: [], aksi: 'balas', balasan: 'Hubungi pak RT.' }] } });
    H.blok.push({ id: 'ork', jenis: 'orkestrator', x: 900, y: 650, cfg: { mode: 'ai', strategi: 'berurutan' } });
    H.blok.find(b => b.id === 'rak').cfg.tulis = true; H.blok.find(b => b.id === 'rak').cfg.dokumen = [{ judul: 'Kode gerbang', teks: 'Kode gerbang belakang 4321.' }];
    s.KV.muat(H); });
  await page.click('#btnProyek');
  const [unduhan] = await Promise.all([page.waitForEvent('download'), page.click('#proyekIsi .btn:has-text("Ekspor proyek")')]);
  const isi = JSON.parse(require('fs').readFileSync(await unduhan.path(), 'utf8'));
  cek('ekspor proyek: format berkas tetap studio-rumah-agen/1', isi.format === 'studio-rumah-agen/1');
  await page.click('#proyekIsi .btn:has-text("Tutup")');
  await S(() => { const s = window.__studio; s.muatPreset('kosong', 'kosong'); });
  const tmp = require('path').join(require('os').tmpdir(), 'proyek-uji-eav.json'); require('fs').writeFileSync(tmp, JSON.stringify(isi));
  await page.click('#btnProyek');
  const [pilihBerkas] = await Promise.all([page.waitForEvent('filechooser'), page.click('#proyekIsi .btn:has-text("Impor proyek")')]);
  await pilihBerkas.setFiles(tmp); await page.waitForTimeout(400);
  const hasilImpor = await S(() => { const H = window.__studio.H, rk = H.blok.find(b => b.id === 'rak'), rt = H.blok.find(b => b.id === 'rt'), ok = H.blok.find(b => b.id === 'ork'); return { tulis: rk && rk.cfg.tulis, dok: rk && rk.cfg.dokumen.map(d => d.teks), aksi: rt && rt.cfg.rute[0].aksi, balasan: rt && rt.cfg.rute[0].balasan, ambang: rt && rt.cfg.ambang, mode: ok && ok.cfg.mode, strategi: ok && ok.cfg.strategi, perangkat: window.__studio.W.perangkat.length }; });
  cek('impor proyek: RAG, izin tulis, aksi rute, ambang, strategi orkestrator, dan rumah kembali utuh', hasilImpor.tulis === true && /4321/.test(hasilImpor.dok[0]) && hasilImpor.aksi === 'balas' && /pak RT/.test(hasilImpor.balasan) && hasilImpor.ambang === 0.4 && hasilImpor.mode === 'ai' && hasilImpor.strategi === 'berurutan' && hasilImpor.perangkat > 10, hasilImpor);
  // berkas lama: rute tanpa aksi, RAG tanpa izin tulis, orkestrator tanpa strategi
  const lama = JSON.parse(JSON.stringify(isi)); lama.graf.blok.forEach(b => { if (b.jenis === 'router') b.cfg.rute.forEach(r => { delete r.aksi; delete r.balasan; }); if (b.jenis === 'rak') delete b.cfg.tulis; if (b.jenis === 'orkestrator') delete b.cfg.strategi; });
  require('fs').writeFileSync(tmp, JSON.stringify(lama));
  await page.click('#btnProyek');
  const [pb2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#proyekIsi .btn:has-text("Impor proyek")')]);
  await pb2.setFiles(tmp); await page.waitForTimeout(400);
  const hl = await S(() => { const H = window.__studio.H; return { aksi: H.blok.find(b => b.id === 'rt').cfg.rute[0].aksi, tulis: H.blok.find(b => b.id === 'rak').cfg.tulis, strategi: H.blok.find(b => b.id === 'ork').cfg.strategi }; });
  cek('berkas proyek versi lama: nilai bawaan aman (teruskan, hanya-baca, strategi otomatis)', hl.aksi === 'teruskan' && hl.tulis === false && hl.strategi === 'otomatis', hl);
  require('fs').unlinkSync(tmp);

  cek('tanpa galat JS', galat.length === 0, galat);
  await browser.close();
  console.log(gagal ? `\n${gagal} gagal` : '\nsemua lulus');
  process.exit(gagal ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
