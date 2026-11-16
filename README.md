# Ruang Agen, tahap 3: RAG, orkestrasi, Ollama, suara, papan skor kelas

Game 3D untuk belajar agentic AI. Otak bisa parser aturan atau LLM, dan kalau LLM gagal agen otomatis memakai parser.
Tahap 3 menambahkan rak manual (RAG), orkestrasi tiga agen spesialis, mode Ollama lokal, suara, dan papan skor kelas.
Kontrak JSON tidak berubah: field `diambil` (RAG) dan `didelegasikan_ke` (orkestrasi) kini terisi.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `index.html` | Hasil build, satu berkas, siap diunggah ke GitHub Pages |
| `brain.js` | Parser aturan, router intent, guardrail aksi (`validasi`), adaptor usulan LLM (`dariUsulan`), pembagian tugas (`bagiTugas`) |
| `manual.js` | Isi rak manual, retrieval TF-IDF tanpa API, pembacaan angka dari teks manual |
| `kelas.js` | Klien Supabase untuk papan skor, badge, dan serangan Trickster (`supabase/schema.sql` berisi tabel dan RLS) |
| `prompt.js` | Sumber tunggal prompt LLM (dipakai browser dan disalin ke proxy) |
| `brain-llm.js` | Memanggil LLM, validasi skema, retry sekali, fallback ke parser |
| `game.js`, `index.src.html` | Adegan 3D, UI, misi |
| `supabase/functions/agent-brain/` | Proxy Edge Function (`index.ts`; `prompt.ts` dihasilkan otomatis) |
| `build.py` | Merakit `index.html` dan `prompt.ts` |
| `test_brain.js`, `test_manual.js`, `test_llm.js`, `test_proxy.mjs`, `test_kelas.js` | Uji otomatis (tanpa jaringan) |
| `test_browser.js` | Uji alur browser dengan Playwright (jaringan ditiru) |
| `live_check.js` | Uji nyata 15 pesan contoh ke OpenRouter (butuh kunci lewat variabel lingkungan) |

## Pasang di GitHub Pages

1. Unggah `index.html` ke repositori, lalu aktifkan Pages (Settings, Pages, branch utama).
2. Buka halamannya, tab **Otak**, pilih sumber otak. Pengaturan tersimpan di browser masing-masing.

Pratinjau artifact di claude.ai memblokir koneksi keluar, jadi mode LLM hanya bekerja di halaman yang Anda host sendiri.

## Empat sumber otak

| Mode | Cocok untuk | Catatan |
|---|---|---|
| Parser aturan | Semua perangkat, level awal | Gratis, instan, tanpa internet |
| Ollama lokal | Laptop yang menjalankan Ollama | Gratis, tanpa kuota dan tanpa internet, lihat bagian Ollama |
| LLM dengan kunci OpenRouter sendiri | **Satu kelas, gratis** | Tiap mahasiswa membuat akun dan kunci sendiri, jadi tiap orang mendapat kuota sendiri |
| LLM lewat proxy kelas | Demo oleh dosen, atau kelas kecil | Kunci Anda aman di server, mahasiswa cukup memasukkan kode kelas |

### Batas gratis (dicek 16 November 2026)

- Model OpenRouter berakhiran `:free`: 20 permintaan per menit, dan **50 permintaan per hari** untuk akun yang total pembelian kreditnya di bawah 10 dolar, atau 1.000 per hari setelah membeli kredit 10 dolar sekali saja. Batas ini **per akun**, bukan per kunci, jadi membuat banyak kunci tidak menambah kuota.
  Sumber: https://openrouter.ai/docs/api/reference/limits
- Akibatnya, satu kunci dosen yang dipakai satu kelas lewat proxy hanya cukup untuk sekitar 50 pesan per hari kecuali Anda membeli kredit 10 dolar. Karena itu mode **kunci pribadi** adalah jalur gratis yang realistis.
- Supabase paket gratis: 500.000 pemanggilan Edge Function per bulan, dan proyek gratis dijeda setelah sekitar seminggu tidak aktif. Sumber: https://supabase.com/docs/guides/functions/pricing
- Daftar model gratis cepat berubah. Model bawaan `openrouter/free` (router yang memilih model gratis yang sedang tersedia; `google/gemma-4-31b-it:free` sering 429 karena kolam Google dipakai bersama) bisa diganti di tab Otak, dan di proxy lewat variabel `MODELS`. Jika model pertama gagal atau penuh, OpenRouter mencoba model berikutnya dalam daftar.
- Hasil uji nyata (16 November 2026, 15 pesan contoh): `openrouter/free` dengan `max_tokens` 1500 memberi JSON valid 13 dari 13 panggilan dan perilaku benar 15 dari 15. Dengan `max_tokens` 400 hanya 7 dari 13, karena model penalaran menghabiskan token untuk berpikir lalu mengembalikan jawaban kosong. Model Gemma bawaan lama selalu 429. Hasil ini belum tentu stabil karena router memilih model yang berganti-ganti.

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
- Prompt dibangun di server. Klien tidak bisa menyuntikkan `messages` atau memilih model. Klien memang mengirim `potongan` manual (maksimal 3 potongan, 300 karakter tiap potongan, 900 total), dan server membatasi serta membuang potongan berpola injeksi sebelum masuk prompt. Potongan tetap bisa memengaruhi teks jawaban model, tetapi tidak bisa melewati guard aksi di kode, jadi endpoint ini tetap bukan LLM bebas untuk perangkat.
- Batas per klien (6 per menit), batas global per menit (18, di bawah 20 milik OpenRouter), dan batas global per hari.
- Penghitung berada di memori isolate. Itu cukup untuk satu kelas tetapi bukan jaminan mutlak. Untuk batas ketat, pindahkan ke tabel Postgres.

## Rak manual (RAG)

Agen berjalan ke rak manual, mengambil potongan SOP yang relevan, lalu bertindak. Potongan masuk ke field `diambil` dan tampil
sebagai tag AMBIL di tab Jejak.

- Isi manual (suhu nyaman, batas lengan, level kipas, interlock pintu, jadwal ruangan) bisa diedit di tab **Manual** dan disimpan di browser.
- Retrieval memakai TF-IDF sederhana di browser (`manual.js`), tanpa API dan tanpa embedding.
- Aturan "nyaman" membaca batas suhu dari **teks** manual. Contoh: batas 24 sampai 26 C membuat kipas level 3, batas 28 sampai 30 C membuat kipas level 1,
  dan batas 22 sampai 24 C membuat kipas level 3 ditambah pintu dibuka. Matikan kotak "Agen boleh membaca manual" untuk melihat agen mengarang angka (kipas level 2).
- Untuk LLM, potongan disisipkan ke prompt sebagai DATA. Manual bisa diedit pemain, jadi bisa menjadi jalur injeksi tidak langsung. Karena itu potongan yang memuat pola injeksi dibuang di kode (klien dan proxy) sebelum sampai ke LLM.
- Guard aksi tetap di kode: angka dari manual tidak bisa melewati batas keselamatan (kecepatan lengan, interlock, level kipas).
- Misi 4 melatih ini: ubah batas suhu di manual lalu lihat perilaku agen ikut berubah.

## Orkestrasi

Agen depan menjadi orkestrator dan membagi aksi ke tiga spesialis yang berdiri di dekat panelnya: **Cahaya** (lampu), **Suhu** (kipas), **Keamanan** (pintu dan lengan).

- Perintah majemuk dikerjakan paralel oleh spesialis berbeda. Kata urutan ("lalu", "setelah", "terus") membuat tiap aksi menjadi tahap sendiri (sekuensial).
- Pintu dibuka dan lengan tidak pernah satu tahap, supaya interlock tidak balapan.
- Pembagian dihitung di kode dari aksi yang sudah lolos guard, jadi LLM tidak menentukan tahap. Hasilnya di field `didelegasikan_ke` dan tag DELEGASI di tab Jejak.
- Misi 5 melatih paralel dan sekuensial.

## Ollama lokal

Tab **Otak**, pilih "Ollama lokal". Game memanggil `http://localhost:11434/api/chat` dengan keluaran terstruktur (`format` berisi JSON schema), tanpa streaming.

1. Pasang Ollama dan unduh model kecil, misalnya `ollama pull qwen2.5:3b`.
2. Izinkan alamat halaman game, misalnya untuk GitHub Pages: set `OLLAMA_ORIGINS=https://<akun>.github.io` lalu jalankan ulang Ollama. Untuk uji dari `file://` atau localhost: `OLLAMA_ORIGINS=*`.
3. Isi alamat dan nama model di tab Otak, lalu **Tes koneksi**.

Keterbatasan: hanya berfungsi di laptop yang menjalankan Ollama (alamat `localhost` milik tiap perangkat), halaman `https` bisa memblokir panggilan ke `http://localhost` di sebagian browser, model kecil sering salah menafsirkan bahasa gaul sehingga fallback parser lebih sering terjadi, dan jawaban pertama lambat karena model dimuat dulu (batas waktu 60 detik). Tidak ada kuota sesi untuk mode ini.

## Suara

Tombol **Bicara** memakai Web Speech API (`id-ID`) lalu mengirim hasilnya lewat jalur chat yang sama, jadi input guard dan guard aksi tetap berlaku. Kotak **Bacakan balasan** memakai `speechSynthesis`.
Syarat: Chrome atau Edge, halaman `https` atau `localhost`, dan izin mikrofon. Pengenalan suara Chrome mengirim audio ke server Google. Tidak berfungsi di pratinjau artifact, hanya di halaman yang di-host sendiri. Chat tetap jalur utama.

## Papan skor kelas dan Level Trickster (Supabase)

Opsional, game penuh tetap jalan tanpa ini. Hanya kode kelas dan nama panggilan yang dikirim.

1. Di dashboard Supabase: Authentication, Sign In / Providers, aktifkan **Allow anonymous sign-ins**.
2. Jalankan `supabase/schema.sql` di SQL Editor (tabel `pemain` dan `serangan`, RLS aktif, batas 60 serangan per jam per pemain).
3. Bagikan ke mahasiswa: URL proyek, anon key (kunci publik), dan kode kelas. Di tab **Kelas** mereka mengisi nama panggilan lalu **Gabung kelas**.

Cara kerja: login anonim memberi `auth.uid()`, jadi RLS membatasi tiap pemain hanya bisa mengubah barisnya sendiri. XP dan badge disinkronkan setelah misi selesai.
Level Trickster (misi 6): pesan yang kamu kirim pada misi ini dicatat sebagai serangan untuk teman (hasil: `diblokir_input`, `ditolak_guard`, `llm_tertipu`, atau `lolos`),
lalu tombol **Terima serangan** menjalankan serangan teman sekelas ke agenmu. Bila belum bergabung kelas, dipakai enam serangan contoh lokal.
Badge **Penipu LLM** diberikan saat model menjawab dengan aksi berbahaya dan guard di kode menolaknya, contoh nyata mengapa keputusan keamanan tidak boleh di prompt.

Keterbatasan: XP dihitung di browser, jadi pemain yang paham DevTools bisa memalsukannya (constraint hanya membatasi rentang 0 sampai 3000). Cukup untuk permainan kelas, bukan untuk nilai resmi.
Pesan serangan dari teman adalah data bebas: tampilannya memakai `textContent`, dan prosesnya tetap lewat input guard dan guard aksi.

## Cara kerja alur otak

```
pesan -> input guard (kode, regex) -> RAG: potongan manual dicari di kode -> LLM mengusulkan JSON -> validasi skema (kode)
      -> guard aksi (kode: batas kecepatan, interlock) -> orkestrator membagi tugas (kode) -> spesialis bertindak
        (gagal di mana pun: parser aturan mengambil alih, dan jejaknya tercatat di tab Jejak)
```

LLM hanya mengusulkan. Keputusan akhir selalu di kode, sehingga perintah berbahaya tetap ditolak walaupun model
setuju. Ini juga bahan ajar tentang defense in depth: bandingkan jejak mode parser dan mode LLM untuk pesan yang sama.

## Build dan uji

```bash
python3 build.py                       # menghasilkan index.html dan prompt.ts
node test_brain.js                     # parser dan guardrail
node test_llm.js                       # otak LLM dengan fetch tiruan
node test_manual.js                    # RAG dan orkestrasi
node --experimental-strip-types --no-warnings test_proxy.mjs   # proxy (Node 22.6 atau lebih baru)
node test_kelas.js                     # klien Supabase dan skema SQL

# uji browser (jaringan ditiru). Butuh playwright-core, Chrome, dan salinan lokal three@0.128.0:
PW=<jalur playwright-core> THREE=<jalur three.min.js> CHROME=<jalur chrome> node test_browser.js

# uji nyata ke OpenRouter (15 pesan contoh), kunci lewat variabel lingkungan, jangan simpan di berkas:
OPENROUTER_API_KEY=sk-or-... node live_check.js [model1,model2]
```

## Yang belum teruji

Teruji nyata: panggilan ke OpenRouter dari Node (15 pesan contoh). Semua yang lain memakai server tiruan.
Belum diuji: panggilan nyata ke OpenRouter dari browser, deploy sungguhan proxy dan `schema.sql` ke Supabase (termasuk bentuk respons login anonim),
Ollama sungguhan (model kecil dan CORS), pengenalan suara sungguhan di Chrome, dan kualitas bahasa Indonesia model gratis.
Lakukan **Tes koneksi** dan beberapa pesan percobaan sebelum dipakai di kelas.
