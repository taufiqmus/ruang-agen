const ALAT = require('./alat');   // pindah ke akar repo
// Uji peluncur: server berkas stdlib, /_info, halaman yang boleh disajikan, dan katalog model Python sama dengan JS.
const { spawn, execFileSync } = require('child_process');
let gagal = 0;
const cek = (n, c, info) => { if (!c) { gagal++; console.log('GAGAL:', n, info !== undefined ? JSON.stringify(info).slice(0, 300) : ''); } else console.log('ok   :', n); };
const PY = process.env.PY || 'python';
const PORT = 8470 + Math.floor(Math.random() * 100);

(async () => {
  // katalog: nama, ukuran, RAM, VRAM harus sama antara jalankan.py dan src/ollama-kelola.js
  const K = require('../src/ollama-kelola.js').KATALOG;
  const pyKat = JSON.parse(execFileSync(PY, ['-c', 'import sys,json; sys.path.insert(0,"server"); import jalankan as j; print(json.dumps(j.OLLAMA_MODEL))']).toString());
  cek('katalog Python sama dengan katalog JS', pyKat.length === K.length && pyKat.every((m, i) => m[0] === K[i].nama && m[1] === K[i].gb && m[2] === K[i].ram && m[3] === K[i].gpu && m[4] === !!K[i].tambahan), pyKat);
  // kecocokan dan saran harus sama di dua bahasa
  const J = require('../src/ollama-kelola.js');
  const kasus = [[4, 0], [8, 0], [16, 0], [16, 6], [16, 8], [32, 12]];
  const pySaran = JSON.parse(execFileSync(PY, ['-c', 'import sys,json; sys.path.insert(0,"server"); import jalankan as j; print(json.dumps([j.saran_model(r,v) for r,v in %s]))'.replace('%s', JSON.stringify(kasus))]).toString());
  cek('saran model sama di Python dan JS', JSON.stringify(pySaran) === JSON.stringify(kasus.map(([r, v]) => J.saran({ ram: r, vram: v }))), pySaran);
  cek('saran: laptop 16 GB dengan GPU 8 GB memilih gemma4:e4b, tanpa GPU qwen2.5:1.5b', J.saran({ ram: 16, vram: 8 }) === 'gemma4:e4b' && J.saran({ ram: 16, vram: 0 }) === 'qwen2.5:1.5b');

  // pilihan dari versi lama (otak "lokal") tidak boleh melewati menu
  const pil = JSON.parse(execFileSync(PY, ['-c', 'import sys,json,os,tempfile; sys.path.insert(0,"server"); import jalankan as j; f=os.path.join(tempfile.gettempdir(),"pil_uji_lama.json"); j.BERKAS_PILIHAN=f; json.dump({"otak":"lokal"},open(f,"w")); a=j.baca_pilihan(); json.dump({"otak":"ollama","model":"x"},open(f,"w")); b=j.baca_pilihan(); os.remove(f); print(json.dumps([a,b]))']).toString());
  cek('pilihan lama (otak lokal) ditolak supaya menu muncul, pilihan sah dibaca', pil[0] === null && pil[1] && pil[1].otak === 'ollama', pil);

  const p = spawn(PY, ['server/jalankan.py', '--port', String(PORT)], { env: Object.assign({}, process.env, { RUANG_TANPA_MENU: '1', RUANG_TANPA_BROWSER: '1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  let keluar = ''; p.stdout.on('data', d => keluar += d); p.stderr.on('data', d => keluar += d);
  const tunggu = async () => { for (let i = 0; i < 50; i++) { try { return await fetch(`http://127.0.0.1:${PORT}/_info`); } catch (e) { await new Promise(r => setTimeout(r, 200)); } } };
  try {
    const r = await tunggu();
    cek('server menyala tanpa venv dan pip', !!r && r.ok, keluar);
    const info = await r.json();
    cek('/_info memberi RAM dan CPU', info.ram > 0 && info.cpu > 0, info);
    const g = await fetch(`http://127.0.0.1:${PORT}/`); const t = await g.text();
    cek('/ menyajikan game', g.ok && /Ruang Agen/.test(t) && /OllamaKelola/.test(t));
    const s = await fetch(`http://127.0.0.1:${PORT}/studio.html`);
    cek('/studio.html menyajikan Studio', s.ok && /Easy Agent Visualizer/.test(await s.text()));
    for (const x of ['/server/jalankan.py', '/.ruangagen-pilihan.json', '/package.json', '/../package.json', '/%2e%2e/package.json']) {
      const y = await fetch(`http://127.0.0.1:${PORT}${x}`);
      cek('tidak menyajikan ' + x, y.status === 404);
    }
  } finally { p.kill(); }
  console.log(gagal ? gagal + ' gagal' : 'semua lulus'); process.exitCode = gagal ? 1 : 0;
})();
