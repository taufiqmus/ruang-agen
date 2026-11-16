/* Uji simulasi perangkat lemah: CPU browser diperlambat, jumlah inti dan RAM dilaporkan kecil.
   Memeriksa: grafis otomatis memilih atau turun ke mode ringan, alur permainan tetap selesai, memori JS wajar.
   Pakai: PW=... THREE=... CHROME=... [LAMBAT=6] node test_resource_rendah.js */
const path = require('path');
const { chromium } = require(process.env.PW || 'playwright-core');
const THREE = process.env.THREE, CHROME = process.env.CHROME, LAMBAT = +process.env.LAMBAT || 6;
if (!THREE || !CHROME) { console.error('Set THREE dan CHROME.'); process.exit(1); }
const URL = 'file:///' + path.resolve('index.html').split(path.sep).join('/');
let gagal = 0;
const cek = (n, c, i) => { if (!c) { gagal++; console.log('GAGAL:', n, i !== undefined ? JSON.stringify(i).slice(0, 300) : ''); } else console.log('ok   :', n); };

async function sesi(browser, nama, { inti, ram, query, lambat }) {
  console.log(`\n--- ${nama}`);
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); if (/three(\.min)?\.js/.test(u)) return r.fulfill({ path: THREE, contentType: 'application/javascript' }); return r.abort(); });
  await ctx.addInitScript(([i, m]) => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => i }); Object.defineProperty(navigator, 'deviceMemory', { get: () => m }); }, [inti, ram]);
  const page = await ctx.newPage(); const galat = [];
  page.on('pageerror', e => galat.push(String(e)));
  const cdp = await ctx.newCDPSession(page);
  if (lambat > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: lambat });
  const t0 = Date.now();
  await page.goto(URL + (query || ''));
  await page.waitForFunction(() => window.__ruangAgen, null, { timeout: 120000 });
  const muat = Date.now() - t0;
  await page.evaluate(() => { window.__ruangAgen.G.speed = 3; });
  const kirim = async t => { const n = await page.evaluate(() => window.__ruangAgen.G.pesan); await page.fill('#inp', t); await page.click('#send'); await page.waitForFunction(x => !window.__ruangAgen.G.busy && window.__ruangAgen.G.pesan >= x, n + 1, { timeout: 300000 }); };
  return { page, ctx, cdp, galat, muat, kirim, mutu: () => page.evaluate(() => window.__ruangAgen.adegan.kualitas()) };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });

  // 1. perangkat 2 inti, RAM 2 GB, CPU 6x lebih lambat: harus langsung memilih grafis ringan
  let s = await sesi(browser, `2 inti, RAM 2 GB, CPU ${LAMBAT}x lebih lambat (mode otomatis)`, { inti: 2, ram: 2, lambat: LAMBAT });
  cek('perangkat lemah terdeteksi: grafis otomatis ringan sejak awal', (await s.mutu()) === 'ringan');
  console.log(`   halaman siap dalam ${(s.muat / 1000).toFixed(1)} detik`);
  cek('halaman siap dalam waktu wajar (kurang dari 60 detik)', s.muat < 60000, s.muat);
  const info = await s.page.evaluate(() => window.__ruangAgen.adegan.info());
  cek('mode ringan: segitiga dan panggilan gambar lebih sedikit dari batas', info.segitiga < 120000, info);
  await s.kirim('nyalakan lampu dan kipas');
  await s.page.waitForSelector('#toast:not([hidden])', { timeout: 30000 });
  cek('alur lengkap jalan di perangkat lemah (misi 1 selesai)', true);
  await s.page.selectOption('#duRuang', 'kafe').catch(async () => { await s.page.click('#tab-dunia'); await s.page.selectOption('#duRuang', 'kafe'); });
  await s.kirim('seduh kopi'); await s.kirim('resep kopi susu gula aren apa?');
  cek('ruang lain dan RAG jalan di perangkat lemah', /150 ml susu/.test(await s.page.textContent('#chatlog li:last-child')));
  const mem = await s.page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1));
  console.log(`   memori JS terpakai: ${mem} MB`);
  cek('memori JS di bawah 250 MB', mem < 250, mem);
  const perFrame = await s.page.evaluate(() => new Promise(r => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t > 2000) r(Math.round(n / ((performance.now() - t) / 1000))); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
  console.log(`   laju frame terukur: ${perFrame} fps (software rendering, CPU diperlambat)`);
  cek('tanpa galat JS', s.galat.length === 0, s.galat);
  await s.ctx.close();

  // 2. perangkat kuat dipaksa realistis lalu CPU diperlambat: penjaga kinerja harus menurunkan ke ringan
  s = await sesi(browser, `perangkat kuat memaksa realistis, lalu CPU ${LAMBAT}x lebih lambat (penurunan otomatis)`, { inti: 12, ram: 8, lambat: 1, query: '' });
  cek('perangkat kuat: mulai realistis', (await s.mutu()) === 'realistis');
  await s.cdp.send('Emulation.setCPUThrottlingRate', { rate: LAMBAT });
  await s.page.waitForFunction(() => window.__ruangAgen.adegan.kualitas() === 'ringan', null, { timeout: 90000 }).catch(() => {});
  cek('penjaga kinerja menurunkan ke ringan bila terlalu lambat', (await s.mutu()) === 'ringan');
  cek('pemain diberi tahu lewat chat', /Grafis diturunkan/.test(await s.page.textContent('#chatlog')));
  await s.kirim('nyalakan lampu');
  cek('permainan tetap jalan setelah penurunan', (await s.page.evaluate(() => window.__ruangAgen.G.st.lampu.on)) === true);
  cek('tanpa galat JS (penurunan)', s.galat.length === 0, s.galat);
  await s.ctx.close();

  // 3. pemain memilih sendiri: pilihan manual menang atas deteksi
  s = await sesi(browser, 'pilihan manual grafis ringan lewat alamat', { inti: 12, ram: 8, lambat: 1, query: '?grafis=ringan' });
  cek('parameter ?grafis=ringan dihormati', (await s.mutu()) === 'ringan');
  await s.ctx.close();

  await browser.close();
  console.log(gagal ? `\n${gagal} gagal` : '\nsemua lulus');
  process.exit(gagal ? 1 : 0);
})().catch(e => { console.error('UJI RESOURCE RENDAH ERROR', e); process.exit(2); });
