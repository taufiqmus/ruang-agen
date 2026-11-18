// Video percontohan Pertemuan 1: rekaman layar Ruang Agen sungguhan, satu adegan per kalimat narasi.
// Panjang tiap adegan = durasi audio + jeda; narasi mulai 0,3 detik setelah adegan dimulai.
const ALAT = require('D:/playground/Agentic AI game/ruang-agen/tests/alat.js');
const { chromium } = require(require.resolve(ALAT.PW, { paths: [ALAT.AKAR] }));
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, 'p1');
const TIMED = JSON.parse(fs.readFileSync(path.join(DIR, 'audio', 'timed.json'), 'utf8'));
const NASKAH = JSON.parse(fs.readFileSync('D:/playground/Agentic AI game/ruang-agen/materi/video/pertemuan-1.json', 'utf8'));
TIMED.forEach(s => { s.say = NASKAH.find(n => n.id === s.id).say; });   // teks layar memakai tulisan asli (200%), bukan versi ejaan
TIMED.find(x => x.id === 4).dur = 8.54; TIMED.find(x => x.id === 4).wav = path.join(DIR, 'audio', 's4_b.wav');
const JEDA = 1.0, MULAI_SUARA = 0.3;
const URL = f => require('url').pathToFileURL(ALAT.AKAR + '/' + f).href;
const tunggu = ms => new Promise(r => setTimeout(r, ms));

// lapisan teks: judul episode dan teks narasi, disisipkan ke halaman (tidak mengubah aplikasi)
const LAPISAN = () => {
  if (document.getElementById('vidCap')) return;
  const s = document.createElement('style');
  s.textContent = `#vidCap{position:fixed;left:455px;bottom:22px;transform:translateX(-50%);width:780px;box-sizing:border-box;background:rgba(22,26,46,.88);color:#fff;font:600 21px/1.4 Calibri,'Onest',sans-serif;padding:10px 20px;border-radius:12px;z-index:99999;text-align:center;pointer-events:none}
  #vidJudul{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(22,26,46,.78);color:#fff;z-index:99998;pointer-events:none;transition:opacity .6s}
  #vidJudul b{font:800 54px 'Bookman Old Style',serif}#vidJudul span{font:400 24px Calibri,sans-serif;color:#ffc928;margin-top:12px}
  #vidLabel{position:fixed;left:14px;bottom:6px;color:#fff;background:rgba(22,26,46,.6);font:400 13px Calibri,sans-serif;padding:3px 8px;border-radius:6px;z-index:99999;pointer-events:none}`;
  document.head.appendChild(s);
  const c = document.createElement('div'); c.id = 'vidCap'; document.body.appendChild(c);
  const l = document.createElement('div'); l.id = 'vidLabel'; l.textContent = 'Narasi: suara dosen hasil kloning AI'; document.body.appendChild(l);
};
const teks = (p, t) => p.evaluate(t => { document.getElementById('vidCap').textContent = t; }, t);
const ketikPelan = async (p, sel, t) => { await p.click(sel); await p.type(sel, t, { delay: 45 }); };

(async () => {
  const b = await chromium.launch({ executablePath: ALAT.CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: path.join(DIR, 'rekam'), size: { width: 1280, height: 720 } } });
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); if (/three/.test(u)) return r.fulfill({ path: ALAT.THREE, contentType: 'application/javascript' }); return r.abort(); });
  await ctx.addInitScript(() => { try { localStorage.setItem('studio-wizard', 'true'); localStorage.setItem('studio-petunjuk-ciut', 'true'); } catch (e) {} });
  const p = await ctx.newPage(); const t0 = Date.now();
  await p.goto(URL('index.html') + '?kejadian=mati'); await p.waitForTimeout(1500);
  await p.evaluate(LAPISAN);
  const adegan = [];
  const kamera = async (dx, ms) => { const c = await (await p.$('canvas')).boundingBox(); const x = c.x + c.width / 2, y = c.y + c.height / 2; await p.mouse.move(x, y); await p.mouse.down(); const n = 50, t1 = Date.now(); for (let i = 1; i <= n; i++) { await p.mouse.move(x + dx * i / n, y); const tg = t1 + ms * i / n - Date.now(); if (tg > 0) await tunggu(tg); } await p.mouse.up(); };
  const AKSI = {
    1: async () => { await p.evaluate(() => { const j = document.createElement('div'); j.id = 'vidJudul'; j.innerHTML = '<b>Apa itu agen AI?</b><span>Pertemuan 1 · Ruang Agen</span>'; document.body.appendChild(j); }); await tunggu(5200); await p.evaluate(() => { document.getElementById('vidJudul').style.opacity = 0; }); },
    2: async () => { await p.evaluate(() => { const j = document.getElementById('vidJudul'); if (j) j.remove(); }); await kamera(160, 4500); },
    3: async () => { await p.click('#tab-chat'); await ketikPelan(p, '#inp', 'nyalakan lampu dan kipas'); await p.click('#send'); },
    4: async () => { await tunggu(1500); await p.click('#tab-jejak'); },
    5: async () => { await p.hover('#pipe'); },
    6: async () => { await p.click('#tab-chat'); await ketikPelan(p, '#inp', 'gerah nih'); await p.click('#send'); },
    7: async () => { await tunggu(2500); await ketikPelan(p, '#inp', 'putar lengan robot 200%'); await p.click('#send'); await tunggu(3500); await p.click('#tab-jejak'); },
    8: async () => { await p.goto(URL('studio.html') + '?grafis=ringan&jam=10&cepat=1&awal=rumah_kebun_kandang&tanpaTutorial=1'); await p.evaluate(LAPISAN); await teks(p, TIMED[7].say); await p.waitForTimeout(800); const c = await (await p.$('#c3d')).boundingBox(); await p.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await p.mouse.down(); for (let i = 1; i <= 30; i++) { await p.mouse.move(c.x + c.width / 2 + i * 6, c.y + c.height / 2); } await p.mouse.up(); }
  };
  for (const s of TIMED) {
    const mulai = (Date.now() - t0) / 1000, panjang = s.dur + JEDA;
    await teks(p, s.say).catch(() => {});
    await AKSI[s.id]();
    const sisa = mulai + panjang - (Date.now() - t0) / 1000;
    if (sisa > 0) await tunggu(sisa * 1000); else console.log('adegan', s.id, 'lebih panjang', (-sisa).toFixed(2), 'detik');
    adegan.push({ id: s.id, mulai, panjang: Math.max(panjang, (Date.now() - t0) / 1000 - mulai), wav: s.wav, say: s.say });
  }
  const akhir = (Date.now() - t0) / 1000;
  await ctx.close(); await b.close();
  const vid = fs.readdirSync(path.join(DIR, 'rekam')).filter(f => f.endsWith('.webm')).map(f => path.join(DIR, 'rekam', f)).sort((a, b2) => fs.statSync(b2).mtimeMs - fs.statSync(a).mtimeMs)[0];
  fs.writeFileSync(path.join(DIR, 'adegan.json'), JSON.stringify({ video: vid, akhir, mulaiSuara: MULAI_SUARA, adegan }, null, 1));
  console.log('rekaman', vid, 'adegan pertama mulai', adegan[0].mulai.toFixed(2), 'akhir', akhir.toFixed(2));
})().catch(e => { console.error(e); process.exit(1); });
