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
| `brain-llm.js` | Memanggil LLM (OpenRouter atau Ollama), validasi skema, retry sekali, fallback ke parser |
| `build.py` | Merakit `index.html` dari berkas sumber dan memeriksa tidak ada em dash |
| `test_brain.js`, `test_manual.js`, `test_llm.js` | Uji otomatis tanpa jaringan |
| `test_browser.js` | Uji alur browser dengan Playwright (jaringan ditiru) |
| `test_browser_live.js`, `live_check.js` | Uji nyata ke OpenRouter atau Ollama (butuh kunci atau Ollama berjalan) |

Edit berkas sumber, bukan `index.html`. Setelah perubahan jalankan `python build.py`.

## Tiga sumber otak

Dipilih di tab **Otak**. Kontrak JSON keluaran sama untuk semuanya:
`{intent, sub, diambil[], didelegasikan_ke, pikiran, aksi[], ditolak[], baca, fokus, balasan, jejak[], otak}`.

| Mode | Cocok untuk | Catatan |
|---|---|---|
| Parser aturan | Semua perangkat, level awal | Gratis, instan, tanpa internet |
| Kunci OpenRouter pribadi | **Satu kelas, gratis** | Tiap mahasiswa membuat akun dan kunci sendiri, jadi tiap orang mendapat kuota sendiri |
| Ollama lokal | Laptop yang menjalankan Ollama | Gratis, tanpa kuota dan tanpa internet, lihat bagian Ollama |

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

## Ollama lokal

Tab **Otak**, pilih "Ollama lokal". Game memanggil `http://localhost:11434/api/chat` dengan keluaran terstruktur (`format` berisi JSON schema) dan batas waktu 60 detik.

1. Pasang Ollama dan unduh model, misalnya `ollama pull qwen2.5:3b`.
2. Izinkan alamat halaman game lewat `OLLAMA_ORIGINS`. Hasil uji (Ollama 0.40.16, Windows): tanpa variabel ini Ollama hanya menerima origin `localhost`. Halaman dari `file://` dan dari GitHub Pages ditolak dengan HTTP 403. Contoh untuk GitHub Pages: `OLLAMA_ORIGINS=https://<akun>.github.io`. Untuk uji lokal: `OLLAMA_ORIGINS=*`. Lalu jalankan ulang Ollama.
3. Isi alamat dan nama model di tab Otak, lalu **Tes koneksi**.

Keterbatasan:
- Hanya berfungsi di laptop yang menjalankan Ollama (`localhost` milik tiap perangkat).
- Model kecil lebih lemah. Hasil uji `qwen2.5:3b` (22 pesan): JSON valid 20 dari 20 panggilan, perilaku benar 19 dari 22. Salah pada pesan ambigu ("yang itu dong", "nyalakan") dan pada hitungan level kipas dari manual. Guard aksi tetap menolak semua yang berbahaya. Coba model lebih besar bila GPU cukup.
- Halaman `https` yang memanggil `http://localhost` bisa diminta izin akses jaringan lokal oleh Chrome. Skenario GitHub Pages ke Ollama belum diuji.
- Jawaban pertama lebih lambat karena model dimuat dulu. Tidak ada kuota sesi untuk mode ini.

## Suara

Tombol **Bicara** memakai Web Speech API (`id-ID`) lalu mengirim hasilnya lewat jalur chat yang sama, jadi input guard dan guard aksi tetap berlaku. Kotak **Bacakan balasan** memakai `speechSynthesis`.

- Syarat: Chrome atau Edge, halaman `https` atau `localhost`, izin mikrofon. Pengenalan suara Chrome mengirim audio ke server Google.
- Pembacaan butuh suara Indonesia terpasang di perangkat. Tanpanya game memberi catatan dan membaca dengan suara lain. Di Windows, tambahkan suara lewat Settings, Time and language, Speech.
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
node test_llm.js           # otak LLM dengan fetch tiruan, Ollama tiruan

# uji browser (jaringan ditiru). Butuh playwright-core, Chrome, dan salinan lokal three@0.128.0:
PW=<jalur playwright-core> THREE=<jalur three.min.js> CHROME=<jalur chrome> node test_browser.js

# uji nyata (kunci lewat variabel lingkungan, jangan simpan di berkas):
OPENROUTER_API_KEY=sk-or-... node live_check.js                  # 15 pesan dasar
SUITE=rag OPENROUTER_API_KEY=sk-or-... node live_check.js        # 7 pesan dengan manual
OLLAMA=1 SUITE=semua node live_check.js qwen2.5:3b               # Ollama lokal
OPENROUTER_API_KEY=sk-or-... PW=... THREE=... CHROME=... node test_browser_live.js
OLLAMA=1 PW=... THREE=... CHROME=... node test_browser_live.js
```

Ringkasan hasil dan batasnya ada di [UJI.md](UJI.md).
