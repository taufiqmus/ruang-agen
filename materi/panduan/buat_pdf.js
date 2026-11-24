/* Membuat docs/Panduan-Instalasi.pdf: panduan visual instalasi dan penyiapan model.
   Tangkapan layar diambil sungguhan dari game (server MULAI sungguhan, Ollama tiruan di port 11999) dan dari menu
   penyiapan sungguhan (jawaban tiruan), lalu dirakit jadi HTML dan dicetak ke PDF oleh Chrome.
   Pakai: node materi/panduan/buat_pdf.js   (butuh npm install, Chrome atau Edge, dan Python) */
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const { spawn, execFileSync } = require('child_process');
const AKAR = path.resolve(__dirname, '..', '..');
process.chdir(AKAR);
const ALAT = require(path.join(AKAR, 'tests', 'alat'));
const { chromium } = require(require.resolve(ALAT.PW, { paths: [AKAR] }));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'panduan-'));
const PY = process.env.PY || 'python';
const KELUAR = path.join(AKAR, 'docs', 'Panduan-Instalasi.pdf');
const gambar = {};

/* ---------- 1. transkrip menu penyiapan sungguhan (laptop contoh: 8 GB RAM, tanpa kartu grafis) ---------- */
function transkripMenu() {
  const kode = `
import sys, builtins, io, contextlib
sys.path.insert(0, 'server'); import jalankan as j, os, tempfile
j.BERKAS_PILIHAN = os.path.join(tempfile.gettempdir(), 'pil_panduan.json')
j.info_laptop = lambda: {"cpu": 8, "ram": 8, "gpu": "", "vram": 0}
j.cari_ollama = lambda: "ollama"
j.pastikan_berjalan = lambda e: True
ada = []
j.model_terpasang = lambda: list(ada)
def tarik(cmd, *a, **k):
    ada.append('qwen2.5:1.5b')
    print("pulling manifest"); print("pulling 183715c43589: 100% " + chr(0x2595) + chr(0x2588) * 16 + chr(0x258f) + " 986 MB")
    print("verifying sha256 digest"); print("writing manifest"); print("success"); return 0
j.subprocess.call = tarik
jaw = iter(['2', '1', '1'])
def masuk(p=''):
    x = next(jaw); print(p + '\\u00ab' + x + '\\u00bb'); return x
builtins.input = masuk
j.menu()
if os.path.exists(j.BERKAS_PILIHAN): os.remove(j.BERKAS_PILIHAN)
`;
  return execFileSync(PY, ['-c', kode], { env: Object.assign({}, process.env, { PYTHONIOENCODING: 'utf-8' }) }).toString('utf8');
}

/* ---------- 2. Ollama tiruan yang mengalirkan unduhan pelan-pelan ---------- */
const ollama = { model: [{ name: 'qwen2.5:1.5b', size: 986e6 }] };
const srvOllama = http.createServer((q, r) => {
  let b = ''; q.on('data', c => { b += c; });
  q.on('end', () => {
    r.setHeader('Access-Control-Allow-Origin', '*'); r.setHeader('Access-Control-Allow-Headers', '*');
    if (q.method === 'OPTIONS') { r.statusCode = 204; return r.end(); }
    if (q.url === '/api/tags') { r.setHeader('Content-Type', 'application/json'); return r.end(JSON.stringify({ models: ollama.model })); }
    if (q.url === '/api/chat') { r.setHeader('Content-Type', 'application/json'); return r.end(JSON.stringify({ model: 'qwen2.5:1.5b', message: { content: JSON.stringify({ intent: 'kontrol', pikiran: 'tes', aksi: [{ device: 'lampu', op: 'on' }], fokus: 'semua', balasan: 'Siap.' }) } })); }
    if (q.url === '/api/pull') {
      const nama = JSON.parse(b).model; let n = 0;
      r.setHeader('Content-Type', 'application/x-ndjson'); r.write(JSON.stringify({ status: 'pulling manifest' }) + '\n');
      const t = setInterval(() => {
        n++; r.write(JSON.stringify({ status: 'pulling 3c8f...', total: 100, completed: n * 3 }) + '\n');
        if (n >= 34) { clearInterval(t); ollama.model.push({ name: nama, size: 1.9e9 }); r.end(JSON.stringify({ status: 'success' }) + '\n'); }
      }, 120);
      return;
    }
    r.statusCode = 404; r.end();
  });
}).listen(11999, '127.0.0.1');

async function ambilGambar() {
  const browser = await chromium.launch({ executablePath: ALAT.CHROME });
  // terminal
  console.log('menu...'); const teksMenu = transkripMenu();
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const htmlT = esc(teksMenu).replace(/«(.*?)»/g, '<b class="jw">$1</b>').replace(/^(=+)$/gm, '<span class="gr">$1</span>').replace(/(SARAN)/g, '<span class="sr">$1</span>');
  const tp = await browser.newPage({ viewport: { width: 1040, height: 900 }, deviceScaleFactor: 2 });
  await tp.setContent(`<style>body{margin:0;background:#0c0f14}.t{margin:0;padding:18px 22px 20px;font:15px/1.5 Consolas,monospace;color:#d6dde6;white-space:pre-wrap;background:#0c0f14}.jw{color:#0c0f14;background:#fbbf24;padding:0 6px;border-radius:3px}.gr{color:#4b5563}.sr{color:#34d399;font-weight:700}</style><pre class="t" id="t">${htmlT}</pre>`);
  gambar.terminal = await (await tp.$('#t')).screenshot();
  await tp.close();

  console.log('terminal ok'); // game dengan server sungguhan
  const port = 8600 + Math.floor(Math.random() * 100);
  const srv = spawn(PY, ['server/jalankan.py', '--port', String(port)], { env: Object.assign({}, process.env, { RUANG_TANPA_MENU: '1', RUANG_TANPA_BROWSER: '1' }) });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/_info`)).ok) break; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  process.on('exit', () => { try { srv.kill(); } catch (e) { /* sudah mati */ } });
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { if (!localStorage.getItem('ruangagen-otak')) localStorage.setItem('ruangagen-otak', JSON.stringify({ mode: 'ollama', ollamaUrl: 'http://localhost:11999', ollamaModel: 'qwen2.5:1.5b', hemat: true, otomatis: false })); });
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1:' + port + '/_info')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ cpu: 8, ram: 8, gpu: '', vram: 0 }) });
    if (u.startsWith('http://127.0.0.1:' + port) || u.startsWith('http://localhost:11999')) return route.continue();
    if (/three(\.min)?\.js/.test(u)) return route.fulfill({ path: ALAT.THREE, contentType: 'application/javascript' });
    return route.abort();
  });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/?grafis=ringan&kejadian=mati&tanpaTutorial=1`);
  console.log('game dimuat'); await page.click('#tab-otak');
  await page.waitForFunction(() => /terpasang/.test(document.querySelector('#otOllamaPanel').textContent));
  await page.waitForTimeout(500);
  const panel2 = async () => { await page.evaluate(() => document.querySelector('#otOllamaPanel').scrollIntoView({ block: 'start' })); const p = await (await page.$('#otOllamaPanel')).boundingBox(), r = await page.locator('#otOllamaPanel > div > div').nth(1).boundingBox(); return r.y + r.height - p.y + 6; };
  const kotak = async (sel, tinggi) => { if (sel === '#otOllamaPanel') await page.evaluate(() => document.querySelector('#otOllamaPanel').scrollIntoView({ block: 'start' })); const b = await (await page.$(sel)).boundingBox(); return page.screenshot({ clip: { x: b.x, y: b.y, width: b.width, height: Math.min(b.height, tinggi || b.height) } }); };
  await page.evaluate(() => document.querySelector('#otakForm').scrollIntoView());
  gambar.pilihOtak = await kotak('#otMode', 60);
  gambar.panel = await kotak('#otOllamaPanel', await panel2());
  console.log('panel ok');
  await page.click('#otTes');
  await page.waitForFunction(() => /Berhasil/.test(document.querySelector('#otStatus').textContent), null, { timeout: 20000 });
  const bt = await (await page.$('#otTes')).boundingBox(), bs = await (await page.$('#otStatus')).boundingBox();
  gambar.tes = await page.screenshot({ clip: { x: Math.min(bt.x, bs.x) - 6, y: bt.y - 8, width: 430, height: bs.y + bs.height - bt.y + 16 } });
  console.log('tes ok');
  await page.locator('#otOllamaPanel > div > div', { hasText: 'qwen2.5:3b' }).first().getByRole('button', { name: 'Unduh' }).click();
  await page.waitForTimeout(1800);
  gambar.unduh = await kotak('#otOllamaPanel', await panel2());
  await page.waitForFunction(() => /qwen2\.5:3b[\s\S]*terpasang/.test(document.querySelector('#otOllamaPanel').textContent), null, { timeout: 20000 });
  await page.waitForTimeout(300);
  gambar.selesai = await kotak('#otOllamaPanel', await panel2());
  console.log('unduh ok');
  await page.selectOption('#otMode', 'kunci');
  await page.waitForTimeout(300);
  await (await page.$('#otMode')).scrollIntoViewIfNeeded();
  const bk = await (await page.$('.grp[data-mode="kunci"]')).boundingBox(), bm = await (await page.$('#otMode')).boundingBox();
  gambar.kunci = await page.screenshot({ clip: { x: bm.x, y: bm.y - 24, width: bm.width, height: bk.y + bk.height - bm.y + 30 } });
  await browser.close(); srv.kill(); srvOllama.close();
}

/* ---------- 3. halaman ---------- */
const img = (k, kelas) => `<img class="${kelas || ''}" src="data:image/png;base64,${gambar[k].toString('base64')}" alt="${k}">`;
const langkah = (n, judul, isi) => `<div class="lg"><div class="no">${n}</div><div><h4>${judul}</h4>${isi}</div></div>`;
const kode = t => `<pre class="kode">${t}</pre>`;
const awas = t => `<div class="awas"><b>Perhatian.</b> ${t}</div>`;
const tip = t => `<div class="tip"><b>Tip.</b> ${t}</div>`;
let nomor = 0;
const halaman = (judul, isi) => { nomor++; return `<section class="page"><header><span>Ruang Agen</span><span>Panduan instalasi</span></header><h2>${judul}</h2>${isi}<footer>${nomor + 1}</footer></section>`; };

function rakit() {
  const css = `
  @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font:11.5pt/1.5 'Segoe UI',Calibri,sans-serif;color:#1b2430;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:210mm;height:297mm;padding:15mm 17mm 16mm;position:relative;page-break-after:always;overflow:hidden;background:#fff}
  header{display:flex;justify-content:space-between;font-size:8.5pt;letter-spacing:.08em;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:12px}
  footer{position:absolute;bottom:9mm;right:17mm;font-size:9pt;color:#94a3b8}
  h2{font-size:20pt;margin:2px 0 4px;color:#0f3d3a;letter-spacing:-.01em}h3{font-size:13pt;margin:14px 0 4px;color:#0f3d3a}h4{margin:0 0 2px;font-size:12pt}
  p{margin:4px 0}.sub{color:#475569;margin:0 0 10px}
  .lg{display:flex;gap:12px;margin:11px 0;align-items:flex-start}.no{flex:none;width:28px;height:28px;border-radius:50%;background:#0f766e;color:#fff;font-weight:700;display:grid;place-items:center;font-size:12pt;margin-top:1px}
  .kode{background:#0c0f14;color:#e5ecf4;font:10.5pt/1.5 Consolas,monospace;padding:8px 12px;border-radius:7px;margin:6px 0;white-space:pre-wrap}
  code{font:10.5pt Consolas,monospace;background:#eef2f6;padding:1px 5px;border-radius:4px}
  .awas,.tip{border-radius:8px;padding:8px 12px;margin:10px 0;font-size:10.5pt}.awas{background:#fff7e6;border-left:4px solid #d97706}.tip{background:#e8f6f3;border-left:4px solid #0f766e}
  img{display:block;max-width:100%;border-radius:8px;border:1px solid #d5dde6;margin:8px 0}img.tanpa{border:none}img.w130{width:132mm}img.w100{width:100mm}.dua img{width:100%}figure{margin:0}figcaption{font-size:9.5pt;color:#64748b;text-align:center}
  table{border-collapse:collapse;width:100%;font-size:10pt;margin:8px 0}th{background:#0f3d3a;color:#fff;text-align:left;padding:6px 8px}td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  .cocok{color:#0f766e;font-weight:700}.lambat{color:#b45309;font-weight:700}.berat{color:#b91c1c;font-weight:700}
  .dua{display:grid;grid-template-columns:1fr 1fr;gap:14px}.kartu{border:1px solid #d5dde6;border-radius:10px;padding:10px 12px;background:#f8fafc}
  .peta{display:flex;align-items:stretch;gap:0;margin:16px 0}.pt{flex:1;text-align:center;padding:10px 6px;background:#f1f5f9;border:1px solid #d5dde6;font-size:9.5pt;position:relative}.pt b{display:block;font-size:11pt;color:#0f766e}.pt+.pt{margin-left:-1px}
  .pt:first-child{border-radius:10px 0 0 10px}.pt:last-child{border-radius:0 10px 10px 0;background:#dff3ee}
  .sampul{background:linear-gradient(160deg,#0f3d3a 0%,#115e59 55%,#0f766e 100%);color:#fff;padding:0}.sampul .isi{padding:34mm 20mm 0}
  .sampul h1{font-size:34pt;line-height:1.1;margin:0 0 8px;letter-spacing:-.02em}.sampul .s{font-size:14pt;opacity:.9;max-width:130mm}
  .angka{display:flex;gap:10px;margin-top:20mm}.angka div{flex:1;background:rgba(255,255,255,.12);border-radius:12px;padding:12px 14px}.angka b{display:block;font-size:22pt}.angka span{font-size:10pt;opacity:.85}
  .sampul .peta{margin:14mm 20mm 0}.sampul .pt{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#e6fffb}.sampul .pt b{color:#fff}.sampul .pt:last-child{background:rgba(255,255,255,.22)}
  .cek li{list-style:none;margin:7px 0;padding-left:30px;position:relative}.cek li:before{content:"";position:absolute;left:0;top:2px;width:17px;height:17px;border:2px solid #0f766e;border-radius:4px}
  .cek{padding:0;margin:8px 0}.kecil{font-size:9.5pt;color:#64748b}`;

  const sampul = `<section class="page sampul"><div class="isi"><div style="letter-spacing:.2em;text-transform:uppercase;font-size:10pt;opacity:.8;margin-bottom:10px">Praktikum Agentic AI</div><h1>Panduan Instalasi<br>Ruang Agen</h1><div class="s">Dari unduh game sampai AI siap dipakai di laptopmu. Tanpa memasang Python, tanpa paket tambahan.</div>
  <div class="angka"><div><b>±15 menit</b><span>termasuk mengunduh model</span></div><div><b>±2 GB</b><span>Ollama dan satu model kecil</span></div><div><b>1 klik</b><span>MULAI.bat menjalankan semuanya</span></div></div></div>
  <div class="peta"><div class="pt"><b>1</b>Pasang Ollama</div><div class="pt"><b>2</b>Unduh model</div><div class="pt"><b>3</b>Unduh game</div><div class="pt"><b>4</b>Klik MULAI.bat</div><div class="pt"><b>5</b>Pilih otak</div><div class="pt"><b>6</b>Tes koneksi</div></div>
  <div style="position:absolute;bottom:14mm;left:20mm;font-size:10pt;opacity:.8">github.com/taufiqmus/ruang-agen</div></section>`;

  const h1 = halaman('1. Sebelum kelas (di rumah)', `<p class="sub">Kerjakan saat internetmu bagus. Dua langkah pertama mengunduh sekitar 2 GB, jangan dilakukan di kelas bersama teman sekelas.</p>
  ${langkah(1, 'Pasang Ollama', `<p>Buka <b>ollama.com/download</b>, unduh versi Windows (atau Mac), lalu pasang seperti aplikasi biasa. Setelah selesai, buka aplikasi Ollama. Ikon kecil muncul di pojok kanan bawah layar.</p>`)}
  ${langkah(2, 'Unduh satu model kecil', `<p>Buka <b>Command Prompt</b> (tekan tombol Windows, ketik <code>cmd</code>, Enter), lalu ketik:</p>${kode('ollama pull qwen2.5:1.5b')}<p>Tunggu sampai muncul tulisan <code>success</code>. Ukurannya sekitar 1 GB.</p>`)}
  ${langkah(3, 'Unduh game', `<p>Buka alamat ini di browser, lalu simpan ZIP-nya:</p>${kode('github.com/taufiqmus/ruang-agen/archive/refs/heads/v2.zip')}<p>Klik kanan ZIP, pilih <b>Extract All</b> (ekstrak semua). Hasilnya sebuah folder bernama <code>ruang-agen-v2</code>.</p>`)}
  ${awas('Jangan menjalankan <code>MULAI.bat</code> dari dalam ZIP. Ekstrak dulu, baru buka foldernya.')}
  ${langkah(4, 'Opsional: buat kunci OpenRouter', `<p>Daftar gratis di <b>openrouter.ai</b>, buka <b>Settings, Keys, Create Key</b>, lalu simpan kunci berawalan <code>sk-or-</code> di tempat yang aman. Ini hanya cadangan bila Ollama bermasalah di laptopmu.</p>`)}
  ${awas('Kunci OpenRouter seperti kata sandi. Jangan ditempel di grup, chat, atau GitHub.')}`);

  const h2 = halaman('2. Menjalankan: klik MULAI.bat', `<p class="sub">Di dalam folder game, klik dua kali <code>MULAI.bat</code> (Mac atau Linux: <code>./mulai.sh</code>). Jendela hitam terbuka dan menu penyiapan muncul. Ini hanya sekali, pilihanmu disimpan.</p>
  ${img('terminal', 'tanpa')}
  <p class="kecil">Contoh di laptop dengan RAM 8 GB tanpa kartu grafis. Bagian kuning adalah jawaban yang diketik.</p>
  ${langkah(1, 'Pilih otak: ketik 2, Enter', '<p>Ollama menjalankan AI di laptopmu sendiri, gratis dan tanpa internet setelah modelnya terunduh.</p>')}
  ${langkah(2, 'Pilih model: ketik 1, Enter', '<p>Menu menilai tiap model untuk laptopmu dan menandai yang <b>SARAN</b>. Model yang sudah kamu unduh di rumah bertuliskan <i>sudah ada</i>, jadi tidak diunduh lagi.</p>')}
  ${langkah(3, 'Pilih aplikasi, lalu tunggu browser terbuka', '<p>1 = Easy Agent Visualizer, 2 = Ruang Agen. <b>Biarkan jendela hitam tetap terbuka</b> selama bermain. Menutupnya menghentikan game.</p>')}
  ${tip('Tidak ada menu dan jendela langsung tertutup? Buka Command Prompt di folder game, ketik <code>MULAI.bat</code>, lalu baca pesannya. Tanpa Python pun tetap jalan: MULAI.bat otomatis memakai PowerShell.')}`);

  const h3 = halaman('3. Memilih model yang cocok', `<p class="sub">Model yang lebih besar lebih pintar, tetapi lebih berat. Mulailah dari yang kecil. Menambah model bisa kapan saja.</p>
  <table><tr><th>Model</th><th>Unduhan</th><th>Syarat laptop</th><th>Catatan</th></tr>
  <tr><td><b>qwen2.5:1.5b</b></td><td>1,0 GB</td><td>RAM 4 GB</td><td>Standar kelas. Jalan di CPU, cukup untuk semua misi.</td></tr>
  <tr><td><b>qwen2.5:3b</b></td><td>1,9 GB</td><td>RAM 8 GB, nyaman dengan GPU 4 GB</td><td>Lebih paham kalimat bebas.</td></tr>
  <tr><td><b>qwen2.5:7b</b></td><td>4,7 GB</td><td>RAM 16 GB, GPU 6 GB</td><td>Bisa memakai alat (tool calling).</td></tr>
  <tr><td><b>gemma4:e4b</b></td><td>6,6 GB</td><td>RAM 16 GB, GPU 8 GB</td><td>Paling andal di Studio. Butuh laptop kuat.</td></tr>
  <tr><td>embeddinggemma</td><td>0,6 GB</td><td>RAM 4 GB</td><td>Tambahan: router embedding dan RAG hibrida.</td></tr>
  <tr><td>llama-guard3:1b</td><td>1,6 GB</td><td>RAM 4 GB</td><td>Tambahan: guard model untuk konten berbahaya.</td></tr></table>
  <h3>Cara cepat memilih</h3>
  <div class="dua"><div class="kartu"><b>Laptop biasa</b><br>RAM 4 sampai 16 GB, tanpa kartu grafis NVIDIA.<br><span class="cocok">Pilih qwen2.5:1.5b.</span> Sudah cukup.</div>
  <div class="kartu"><b>Laptop dengan GPU NVIDIA</b><br>Cek VRAM di menu penyiapan.<br><span class="cocok">6 GB: qwen2.5:7b. 8 GB ke atas: gemma4:e4b.</span></div></div>
  <h3>Penilaian di menu dan di game</h3>
  <p><span class="cocok">cocok</span> laptopmu cukup kuat. <span class="lambat">lambat</span> bisa jalan, tetapi jawabannya lama. <span class="berat">terlalu berat</span> RAM tidak cukup, jangan dipilih.</p>
  ${awas('Penilaian hanyalah perkiraan dari RAM dan kartu grafis. Bila model terasa lambat atau laptop panas, ganti ke model yang lebih kecil.')}
  ${tip('Model lain? Di menu, ketik namanya langsung, misalnya <code>llama3.2:1b</code>. Daftarnya ada di ollama.com/library.')}`);

  const h4 = halaman('4. Di dalam game: atur otak dan tes', `<p class="sub">Buka tab <b>Otak</b>. Di sinilah kamu memilih model dan memastikan koneksinya hidup.</p>
  ${langkah(1, 'Pilih sumber otak: Ollama', img('pilihOtak'))}
  ${langkah(2, 'Lihat daftar model dan pilih yang kamu pakai', `<p>Model yang sudah terunduh bertanda <b>terpasang</b>. Klik <b>Pakai</b> pada modelnya, lalu <b>Simpan</b>. Biarkan <b>Router hemat</b> tercentang: parser mengerjakan pesan yang dikenalnya, model hanya untuk pesan baru, jadi lebih cepat.</p>${img('panel','w130')}`)}
  ${langkah(3, 'Klik Tes koneksi', `<p>Harus muncul tulisan <b>Berhasil</b> beserta lama jawabannya. Bila gagal, lihat halaman 7.</p>${img('tes','w100')}`)}`);

  const h5 = halaman('5. Menambah model nanti', `<p class="sub">Laptopmu ternyata masih kuat? Tambahkan model lain kapan saja, langsung dari game. Tanpa terminal.</p>
  ${langkah(1, 'Klik Unduh pada model yang diinginkan', `<p>Di tab <b>Otak</b> (Studio: tab <b>Model</b>), bagian <b>Unduh atau tambah model</b>. Bar kemajuan menunjukkan unduhan berjalan. Tombol <b>Batal</b> menghentikannya. Setelah selesai, model bertanda <b>terpasang</b>: klik <b>Pakai</b>, lalu <b>Simpan</b>.</p>`)}
  <div class="dua"><figure>${img('unduh')}<figcaption>Saat mengunduh qwen2.5:3b</figcaption></figure><figure>${img('selesai')}<figcaption>Setelah selesai: bertanda terpasang</figcaption></figure></div>
  ${langkah(2, 'Lewat terminal (cadangan)', `<p>Tutup game, lalu jalankan:</p>${kode('MULAI.bat --model')}<p>Menu model yang sama muncul lagi. Ketik <code>MULAI.bat --pilih</code> untuk mengulang seluruh menu.</p>`)}
  ${awas('Unduhan model besar memakan waktu dan kuota. Lakukan di internet yang cepat, bukan di Wi-Fi kelas.')}`);

  const h6 = halaman('6. Cadangan: OpenRouter', `<p class="sub">AI besar lewat internet. Berguna bila Ollama bermasalah atau laptopmu terlalu lemah.</p>
  ${langkah(1, 'Pilih "LLM dengan kunci OpenRouter sendiri"', img('kunci'))}
  ${langkah(2, 'Tempel kunci, Simpan, lalu Tes koneksi', '<p>Kunci hanya disimpan di browser ini dan hanya dikirim ke openrouter.ai. Akun gratis dibatasi sekitar 50 pesan AI per hari. Bila kuota habis, agen otomatis kembali ke parser.</p>')}
  ${awas('Setiap mahasiswa memakai kunci sendiri. Satu kunci bersama untuk satu kelas cepat kena batas dan error 429.')}
  <h3>Kalau semuanya gagal</h3><p>Klik dua kali <code>index.html</code> di dalam folder game. Agen memakai <b>parser aturan</b> tanpa internet dan tanpa pasang apa pun. Semua misi tetap bisa diselesaikan.</p>`);

  const h7 = halaman('7. Masalah umum dan daftar siap', `<table><tr><th>Gejala</th><th>Yang dilakukan</th></tr>
  <tr><td>Jendela hitam langsung tertutup</td><td>Buka Command Prompt di folder game, ketik <code>MULAI.bat</code>, baca pesannya.</td></tr>
  <tr><td>Panel model: "Ollama tidak terjangkau"</td><td>Buka aplikasi Ollama dari menu Start, lalu klik <b>Periksa lagi</b>.</td></tr>
  <tr><td>Browser tidak membuka halaman</td><td>Jendela hitam sudah tertutup. Klik dua kali <code>MULAI.bat</code> lagi.</td></tr>
  <tr><td>Port 8000 terpakai</td><td>Tidak apa-apa. Game otomatis memakai 8001 dan seterusnya, alamatnya tertulis di jendela hitam.</td></tr>
  <tr><td>AI terasa lambat</td><td>Pilih <code>qwen2.5:1.5b</code>, pastikan Router hemat tercentang, atau pakai parser.</td></tr>
  <tr><td>Unduhan model gagal atau terputus</td><td>Periksa internet lalu klik <b>Unduh</b> lagi. Unduhan dilanjutkan dari bagian yang sudah ada.</td></tr>
  <tr><td>Tes koneksi: kunci ditolak (OpenRouter)</td><td>Kunci salah atau sudah dihapus. Buat kunci baru.</td></tr>
  <tr><td>Layar 3D kosong</td><td>Pakai Chrome atau Edge terbaru, atau tambahkan <code>?grafis=ringan</code> di akhir alamat.</td></tr></table>
  <h3>Daftar siap sebelum praktikum</h3>
  <ul class="cek"><li>Ollama terpasang dan aplikasinya terbuka (ikon di pojok kanan bawah)</li><li><code>qwen2.5:1.5b</code> sudah terunduh (<code>ollama list</code> menampilkannya)</li><li>Folder game sudah diekstrak, bukan dijalankan dari dalam ZIP</li><li><code>MULAI.bat</code> membuka browser dan menu penyiapan sudah dijawab</li><li>Tab <b>Otak</b>: Ollama dipilih dan <b>Tes koneksi</b> menampilkan Berhasil</li><li>Laptop dicas dan jendela hitam dibiarkan terbuka</li></ul>
  <p class="kecil">Panduan lengkap: docs/PANDUAN.md di repositori. Kode: github.com/taufiqmus/ruang-agen</p>`);

  return `<!doctype html><html lang="id"><meta charset="utf-8"><title>Panduan Instalasi Ruang Agen</title><style>${css}</style><body>${sampul}${h1}${h2}${h3}${h4}${h5}${h6}${h7}</body></html>`;
}

(async () => {
  await ambilGambar();
  for (const k of Object.keys(gambar)) fs.writeFileSync(path.join(TMP, k + '.png'), gambar[k]);
  const html = rakit();
  fs.writeFileSync(path.join(TMP, 'panduan.html'), html);
  const browser = await chromium.launch({ executablePath: ALAT.CHROME });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: KELUAR, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log('PDF:', KELUAR, '| gambar dan HTML:', TMP);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { srvOllama.close(); setTimeout(() => process.exit(), 500); });
