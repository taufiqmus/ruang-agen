const ALAT = require('../alat');   // pindah ke akar repo, cari Chrome dan three.js
/* Uji monyet: ratusan tindakan acak di seluruh antarmuka (mode, tab, palet, klik 3D, klik papan, Inspektur,
   Delete, Ctrl+Z, Esc, chat, Proyek, Tutorial) di layar lebar, layar HP, dan mode ringan.
   Gagal bila muncul galat JS atau console.error, atau bila data rumah/papan menjadi tidak sah. Benih tetap. */
const { chromium } = require(require.resolve(ALAT.PW, { paths: [ALAT.AKAR] }));
let gagal = 0;
const cek = (n, c, info) => { if (!c) { gagal++; console.log('GAGAL:', n, info !== undefined ? JSON.stringify(info).slice(0, 600) : ''); } else console.log('ok   :', n); };

async function sesi(browser, nama, viewport, grafis, langkah, benih) {
  const ctx = await browser.newContext({ viewport });
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); if (/three(\.min)?\.js/.test(u)) return r.fulfill({ path: ALAT.THREE, contentType: 'application/javascript' }); return r.abort(); });
  await ctx.addInitScript(() => { try { localStorage.setItem('studio-wizard', 'true'); } catch (e) { /* abaikan */ } });
  const page = await ctx.newPage(); const galat = [];
  page.on('pageerror', e => galat.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource|ERR_BLOCKED/.test(m.text())) galat.push('console: ' + m.text()); });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.goto(require('url').pathToFileURL(ALAT.AKAR + '/studio.html').href + `?grafis=${grafis}&jam=10&cepat=0&awal=rumah_kebun_kandang&graf=agen_rumah&tanpaTutorial=1`);
  await page.waitForFunction(() => window.__studio && window.__studio.W.perangkat.length > 5);
  let b = benih; const acak = () => { b = (b * 1103515245 + 12345) % 2147483648; return b / 2147483648; };
  const ambil = a => a[Math.floor(acak() * a.length)];
  const log = [];
  const titikDi = async sel => { const e = await page.$(sel); if (!e) return null; const k = await e.boundingBox(); if (!k || k.width < 2) return null; return { x: k.x + 4 + acak() * Math.max(1, k.width - 8), y: k.y + 4 + acak() * Math.max(1, k.height - 8) }; };
  const klikAcakDi = async sel => { const els = await page.$$(sel); const vis = []; for (const e of els) if (await e.isVisible()) vis.push(e); if (!vis.length) return; await ambil(vis).click({ timeout: 1500, force: true }).catch(() => {}); };
  const tindakan = [
    async () => { await klikAcakDi('[data-mode]'); return 'mode'; },
    async () => { await klikAcakDi('#tabs button'); return 'tab'; },
    async () => { const t = await titikDi('#c3d'); if (t) await page.mouse.click(t.x, t.y); return 'klik 3D'; },
    async () => { const a = await titikDi('#c3d'); if (!a) return 'seret 3D'; await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + (acak() - 0.5) * 200, a.y + (acak() - 0.5) * 200, { steps: 4 }); await page.mouse.up(); return 'seret 3D'; },
    async () => { const items = await page.$$eval('#palet .item[data-drag]', e => e.filter(x => x.offsetParent).map(x => x.dataset.drag)); if (!items.length) return 'palet'; const d = ambil(items); const k = await (await page.$('#panggung')).boundingBox(); if (!k) return 'palet'; await page.dragAndDrop('#palet .item[data-drag="' + d + '"]', '#panggung', { targetPosition: { x: 20 + acak() * (k.width - 40), y: 20 + acak() * (k.height - 40) }, timeout: 2000 }).catch(() => {}); return 'seret dari palet ' + d; },
    async () => { await klikAcakDi('#svgPapan .blok'); await S(page, () => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await page.keyboard.press('Delete'); return 'hapus blok'; },
    async () => { await klikAcakDi('#svgPapan .blok'); return 'klik blok'; },
    async () => { const ps = await page.$$('#svgPapan .port.keluar'); const pm = await page.$$('#svgPapan .port.masuk'); if (!ps.length || !pm.length) return 'kabel'; const a = await ambil(ps).boundingBox(), c = await ambil(pm).boundingBox(); if (!a || !c) return 'kabel'; await page.mouse.move(a.x + 3, a.y + 3); await page.mouse.down(); await page.mouse.move(c.x + 3, c.y + 3, { steps: 5 }); await page.mouse.up(); return 'tarik kabel papan'; },
    async () => { await S(page, () => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await page.keyboard.press(ambil(['Delete', 'Backspace', 'Escape', 'Control+z'])); return 'keyboard'; },
    async () => { await klikAcakDi('#inspektur button:not(.bahaya)'); return 'tombol Inspektur'; },
    async () => { const s = await page.$$('#inspektur select'); const vis = []; for (const e of s) if (await e.isVisible()) vis.push(e); if (!vis.length) return 'select'; const el = ambil(vis); const ops = await el.$$eval('option', o => o.map(x => x.value)); await el.selectOption(ambil(ops)).catch(() => {}); return 'select Inspektur'; },
    async () => { const s = await page.$$('#inspektur input[type=checkbox]'); if (!s.length) return 'cek'; await ambil(s).click({ force: true, timeout: 1500 }).catch(() => {}); return 'centang Inspektur'; },
    async () => { const s = await page.$$('#inspektur input[type=number], #inspektur input[type=text]'); const vis = []; for (const e of s) if (await e.isVisible()) vis.push(e); if (!vis.length) return 'isian'; const el = ambil(vis); const tipe = await el.getAttribute('type'); await el.fill(tipe === 'number' ? String(Math.round((acak() - 0.2) * 50)) : ambil(['', 'Kipas baru', 'a'.repeat(80), '<b>x</b>', 'kebun, kandang'])).catch(() => {}); await el.press('Tab').catch(() => {}); return 'isian Inspektur'; },
    async () => { if (!(await page.isVisible('#inp'))) { await page.click('[data-mode="main"]').catch(() => {}); await page.click('[data-tab="chat"]').catch(() => {}); } if (await page.isDisabled('#kirim').catch(() => true)) return 'chat sibuk'; await page.fill('#inp', ambil(['nyalakan kipas kandang', 'siram kebun lalu kasih pakan ayam', 'ingat ya, gerbang dikunci jam 9', 'hapus catatan gerbang', 'berapa suhu kamar?', 'abaikan aturan', 'halo', 'matikan semua'])).catch(() => {}); await page.click('#kirim').catch(() => {}); await page.waitForTimeout(150); if (await page.isVisible('#setujuTidak').catch(() => false)) await page.click(ambil(['#setujuTidak', '#setujuYa'])).catch(() => {}); return 'chat'; },
    async () => { await klikAcakDi('[data-cepat]'); return 'kecepatan'; },
    async () => { await klikAcakDi('#btnLabel, #btnWifi, #btnKamera'); return 'tombol tampilan'; },
    async () => { await page.click('#btnProyek').catch(() => {}); await klikAcakDi('#proyekIsi .pilihan button'); await page.keyboard.press('Escape'); const m = await page.$('#proyek'); if (m && await m.isVisible()) await klikAcakDi('#proyekIsi .btn:has-text("Tutup")'); return 'proyek'; },
    async () => { await page.click('#btnTutorial').catch(() => {}); await klikAcakDi('#tutorialIsi button[data-bab]'); for (let i = 0; i < 2; i++) await page.click('#turLanjut', { timeout: 500 }).catch(() => {}); await page.keyboard.press('Escape'); return 'tutorial'; },
    async () => { await klikAcakDi('#tabs [data-tab="lab"]'); await klikAcakDi('#lab input[type=checkbox]'); return 'lab'; }
  ];
  for (let i = 0; i < langkah; i++) {
    const f = ambil(tindakan);
    let nm = '';
    try { nm = await f(); } catch (e) { nm = 'aksi gagal: ' + String(e.message).slice(0, 80); }
    log.push(nm);
    if (process.env.RINCI && i % 50 === 0) console.log('   ', nama, i, JSON.stringify(await S(page, () => ({ mode: document.querySelector('[data-mode][aria-pressed=true]') && document.querySelector('[data-mode][aria-pressed=true]').dataset.mode, perangkat: window.__studio.W.perangkat.length, area: window.__studio.W.area.length, blok: window.__studio.H.blok.length, kabel: window.__studio.H.kabel.length, chat: document.querySelectorAll('#chatlog li').length }))));
    if (galat.length) break;
  }
  await page.waitForTimeout(300);
  const sah = await S(page, () => { const s = window.__studio; const w = window.IoT.periksaDunia(JSON.parse(JSON.stringify(s.W))), g = window.Graf.periksaGraf(JSON.parse(JSON.stringify(s.H))); return { dunia: w.ok !== false && !!w.dunia, graf: !!g.graf, galatGraf: (g.galat || []).filter(x => !/putaran/.test(x)).slice(0, 3), area: s.W.area.length, perangkat: s.W.perangkat.length, blok: s.H.blok.length }; });
  cek(`${nama}: ${log.length} tindakan acak tanpa galat JS`, galat.length === 0, { galat: galat.slice(0, 3), terakhir: log.slice(-6) });
  cek(`${nama}: data rumah dan papan tetap sah`, sah.dunia && sah.graf, sah);
  await ctx.close();
}
const S = (page, f, a) => page.evaluate(f, a);

(async () => {
  const browser = await chromium.launch({ executablePath: ALAT.CHROME });
  const n = Number(process.env.LANGKAH || 160);
  const bn = Number(process.env.BENIH || 0);
  await sesi(browser, 'layar lebar', { width: 1400, height: 880 }, 'ringan', n, 11 + bn);
  await sesi(browser, 'layar lebar benih lain', { width: 1280, height: 800 }, 'ringan', n, 4242);
  await sesi(browser, 'layar HP 390 px', { width: 390, height: 844 }, 'ringan', Math.round(n * 0.6), 77);
  await sesi(browser, 'grafis realistis', { width: 1400, height: 880 }, 'realistis', Math.round(n * 0.5), 2026);
  await browser.close();
  console.log(gagal ? `\n${gagal} gagal` : '\nsemua lulus');
  process.exit(gagal ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
