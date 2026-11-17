const ALAT = require('../alat');   // pindah ke akar repo, cari Chrome dan three.js
/* Studio di perangkat lemah: 2 inti, RAM 2 GB, CPU diperlambat. Memeriksa grafis ringan otomatis, waktu muat,
   simulasi tetap berjalan pada 60x, chat tetap menjawab, gambar per detik, dan memori JS. */
const { chromium } = require(require.resolve(ALAT.PW, { paths: [ALAT.AKAR] }));
const LAMBAT = +process.env.LAMBAT || 6;
let gagal = 0;
const cek = (n, c, i) => { if (!c) { gagal++; console.log('GAGAL:', n, i !== undefined ? JSON.stringify(i).slice(0, 300) : ''); } else console.log('ok   :', n); };
(async () => {
  const browser = await chromium.launch({ executablePath: ALAT.CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); if (/three(\.min)?\.js/.test(u)) return r.fulfill({ path: ALAT.THREE, contentType: 'application/javascript' }); return r.abort(); });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }); Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 }); localStorage.setItem('studio-wizard', 'true'); });
  const page = await ctx.newPage(); const galat = []; page.on('pageerror', e => galat.push(String(e)));
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: LAMBAT });
  const t0 = Date.now();
  await page.goto(require('url').pathToFileURL(ALAT.AKAR + '/studio.html').href + '?awal=rumah_kebun_kandang&graf=multi_agen&jam=6&cepat=60&mode=main');
  await page.waitForFunction(() => window.__studio, null, { timeout: 120000 });
  const muat = Date.now() - t0;
  console.log(`   2 inti, RAM 2 GB, CPU ${LAMBAT}x lebih lambat: siap dalam ${(muat / 1000).toFixed(1)} detik`);
  cek('perangkat lemah: grafis otomatis ringan', (await page.evaluate(() => window.__studio.D3.kualitas())) === 'ringan');
  cek('halaman siap dalam waktu wajar (< 60 detik)', muat < 60000, muat);
  const m0 = await page.evaluate(() => window.__studio.S.menit);
  const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 5000) requestAnimationFrame(f); else r(n / 5); }; requestAnimationFrame(f); }));
  const m1 = await page.evaluate(() => window.__studio.S.menit);
  console.log(`   gambar per detik: ${fps.toFixed(1)}, menit simulasi berjalan: ${(m1 - m0).toFixed(0)} dalam 5 detik`);
  cek('simulasi tetap berjalan pada 60x', m1 - m0 > 60, m1 - m0);
  cek('animasi tetap bergerak (> 3 gambar per detik)', fps > 3, fps);
  const info = await page.evaluate(() => window.__studio.D3.info());
  cek('mode ringan: jumlah segitiga terkendali', info.segitiga < 150000, info);
  for (const t of ['siram kebun dong', 'berapa suhu kandang?', 'nyalakan kipas kamar']) {
    const n = await page.$$eval('#chatlog li', e => e.length);
    await page.fill('#inp', t); await page.click('#kirim');
    await page.waitForFunction(n => document.querySelectorAll('#chatlog li').length > n + 1 && !document.querySelector('#kirim').disabled, n, { timeout: 60000 });
  }
  const jw = await page.$$eval('#chatlog li', e => e.slice(-1)[0].textContent);
  cek('chat tetap menjawab di perangkat lemah', /Kipas kamar menyala/.test(jw), jw);
  const mem = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0));
  console.log(`   memori JS terpakai: ${mem} MB`);
  cek('memori JS di bawah 250 MB', mem < 250, mem);
  cek('tanpa galat JS', galat.length === 0, galat);
  await browser.close();
  console.log(gagal ? `\n${gagal} gagal` : '\nsemua lulus');
  process.exit(gagal ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
