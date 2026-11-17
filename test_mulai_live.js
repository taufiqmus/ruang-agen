/* Uji nyata alur mahasiswa: MULAI.bat sudah berjalan (game dan model di satu alamat). Browser baru tanpa pengaturan apa pun
   harus langsung memakai model lokal. Pakai: PW=... CHROME=... [ALAMAT=http://127.0.0.1:8000/] node test_mulai_live.js */
const { chromium } = require(process.env.PW || 'playwright-core');
const ALAMAT = process.env.ALAMAT || 'http://127.0.0.1:8000/';
let gagal = 0;
const cek = (n, c, i) => { if (!c) { gagal++; console.log('GAGAL:', n, i !== undefined ? JSON.stringify(i).slice(0, 300) : ''); } else console.log('ok   :', n); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 760 } });
  // three.js tetap dari CDN bila ada internet; uji ini memakai salinan lokal bila THREE diisi
  if (process.env.THREE) await ctx.route(/three(\.min)?\.js/, r => r.fulfill({ path: process.env.THREE, contentType: 'application/javascript' }));
  const page = await ctx.newPage(); const galat = []; page.on('pageerror', e => galat.push(String(e)));
  await page.goto(ALAMAT + '?grafis=ringan&kejadian=mati');
  await page.waitForFunction(() => window.__ruangAgen, null, { timeout: 60000 });
  await page.waitForFunction(() => /Model lokal terdeteksi/.test(document.querySelector('#chatlog').textContent), null, { timeout: 15000 }).catch(() => {});
  cek('tanpa pengaturan: model lokal terdeteksi dan dipakai otomatis', /Model lokal terdeteksi/.test(await page.textContent('#chatlog')) && /model lokal/.test(await page.textContent('#otakBadge')));
  await page.evaluate(() => { window.__ruangAgen.G.speed = 3; });
  const kirim = async t => { const n = await page.evaluate(() => window.__ruangAgen.G.pesan); await page.fill('#inp', t); await page.click('#send'); await page.waitForFunction(x => !window.__ruangAgen.G.busy && window.__ruangAgen.G.pesan >= x, n + 1, { timeout: 180000 }); };
  await kirim('nyalakan lampu dan kipas');
  cek('pesan dikenal: dikerjakan parser (router hemat), cepat', /Router biaya/.test(await page.textContent('#trace')) && (await page.evaluate(() => window.__ruangAgen.G.st.lampu.on)));
  await kirim('hawanya bikin ngantuk');
  const j = await page.textContent('#trace');
  cek('pesan baru: model lokal sungguhan dipanggil di alamat yang sama (tanpa CORS)', /Otak: LLM lokal:/.test(j), j.split('Perintah #2')[1]);
  cek('tanpa galat JS', galat.length === 0, galat);
  await b.close();
  console.log(gagal ? `\n${gagal} gagal` : '\nsemua lulus');
  process.exit(gagal ? 1 : 0);
})().catch(e => { console.error('UJI MULAI ERROR', e); process.exit(2); });
