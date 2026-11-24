const ALAT = require('./alat');
/* Uji panel model Ollama di game (tab Otak) dan Studio (tab Model): katalog, kecocokan, unduhan dengan progres,
   galat unduhan, unduhan terputus, memilih model. Ollama ditiru lewat route, tanpa jaringan. */
const { chromium } = require(require.resolve(ALAT.PW, { paths: [ALAT.AKAR] }));
const url = require('url');
let gagal = 0;
const cek = (n, c, info) => { if (!c) { gagal++; console.log('GAGAL:', n, info !== undefined ? JSON.stringify(info).slice(0, 300) : ''); } else console.log('ok   :', n); };
const CORS = { 'access-control-allow-origin': '*' };

(async () => {
  const browser = await chromium.launch({ executablePath: ALAT.CHROME });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  let terpasang = [{ name: 'qwen2.5:1.5b', size: 986e6 }];
  let ollamaMati = false;
  const tarikan = [];
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('file:')) return route.continue();
    if (/three(\.min)?\.js/.test(u)) return route.fulfill({ path: ALAT.THREE, contentType: 'application/javascript' });
    if (u.startsWith('http://localhost:11434/') && ollamaMati) return route.abort();
    if (u === 'http://localhost:11434/api/tags') return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ models: terpasang }) });
    if (u === 'http://localhost:11434/api/pull') {
      const b = JSON.parse(route.request().postData()); tarikan.push(b);
      if (b.model === 'tidakada:1b') return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ status: 'pulling manifest' }) + '\n' + JSON.stringify({ error: 'pull model manifest: file does not exist' }) + '\n' });
      if (b.model === 'putus:1b') return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ status: 'pulling abc', total: 100, completed: 30 }) + '\n' });
      if (!terpasang.some(m => m.name === b.model)) terpasang.push({ name: b.model, size: 1.9e9 });
      return route.fulfill({ status: 200, headers: CORS, body: [{ status: 'pulling manifest' }, { status: 'pulling abc', total: 100, completed: 50 }, { status: 'pulling abc', total: 100, completed: 100 }, { status: 'success' }].map(x => JSON.stringify(x)).join('\n') + '\n' });
    }
    return route.abort();
  });

  for (const app of ['game', 'studio']) {
    const page = await ctx.newPage();
    const galat = []; page.on('pageerror', e => galat.push(String(e)));
    terpasang = [{ name: 'qwen2.5:1.5b', size: 986e6 }]; tarikan.length = 0;
    const u = url.pathToFileURL(ALAT.AKAR + (app === 'game' ? '/index.html' : '/studio.html')).href + '?grafis=ringan&kejadian=mati&jam=13&tanpaTutorial=1';
    await page.goto(u);
    if (app === 'game') { await page.click('#tab-otak'); await page.selectOption('#otMode', 'ollama'); }
    else {
      await page.waitForSelector('#wizard:not([hidden])');
      await page.click('#wizardIsi .pilihan button[data-v="parser"]'); await page.click('#wizardIsi .pilihan button[data-v="kosong"]'); await page.click('#wizardMulai');
      await page.click('[data-tab="model"]'); await page.selectOption('#mdMode', 'ollama');
    }
    const panel = app === 'game' ? '#otOllamaPanel' : '#mdKelola';
    await page.waitForFunction(p => /terpasang/.test((document.querySelector(p) || {}).textContent || ''), panel);
    const teks = () => page.textContent(panel);
    const baris = n => page.locator(`${panel} > div > div`, { hasText: n }).first();
    const t0 = await teks();
    cek(app + ': katalog menampilkan 6 model dan ukurannya', ['qwen2.5:1.5b', 'qwen2.5:3b', 'qwen2.5:7b', 'gemma4:e4b', 'embeddinggemma', 'llama-guard3:1b'].every(n => t0.includes(n)) && /4\.7 GB/.test(t0), t0.slice(0, 200));
    cek(app + ': model terpasang bertanda, lainnya punya tombol Unduh', /qwen2\.5:1\.5b[\s\S]*terpasang/.test(t0) && (await page.$$(panel + ' button')).length > 5);
    cek(app + ': ada penilaian kecocokan, saran, dan info laptop', /DISARANKAN/.test(t0) && /(cocok|lambat|berat|tidak diketahui)/.test(t0) && /Laptopmu|tidak terbaca/.test(t0), t0.slice(0, 300));

    await baris('qwen2.5:3b').getByRole('button', { name: 'Unduh' }).click();
    await page.waitForFunction(p => /qwen2\.5:3b[\s\S]*terpasang/.test(document.querySelector(p).textContent), panel);
    cek(app + ': unduhan memakai /api/pull dengan nama model', tarikan.length === 1 && tarikan[0].model === 'qwen2.5:3b' && tarikan[0].stream === true, tarikan);
    cek(app + ': setelah unduhan model terpasang dan bisa dipakai', await baris('qwen2.5:3b').getByRole('button', { name: 'Pakai' }).isVisible());

    await baris('qwen2.5:3b').getByRole('button', { name: 'Pakai' }).click();
    const dipilih = await page.evaluate(a => a === 'game' ? document.querySelector('#otOllamaModel').value : document.querySelector('#mdModel').value, app);
    cek(app + ': tombol Pakai memilih model', dipilih === 'qwen2.5:3b', dipilih);

    const unduhBebas = async nama => { await page.fill(panel + ' input[type=text]', nama); await page.locator(panel + ' > div').last().getByRole('button', { name: 'Unduh' }).click(); };
    await unduhBebas('llama3.2:1b');
    await page.waitForFunction(p => /llama3\.2:1b[\s\S]*terpasang/.test(document.querySelector(p).textContent), panel);
    cek(app + ': model di luar katalog bisa diunduh dan muncul di daftar', tarikan.some(b => b.model === 'llama3.2:1b'));

    await unduhBebas('tidakada:1b');
    await page.waitForFunction(p => /file does not exist/.test(document.querySelector(p).textContent), panel);
    cek(app + ': galat unduhan ditampilkan ramah', /Gagal: pull model manifest: file does not exist/.test(await teks()));

    await unduhBebas('putus:1b');
    await page.waitForFunction(p => /berhenti sebelum selesai/.test(document.querySelector(p).textContent), panel);
    cek(app + ': unduhan terputus dijelaskan dan boleh diulang', /berhenti sebelum selesai/.test(await teks()));
    cek(app + ': tanpa galat JS', galat.length === 0, galat);
    await page.close();
  }

  // Ollama mati: pesan jelas, bukan layar kosong
  ollamaMati = true;
  const page = await ctx.newPage();
  await page.goto(url.pathToFileURL(ALAT.AKAR + '/index.html').href + '?grafis=ringan&kejadian=mati');
  await page.click('#tab-otak'); await page.selectOption('#otMode', 'ollama');
  await page.waitForFunction(() => /tidak terjangkau/.test(document.querySelector('#otOllamaPanel').textContent));
  cek('Ollama mati: panel menjelaskan cara memperbaiki dan tombol Periksa lagi ada', /ollama\.com\/download/.test(await page.textContent('#otOllamaPanel')) && await page.isVisible('#oklPeriksa'));
  await browser.close();
  console.log(gagal ? gagal + ' gagal' : 'semua lulus'); process.exitCode = gagal ? 1 : 0;
})();
