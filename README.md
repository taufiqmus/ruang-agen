# Ruang Agen, tahap 2: otak LLM gratis dengan cadangan parser

Game 3D untuk belajar agentic AI. Tahap 2 menambahkan otak LLM yang bisa dipilih, tanpa mengubah kontrak JSON
dan tanpa membuat game bergantung padanya: kalau LLM gagal, agen otomatis memakai parser aturan.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `index.html` | Hasil build, satu berkas, siap diunggah ke GitHub Pages |
| `brain.js` | Parser aturan, router intent, guardrail aksi (`validasi`), adaptor usulan LLM (`dariUsulan`) |
| `prompt.js` | Sumber tunggal prompt LLM (dipakai browser dan disalin ke proxy) |
| `brain-llm.js` | Memanggil LLM, validasi skema, retry sekali, fallback ke parser |
| `game.js`, `index.src.html` | Adegan 3D, UI, misi |
| `supabase/functions/agent-brain/` | Proxy Edge Function (`index.ts`; `prompt.ts` dihasilkan otomatis) |
| `build.py` | Merakit `index.html` dan `prompt.ts` |
| `test_brain.js`, `test_llm.js`, `test_proxy.mjs` | Uji otomatis (tanpa jaringan) |

## Pasang di GitHub Pages

1. Unggah `index.html` ke repositori, lalu aktifkan Pages (Settings, Pages, branch utama).
2. Buka halamannya, tab **Otak**, pilih sumber otak. Pengaturan tersimpan di browser masing-masing.

Pratinjau artifact di claude.ai memblokir koneksi keluar, jadi mode LLM hanya bekerja di halaman yang Anda host sendiri.

## Tiga sumber otak

| Mode | Cocok untuk | Catatan |
|---|---|---|
| Parser aturan | Semua perangkat, level awal | Gratis, instan, tanpa internet |
| LLM dengan kunci OpenRouter sendiri | **Satu kelas, gratis** | Tiap mahasiswa membuat akun dan kunci sendiri, jadi tiap orang mendapat kuota sendiri |
| LLM lewat proxy kelas | Demo oleh dosen, atau kelas kecil | Kunci Anda aman di server, mahasiswa cukup memasukkan kode kelas |

### Batas gratis (dicek 16 November 2026)

- Model OpenRouter berakhiran `:free`: 20 permintaan per menit, dan **50 permintaan per hari** untuk akun yang total pembelian kreditnya di bawah 10 dolar, atau 1.000 per hari setelah membeli kredit 10 dolar sekali saja. Batas ini **per akun**, bukan per kunci, jadi membuat banyak kunci tidak menambah kuota.
  Sumber: https://openrouter.ai/docs/api/reference/limits
- Akibatnya, satu kunci dosen yang dipakai satu kelas lewat proxy hanya cukup untuk sekitar 50 pesan per hari kecuali Anda membeli kredit 10 dolar. Karena itu mode **kunci pribadi** adalah jalur gratis yang realistis.
- Supabase paket gratis: 500.000 pemanggilan Edge Function per bulan, dan proyek gratis dijeda setelah sekitar seminggu tidak aktif. Sumber: https://supabase.com/docs/guides/functions/pricing
- Daftar model gratis cepat berubah. Model bawaan `openrouter/free` (router yang memilih model gratis yang sedang tersedia; `google/gemma-4-31b-it:free` sering 429 karena kolam Google dipakai bersama) bisa diganti di tab Otak, dan di proxy lewat variabel `MODELS`. Jika model pertama gagal atau penuh, OpenRouter mencoba model berikutnya dalam daftar.

## Opsi A: kunci OpenRouter pribadi (mahasiswa)

1. Buat akun di openrouter.ai, lalu buat API key.
2. Di game, tab **Otak**, pilih "LLM dengan kunci OpenRouter sendiri", tempel kunci, **Simpan**, lalu **Tes koneksi**.
3. Kunci hanya disimpan di localStorage browser itu dan hanya dikirim ke openrouter.ai.

## Opsi B: proxy kelas di Supabase

Prasyarat: Supabase CLI dan satu proyek Supabase (bisa proyek game turunan yang sudah ada).

```bash
supabase login
supabase link --project-ref <ref-proyek>

supabase secrets set OPENROUTER_API_KEY=sk-or-... KODE_KELAS=pilih-kode-rahasia
# opsional:
supabase secrets set ALLOWED_ORIGIN=https://<akun>.github.io
supabase secrets set MODELS="openrouter/free"
supabase secrets set BATAS_GLOBAL_PER_HARI=45        # naikkan ke 950 jika sudah membeli kredit 10 dolar
supabase secrets set BATAS_KLIEN_PER_MENIT=6 BATAS_GLOBAL_PER_MENIT=18

supabase functions deploy agent-brain --no-verify-jwt
```

Lalu di game, tab **Otak**, pilih "LLM lewat proxy kelas", isi URL
`https://<ref-proyek>.supabase.co/functions/v1/agent-brain` dan kode kelas, **Simpan**, **Tes koneksi**.

Pengaman di proxy:
- Kunci OpenRouter hanya ada di server, tidak pernah dikirim ke browser.
- Kode kelas wajib (header `x-kode-kelas`). Tanpa kode yang benar, permintaan ditolak sebelum menyentuh OpenRouter.
- Prompt dibangun di server dari `{pesan, state}`. Klien tidak bisa menyuntikkan `messages` atau memilih model, jadi endpoint ini bukan LLM bebas.
- Batas per klien (6 per menit), batas global per menit (18, di bawah 20 milik OpenRouter), dan batas global per hari.
- Penghitung berada di memori isolate. Itu cukup untuk satu kelas tetapi bukan jaminan mutlak. Untuk batas ketat, pindahkan ke tabel Postgres.

## Cara kerja alur otak

```
pesan -> input guard (kode, regex) -> LLM mengusulkan JSON -> validasi skema (kode)
      -> guard aksi (kode: batas kecepatan, interlock) -> agen berjalan dan bertindak
        (gagal di mana pun: parser aturan mengambil alih, dan jejaknya tercatat di tab Jejak)
```

LLM hanya mengusulkan. Keputusan akhir selalu di kode, sehingga perintah berbahaya tetap ditolak walaupun model
setuju. Ini juga bahan ajar tentang defense in depth: bandingkan jejak mode parser dan mode LLM untuk pesan yang sama.

## Build dan uji

```bash
python3 build.py                       # menghasilkan index.html dan prompt.ts
node test_brain.js                     # parser dan guardrail
node test_llm.js                       # otak LLM dengan fetch tiruan
node --experimental-strip-types --no-warnings test_proxy.mjs   # proxy (Node 22.6 atau lebih baru)
```

## Yang belum teruji

Semua uji memakai server tiruan. Belum diuji: panggilan nyata ke OpenRouter dari browser, deploy sungguhan ke
Supabase, dan perilaku model gratis tertentu terhadap prompt ini (kualitas JSON dan bahasa Indonesia bervariasi per model).
Lakukan **Tes koneksi** dan beberapa pesan percobaan sebelum dipakai di kelas.

## Berikutnya

Tahap 3: rak manual (RAG), lalu orkestrasi beberapa agen, mode Ollama lokal, dan suara.
