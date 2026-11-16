// Proxy gratis ke OpenRouter untuk game Ruang Agen (Supabase Edge Function).
// Menyimpan kunci API di server, memakai kode kelas, dan membatasi laju.
// Prompt dibangun DI SINI dari prompt.ts, jadi endpoint ini tidak bisa dipakai sebagai LLM bebas.
import { bangunPrompt } from './prompt.ts';

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
type Env = Record<string, string | undefined>;

// Penghitung disimpan di memori isolate: cukup untuk satu kelas, tetapi bukan jaminan mutlak
// (isolate bisa berganti). Untuk batas yang ketat, pindahkan ke tabel Postgres.
const perKlien = new Map<string, number[]>();
const global = { menit: [] as number[], hari: 0, tanggal: '' };

const angka = (v: string | undefined, d: number): number => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : d;
};

function cors(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kode-kelas, x-klien',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function balas(env: Env, status: number, isi: unknown): Response {
  return new Response(JSON.stringify(isi), { status, headers: { ...cors(env), 'Content-Type': 'application/json' } });
}

function ringkas(s: any) {
  const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    suhu: n(s?.suhu, 31), cahaya: n(s?.cahaya, 20),
    lampu: { on: !!s?.lampu?.on }, kipas: { on: !!s?.kipas?.on, speed: n(s?.kipas?.speed, 2) },
    pintu: { open: !!s?.pintu?.open }, lengan: { on: !!s?.lengan?.on, speed: n(s?.lengan?.speed, 30), angle: n(s?.lengan?.angle, 60) }
  };
}

export async function handle(req: Request, env: Env, now: number = Date.now()): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
  if (req.method !== 'POST') return balas(env, 405, { error: 'metode' });

  if (!env.OPENROUTER_API_KEY || !env.KODE_KELAS) return balas(env, 500, { error: 'server_belum_dikonfigurasi' });
  if ((req.headers.get('x-kode-kelas') || '') !== env.KODE_KELAS) return balas(env, 401, { error: 'kode_kelas_salah' });

  // Batas laju per klien (id acak dari browser, cadangan: IP)
  const idMentah = (req.headers.get('x-klien') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const klien = idMentah || 'ip:' + (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim();
  const jendela = (perKlien.get(klien) || []).filter((t) => now - t < 60000);
  if (jendela.length >= angka(env.BATAS_KLIEN_PER_MENIT, 6)) return balas(env, 429, { error: 'pelan_dulu' });

  // Batas global (kuota OpenRouter dipakai bersama satu kelas)
  global.menit = global.menit.filter((t) => now - t < 60000);
  if (global.menit.length >= angka(env.BATAS_GLOBAL_PER_MENIT, 18)) return balas(env, 429, { error: 'server_penuh' });
  const tanggal = new Date(now).toISOString().slice(0, 10);
  if (global.tanggal !== tanggal) { global.tanggal = tanggal; global.hari = 0; }
  if (global.hari >= angka(env.BATAS_GLOBAL_PER_HARI, 45)) return balas(env, 429, { error: 'kuota_hari_habis' });

  let isi: any;
  try {
    const teks = await req.text();
    if (teks.length > 4000) return balas(env, 413, { error: 'terlalu_besar' });
    isi = JSON.parse(teks);
  } catch (_e) { return balas(env, 400, { error: 'json_tidak_valid' }); }
  if (typeof isi?.pesan !== 'string' || !isi.pesan.trim() || isi.pesan.length > 200) return balas(env, 400, { error: 'pesan_tidak_valid' });

  jendela.push(now); perKlien.set(klien, jendela);
  if (perKlien.size > 500) for (const [k, v] of perKlien) if (v.every((t) => now - t > 60000)) perKlien.delete(k);
  global.menit.push(now); global.hari++;

  const models = (env.MODELS || 'openrouter/free').split(',').map((m) => m.trim()).filter(Boolean);
  const badan: Record<string, unknown> = {
    messages: bangunPrompt(isi.pesan, ringkas(isi.state)),
    temperature: 0.2, max_tokens: 1500, response_format: { type: 'json_object' }
  };
  if (models.length > 1) badan.models = models; else badan.model = models[0];

  let res: Response;
  try {
    res = await fetch(OR_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'X-Title': 'Ruang Agen' },
      body: JSON.stringify(badan),
      signal: AbortSignal.timeout(8500)
    });
  } catch (_e) { return balas(env, 504, { error: 'upstream_timeout' }); }

  if (res.status === 429) return balas(env, 429, { error: 'kuota_model' });
  if (res.status === 402) return balas(env, 502, { error: 'saldo' });
  if (!res.ok) return balas(env, 502, { error: 'upstream', status: res.status });
  let data: any;
  try { data = await res.json(); } catch (_e) { return balas(env, 502, { error: 'upstream_bukan_json' }); }
  const teks = data?.choices?.[0]?.message?.content;
  if (typeof teks !== 'string' || !teks) return balas(env, 502, { error: 'jawaban_kosong' });
  return balas(env, 200, { teks, model: data?.model || models[0] });
}

declare const Deno: any;
if (typeof Deno !== 'undefined') Deno.serve((req: Request) => handle(req, Deno.env.toObject()));
