/* Otak LLM: memanggil model (kunci OpenRouter pribadi atau Ollama lokal),
   memvalidasi jawabannya, dan jatuh kembali ke parser aturan bila gagal.
   Prinsip: LLM hanya MENGUSULKAN. Input guard dan guard aksi tetap dijalankan di kode. */
(function (root) {
  'use strict';
  const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

  class GalatOtak extends Error {
    constructor(kode, pesan) { super(pesan); this.kode = kode; }
  }

  const OPS = { lampu: ['on', 'off'], kipas: ['on', 'off'], pintu: ['open', 'close'], lengan: ['on', 'off'] };
  const SINONIM = { buka: 'open', tutup: 'close', nyala: 'on', hidup: 'on', mati: 'off', matikan: 'off', nyalakan: 'on' };
  const num = v => { const x = parseFloat(String(v).replace('%', '')); return Number.isFinite(x) ? x : undefined; };
  const str = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

  function normAksi(a) {
    if (!a || typeof a !== 'object') return null;
    const device = String(a.device || '').toLowerCase();
    if (!OPS[device]) return null;
    let op = String(a.op || '').toLowerCase();
    op = SINONIM[op] || op;
    if (!OPS[device].includes(op)) return null;
    const x = { device, op };
    if (device === 'kipas' && op === 'on') { const s = num(a.speed); x.speed = s === undefined ? 2 : s; }
    if (device === 'lengan' && op === 'on') {
      const s = num(a.speed), g = num(a.angle);
      x.speed = s === undefined ? 30 : s; x.angle = g === undefined ? 60 : g;
    }
    return x;
  }

  /* Skema dipaksa di sini. Nilai angka TIDAK dipotong, supaya guard aksi yang menilai batasnya. */
  function normalisasi(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new GalatOtak('skema', 'Jawaban LLM bukan objek JSON.');
    const intent = String(raw.intent || '').toLowerCase();
    if (!['kontrol', 'info', 'obrol', 'tidak_paham'].includes(intent)) throw new GalatOtak('skema', `Intent "${str(String(raw.intent), 20)}" tidak dikenal.`);
    const mentah = Array.isArray(raw.aksi) ? raw.aksi.slice(0, 6) : [];
    const aksi = [];
    for (const a of mentah) { const x = normAksi(a); if (x) aksi.push(x); }
    const fokus = ['suhu', 'cahaya', 'semua', 'manual'].includes(raw.fokus) ? raw.fokus : 'semua';
    return { intent, pikiran: str(raw.pikiran, 220), aksi, fokus, balasan: str(raw.balasan, 240), dibuang: mentah.length - aksi.length };
  }

  /* Tahan terhadap pagar kode, teks pembuka, dan blok <think> dari model penalaran. */
  function parseLonggar(teks) {
    let t = String(teks || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try { return JSON.parse(t); } catch (e) { /* coba potong */ }
    const i = t.indexOf('{'), j = t.lastIndexOf('}');
    if (i >= 0 && j > i) { try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { /* gagal */ } }
    throw new GalatOtak('parse', 'Jawaban LLM bukan JSON yang valid.');
  }

  const LABEL = {
    auth: 'kunci ditolak.',
    kuota: 'kuota model gratis habis atau sedang penuh (429).',
    saldo: 'saldo OpenRouter negatif (402).'
  };

  async function http(url, opsi, timeoutMs) {
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), timeoutMs);
    let res;
    try { res = await fetch(url, Object.assign({}, opsi, { signal: ctl.signal })); }
    catch (e) {
      if (e && e.name === 'AbortError') throw new GalatOtak('timeout', `tidak ada jawaban dalam ${Math.round(timeoutMs / 1000)} detik.`);
      throw new GalatOtak('jaringan', 'server tidak terjangkau (jaringan, CORS, atau halaman ini memblokir koneksi keluar).');
    } finally { clearTimeout(tm); }
    let data = null;
    try { data = await res.json(); } catch (e) { /* bukan JSON */ }
    if (!res.ok) {
      const kode = res.status === 401 || res.status === 403 ? 'auth' : res.status === 429 ? 'kuota' : res.status === 402 ? 'saldo' : 'http';
      const dari = data && data.error ? (data.error.message || data.error) : '';
      throw new GalatOtak(kode, LABEL[kode] || `server membalas HTTP ${res.status}${dari ? ' (' + str(String(dari), 80) + ')' : ''}.`);
    }
    return data;
  }

  const ringkasState = s => ({
    suhu: s.suhu, cahaya: s.cahaya,
    lampu: { on: !!s.lampu.on }, kipas: { on: !!s.kipas.on, speed: s.kipas.speed },
    pintu: { open: !!s.pintu.open }, lengan: { on: !!s.lengan.on, speed: s.lengan.speed, angle: s.lengan.angle }
  });

  /* Skema keluaran terstruktur untuk Ollama (format JSON schema). */
  const SKEMA = {
    type: 'object',
    properties: {
      intent: { type: 'string', enum: ['kontrol', 'info', 'obrol', 'tidak_paham'] },
      pikiran: { type: 'string' },
      aksi: { type: 'array', items: { type: 'object', properties: { device: { type: 'string', enum: ['lampu', 'kipas', 'pintu', 'lengan'] }, op: { type: 'string', enum: ['on', 'off', 'open', 'close'] }, speed: { type: 'number' }, angle: { type: 'number' } }, required: ['device', 'op'] } },
      fokus: { type: 'string', enum: ['suhu', 'cahaya', 'semua', 'manual'] },
      balasan: { type: 'string' }
    },
    required: ['intent', 'pikiran', 'aksi', 'fokus', 'balasan']
  };

  async function satuPanggilan(pesan, state, cfg, potongan) {
    const timeout = cfg.timeoutMs || 12000;
    const susun = cfg.ringkas ? bangunPromptRingkas : bangunPrompt; // prompt ringkas untuk model kecil
    if (cfg.mode === 'ollama') {
      const base = String(cfg.ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
      const model = cfg.ollamaModel || 'qwen2.5:3b';
      let d;
      try {
        d = await http(base + '/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: susun(pesan, state, potongan), stream: false, format: SKEMA, options: { temperature: 0.2 } })
        }, timeout);
      } catch (e) {
        if (e instanceof GalatOtak && e.kode === 'jaringan') throw new GalatOtak('jaringan', 'Ollama tidak terjangkau. Pastikan Ollama berjalan di laptop ini dan OLLAMA_ORIGINS mengizinkan alamat halaman ini.');
        throw e;
      }
      const teks = d && d.message && d.message.content;
      if (!teks) throw new GalatOtak('kosong', 'Ollama mengembalikan jawaban kosong (model sudah diunduh?).');
      return { teks, model: 'ollama:' + (d.model || model) };
    }
    if (cfg.mode === 'lokal') {
      /* Server lokal berbasis Python (llama-cpp-python) atau server lain yang kompatibel OpenAI. Keluaran dipaksa
         mengikuti skema lewat grammar, jadi JSON selalu valid dan device/op hanya bernilai sah. */
      const base = String(cfg.lokalUrl || 'http://localhost:8000/v1').replace(/\/+$/, '');
      let d;
      try {
        d = await http(base + '/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: cfg.lokalModel || 'lokal', messages: susun(pesan, state, potongan), temperature: 0, max_tokens: 300, response_format: { type: 'json_object', schema: SKEMA } })
        }, timeout);
      } catch (e) {
        if (e instanceof GalatOtak && e.kode === 'jaringan') throw new GalatOtak('jaringan', 'Server model lokal tidak terjangkau. Pastikan server berjalan di laptop ini (lihat PANDUAN.md) dan alamatnya benar.');
        throw e;
      }
      const teks = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      if (!teks) throw new GalatOtak('kosong', 'Server lokal mengembalikan jawaban kosong.');
      return { teks, model: 'lokal:' + String(d.model || cfg.lokalModel || 'lokal').split(/[\\/]/).pop() };
    }
    if (!cfg.apiKey) throw new GalatOtak('konfig', 'kunci OpenRouter belum diisi.');
    const body = { messages: susun(pesan, state, potongan), temperature: 0.2, max_tokens: 1500, response_format: { type: 'json_object' } };
    const m = (cfg.models || []).filter(Boolean);
    if (m.length > 1) body.models = m; else body.model = m[0] || 'openrouter/free';
    const d = await http(OR_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cfg.apiKey, 'Content-Type': 'application/json', 'X-Title': 'Ruang Agen' },
      body: JSON.stringify(body)
    }, timeout);
    const teks = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    if (!teks) throw new GalatOtak('kosong', 'LLM mengembalikan jawaban kosong.');
    return { teks, model: d.model || m[0] || 'openrouter/free' };
  }

  async function pikirAsync(pesan, state, cfg, opsi) {
    const O = root.Otak; opsi = opsi || {}; cfg = cfg || { mode: 'parser' };
    const opsiOtak = { manual: opsi.manual, rag: opsi.rag };
    const t0 = Date.now();
    const tandai = (plan, info, catatan) => {
      plan.otak = Object.assign({ ms: Date.now() - t0, panggilan: 0 }, info);
      plan.jejak.splice(1, 0, { k: 'otak', t: catatan });
      return plan;
    };
    if (!cfg.mode || cfg.mode === 'parser') return tandai(O.pikir(pesan, state, opsiOtak), { asal: 'parser' }, 'Otak: parser aturan (tanpa LLM).');
    const inj = O.cekInjeksi(pesan);
    if (inj) return tandai(inj, { asal: 'guard' }, 'Input guard di kode menangkap pesan ini sebelum LLM dipanggil, jadi kuota tidak terpakai.');
    if (opsi.kuotaHabis) return tandai(O.pikir(pesan, state, opsiOtak), { asal: 'parser', fallback: true, alasan: 'kuota sesi' }, 'Kuota LLM sesi ini habis. Memakai parser aturan.');

    /* Router biaya (mode hemat): pesan yang dikenali parser dikerjakan parser. LLM hanya dipanggil untuk pesan yang
       parser tidak paham. Cocok untuk model kecil di laptop lambat: hasil lebih andal dan jauh lebih cepat. */
    if (cfg.rute === 'hemat') {
      const p0 = O.pikir(pesan, state, opsiOtak);
      // parser "perlu klarifikasi" (ada kata kerja atau perangkat, tapi kurang lengkap) lebih aman daripada tebakan model kecil
      const takTahu = p0.intent === 'tidak_paham' && p0.sub !== 'perlu klarifikasi';
      if (!takTahu) return tandai(p0, { asal: 'parser', rute: 'hemat' }, 'Router biaya: parser yakin dengan pesan ini, LLM dilewati (hemat waktu dan kuota).');
    }

    /* RAG di kode: potongan dicari sebelum LLM dipanggil. Potongan yang memuat pola injeksi dibuang
       (manual bisa diedit pemain, jadi bisa menjadi jalur injeksi tidak langsung). */
    let diambil = [], dibuang = 0;
    if (root.Manual && Array.isArray(opsi.manual) && opsi.rag !== false) {
      const kandidat = root.Manual.cari(pesan, opsi.manual, 2, 0.8);
      diambil = kandidat.filter(p => !O.adaInjeksi(p.judul + ' ' + p.teks));
      dibuang = kandidat.length - diambil.length;
    }
    const potongan = diambil.map(p => ({ id: p.id, judul: p.judul, teks: p.teks }));

    let panggilan = 0, galat = null;
    for (let percobaan = 0; percobaan < 2; percobaan++) {
      try {
        panggilan++;
        const { teks, model } = await satuPanggilan(pesan, state, cfg, potongan);
        const u = normalisasi(parseLonggar(teks));
        const plan = O.dariUsulan(pesan, u, state, { diambil });
        if (dibuang) plan.jejak.push({ k: 'guard', t: `Guard: ${dibuang} potongan manual dibuang karena memuat pola injeksi.` });
        const dtk = ((Date.now() - t0) / 1000).toFixed(1);
        return tandai(plan, { asal: 'llm', model, panggilan }, `Otak: LLM ${model} (${dtk} dtk)${panggilan > 1 ? ', percobaan ke-2' : ''}${u.dibuang ? `. ${u.dibuang} aksi tidak sah dibuang oleh validasi skema` : ''}.`);
      } catch (e) {
        galat = e;
        if (!(e instanceof GalatOtak) || (e.kode !== 'parse' && e.kode !== 'skema')) break;
      }
    }
    const alasan = galat instanceof GalatOtak ? galat.message : 'galat tak terduga (' + str(String(galat && galat.message), 60) + ').';
    return tandai(O.pikir(pesan, state, opsiOtak), { asal: 'parser', fallback: true, alasan, panggilan }, `LLM gagal: ${alasan} Beralih ke parser aturan.`);
  }

  /* Dipakai tombol "Tes koneksi": satu panggilan nyata, hasilnya divalidasi seperti biasa. */
  async function uji(cfg) {
    const t0 = Date.now();
    const { teks, model } = await satuPanggilan('halo', root.Otak.stateAwal(), cfg);
    normalisasi(parseLonggar(teks));
    return { model, ms: Date.now() - t0 };
  }

  const api = { pikirAsync, uji, normalisasi, parseLonggar, GalatOtak };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OtakLLM = api;
})(typeof window !== 'undefined' ? window : globalThis);
