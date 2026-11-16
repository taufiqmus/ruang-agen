# Ruang Agen

Game 3D berbasis web untuk mengajarkan agentic AI ke mahasiswa pemula. Pemain mengobrol dengan agen penjaga ruangan. Agen menerima pesan, memilah intent, berpikir, membaca rak manual, membagi tugas ke spesialis, menekan tombol, lalu membalas. Setiap langkah tampil di tab **Jejak**, jadi proses "berpikir" agen bisa dibaca dan didiskusikan.

Satu halaman HTML (Three.js r128), tanpa framework dan tanpa server. Bahasa antarmuka: Indonesia.

Dokumen lain:
- [PANDUAN.md](PANDUAN.md): instalasi dan penggunaan lengkap (mahasiswa dan dosen), membuat ruang sendiri, pemecahan masalah.
- [UJI.md](UJI.md): apa saja yang sudah diuji, caranya, hasilnya, dan yang belum.

## Mulai cepat

1. Buka `index.html` di Chrome atau Edge. Game langsung jalan dengan **parser aturan** (gratis, tanpa internet kecuali memuat three.js dari CDN).
2. Ketik perintah di tab **Chat**, misalnya `nyalakan lampu dan kipas`, `gerah nih`, `bikin nyaman`, atau `berapa suhu nyaman?`.
3. Buka tab **Jejak** untuk melihat jalur pesan melewati pipeline agen. Selesaikan misi di tab **Misi**. Pindah ruang atau semesta di tab **Dunia**, dan ubah isi kepala agen di tab **Agen**.

Untuk kelas, unggah `index.html` ke GitHub Pages (Settings, Pages). Pratinjau artifact di claude.ai memblokir koneksi keluar, jadi mode LLM hanya bekerja di halaman yang Anda host sendiri.

## Semesta dan dunia

Semuanya **data, bukan kode**. Satu **semesta** (universe) memuat ruang-ruang beserta seluruh perilaku agennya. Otak, prompt AI, dan adegan 3D dirakit dari definisi yang sama, jadi menambah atau mengubah apa pun tidak menyentuh kode.

### Semesta bawaan: Kampus Nusantara

Enam ruang, 24 bab pengetahuan bersama (kampus dan akademik), 4 rute router buatan, 3 kejadian, dan 5 misi lintas ruang. Total sekitar 74 bab di rak.

| Ruang | Tema | Perangkat dan spesialis | Yang dipelajari |
|---|---|---|---|
| **Lab Robotika** | Dasar agen | Lampu, kipas, pintu, lengan robot. Cahaya, Suhu, Keamanan | Parser, guard, RAG, orkestrasi, serangan Trickster (6 misi) |
| **Kafe Senja** | Barista dan vibes | Lampu gantung, AC, speaker, pintu, mesin espresso. Cahaya, Suhu, Vibes, Barista | Kata gaul, alias ("seduh kopi"), RAG sebagai resep, batas daya mesin (4 misi) |
| **Studio Konten** | Live streaming | Ring light, AC, pintu, tanda ON AIR, gimbal. Cahaya, Suhu, Keamanan, Siaran | Interlock pintu saat ON AIR, urutan sebelum live (4 misi) |
| **Perpustakaan Cahaya** | RAG berat | Lampu baca, AC, pintu, tirai, robot pustakawan. Cahaya, Suhu, Petugas, Pustakawan | Katalog, denda, jam layanan, jurnal, plagiasi. Robot hanya jalan saat pintu tertutup (4 misi) |
| **Dapur Kantin** | Listrik terbatas | Lampu, exhaust, pintu pantry, kompor (level 1 sampai 5), oven. Cahaya, Udara, Koki | Interlock timbal balik kompor dan oven, resep, menu, alergen (4 misi) |
| **Kebun Hidroponik** | Rumah kaca | Lampu tumbuh, kipas, pintu, pompa nutrisi, naungan. Cahaya, Udara, Air | pH, jadwal pompa, hama, panen. Pompa tidak boleh menyala saat pintu terbuka (4 misi) |

### Yang bisa dikustom (semuanya)

| Bagian | Apa yang bisa diubah | Di mana |
|---|---|---|
| **Agen** | Nama, warna, persona (masuk prompt AI), sapaan, kata setuju, kata menolak, gaya bahasa | Tab Agen |
| **Orkestrator** | Nama, strategi (otomatis, selalu paralel, selalu berurutan), warna dan nama spesialis | Tab Agen, JSON |
| **Router** | Rute buatan: kata pemicu, lalu jawab dari koleksi rak, balas teks tetap, atau tolak. Muncul di totem router 3D | Tab Agen |
| **RAG** | Pengetahuan bersama dan per ruang, koleksi, jumlah potongan (k), ambang skor, sinonim, kata henti, memori | Tab Manual, Agen, JSON |
| **Guardrails** | Guard masukan (+ pola sendiri), batas aksi, interlock, memori, guard keluaran (kata terlarang). Semua bisa dimatikan untuk belajar (mode rentan) | Tab Agen |
| **Tugas (misi)** | Misi ruang dan misi lintas ruang dengan target: perangkat, suhu, cahaya, penolakan, paralel, tahap, urutan aksi, bab dibuka, memori, intent, rute, kejadian, batas pesan, jumlah ruang dikunjungi, bab unik, XP, badge | JSON |
| **Kejadian** | Pemicu pada pesan ke-N, saat masuk ruang, atau acak. Efek: ubah suhu atau cahaya, matikan atau nyalakan perangkat | JSON |
| **Ruang** | Perangkat (maks 6), spesialis (maks 4), bentuk 3D, fisika, interlock, kata gaul, alias, manual, tema | Tab Dunia |
| **Cerita** | Teks pengantar semesta | JSON |

Hal yang tetap di kode demi keamanan dan keterbacaan: empat tipe perangkat (`saklar`, `level`, `buka`, `mesin`), bentuk 3D dari daftar tetap, dan dua sensor (suhu dan cahaya). Rinciannya di [PANDUAN.md](PANDUAN.md).

Empat **tipe perangkat** cukup untuk semuanya:

| Tipe | Keadaan | Aksi | Contoh |
|---|---|---|---|
| `saklar` | on | on, off | Lampu, ring light, tanda ON AIR |
| `level` | on, speed | on dengan speed 1 sampai maks, off | Kipas, AC, speaker, kompor, pompa |
| `buka` | open | open, close | Pintu, tirai, naungan |
| `mesin` | on, speed, angle | on dengan speed (persen) dan angle (derajat), off, dijaga `batasDaya` dan `batasSudut` | Lengan robot, mesin espresso, oven, gimbal |

### Pipeline agen (terlihat di tab Jejak)

```
MASUKAN -> MEMORI -> ROUTER -> RAG -> OTAK -> GUARD -> ORKESTRATOR -> SPESIALIS -> KELUARAN
```

Tiap pesan menyalakan tahap yang dilalui dan memerahkan yang menolak. Ini cara melihat bahwa agen bukan satu "otak" saja, melainkan rangkaian komponen yang masing-masing bisa diganti.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `index.html` | Hasil build, satu berkas, siap diunggah ke GitHub Pages |
| `index.src.html`, `game.js` | Template halaman, alur permainan, misi ruang dan semesta, kejadian, pipeline, tab Dunia, Agen, dan Manual |
| `dunia.js` | Definisi ruang (data), pemeriksa definisi, fisika suhu dan cahaya, misi deklaratif |
| `semesta.js` | Semesta: Kampus Nusantara, tiga ruang tambahan (perpustakaan, dapur, kebun), pemeriksa semesta, misi lintas ruang |
| `adegan.js` | Adegan 3D: material realistis, bayangan, pantulan, mode ringan, totem router dan label agen dari data |
| `brain.js` | Parser aturan, router (bawaan dan buatan), guardrails (masukan, aksi, interlock, keluaran), memori, pembagian tugas. Membaca semesta dan ruang aktif |
| `manual.js` | Rak manual: retrieval TF-IDF tanpa API, angka dari teks manual, catatan memori, penjelasan skor |
| `prompt.js` | Prompt LLM (lengkap dan ringkas) dirakit dari ruang aktif |
| `brain-llm.js` | Memanggil LLM (server lokal Python, OpenRouter, atau Ollama), validasi skema, retry, router hemat, fallback |
| `server_lokal.py`, `requirements-lokal.txt` | Server model kecil lokal berbasis Python (llama-cpp-python, CPU) |
| `build.py` | Merakit `index.html` dan memeriksa tidak ada em dash |
| `test_*.js` | Uji otomatis (lihat bagian Build dan uji) |
| `live_check.js` | Uji nyata pesan contoh ke LLM sungguhan |

Edit berkas sumber, bukan `index.html`. Setelah perubahan jalankan `python build.py`.

## Empat sumber otak

Dipilih di tab **Otak**. Kontrak JSON keluaran sama untuk semuanya:
`{intent, sub, diambil[], didelegasikan_ke, memori, pikiran, aksi[], ditolak[], baca, fokus, balasan, jejak[], otak}`.

| Mode | Cocok untuk | Catatan |
|---|---|---|
| Parser aturan | Semua perangkat, level awal | Gratis, instan, tanpa internet |
| **Model lokal kecil (Python)** | **Laptop berspesifikasi rendah, satu kelas** | Gratis, tanpa kuota, tanpa internet setelah model terunduh. Qwen2.5 1.5B lewat `server_lokal.py` |
| Kunci OpenRouter pribadi | Model besar, butuh internet | Tiap mahasiswa membuat akun dan kunci sendiri, kuota gratis per akun |
| Ollama lokal | Yang sudah memasang Ollama | Alternatif model lokal. Ollama bukan Python (ditulis dengan Go) |

Kalau LLM gagal (kuota habis, jaringan, JSON rusak), agen otomatis memakai parser aturan dan kegagalannya tercatat di Jejak. Game selalu bisa dimainkan tanpa internet dan tanpa biaya.

### Batas gratis OpenRouter (dicek 16 November 2026)

- Model berakhiran `:free`: 20 permintaan per menit, dan **50 permintaan per hari** untuk akun yang total pembelian kreditnya di bawah 10 dolar, atau 1.000 per hari setelah membeli kredit 10 dolar sekali. Batas ini **per akun**, bukan per kunci. Sumber: https://openrouter.ai/docs/api/reference/limits
- Satu kunci bersama satu kelas hanya cukup untuk sekitar 50 pesan per hari. Jalur realistis: kunci pribadi tiap mahasiswa, atau model lokal.
- Model bawaan `openrouter/free` (router yang memilih model gratis yang tersedia). `max_tokens` 1500: dengan 400, model penalaran menghabiskan token untuk berpikir lalu mengembalikan jawaban kosong.

### Memakai kunci OpenRouter pribadi

1. Buat akun di openrouter.ai, lalu buat API key di https://openrouter.ai/settings/keys (kunci hanya tampil sekali).
2. Di game, tab **Otak**, pilih "LLM dengan kunci OpenRouter sendiri", tempel kunci, **Simpan**, lalu **Tes koneksi**.
3. Kunci disimpan di localStorage browser itu dan hanya dikirim ke openrouter.ai. Jangan membagikan kunci. Hapus kunci di halaman yang sama setelah selesai.

## Rak manual (RAG) kreatif

Agen berjalan ke rak manual, mengambil potongan yang relevan, lalu bertindak. Potongan masuk ke field `diambil` dan tampil sebagai tag AMBIL di tab Jejak. Di tiap ruang, rak berisi pengetahuan yang berbeda: SOP lab, resep dan jam happy hour kafe, tips konten studio.

- **Angka dibaca dari teks.** Aturan "nyaman" membaca batas suhu dari manual dan menghitung level pendingin memakai fisika ruang. Ubah teksnya, perilaku agen berubah. Tanpa RAG agen mengarang angka.
- **Memori.** Kirim `ingat ya, pelanggan meja 3 alergi susu` (atau titip lewat tab Manual) dan agen menulis catatan baru ke rak, bertag CATAT di Jejak. Catatan ikut dicari ("siapa yang alergi susu?"). Catatan yang memuat suhu nyaman mengalahkan bab suhu bawaan. Menulis memori dikerjakan kode, bukan LLM, dan catatan berpola injeksi ditolak.
- **Uji pencarian.** Di tab Manual, ketik pertanyaan untuk melihat skor TF-IDF tiap bab, kata yang cocok, dan bab mana yang terambil. Begini cara agen memilih potongan.
- **Top-k** (1 sampai 3) bisa diatur: bandingkan hasil ambil sedikit dan banyak.
- Retrieval memakai TF-IDF sederhana dengan sinonim sehari-hari, tanpa API dan tanpa embedding.
- Untuk LLM, potongan masuk prompt sebagai DATA. Karena manual dan catatan bisa diisi pemain, potongan berpola injeksi dibuang di kode sebelum sampai ke LLM. Guard aksi tetap di kode.

## Orkestrasi

Agen depan menjadi orkestrator. Spesialis (satu per kelompok perangkat) berdiri di dekat panelnya dan menekan tombol.

- Aksi dalam satu perintah dikerjakan paralel oleh spesialis berbeda. Kata urutan ("lalu", "setelah", "terus") memecah tahap per segmen.
- Dua aksi yang terikat interlock tidak pernah satu tahap, supaya tidak balapan.
- Pembagian dihitung di kode dari aksi yang sudah lolos guard, jadi LLM tidak menentukan tahap. Hasilnya di field `didelegasikan_ke` dan tag DELEGASI di tab Jejak.
- Keterbatasan: untuk keluhan tanpa nama perangkat ("gerah lalu gelap"), tiap aksi menjadi tahap sendiri.

## Grafis dan perangkat lemah

Adegan 3D punya dua mutu:

| Mutu | Isi | Untuk |
|---|---|---|
| Realistis | Material PBR, pantulan lingkungan, bayangan lembut, tone mapping film, tekstur kayu, beton, dan ubin buatan, jendela, rak buku, lampu titik | Laptop dengan GPU |
| Ringan | Material sederhana, tanpa bayangan dan pantulan, resolusi 1x, bentuk lebih sedikit segi | Laptop lemah |

Pilihan **Otomatis** (bawaan) memakai ringan di perangkat dengan 4 inti atau kurang atau RAM 4 GB atau kurang, dan turun sendiri ke ringan bila gambar per detik di bawah 20. Bisa dipilih manual di tab Dunia, atau lewat alamat `index.html?grafis=ringan`. Waktu permainan memakai batas langkah yang longgar, jadi laptop lambat tetap berjalan wajar. Model lokal 1,5B butuh RAM kosong sekitar 2 GB.

## Model lokal kecil (Python) dan router hemat

Untuk laptop berspesifikasi rendah. `server_lokal.py` menjalankan model Qwen2.5 Instruct kecil (kuantisasi Q4_K_M) di CPU memakai llama-cpp-python, tanpa GPU dan tanpa Docker. Server kompatibel OpenAI di `http://127.0.0.1:8000/v1`.

```bash
python -m venv venv
venv\Scripts\activate        # Linux atau Mac: source venv/bin/activate
pip install -r requirements-lokal.txt
python server_lokal.py          # unduh model 1.5B sekali (sekitar 1 GB), lalu jalan
```

Lalu di game: tab **Otak**, pilih "Model lokal kecil, Python", **Simpan**, **Tes koneksi**. Opsi lain: `--ukuran 0.5b` (paling ringan), `--threads N`, `--berkas jalur.gguf`, `--folder` (lokasi model, default `./model`).

Strategi untuk model kecil:
1. **Prompt ringkas**, dirakit dari ruang aktif: aturan pendek dan contoh yang dibuat dari perangkat ruang itu.
2. **Keluaran dipaksa lewat grammar** dengan daftar perangkat ruang aktif, jadi JSON selalu valid dan nama perangkat tidak bisa dikarang.
3. **Router hemat** (bawaan hidup): pesan yang dikenali parser dikerjakan parser tanpa memanggil model, dan hitungan "nyaman" dikerjakan kode. Perintah kurang lengkap dijawab pertanyaan klarifikasi parser. Matikan untuk melihat model kecil bekerja sendirian.
4. **Guard tetap di kode.**

Hasil ukur dan pilihan model ada di [UJI.md](UJI.md). Ringkasnya: model 1,5B dipakai sebagai bawaan, 0,5B hampir tidak menambah nilai di atas parser, dan sekitar 4 sampai 5 detik per panggilan model di CPU modern (lebih lambat di laptop lama).

### Ollama lokal (alternatif)

Tab Otak, pilih "Ollama lokal" (prompt ringkas dan router hemat yang sama). Pasang Ollama, `ollama pull qwen2.5:1.5b`, dan izinkan alamat halaman lewat `OLLAMA_ORIGINS` (tanpa itu halaman `file://` dan GitHub Pages ditolak dengan HTTP 403; uji lokal: `OLLAMA_ORIGINS=*`).

## Input suara

Agen tidak bersuara. Tombol **Bicara** memakai Web Speech API (`id-ID`), mengubah ucapan menjadi teks, lalu mengirimnya lewat jalur chat yang sama, jadi input guard dan guard aksi tetap berlaku. Syarat: Chrome atau Edge, halaman `https` atau `localhost`, izin mikrofon, dan internet.

## Misi, XP, dan badge

Lab punya enam misi, ruang lain masing-masing empat, semesta punya misi lintas ruang (Tur Kampus, Ahli Pengetahuan, Jagoan Router, Tahan Banting, Mahasiswa Teladan), dan semesta atau ruang buatan sendiri bisa menambah misi di JSON ("target": perangkat, suhu, cahaya, jumlah penolakan, paralel, tahap, bab manual yang dibuka, jumlah memori). Bintang bergantung pada jumlah pesan, dan petunjuk mengurangi XP. Level: Rookie, Handler, Orchestrator, Architect, Grandmaster, World Builder.

Badge per misi, ditambah **Penipu LLM**, **Pengingat** (menitip memori), **Arsitek Dunia** (membuat ruang atau semesta sendiri), dan **Perancang Agen** (mengubah kepribadian, router, atau guard). XP, badge, dan ruang buatan hanya tersimpan di browser masing-masing. Tidak ada ranking atau data yang dikirim ke server.

## Arsitektur dan prinsip

```
pesan -> input guard (kode) -> memori atau RAG: potongan dicari di kode -> otak (parser atau LLM) mengusulkan JSON
      -> validasi skema (kode) -> guard aksi (kode: batas, interlock) -> orkestrator membagi tugas (kode)
      -> spesialis bertindak -> balasan   (gagal di mana pun: parser mengambil alih, jejak tercatat)
```

1. LLM hanya MENGUSULKAN. Input guard dan guard aksi selalu di kode, tidak pernah di prompt. Ruang buatan sendiri tidak bisa mematikannya: batas dipotong ke rentang aman dan interlock dijaga kode.
2. Setiap kegagalan LLM jatuh ke parser dan tercatat di Jejak.
3. Hanya layanan gratis.
4. Mobile tetap nyaman: layout menumpuk di lebar 860px ke bawah.

## Build dan uji

```bash
python build.py            # menghasilkan index.html
node test_brain.js         # parser dan guardrail
node test_manual.js        # RAG dan orkestrasi
node test_dunia.js         # ruang, pemeriksa definisi, fisika, misi deklaratif, memori
node test_semesta.js       # semesta: agen, orkestrator, router, RAG, guardrails, kejadian, misi lintas ruang
node test_llm.js           # otak LLM dengan fetch tiruan, model lokal, Ollama, router hemat

# uji browser (jaringan ditiru). Butuh playwright-core, Chrome, dan salinan lokal three@0.128.0:
PW=<jalur playwright-core> THREE=<jalur three.min.js> CHROME=<jalur chrome> node test_browser.js
PW=... THREE=... CHROME=... node test_browser_semesta.js   # Studio Agen, router, kejadian, semesta buatan, ekspor dan impor
PW=... THREE=... CHROME=... [LAMBAT=6] node test_resource_rendah.js   # simulasi perangkat lemah

# uji nyata (kunci lewat variabel lingkungan, jangan simpan di berkas):
OPENROUTER_API_KEY=sk-or-... node live_check.js                  # 15 pesan dasar
SUITE=ruang RUANG=kafe LOKAL=http://127.0.0.1:8000/v1 RINGKAS=1 node live_check.js q15   # server_lokal.py berjalan
```

Ringkasan hasil dan batasnya ada di [UJI.md](UJI.md).
