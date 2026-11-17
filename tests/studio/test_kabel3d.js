const ALAT = require('../alat');   // pindah ke akar repo, cari Chrome dan three.js
/* Skenario kabel dan visual di dunia 3D dengan mouse sungguhan:
   klik kabel lalu putuskan (tombol dan Delete), sambung lewat klik tujuan (benar dan ditolak), Esc membatalkan,
   kabel ikut saat perangkat digeser, salah pin jadi oranye, hapus ESP, label tidak bertumpuk, mode ringan, malam. */
const { chromium } = require(require.resolve(ALAT.PW, { paths: [ALAT.AKAR] }));
let gagal = 0;
const cek = (n, c, info) => { if (!c) { gagal++; console.log('GAGAL:', n, info !== undefined ? JSON.stringify(info).slice(0, 300) : ''); } else console.log('ok   :', n); };

async function buka(browser, grafis) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 880 } });
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); if (/three(\.min)?\.js/.test(u)) return r.fulfill({ path: ALAT.THREE, contentType: 'application/javascript' }); return r.abort(); });
  await ctx.addInitScript(() => { try { localStorage.setItem('studio-wizard', 'true'); } catch (e) { /* abaikan */ } });
  const page = await ctx.newPage(); page.galat = []; page.on('pageerror', e => page.galat.push(String(e)));
  await page.goto(require('url').pathToFileURL(ALAT.AKAR + '/studio.html').href + `?grafis=${grafis}&jam=11&cepat=0&awal=rumah_kebun_kandang&tanpaTutorial=1`);
  await page.waitForFunction(() => window.__studio && window.__studio.W.perangkat.length > 10);
  await page.waitForTimeout(600);
  return page;
}
const kabel = page => page.evaluate(() => window.__studio.D3.daftarKabel());
const sambung = (page, id) => page.evaluate(id => { const p = window.__studio.W.perangkat.find(q => q.id === id); return p && (p.sambung || p.daya) ? JSON.parse(JSON.stringify({ s: p.sambung, d: p.daya })) : null; }, id);

(async () => {
  const browser = await chromium.launch({ executablePath: ALAT.CHROME });
  const page = await buka(browser, 'realistis');
  const S = (f, a) => page.evaluate(f, a);

  // kamera dekat kandang
  await S(() => window.__studio.D3.fokus(27, 15, 12, -0.6, 0.85)); await page.waitForTimeout(300);
  const k0 = await kabel(page);
  cek('kabel tergambar untuk setiap sambungan (data, daya, relay, beban)', ['data', 'daya', 'relay', 'beban'].every(j => k0.some(k => k.jenis === j)), k0.map(k => k.jenis));

  /* 1. klik kabel di 3D, lalu tombol Putuskan */
  let t = await S(() => window.__studio.D3.layarKabel('dht_kandang>sambung'));
  await page.mouse.click(t.x, t.y); await page.waitForTimeout(200);
  cek('klik kabel: Inspektur menampilkan kabel itu', /Kabel data/.test(await page.textContent('#inspektur')) && /DHT22 kandang/.test(await page.textContent('#inspektur')), await page.textContent('#inspektur'));
  await page.click('#putusKabel'); await page.waitForTimeout(200);
  cek('Putuskan kabel: sambungan sensor hilang', !(await sambung(page, 'dht_kandang')));
  cek('Putuskan kabel: kabelnya hilang dari 3D', !(await kabel(page)).some(k => k.kunci === 'dht_kandang>sambung'));
  cek('Putuskan kabel: sensor tidak terbaca', /Tidak terbaca|Belum disambungkan/.test(await page.textContent('#inspektur')), await page.textContent('#inspektur'));

  /* 2. sambung ulang lewat klik: Sambung ke... lalu klik ESP */
  await page.click('#sambungKe');
  cek('mode sambung: petunjuk tampil di panggung', await S(() => document.querySelector('#panggung').classList.contains('menyambung')));
  t = await S(() => window.__studio.D3.layar('esp_kandang')); await page.mouse.click(t.x, t.y); await page.waitForTimeout(200);
  const sb = await sambung(page, 'dht_kandang');
  cek('klik ESP tujuan: sensor tersambung ke pin bebas', sb && sb.s && sb.s.esp === 'esp_kandang' && /GPIO/.test(sb.s.pin), sb);
  cek('rangkaian benar setelah sambung ulang', /Rangkaian benar/.test(await page.textContent('#inspektur')));

  /* 3. sambung yang salah ditolak: kipas ke ESP langsung */
  t = await S(() => window.__studio.D3.layar('kipas_kandang')); await page.mouse.click(t.x, t.y);
  await page.click('#putusPerangkat');
  cek('Putuskan kabel dari Inspektur perangkat', !(await sambung(page, 'kipas_kandang')));
  await page.click('#sambungKe'); t = await S(() => window.__studio.D3.layar('esp_kandang')); await page.mouse.click(t.x, t.y); await page.waitForTimeout(200);
  cek('kipas ke ESP ditolak dengan alasan relay', !(await sambung(page, 'kipas_kandang')) && /relay/.test(await page.textContent('#toast')), await page.textContent('#toast'));
  await page.click('#sambungKe'); t = await S(() => window.__studio.D3.layar('relay_kandang')); await page.mouse.click(t.x, t.y); await page.waitForTimeout(200);
  cek('kipas ke relay diterima', ((await sambung(page, 'kipas_kandang')) || {}).s.relay === 'relay_kandang');

  /* 4. Esc membatalkan mode sambung */
  await page.click('#sambungKe'); await page.keyboard.press('Escape');
  cek('Esc membatalkan mode sambung', !(await S(() => document.querySelector('#panggung').classList.contains('menyambung'))));

  /* 5. Delete memutus kabel yang dipilih */
  t = await S(() => window.__studio.D3.layarKabel('esp_kandang>daya'));
  if (t) { await page.mouse.click(t.x, t.y); await page.waitForTimeout(150); }
  else { await S(() => window.__studio.D3.fokus(26, 14, 6, -0.6, 0.85)); await page.waitForTimeout(150); t = await S(() => window.__studio.D3.layarKabel('esp_kandang>daya')); await page.mouse.click(t.x, t.y); await page.waitForTimeout(150); }
  cek('klik kabel daya: Inspektur kabel daya', /Kabel daya/.test(await page.textContent('#inspektur')));
  await page.keyboard.press('Delete'); await page.waitForTimeout(200);
  cek('Delete memutus kabel daya ESP', !(await S(() => window.__studio.W.perangkat.find(p => p.id === 'esp_kandang').daya)));
  cek('ESP tanpa daya: status mati', await S(() => { const s = window.__studio; return !window.IoT.status(s.W, s.S).papan.esp_kandang.hidup; }));
  await page.click('#sambungKe'); t = await S(() => window.__studio.D3.layar('adaptor_kandang') || window.__studio.D3.layar(window.__studio.W.perangkat.find(p => p.jenis === 'adaptor' && p.x > 20).id)); await page.mouse.click(t.x, t.y); await page.waitForTimeout(200);
  cek('ESP disambung ulang ke adaptor lewat klik', !!(await S(() => window.__studio.W.perangkat.find(p => p.id === 'esp_kandang').daya)));

  await S(() => window.__studio.D3.fokus(27, 15, 12, -0.6, 0.85)); await page.waitForTimeout(200);
  /* 6. geser perangkat: kabel ikut */
  const sebelum = await S(() => window.__studio.D3.layarKabel('dht_kandang>sambung'));
  const a = await S(() => window.__studio.D3.layar('dht_kandang'));
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 60, a.y + 40, { steps: 6 }); await page.waitForTimeout(100);
  const tengah = await S(() => window.__studio.D3.layarKabel('dht_kandang>sambung'));
  await page.mouse.up(); await page.waitForTimeout(150);
  cek('kabel ikut bergerak saat perangkat masih diseret', tengah && Math.hypot(tengah.x - sebelum.x, tengah.y - sebelum.y) > 5, { sebelum, tengah });

  /* 7. salah pin: kabel oranye */
  await S(() => window.__studio.D3.fokus(8, 16, 12, -0.6, 0.85)); await page.waitForTimeout(150);
  t = await S(() => window.__studio.D3.layar('soil_kebun')); await page.mouse.click(t.x, t.y); await page.waitForTimeout(150);
  await page.selectOption('#inspektur label:text-is("Pin data") + select', 'GPIO23'); await page.waitForTimeout(150);
  cek('sensor analog di pin digital: kabel ditandai salah (oranye)', (await kabel(page)).some(k => k.dari === 'soil_kebun' && k.salah), (await kabel(page)).filter(k => k.dari === 'soil_kebun'));

  /* 8. hapus ESP: kabel yang menuju ESP ikut hilang, tidak ada kabel yatim */
  await S(() => window.__studio.D3.fokus(27, 15, 12, -0.6, 0.85)); await page.waitForTimeout(150);
  t = await S(() => window.__studio.D3.layar('esp_kandang')); await page.mouse.click(t.x, t.y);
  await page.click('#inspektur .btn:has-text("Hapus")'); await page.waitForTimeout(200);
  const k8 = await kabel(page);
  cek('hapus ESP: tidak ada kabel ke ESP yang sudah hilang', !k8.some(k => k.ke === 'esp_kandang' || k.dari === 'esp_kandang'), k8);

  /* 9. label: tidak ada dua label terlihat yang saling tumpuk di layar */
  await page.click('#btnKamera'); await page.waitForTimeout(400);
  const tumpuk = await S(() => {
    const s = window.__studio, kotak = [];
    // posisi label dihitung ulang tiap frame; ambil dari kanvas label yang terlihat
    return s.D3.labelTerlihat ? s.D3.labelTerlihat() : null;
  });
  if (tumpuk) {
    let tabrak = 0; for (let i = 0; i < tumpuk.length; i++) for (let j = i + 1; j < tumpuk.length; j++) { const A = tumpuk[i], B = tumpuk[j]; if (Math.abs(A.x - B.x) < (A.w + B.w) / 2 - 2 && Math.abs(A.y - B.y) < A.h - 2) tabrak++; }
    cek('label perangkat tidak saling tumpuk (tampilan umum)', tabrak === 0, { tabrak, n: tumpuk.length });
  } else cek('labelTerlihat tersedia', false);

  /* 10. malam: adegan tidak gelap gulita */
  await S(() => { window.__studio.S.menit = 23 * 60; }); await page.waitForTimeout(400);
  const terang = await S(() => { const s = window.__studio; s.D3.perbarui(s.S, window.IoT.status(s.W, s.S)); const c = document.querySelector('#c3d'), g = document.createElement('canvas'); g.width = 64; g.height = 40; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 40); const d = x.getImageData(0, 0, 64, 40).data; let jml = 0; for (let i = 0; i < d.length; i += 4) jml += (d[i] + d[i + 1] + d[i + 2]) / 3; return jml / (d.length / 4); });
  cek('malam: kecerahan rata-rata layar cukup (> 45 dari 255)', terang > 45, terang);
  cek('tanpa galat JS (realistis)', page.galat.length === 0, page.galat);

  /* 11. mode ringan: semua skenario dasar tetap jalan */
  const p2 = await buka(browser, 'ringan');
  await p2.evaluate(() => window.__studio.D3.fokus(27, 15, 12, -0.6, 0.85)); await p2.waitForTimeout(200);
  const t2 = await p2.evaluate(() => window.__studio.D3.layarKabel('dht_kandang>sambung'));
  await p2.mouse.click(t2.x, t2.y); await p2.waitForTimeout(150); await p2.click('#putusKabel');
  cek('mode ringan: klik kabel dan putuskan', !(await sambung(p2, 'dht_kandang')));
  cek('mode ringan: segitiga tetap hemat (< 150 ribu)', (await p2.evaluate(() => window.__studio.D3.info().segitiga)) < 150000, await p2.evaluate(() => window.__studio.D3.info()));
  cek('tanpa galat JS (ringan)', p2.galat.length === 0, p2.galat);

  await browser.close();
  console.log(gagal ? `\n${gagal} gagal` : '\nsemua lulus');
  process.exit(gagal ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
