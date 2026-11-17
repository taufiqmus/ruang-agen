/* Studio Rumah Agen: klien bot Telegram langsung dari browser.
   - Hanya "simple request" (GET dengan query, POST x-www-form-urlencoded) supaya tidak ada preflight CORS:
     api.telegram.org menjawab preflight OPTIONS dengan 501.
   - Long polling getUpdates dengan offset (pesan yang sudah dibaca diakui).
   - HTTP 409: token dipakai di tab atau server lain, atau masih ada webhook. Dijelaskan, dan ada pilihan deleteWebhook.
   - Daftar izin: chat yang belum diizinkan menunggu persetujuan pemilik di UI. Isi pesan selalu tidak dipercaya.
   - Token hanya disimpan di browser dan disamarkan dari semua pesan galat. */
(function (root) {
  'use strict';
  const potong = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '...' : s; };
  const POLA_TOKEN = /\d{6,12}:[A-Za-z0-9_-]{20,}/g;
  const samarkan = s => String(s == null ? '' : s).replace(POLA_TOKEN, '[TOKEN]').replace(/bot[^/\s]*\//g, 'bot[TOKEN]/');
  const tokenSah = t => /^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(String(t || '').trim());

  function buatKlien(o) {
    const base = (o.base || 'https://api.telegram.org').replace(/\/+$/, '');
    const token = String(o.token || '').trim();
    const ambil = o.fetch || ((...a) => root.fetch(...a));
    const K = { status: 'mati', bot: null, offset: 0, jalan: false, izin: new Set((o.izin || []).map(String)), menunggu: new Map(), galat: '', terkirim: 0, diterima: 0 };
    const kabar = () => o.onStatus && o.onStatus(K);
    async function panggil(metode, param, post) {
      const url = `${base}/bot${token}/${metode}`;
      const qs = new URLSearchParams(Object.entries(param || {}).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]));
      let r;
      try {
        r = post ? await ambil(url, { method: 'POST', body: qs, signal: o.sinyal && o.sinyal() })   // body URLSearchParams = x-www-form-urlencoded, tanpa preflight
                 : await ambil(url + (qs.toString() ? '?' + qs : ''), { signal: o.sinyal && o.sinyal() });
      } catch (e) { throw new Error('tidak bisa menghubungi Telegram (' + samarkan(e && e.message) + ')'); }
      let d = null; try { d = await r.json(); } catch (e) { /* bukan JSON */ }
      if (!r.ok || !d || !d.ok) {
        const er = new Error(samarkan((d && d.description) || ('HTTP ' + r.status)));
        er.kode = (d && d.error_code) || r.status;
        throw er;
      }
      return d.result;
    }
    K.hubungkan = async function () {
      if (!tokenSah(token)) { K.status = 'galat'; K.galat = 'Token tidak sah. Bentuknya 123456789:ABC... dari @BotFather.'; kabar(); return false; }
      try { K.bot = await panggil('getMe'); K.status = 'tersambung'; K.galat = ''; kabar(); return true; }
      catch (e) { K.status = 'galat'; K.galat = e.kode === 401 ? 'Token ditolak Telegram (401). Buat ulang di @BotFather.' : e.message; kabar(); return false; }
    };
    K.hapusWebhook = async () => { await panggil('deleteWebhook', { drop_pending_updates: false }); return true; };
    K.mulai = async function () {
      if (K.jalan) return;
      if (K.status !== 'tersambung' && !(await K.hubungkan())) return;
      K.jalan = true; K.status = 'mendengarkan'; kabar();
      while (K.jalan) {
        try {
          const upd = await panggil('getUpdates', { offset: K.offset, timeout: o.timeout != null ? o.timeout : 25, allowed_updates: ['message'] });
          for (const u of upd) {
            K.offset = Math.max(K.offset, u.update_id + 1);
            const m = u.message; if (!m || typeof m.text !== 'string') continue;
            const chatId = String(m.chat.id), nama = potong((m.from && (m.from.username ? '@' + m.from.username : m.from.first_name)) || 'tanpa nama', 40);
            const pesan = { chatId, nama, teks: potong(m.text, 500), waktu: m.date };
            K.diterima++;
            if (K.izin.has(chatId)) { if (o.onPesan) await o.onPesan(pesan); }
            else if (!K.menunggu.has(chatId)) { K.menunggu.set(chatId, pesan); if (o.onBaru) o.onBaru(pesan); }
          }
          K.galat = ''; if (K.status !== 'mendengarkan') { K.status = 'mendengarkan'; kabar(); }
        } catch (e) {
          if (!K.jalan) break;
          if (e.kode === 409) { K.status = 'bentrok'; K.galat = 'Token ini sedang dipakai di tab, laptop, atau server lain, atau masih punya webhook (409). Tutup yang lain atau hapus webhook.'; K.jalan = false; kabar(); break; }
          if (e.kode === 401) { K.status = 'galat'; K.galat = 'Token ditolak (401).'; K.jalan = false; kabar(); break; }
          K.galat = e.message; kabar();
          await new Promise(r => setTimeout(r, o.jedaGalat || 3000));
        }
        if (o.jeda) await new Promise(r => setTimeout(r, o.jeda));
      }
      if (K.status === 'mendengarkan') { K.status = 'tersambung'; kabar(); }
    };
    K.berhenti = () => { K.jalan = false; };
    K.izinkan = chatId => { chatId = String(chatId); K.izin.add(chatId); const p = K.menunggu.get(chatId); K.menunggu.delete(chatId); if (o.simpanIzin) o.simpanIzin([...K.izin]); kabar(); return p; };
    K.tolak = chatId => { K.menunggu.delete(String(chatId)); kabar(); };
    K.kirim = async function (chatId, teks) {
      if (!K.izin.has(String(chatId))) return { ok: false, alasan: 'chat belum diizinkan' };
      try { await panggil('sendMessage', { chat_id: chatId, text: potong(teks, 3500) }, true); K.terkirim++; return { ok: true }; }
      catch (e) { return { ok: false, alasan: e.message }; }
    };
    K.kirimPemilik = async function (teks) {
      const ids = [...K.izin]; if (!ids.length) return { ok: false, alasan: 'belum ada chat pemilik yang diizinkan' };
      return K.kirim(ids[0], teks);
    };
    return K;
  }

  const api = { buatKlien, samarkan, tokenSah };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TelegramStudio = api;
})(typeof window !== 'undefined' ? window : globalThis);
