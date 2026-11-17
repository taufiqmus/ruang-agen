const ALAT = require('../alat');   // pindah ke akar repo, cari Chrome dan three.js
/* Area di dunia 3D dengan mouse sungguhan: klik memilih, seret memindah (perangkat ikut), pegangan sudut mengubah ukuran,
   area tidak boleh menimpa area lain atau keluar lahan, area baru dari palet digeser ke tempat kosong. */
const { chromium } = require(require.resolve(ALAT.PW, { paths: [ALAT.AKAR] }));
let gagal = 0;
const cek = (n, c, info) => { if (!c) { gagal++; console.log('GAGAL:', n, info !== undefined ? JSON.stringify(info).slice(0, 300) : ''); } else console.log('ok   :', n); };

(async () => {
  const browser = await chromium.launch({ executablePath: ALAT.CHROME });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 880 } });
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); if (/three(\.min)?\.js/.test(u)) return r.fulfill({ path: ALAT.THREE, contentType: 'application/javascript' }); return r.abort(); });
  await ctx.addInitScript(() => { try { localStorage.setItem('studio-wizard', 'true'); } catch (e) { /* abaikan */ } });
  const page = await ctx.newPage(); const galat = []; page.on('pageerror', e => galat.push(String(e)));
  await page.goto(require('url').pathToFileURL(ALAT.AKAR + '/studio.html').href + '?grafis=ringan&jam=11&cepat=0&awal=rumah_kebun_kandang&tanpaTutorial=1');
  await page.waitForFunction(() => window.__studio && window.__studio.W.perangkat.length > 10);
  const S = (f, a) => page.evaluate(f, a);
  const area = id => S(id => { const a = window.__studio.W.area.find(x => x.id === id); return a && { x: a.x, z: a.z, w: a.w, d: a.d }; }, id);
  const pos = id => S(id => { const p = window.__studio.W.perangkat.find(x => x.id === id); return p && { x: p.x, z: p.z }; }, id);
  // titik layar dari koordinat lantai
  const layarLantai = (x, z) => S(([x, z]) => { const D = window.__studio.D3, c = document.querySelector('#c3d').getBoundingClientRect(); let best = null, jb = 1e9; for (let y = c.top + 5; y < c.bottom - 5; y += 6) for (let xx = c.left + 5; xx < c.right - 5; xx += 6) { const p = D.titikLantai(xx, y); if (!p) continue; const j = (p.x - x) ** 2 + (p.z - z) ** 2; if (j < jb && !D.ambilPerangkat(xx, y) && !D.ambilKabel(xx, y)) { jb = j; best = { x: xx, y }; } } return best; }, [x, z]);
  const seret = async (a, b) => { await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(200); };

  await S(() => window.__studio.D3.fokus(27, 16, 22, -0.4, 0.75)); await page.waitForTimeout(300);

  /* 1. satu klik memilih area */
  let t = await layarLantai(29.5, 17.5); await page.mouse.click(t.x, t.y); await page.waitForTimeout(150);
  cek('satu klik di lantai memilih area', /Area: Kandang/.test(await page.textContent('#inspektur')), await page.textContent('#inspektur'));
  cek('area terpilih ditandai di 3D', (await S(() => window.__studio.D3.areaTerpilih())) === 'kandang');

  /* 2. seret area terpilih: area dan perangkat di dalamnya pindah */
  const a0 = await area('kandang'), d0 = await pos('dht_kandang');
  const kamera0 = await S(() => ({ ...window.__studio.D3.kamera, target: null }));
  await seret(await layarLantai(29.5, 17.5), await layarLantai(32.5, 20.5));
  const a1 = await area('kandang'), d1 = await pos('dht_kandang');
  cek('seret area: posisinya berubah', a1.x !== a0.x || a1.z !== a0.z, { a0, a1 });
  cek('perangkat di dalam area ikut pindah sejauh area', Math.abs((d1.x - d0.x) - (a1.x - a0.x)) < 0.01 && Math.abs((d1.z - d0.z) - (a1.z - a0.z)) < 0.01, { d0, d1, a0, a1 });
  const k1 = await S(() => ({ ...window.__studio.D3.kamera, target: null }));
  cek('kamera tidak berputar saat menyeret area', k1.theta === kamera0.theta && k1.phi === kamera0.phi);
  cek('perangkat di luar area tidak ikut', JSON.stringify(await pos('esp_rumah')) === JSON.stringify({ x: 10, z: 6.5 }));
  cek('rangkaian tetap utuh setelah area dipindah', await S(() => !window.IoT.periksaRangkaian(window.__studio.W).dht_kandang.masalah.length));

  /* 3. area yang dijatuhkan menimpa area lain: ditolak, kembali ke tempat semula */
  await S(() => window.__studio.D3.fokus(20, 15, 34, -0.4, 0.8)); await page.waitForTimeout(300);
  const a2 = await area('kandang');
  await seret(await layarLantai(a2.x + 4, a2.z + 3), await layarLantai(10, 17));
  cek('menimpa area lain: ditolak dan kembali', JSON.stringify(await area('kandang')) === JSON.stringify(a2) && /menimpa/.test(await page.textContent('#toast')), await page.textContent('#toast'));
  cek('perangkat kembali ke posisinya juga', JSON.stringify(await pos('dht_kandang')) === JSON.stringify(d1));

  /* 4. pegangan sudut mengubah ukuran */
  await S(() => { const a = window.__studio.W.area.find(x => x.id === 'kandang'); window.__studio.D3.fokus(a.x + a.w - 2, a.z + a.d - 2, 16, -0.4, 0.8); }); await page.waitForTimeout(300);
  const pg = await S(() => { const D = window.__studio.D3, a = window.__studio.W.area.find(x => x.id === 'kandang'), c = document.querySelector('#c3d').getBoundingClientRect(); for (let y = c.top; y < c.bottom; y += 3) for (let x = c.left; x < c.right; x += 3) if (D.ambilPegangan(x, y)) return { x, y }; return null; });
  cek('pegangan ukuran tampil di sudut area terpilih', !!pg, await area('kandang'));
  const a3 = await area('kandang');
  const tuju = await layarLantai(a3.x + a3.w - 2, a3.z + a3.d - 1.5);
  await seret(pg, tuju);
  const a4 = await area('kandang');
  cek('seret pegangan: area mengecil', a4.w < a3.w && a4.d < a3.d && a4.x === a3.x, { a3, a4 });

  /* 5. klik lantai kosong melepas pilihan */
  t = await layarLantai(38, 2); await page.mouse.click(t.x, t.y); await page.waitForTimeout(100);
  cek('klik lahan kosong melepas pilihan area', !(await S(() => window.__studio.D3.areaTerpilih())));

  /* 6. area baru dari palet di atas area lain: digeser ke tempat kosong */
  t = await layarLantai(8, 17);
  await page.dragAndDrop('.item[data-drag="area:gudang"]', '#c3d', { targetPosition: await S(([x, y]) => { const r = document.querySelector('#c3d').getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; }, [t.x, t.y]) });
  await page.waitForTimeout(200);
  const g = await S(() => { const W = window.__studio.W, a = W.area.find(x => x.tipe === 'gudang'); return a && { a, bentrok: window.IoT.areaBentrok(W, a) }; });
  cek('area baru tidak menimpa area lain', g && !g.bentrok, g);

  /* 7. kolom angka di Inspektur menolak posisi yang menimpa */
  await page.click('#inspektur label:text-is("X") + input', { clickCount: 3 }).catch(() => {});
  const xIn = await page.$('#inspektur label:text-is("X") + input');
  const xLama = await xIn.inputValue();
  await xIn.fill('4'); await xIn.press('Tab'); await page.waitForTimeout(100);
  const g2 = await S(() => { const W = window.__studio.W, a = W.area.find(x => x.tipe === 'gudang'); return !window.IoT.areaBentrok(W, a); });
  cek('Inspektur: angka yang membuat area menimpa ditolak', g2 && (await xIn.inputValue()) === xLama, await page.textContent('#toast'));

  /* 8. Delete dan Ctrl+Z tetap jalan untuk area (fokus keluar dari kolom isian dulu) */
  await S(() => document.activeElement.blur());
  await page.keyboard.press('Delete');
  cek('Delete menghapus area terpilih', !(await S(() => window.__studio.W.area.some(x => x.tipe === 'gudang'))));
  await page.keyboard.press('Control+z');
  cek('Ctrl+Z mengembalikannya', await S(() => window.__studio.W.area.some(x => x.tipe === 'gudang')));

  cek('tanpa galat JS', galat.length === 0, galat);
  await browser.close();
  console.log(gagal ? `\n${gagal} gagal` : '\nsemua lulus');
  process.exit(gagal ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
