/* Gamifikasi kelas lewat Supabase (REST). Tanpa data pribadi: hanya kode kelas dan nama panggilan.
   Login memakai anonymous sign-in Supabase, jadi RLS bisa memakai auth.uid() tanpa akun email.
   fetch disuntikkan supaya bisa diuji tanpa jaringan. Semua galat dikembalikan sebagai pesan, tidak pernah dilempar ke game. */
(function (root) {
  'use strict';

  const BADGE = {
    pemula: 'Pemula: misi 1 selesai',
    bahasa: 'Penerjemah: misi 2 selesai',
    penjaga: 'Penjaga: misi 3 selesai',
    pustakawan: 'Pustakawan: misi 4 selesai',
    dirigen: 'Dirigen: misi 5 selesai',
    trickster: 'Trickster: misi 6 selesai',
    penipu_llm: 'Penipu LLM: guard di kode menyelamatkan usulan LLM yang tertipu'
  };
  const OK_KELAS = /^[A-Za-z0-9_-]{2,20}$/;
  const OK_NAMA = /^[A-Za-z0-9 _.-]{2,16}$/;
  const ID_BADGE = Object.keys(BADGE);

  function buat(cfg, deps) {
    const F = (deps && deps.fetch) || root.fetch.bind(root);
    const url = String(cfg.url || '').trim().replace(/\/+$/, '');
    const kunci = String(cfg.anonKey || '').trim();
    const kelas = String(cfg.kelas || '').trim();
    const nama = String(cfg.nama || '').trim();
    let sesi = cfg.sesi || null;   // {access_token, refresh_token, uid, exp}
    const sekarang = (deps && deps.now) || Date.now;

    const galat = pesan => { const e = new Error(pesan); e.kelas = true; return e; };
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) throw galat('URL Supabase harus berbentuk https://xxxx.supabase.co');
    if (!kunci) throw galat('Anon key belum diisi.');
    if (!OK_KELAS.test(kelas)) throw galat('Kode kelas: 2 sampai 20 huruf, angka, atau tanda - dan _.');
    if (!OK_NAMA.test(nama)) throw galat('Nama panggilan: 2 sampai 16 karakter (huruf, angka, spasi). Jangan pakai nama asli.');

    async function req(path, opsi, tanpaAuth) {
      const h = Object.assign({ apikey: kunci, 'Content-Type': 'application/json' }, (opsi && opsi.headers) || {});
      if (!tanpaAuth) h.Authorization = 'Bearer ' + sesi.access_token;
      let res;
      try { res = await F(url + path, Object.assign({}, opsi, { headers: h })); }
      catch (e) { throw galat('Supabase tidak terjangkau (jaringan atau CORS).'); }
      let data = null; try { data = await res.json(); } catch (e) { /* kosong */ }
      if (!res.ok) throw galat(`Supabase menolak (HTTP ${res.status}${data && (data.msg || data.message) ? ': ' + String(data.msg || data.message).slice(0, 80) : ''}).`);
      return data;
    }
    function simpanSesi(d) {
      if (!d || !d.access_token || !d.user) throw galat('Login anonim gagal. Aktifkan "Anonymous sign-ins" di dashboard Supabase.');
      sesi = { access_token: d.access_token, refresh_token: d.refresh_token, uid: d.user.id, exp: sekarang() + ((d.expires_in || 3600) - 60) * 1000 };
      return sesi;
    }
    async function pastikanSesi() {
      if (!sesi) simpanSesi(await req('/auth/v1/signup', { method: 'POST', body: '{}' }, true));
      else if (sekarang() >= sesi.exp) simpanSesi(await req('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: sesi.refresh_token }) }, true));
      return sesi;
    }
    const rapikanBadge = b => (Array.isArray(b) ? b : []).filter(x => ID_BADGE.includes(x)).slice(0, 20);

    return {
      get sesi() { return sesi; },
      async gabung(xp, badge) {
        await pastikanSesi();
        await req('/rest/v1/pemain?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: sesi.uid, kelas, nama, xp: Math.min(Math.max(xp | 0, 0), 3000), badge: rapikanBadge(badge) }) });
        return sesi.uid;
      },
      async sinkron(xp, badge) {
        await pastikanSesi();
        await req('/rest/v1/pemain?id=eq.' + sesi.uid, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ xp: Math.min(Math.max(xp | 0, 0), 3000), badge: rapikanBadge(badge), diubah: new Date(sekarang()).toISOString() }) });
      },
      async papan() {
        await pastikanSesi();
        const d = await req('/rest/v1/pemain?kelas=eq.' + encodeURIComponent(kelas) + '&select=nama,xp,badge&order=xp.desc&limit=10', { method: 'GET' });
        return (Array.isArray(d) ? d : []).map(r => ({ nama: String(r.nama || '').slice(0, 16), xp: r.xp | 0, badge: rapikanBadge(r.badge) }));
      },
      async kirimSerangan(pesan, hasil) {
        await pastikanSesi();
        if (!['diblokir_input', 'ditolak_guard', 'llm_tertipu', 'lolos'].includes(hasil)) throw galat('Hasil serangan tidak dikenal.');
        await req('/rest/v1/serangan', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ kelas, pesan: String(pesan).slice(0, 200), hasil }) });
      },
      /* Serangan teman sekelas (bukan milik sendiri), diacak di klien. Teks dari teman adalah DATA: tetap lewat input guard dan guard aksi. */
      async ambilSerangan(n) {
        await pastikanSesi();
        const d = await req('/rest/v1/serangan?kelas=eq.' + encodeURIComponent(kelas) + '&pemain_id=neq.' + sesi.uid + '&select=pesan,pemain(nama)&order=dibuat.desc&limit=30', { method: 'GET' });
        const a = (Array.isArray(d) ? d : []).map(r => ({ pesan: String(r.pesan || '').slice(0, 200), dari: String((r.pemain && r.pemain.nama) || 'teman').slice(0, 16) })).filter(r => r.pesan);
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a.slice(0, n || 3);
      }
    };
  }

  const api = { buat, BADGE, ID_BADGE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Kelas = api;
})(typeof window !== 'undefined' ? window : globalThis);
