# Ruang Agen

Game 3D berbasis web untuk mengajarkan agentic AI ke mahasiswa pemula. Pemain mengobrol dengan agen penjaga ruangan. Agen menerima pesan, memilah intent, berpikir, membaca rak manual, membagi tugas ke spesialis, menekan tombol, lalu membalas. Setiap langkah tampil di tab **Jejak**, jadi proses "berpikir" agen bisa dibaca dan didiskusikan.

Satu halaman HTML (Three.js r128), tanpa framework dan tanpa server. Bahasa antarmuka: Indonesia.

Dokumen lain:
- [PANDUAN.md](PANDUAN.md): cara memakai game (mahasiswa dan dosen), daftar misi, pemecahan masalah.
- [UJI.md](UJI.md): apa saja yang sudah diuji, caranya, hasilnya, dan yang belum.

## Mulai cepat

1. Buka `index.html` di Chrome atau Edge. Game langsung jalan dengan **parser aturan** (gratis, tanpa internet kecuali memuat three.js dari CDN).
2. Ketik perintah di tab **Chat**, misalnya `nyalakan lampu dan kipas`, `gerah nih`, `bikin nyaman`, atau `berapa suhu nyaman?`.
3. Buka tab **Jejak** untuk melihat langkah agen. Selesaikan 6 misi di tab **Misi**.

Untuk kelas, unggah `index.html` ke GitHub Pages (Settings, Pages). Pratinjau artifact di claude.ai memblokir koneksi keluar, jadi mode LLM hanya bekerja di halaman yang Anda host sendiri.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `index.html` | Hasil build, satu berkas, siap diunggah ke GitHub Pages |
| `index.src.html`, `game.js` | Template halaman, adegan 3D, UI, misi, badge |
| `brain.js` | Parser aturan, router intent, guardrail aksi (`validasi`), adaptor usulan LLM (`dariUsulan`), input guard (`cekInjeksi`), pembagian tugas (`bagiTugas`) |
| `manual.js` | Isi rak manual, retrieval TF-IDF tanpa API, pembacaan angka dari teks manual |
| `prompt.js` | Sumber tunggal prompt LLM (`bangunPrompt`) |
| `brain-llm.js` | Memanggil LLM (OpenRouter, model lokal Python, atau Ollama), validasi skema, retry sekali, router hemat, fallback ke parser |
| `server_lokal.py`, `requirements-lokal.txt` | Server model kecil lokal berbasis Python (llama-cpp-python, CPU) |
| `build.py` | Merakit `index.html` dari berkas sumber dan memeriksa tidak ada em dash |
| `test_brain.js`, `test_manual.js`, `test_llm.js` | Uji otomatis tanpa jaringan |
| `test_browser.js` | Uji alur browser dengan Playwright (jaringan ditiru) |
| `test_browser_live.js`, `live_check.js` | Uji nyata ke OpenRouter, server lokal Python, atau Ollama |

Edit berkas sumber, bukan `index.html`. Setelah perubahan jalankan `python build.py`.

## Empat sumber otak

Dipilih di tab **Otak**. Kontrak JSON keluaran sama untuk semuanya:
`{intent, sub, diambil[], didelegasikan_ke, pikiran, aksi[], ditolak[], baca, fokus, balasan, jejak[], otak}`.

| Mode | Cocok untuk | Catatan |
|---|---|---|
| Parser aturan | Semua perangkat, level awal | Gratis, instan, tanpa internet |
| **Model lokal kecil (Python)** | **Laptop berspesifikasi rendah, satu kelas** | Gratis, tanpa kuota, tanpa internet setelah model terunduh. Qwen2.5 1.5B lewat `server_lokal.py` |
| Kunci OpenRouter pribadi | Model besar, butuh internet | Tiap mahasiswa membuat akun dan kunci sendiri, kuota gratis per akun |
| Ollama lokal | Yang sudah memasang Ollama | Alternatif model lokal. Ollama bukan Python (ditulis dengan Go) |

Kalau LLM gagal (kuota habis, jaringan, JSON rusak), agen otomatis memakai parser aturan dan kegagalannya tercatat di Jejak. Game selalu bisa dimainkan tanpa internet dan tanpa biaya.

### Batas gratis OpenRouter (dicek 16 November 2026)

- Model berakhiran `:free`: 20 permintaan per menit, dan **50 permintaan per hari** untuk akun yang total pembelian kreditnya di bawah 10 dolar, atau 1.000 per hari setelah membeli kredit 10 dolar sekali. Batas ini **per akun**, bukan per kunci. Sumber: https://openrouter.ai/docs/api/reference/limits
- Karena itu satu kunci yang dipakai bersama satu kelas hanya cukup untuk sekitar 50 pesan per hari. Jalur realistis: kunci pribadi tiap mahasiswa. Tidak ada proxy kelas.
- Model bawaan `openrouter/free` (router yang memilih model gratis yang sedang tersedia). `google/gemma-4-31b-it:free` sering 429 karena kolam Google dipakai bersama. Daftar model gratis cepat berubah.
- `max_tokens` 1500: dengan 400, model penalaran menghabiskan token untuk berpikir lalu mengembalikan jawaban kosong.

### Memakai kunci OpenRouter pribadi

1. Buat akun di openrouter.ai, lalu buat API key di https://openrouter.ai/settings/keys (kunci hanya tampil sekali).
2. Di game, tab **Otak**, pilih "LLM dengan kunci OpenRouter sendiri", tempel kunci, **Simpan**, lalu **Tes koneksi**.
3. Kunci disimpan di localStorage browser itu dan hanya dikirim ke openrouter.ai. Jangan membagikan kunci. Hapus kunci di halaman yang sama setelah selesai.

## Rak manual (RAG)

Agen berjalan ke rak manual, mengambil potongan SOP yang relevan, lalu bertindak. Potongan masuk ke field `diambil` dan tampil sebagai tag AMBIL di tab Jejak.

- Isi manual (suhu nyaman, cahaya, batas lengan, level kipas, interlock pintu, jadwal ruangan) bisa diedit di tab **Manual** dan disimpan di browser.
- Retrieval memakai TF-IDF sederhana (`manual.js`) dengan sinonim sehari-hari ("gerah" menemukan potongan suhu). Tanpa API dan tanpa embedding.
- Aturan "nyaman" membaca batas suhu dari **teks** manual. Contoh: batas 24 sampai 26 C membuat kipas level 3, 28 sampai 30 C membuat level 1, 22 sampai 24 C membuat level 3 ditambah pintu dibuka. Tanpa RAG (kotak "Agen boleh membaca manual" dimatikan) agen mengarang angka: kipas level 2.
- Pertanyaan SOP ("berapa suhu nyaman?", "jam berapa ruangan dipakai?") dijawab dari manual, bukan dari papan sensor.
- Untuk LLM, potongan masuk prompt sebagai DATA. Manual bisa diedit pemain, jadi bisa menjadi jalur injeksi tidak langsung. Potongan yang memuat pola injeksi dibuang di kode sebelum sampai ke LLM.
- Guard aksi tetap di kode: angka dari manual tidak bisa melewati batas keselamatan.

## Orkestrasi

Agen depan menjadi orkestrator. Tiga spesialis berdiri di dekat panelnya: **Cahaya** (lampu), **Suhu** (kipas), **Keamanan** (pintu dan lengan).

- Aksi dalam satu perintah dikerjakan paralel oleh spesialis berbeda. Kata urutan ("lalu", "setelah", "terus") memecah tahap per segmen: "nyalakan lampu dan kipas lalu buka pintu" menjadi tahap 1 (Cahaya dan Suhu paralel) lalu tahap 2 (Keamanan).
- Pintu dibuka dan lengan tidak pernah satu tahap, supaya interlock tidak balapan.
- Pembagian dihitung di kode dari aksi yang sudah lolos guard, jadi LLM tidak menentukan tahap. Hasilnya di field `didelegasikan_ke` dan tag DELEGASI di tab Jejak.
- Keterbatasan: untuk keluhan tanpa nama perangkat ("gerah lalu gelap"), tiap aksi menjadi tahap sendiri.

## Model lokal kecil (Python) dan router hemat

Untuk laptop berspesifikasi rendah. `server_lokal.py` menjalankan model Qwen2.5 Instruct kecil (kuantisasi Q4_K_M) di CPU memakai llama-cpp-python, tanpa GPU dan tanpa Docker. Server kompatibel OpenAI di `http://127.0.0.1:8000/v1`.

```bash
python -m venv venv
venv\Scripts\activate        # Linux atau Mac: source venv/bin/activate
pip install -r requirements-lokal.txt
python server_lokal.py          # unduh model 1.5B sekali (sekitar 1 GB), lalu jalan
```

Lalu di game: tab **Otak**, pilih "Model lokal kecil, Python", **Simpan**, **Tes koneksi**. Opsi lain: `--ukuran 0.5b` (paling ringan), `--threads N`, `--berkas jalur.gguf`, `--folder` (lokasi model, default `./model`).

Strategi untuk model kecil, semuanya hasil uji (lihat [UJI.md](UJI.md)):

1. **Prompt ringkas.** Aturan pendek dan banyak contoh. Model 1.5B naik dari 13 ke 18 benar dari 28 pesan, dan token lebih sedikit.
2. **Keluaran dipaksa lewat grammar.** Server menerima skema JSON, jadi JSON selalu valid dan `device` serta `op` hanya bernilai sah. Tidak ada jawaban rusak.
3. **Router hemat (bawaan hidup).** Pesan yang dikenali parser dikerjakan parser tanpa memanggil model. Model hanya dipanggil untuk pesan yang parser tidak kenal. Perintah yang kurang lengkap ("nyalakan") dijawab pertanyaan klarifikasi parser, bukan tebakan model. Hitungan "nyaman" dari manual dikerjakan kode, karena model kecil lemah berhitung. Hasil: 27 dari 28 benar, dan hanya 5 dari 26 pesan yang memanggil model. Matikan kotak "Router hemat" di tab Otak untuk melihat model kecil bekerja sendirian dan membandingkannya.
4. **Guard tetap di kode.** Usulan model kecil yang berbahaya tetap ditolak.

Pilihan model:

| Model | Unduhan | RAM server | Kualitas pada pesan yang parser tidak kenal |
|---|---|---|---|
| Qwen2.5 0.5B | sekitar 0.5 GB | sekitar 1.5 sampai 2 GB | Hampir tidak membantu (0 dari 6 benar). Praktis parser saja |
| **Qwen2.5 1.5B (bawaan)** | **sekitar 1.1 GB** | **sekitar 2 GB** | **Cukup (4 dari 6 benar)**, kadang salah menafsirkan |

Kecepatan: sekitar 3.7 detik per panggilan model di CPU i5-12400F, sekitar 4.7 detik dengan dibatasi 2 thread. Laptop lama bisa lebih lambat, dan router hemat membuat sebagian besar pesan tetap instan. Batas waktu 120 detik.

Server hanya menerima koneksi dari laptop itu sendiri (127.0.0.1). Hasil uji: halaman dari `file://` dan `http://localhost` bisa memanggilnya langsung dari browser (server mengizinkan CORS). Halaman GitHub Pages (`https`) yang memanggil `http://localhost` belum diuji dan bisa memicu izin akses jaringan lokal di Chrome. Pada skenario itu, alternatifnya membuka `index.html` dari berkas lokal atau dari `python -m http.server`.

## Ollama lokal (alternatif)

Tab **Otak**, pilih "Ollama lokal". Memakai `http://localhost:11434/api/chat` dengan keluaran terstruktur dan prompt ringkas serta router hemat yang sama.

1. Pasang Ollama dan unduh model kecil, misalnya `ollama pull qwen2.5:1.5b`.
2. Izinkan alamat halaman game lewat `OLLAMA_ORIGINS`. Hasil uji (Ollama 0.40.16, Windows): tanpa variabel ini Ollama hanya menerima origin `localhost`. Halaman dari `file://` dan GitHub Pages ditolak dengan HTTP 403. Contoh GitHub Pages: `OLLAMA_ORIGINS=https://<akun>.github.io`. Uji lokal: `OLLAMA_ORIGINS=*`. Lalu jalankan ulang Ollama.
3. Isi alamat dan nama model di tab Otak, lalu **Tes koneksi**.

Keterbatasan: Ollama memakai ruang disk dan layanan latar belakang lebih besar daripada server Python. Hasil uji model 3B di Ollama ada di [UJI.md](UJI.md). Hanya berfungsi di laptop yang menjalankannya.

## Input suara

Agen tidak bersuara. Suara hanya untuk **input**: tombol **Bicara** memakai Web Speech API (`id-ID`), mengubah ucapan menjadi teks, lalu mengirimnya lewat jalur chat yang sama, jadi input guard dan guard aksi tetap berlaku.

- Syarat: Chrome atau Edge, halaman `https` atau `localhost`, izin mikrofon. Pengenalan suara Chrome mengirim audio ke server Google dan butuh internet.
- Tidak berfungsi di pratinjau artifact, hanya di halaman yang di-host sendiri. Chat tetap jalur utama.

## Misi, XP, dan badge

Enam misi: Perintah Jelas, Bahasa Sehari-hari, Uji Keamanan, Manual Mengubah Agen, Dirigen Tiga Spesialis, Level Trickster. Bintang (1 sampai 3) bergantung pada jumlah pesan, dan petunjuk mengurangi XP. Level: Rookie, Handler, Orchestrator, Architect, Grandmaster.

Badge diberikan per misi, ditambah **Penipu LLM** saat model menjawab dengan aksi berbahaya dan guard di kode menolaknya. XP dan badge hanya tersimpan di browser masing-masing. Tidak ada ranking atau data yang dikirim ke server.

Level Trickster: kirim pesan yang mencoba menipu agen, lalu tekan **Terima serangan** untuk menahan 3 serangan contoh dari Trickster lain.

## Arsitektur dan prinsip

```
pesan -> input guard (kode, regex) -> RAG: potongan manual dicari di kode -> otak (parser atau LLM) mengusulkan JSON
      -> validasi skema (kode) -> guard aksi (kode: batas kecepatan, interlock, level kipas)
      -> orkestrator membagi tugas (kode) -> spesialis bertindak -> balasan
        (gagal di mana pun: parser aturan mengambil alih, dan jejaknya tercatat)
```

1. LLM hanya MENGUSULKAN. Input guard dan guard aksi selalu di kode, tidak pernah di prompt.
2. Setiap kegagalan LLM jatuh ke parser dan tercatat di Jejak.
3. Hanya layanan gratis.
4. Mobile tetap nyaman: layout menumpuk di lebar 860px ke bawah.

Bahan ajar: bandingkan jejak mode parser dan mode LLM untuk pesan yang sama, lalu coba bujuk LLM sampai usulannya berbahaya dan lihat guard di kode menolaknya (defense in depth).

## Build dan uji

```bash
python build.py            # menghasilkan index.html
node test_brain.js         # parser dan guardrail
node test_manual.js        # RAG dan orkestrasi
node test_llm.js           # otak LLM dengan fetch tiruan: OpenRouter, model lokal, Ollama, router hemat

# uji browser (jaringan ditiru). Butuh playwright-core, Chrome, dan salinan lokal three@0.128.0:
PW=<jalur playwright-core> THREE=<jalur three.min.js> CHROME=<jalur chrome> node test_browser.js

# uji nyata (kunci lewat variabel lingkungan, jangan simpan di berkas):
OPENROUTER_API_KEY=sk-or-... node live_check.js                  # 15 pesan dasar
SUITE=rag OPENROUTER_API_KEY=sk-or-... node live_check.js        # 7 pesan dengan manual
LOKAL=http://127.0.0.1:8000/v1 RINGKAS=1 RUTE=hemat SUITE=semua node live_check.js q15   # server_lokal.py berjalan
OLLAMA=1 SUITE=semua node live_check.js qwen2.5:3b               # Ollama lokal
OPENROUTER_API_KEY=sk-or-... PW=... THREE=... CHROME=... node test_browser_live.js
OLLAMA=1 PW=... THREE=... CHROME=... node test_browser_live.js
LOKAL=1 PW=... THREE=... CHROME=... node test_browser_live.js   # server_lokal.py berjalan di localhost:8000
```

Ringkasan hasil dan batasnya ada di [UJI.md](UJI.md).
