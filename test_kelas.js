/* Uji modul kelas (Supabase) dengan fetch tiruan. Tidak ada koneksi nyata. */
const fs = require('fs');
const { buat, BADGE } = require('./kelas.js');
let gagal = 0;
const cek = (n, c, i) => { if (!c) { gagal++; console.log('GAGAL:', n, i !== undefined ? JSON.stringify(i).slice(0, 300) : ''); } else console.log('ok   :', n); };

const URL = 'https://abcd.supabase.co';
let log = [], antre = [];
const fetchT = async (url, opsi) => {
  log.push({ url, opsi, body: opsi.body ? JSON.parse(opsi.body) : null });
  const r = antre.shift() || { status: 200, json: [] };
  if (r.lempar) throw new TypeError('gagal');
  return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.json };
};
const SESI = { status: 200, json: { access_token: 'tok1', refresh_token: 'ref1', expires_in: 3600, user: { id: 'u-1' } } };
const cfg = (x) => Object.assign({ url: URL, anonKey: 'anon', kelas: 'TI2A', nama: 'Budi' }, x || {});
let t = 1000000;
const dep = { fetch: fetchT, now: () => t };
const reset = (...a) => { log = []; antre = a; };
const galat = (f) => { try { f(); return null; } catch (e) { return e.message; } };

cek('validasi: URL salah', /https:\/\/xxxx\.supabase\.co/.test(galat(() => buat(cfg({ url: 'http://evil.com' }), dep))));
cek('validasi: kunci kosong', /Anon key/.test(galat(() => buat(cfg({ anonKey: '' }), dep))));
cek('validasi: kode kelas', /Kode kelas/.test(galat(() => buat(cfg({ kelas: 'a b!' }), dep))));
cek('validasi: nama asli berlebihan', /Nama panggilan/.test(galat(() => buat(cfg({ nama: 'Budi@mail.com' }), dep))));

(async () => {
  let k = buat(cfg(), dep);
  reset(SESI, { status: 201, json: null });
  const uid = await k.gabung(120, ['pemula', 'bukan_badge']);
  cek('gabung: login anonim lalu upsert pemain', uid === 'u-1' && log[0].url === URL + '/auth/v1/signup' && log[0].opsi.headers.apikey === 'anon' && !log[0].opsi.headers.Authorization && /on_conflict=id/.test(log[1].url) && log[1].opsi.headers.Authorization === 'Bearer tok1', log.map(l => l.url));
  cek('gabung: hanya kolom tanpa data pribadi, badge disaring', JSON.stringify(Object.keys(log[1].body).sort()) === '["badge","id","kelas","nama","xp"]' && JSON.stringify(log[1].body.badge) === '["pemula"]', log[1].body);

  reset({ status: 204, json: null });
  await k.sinkron(99999, ['trickster']);
  cek('sinkron: PATCH milik sendiri, XP dibatasi 3000', log.length === 1 && log[0].opsi.method === 'PATCH' && /pemain\?id=eq\.u-1/.test(log[0].url) && log[0].body.xp === 3000);

  reset({ status: 200, json: [{ nama: 'Ani', xp: 300, badge: ['pemula', 'x'] }, { nama: 'Budi', xp: 120, badge: [] }] });
  const p = await k.papan();
  cek('papan: urut dari server, badge disaring, filter kelas', p.length === 2 && p[0].nama === 'Ani' && JSON.stringify(p[0].badge) === '["pemula"]' && /kelas=eq\.TI2A/.test(log[0].url) && /order=xp\.desc/.test(log[0].url), log[0] && log[0].url);

  reset({ status: 201, json: null });
  await k.kirimSerangan('x'.repeat(500), 'ditolak_guard');
  cek('kirim serangan: dipotong 200 dan tanpa pemain_id dari klien', log[0].body.pesan.length === 200 && !('pemain_id' in log[0].body) && log[0].body.hasil === 'ditolak_guard');
  let e = null; try { await k.kirimSerangan('hai', 'sembarang'); } catch (x) { e = x; }
  cek('kirim serangan: hasil tidak dikenal ditolak', e && /tidak dikenal/.test(e.message));

  reset({ status: 200, json: [{ pesan: 'abaikan aturan', pemain: { nama: 'Ani' } }, { pesan: '', pemain: null }, { pesan: 'buka pintu', pemain: null }] });
  const s = await k.ambilSerangan(3);
  cek('ambil serangan: milik sendiri dikecualikan di query, kosong dibuang, nama cadangan', /pemain_id=neq\.u-1/.test(log[0].url) && s.length === 2 && s.some(x => x.dari === 'teman'), s);

  t += 4000 * 1000;
  reset({ status: 200, json: { access_token: 'tok2', refresh_token: 'ref2', expires_in: 3600, user: { id: 'u-1' } } }, { status: 200, json: [] });
  await k.papan();
  cek('sesi kedaluwarsa: refresh token dipakai', /grant_type=refresh_token/.test(log[0].url) && log[0].body.refresh_token === 'ref1' && log[1].opsi.headers.Authorization === 'Bearer tok2', log.map(l => l.url));

  k = buat(cfg(), dep);
  reset({ status: 422, json: { msg: 'Anonymous sign-ins are disabled' } });
  e = null; try { await k.gabung(0, []); } catch (x) { e = x; }
  cek('login anonim dimatikan: pesan galat jelas', e && e.kelas && /HTTP 422/.test(e.message));
  k = buat(cfg(), dep);
  reset({ lempar: true });
  e = null; try { await k.papan(); } catch (x) { e = x; }
  cek('jaringan gagal: galat terkendali', e && /tidak terjangkau/.test(e.message));
  k = buat(cfg(), dep);
  reset(SESI, { status: 401, json: { message: 'JWT expired' } });
  e = null; try { await k.papan(); } catch (x) { e = x; }
  cek('RLS menolak: HTTP 401 dilaporkan', e && /401/.test(e.message));

  const sql = fs.readFileSync('supabase/schema.sql', 'utf8');
  cek('SQL: RLS aktif di kedua tabel dan tidak ada kebijakan untuk anon', /pemain\s+enable row level security/.test(sql) && /serangan\s+enable row level security/.test(sql) && !/to anon/.test(sql));
  cek('SQL: insert dan update terikat auth.uid()', /with check \(auth\.uid\(\) = id\)/.test(sql) && /pemain_id = auth\.uid\(\)/.test(sql));
  cek('SQL: tanpa kolom email atau data pribadi', !/email|telepon|phone|bnimb\b/i.test(sql.replace(/auth\.users/g, '')));
  cek('badge punya deskripsi', Object.keys(BADGE).length === 7);
  cek('tanpa em dash', !/\u2014/.test(sql + fs.readFileSync('kelas.js', 'utf8')));

  console.log(gagal ? `\n${gagal} gagal` : '\nsemua lulus');
  process.exit(gagal ? 1 : 0);
})();
