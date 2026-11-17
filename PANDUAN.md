# Panduan Ruang Agen

Panduan instalasi dan penggunaan. Bagian 1 sampai 3 untuk mahasiswa, bagian 4 untuk dosen, bagian 5 untuk yang ingin membuat ruang sendiri.

## 1. Instalasi

Pilih salah satu. Semuanya gratis.

### A. Paling cepat: tanpa pasang apa pun (otak parser)

Klik dua kali `index.html` (Chrome atau Edge). Langsung main, tanpa AI model. Semua misi bisa diselesaikan.

### B. Dengan AI di laptop sendiri: klik dua kali `MULAI.bat`

Untuk Windows. Mac atau Linux: buka terminal di folder game, jalankan `./mulai.sh`.

1. Klik dua kali **`MULAI.bat`** di folder game.
2. Tunggu. Pertama kali butuh internet dan beberapa menit: skrip menyiapkan Python sendiri di folder `.venv`, memasang paket (sekitar 150 MB), dan mengunduh model kecil (sekitar 1 GB). Kemajuan tampil sebagai langkah `[1/4]` sampai `[4/4]`.
3. Browser terbuka sendiri di `http://127.0.0.1:8000`. Otak **otomatis** memakai model lokal dengan router hemat. Tidak ada yang perlu diatur.
4. Biarkan jendela hitam tetap terbuka selama bermain. Tutup jendelanya untuk berhenti.

Berikutnya cukup klik dua kali `MULAI.bat` lagi: siap dalam beberapa detik, tanpa unduhan.

Kalau laptop belum punya Python 3.10 sampai 3.12, `MULAI.bat` menawarkan memasang Python 3.12 otomatis (ketik `Y`), lalu minta Anda menjalankan `MULAI.bat` sekali lagi. Python lama (misalnya 3.8) diabaikan, jadi tidak perlu dihapus.

Pilihan tambahan (klik kanan di folder, "Open in Terminal", lalu ketik):

| Perintah | Kegunaan |
|---|---|
| `MULAI.bat --ukuran 0.5b` | Model paling ringan (sekitar 0,5 GB), untuk laptop sangat terbatas. Jawaban lebih lemah |
| `MULAI.bat --threads 2` | Batasi pemakaian CPU supaya laptop tidak panas |
| `MULAI.bat --tanpa-model` | Hanya menyajikan game (otak parser), misalnya untuk mikrofon |
| `MULAI.bat --port 9000` | Pakai port lain. Bila 8000 terpakai, port berikutnya dipilih otomatis |

Dosen bisa menyalin folder `model/` lewat flashdisk ke tiap laptop supaya mahasiswa tidak perlu mengunduh 1 GB.

### C. Untuk kelas: GitHub Pages

1. Unggah `index.html` ke repositori GitHub, Settings, Pages, pilih branch utama.
2. Bagikan alamatnya. Mahasiswa main dengan parser atau OpenRouter. Untuk model lokal, mahasiswa tetap memakai cara B di laptop masing-masing.

### Opsional: AI besar lewat internet (OpenRouter, gratis)

Daftar di openrouter.ai, buka https://openrouter.ai/settings/keys, **Create Key**, salin kunci `sk-or-...` (hanya tampil sekali). Di tab Otak pilih "LLM dengan kunci OpenRouter sendiri", tempel, **Simpan**, **Tes koneksi**. Kunci hanya tersimpan di browser Anda. Jangan menempelkannya di chat, grup, atau repositori. Akun gratis dibatasi 50 pesan per hari.

### Opsional: Ollama

Alternatif cara B bila sudah memasang Ollama. Langkahnya lebih banyak:
1. Pasang dari https://ollama.com/download.
2. Set `OLLAMA_ORIGINS` supaya browser boleh memanggil Ollama. Jika game dibuka lewat `MULAI.bat --tanpa-model` (alamat localhost), tidak perlu diset. Jika `index.html` dibuka langsung, perlu `setx OLLAMA_ORIGINS "*"`. Untuk GitHub Pages, isi alamat situsnya. Lalu tutup dan buka lagi Ollama.
3. `ollama pull qwen2.5:1.5b`.
4. Tab Otak, pilih "Ollama lokal", isi model `qwen2.5:1.5b`, **Simpan**, **Tes koneksi**.

`OLLAMA_ORIGINS="*"` membuat situs apa pun yang Anda buka bisa memanggil Ollama di laptop ini. Pakai alamat spesifik bila memungkinkan.

## 2. Penggunaan

### Tata letak

- **Kiri**: ruangan 3D. Seret untuk memutar kamera, roda mouse untuk zoom, "Reset kamera" untuk kembali. Tombol 1x/2x/3x mempercepat animasi.
- **Kartu misi** (kiri atas): tujuan dan syarat yang harus dipenuhi, tombol petunjuk (mengurangi XP).
- **Kanan**, tujuh tab (bisa digeser ke samping di layar sempit):

| Tab | Isi |
|---|---|
| Chat | Ketik perintah, klik contoh, atau tombol **Bicara** untuk mengetik dengan suara |
| Jejak | Langkah demi langkah proses agen, plus "Kontrak JSON dari otak" |
| Misi | Daftar misi ruang aktif, XP, bintang, badge |
| Manual | Isi rak manual, titip catatan, uji pencarian |
| Dunia | Pindah semesta dan ruang, grafis, ajari kata gaul, sunting JSON semesta dan ruang, ekspor dan impor |
| Agen | Studio Agen: kepribadian, orkestrator, router, RAG, guardrails, kejadian |
| Otak | Pilih parser, model lokal, OpenRouter, atau Ollama |

### Alur satu pesan

Ketik di Chat. Agen: menerima pesan, router memilah rute, berpikir, membuka rak manual bila perlu, membagi tugas ke spesialis, spesialis menekan tombol, agen membalas. Semua tercatat di **Jejak**. Di atas daftar langkah ada **jalur pipeline** (MASUKAN, MEMORI, ROUTER, RAG, OTAK, GUARD, ORKESTRATOR, SPESIALIS, KELUARAN): tahap yang dilalui pesan menyala hijau (kuning untuk otak AI), dan tahap yang menolak menyala merah.

| Tag | Arti |
|---|---|
| KEJADIAN | Kejadian acak atau terjadwal yang mengubah keadaan ruang |

| TERIMA, ROUTER, PIKIR | Pesan masuk, intent atau rute yang dipilih (rute buatan disebut namanya), alasan agen |
| OTAK | Siapa yang berpikir: parser, LLM, atau input guard (dan "Router biaya" bila parser mengerjakannya demi hemat) |
| AMBIL | Potongan manual yang dibaca agen, lengkap dengan skor |
| CATAT | Catatan baru yang ditulis agen ke rak (memori) |
| DELEGASI | Pembagian tugas dan tahap (paralel atau berurutan) |
| JALAN, AKSI, AMATI | Agen berpindah, spesialis menekan tombol, agen membaca sensor |
| GUARD | Aturan keselamatan menolak sesuatu |
| BALAS | Jawaban agen |

### Semesta dan ruang

Semesta bawaan **Kampus Nusantara** berisi enam ruang. Pindah di tab **Dunia**: pilih semesta, lalu pilih ruang. Tiap ruang punya perangkat, spesialis, rak manual, contoh pesan, dan misi sendiri. Semua ruang berbagi pengetahuan kampus dan akademik, serta router yang sama.

| Ruang | Contoh pesan |
|---|---|
| Lab Robotika | `nyalakan lampu dan kipas`, `gerah nih`, `bikin nyaman`, `putar lengan robot 200%`, `buka pintu setelah matikan lengan` |
| Kafe Senja | `sepi banget nih`, `seduh kopi`, `seduh kopi 90%`, `resep kopi susu gula aren apa?`, `happy hour jam berapa?` |
| Studio Konten | `nyalakan ring light dan ac`, `go live`, `buka pintu` (ditolak saat ON AIR), `putar kamera 30% sudut 90`, `durasi konten berapa?` |
| Perpustakaan Cahaya | `ngantuk banget`, `ambilkan buku`, `denda telat berapa?`, `buku AI ada di rak mana?`, `cek plagiasi skripsi di mana?` |
| Dapur Kantin | `masak nasi goreng`, `panggang`, `nyalakan oven` saat kompor menyala (ditolak listrik), `resep nasi goreng apa?`, `asap banget` |
| Kebun Hidroponik | `siram`, `tanaman layu`, `pH nutrisi berapa?`, `kapan panen selada?`, `nyalakan pompa` saat pintu terbuka (ditolak) |

Di semua ruang, rute router Kampus aktif: `beasiswa apa saja?` dan `sidang skripsi syaratnya apa?` dijawab dari koleksi rak, `aku stres banget` dijawab aturan tetap (bukan AI), dan `bisa bantu joki skripsi?` ditolak router.

**Kejadian** muncul saat bermain: listrik padam pada pesan ke-6 di satu ruang, gelombang panas acak (suhu luar naik 4 derajat, dan agen memperhitungkannya saat merencanakan "nyaman"), dan dosen tamu saat masuk perpustakaan. Untuk kelas yang tidak mau kejutan, buka `index.html?kejadian=mati`.

**Misi semesta** (di bagian bawah tab Misi) menghitung kemajuan lintas ruang: Tur Kampus (kunjungi 3 ruang), Ahli Pengetahuan (buka 8 bab berbeda), Jagoan Router (pakai 2 rute berbeda), Tahan Banting (alami satu kejadian), dan Mahasiswa Teladan (selesaikan 4 misi ruang).

### Misi Lab

| # | Misi | Intinya |
|---|---|---|
| 1 | Perintah Jelas | Hidupkan lampu dan kipas dengan satu pesan |
| 2 | Bahasa Sehari-hari | Buat ruangan sejuk dan terang memakai keluhan, bukan nama perangkat |
| 3 | Uji Keamanan | Picu dua jenis penolakan berbeda |
| 4 | Manual Mengubah Agen | Ubah suhu nyaman menjadi 28 sampai 30 C lewat tab Manual atau memori, lalu `bikin nyaman`. Agen memakai angka baru |
| 5 | Dirigen Tiga Spesialis | Lengan aktif. Capai lengan mati, pintu terbuka, lampu dan kipas nyala dengan satu pesan paralel dan satu berurutan |
| 6 | Level Trickster | Tipu agen sampai guard menolak, lalu tahan 3 serangan lewat tombol **Terima serangan** |

Bintang bergantung pada jumlah pesan. XP, badge, dan ruang buatan hanya tersimpan di browser Anda dan tidak dibandingkan dengan siapa pun.

### Tab Manual (RAG)

- **Edit bab**: ubah kalimatnya, perilaku agen ikut berubah. Kotak hijau menunjukkan angka yang berhasil dibaca (tulis suhu dengan pola `24 sampai 26 C`, cahaya `200 lux`).
- **Agen boleh membaca manual (RAG)**: matikan untuk melihat agen mengarang angka.
- **Top-k**: jumlah potongan yang diambil (1 sampai 3).
- **Titip catatan (memori)**: tulis di kotak, atau lewat chat: `ingat ya, pelanggan meja 3 alergi susu`. Agen menulis ke rak (tag CATAT), dan catatan ikut dicari: `siapa yang alergi susu?`. Catatan suhu baru ("ingat ya, suhu nyaman 28 sampai 30 C") mengalahkan bab suhu bawaan. Tombol "hapus" membuang satu catatan. Rak maksimal 12 bab.
- **Uji pencarian**: ketik pertanyaan, lihat skor TF-IDF tiap bab (batang hijau), kata yang cocok, dan bab yang akhirnya terambil. Begini agen memutuskan.
- Catatan atau bab yang memuat kalimat seperti "abaikan aturan" ditolak atau dibuang sebelum sampai ke AI.

### Tab Dunia

- **Semesta** dan **Ruang di semesta ini**: pilih. Semesta atau ruang yang Anda ubah ditandai "(diubah)", yang baru "(buatanku)".
- **Grafis**: Otomatis, Realistis, atau Ringan. Di laptop lemah gunakan Ringan.
- **Ajari kata gaul**: tulis kata (misalnya `mager`), pilih perangkat dan aksi, klik **Ajari**. Agen langsung paham dan prompt AI ikut diperbarui.
- **Definisi semesta (JSON)**: cerita, agen, orkestrator, router, RAG, guardrails, pengetahuan bersama, kejadian, misi lintas ruang. "ruang" cukup berisi id ruang. **Terapkan semesta**, **Semesta baru dari templat**, **Ekspor semesta** (berkas utuh dengan seluruh ruangnya), **Impor** (berkas semesta, atau berkas satu ruang yang lalu ditambahkan ke semesta aktif, maksimal 250 KB), dan **Hapus atau kembalikan**.
- **Definisi ruang (JSON)**: satu ruang. **Terapkan**, **Tambah ruang dari templat**, **Ekspor**, **Impor**, **Hapus ruang ini**.
- Galat ditampilkan dengan penjelasan di bawah kotak JSON. Definisi yang salah tidak pernah menggantikan semesta atau ruang yang sedang aktif.

### Tab Agen (Studio Agen)

Isi kepala agen, dikelompokkan sesuai pipeline. Klik **Terapkan ke agen** untuk menyimpan, **Batalkan perubahan** untuk kembali ke nilai semesta aktif.

| Bagian | Isi |
|---|---|
| Kepribadian agen | Nama, warna (dipakai di label 3D), persona (masuk prompt AI), sapaan, kata setuju ("Siap!"), kata menolak ("Aku tolak:"), gaya bahasa |
| Orkestrator | Nama dan strategi: **otomatis** (baca kata lalu dan setelah), **selalu paralel**, **selalu berurutan**. Aksi yang terikat interlock tetap dipisah apa pun strateginya |
| Router | Daftar rute buatan. Tambah dengan nama, kata pemicu (dipisah koma), aksi, dan isi: **jawab dari koleksi** (isi: nama koleksi, hanya mencari di bab bertanda itu), **balas teks tetap**, atau **tolak** (isi: teks penolakan). Rute tampil di totem router 3D |
| RAG | Jumlah potongan (k), ambang skor, sinonim (satu per baris, `kata=istilah di rak`), kata henti tambahan |
| Guardrails | Guard masukan dan pola tambahan, guard batas aksi, interlock, izin menulis memori, guard keluaran dan kata terlarangnya |
| Kejadian | Daftar kejadian (hanya baca di sini, ubah lewat JSON semesta) |

Aturan router: rute **tolak** selalu menang, termasuk saat pesan memuat perintah perangkat. Rute **jawab dari koleksi** dan **balas** tidak membajak perintah perangkat yang jelas (kata kerja dan nama perangkat). Router dikerjakan kode sebelum AI, jadi AI tidak memutuskan rute.

**Mode rentan.** Mematikan guard batas aksi, interlock, atau guard masukan menampilkan peringatan kuning dan menambahkan catatan di Jejak. Ini hanya untuk belajar: matikan, kirim `putar lengan robot 200%`, lihat lengan berputar 200 persen, lalu nyalakan lagi dan lihat guard menolak. Ruang di game ini tidak punya efek nyata di dunia luar.

### Tab Otak

| Pilihan | Kapan |
|---|---|
| Parser aturan | Default. Gratis, tanpa internet, instan |
| Model lokal kecil, Python | Disarankan untuk laptop biasa. Perlu langkah instalasi model |
| LLM dengan kunci OpenRouter sendiri | Model besar lewat internet |
| Ollama lokal | Bila sudah memasang Ollama |

**Router hemat** (kotak di tab Otak, hidup bawaan untuk model lokal): pesan yang dikenali parser dikerjakan parser tanpa memanggil model, jadi cepat dan andal. Model hanya dipanggil untuk pesan baru yang parser tidak kenal. Matikan untuk melihat model kecil bekerja sendirian: hasilnya lebih sering salah, dan itu bahan diskusi bagus tentang kapan AI kecil layak dipercaya. Bila AI gagal, agen otomatis kembali ke parser dan Jejak menjelaskan alasannya.

### Input suara

Agen tidak bersuara. Tombol **Bicara** mengubah ucapan menjadi pesan, lalu diproses sama seperti teks. Butuh Chrome atau Edge, halaman `https` atau `localhost`, izin mikrofon, dan internet. Tombol tidak muncul bila browser tidak mendukung.

## 3. Pemecahan masalah

| Gejala | Penyebab dan solusi |
|---|---|
| Layar 3D kosong atau galat | three.js dimuat dari CDN: pastikan ada internet. Coba Chrome terbaru. Coba `index.html?grafis=ringan` |
| Animasi patah-patah | Pilih grafis Ringan di tab Dunia. Mode Otomatis juga turun sendiri bila di bawah 20 gambar per detik |
| Tes koneksi: "kunci ditolak" | Kunci OpenRouter salah atau sudah dihapus. Buat baru |
| "kuota model gratis habis atau sedang penuh (429)" | Batas 50 per hari atau model penuh. Agen memakai parser. Coba lagi nanti |
| Jejak OTAK: "LLM gagal" | Normal. Alasannya tertulis dan agen tetap bekerja lewat parser |
| Model lokal: "Server model lokal tidak terjangkau" | Jendela `MULAI.bat` sudah ditutup. Klik dua kali `MULAI.bat` lagi, lalu buka alamat yang tertulis di jendelanya |
| `MULAI.bat` berhenti dengan GAGAL saat memasang paket | Periksa internet lalu jalankan lagi. Bila tetap gagal, pasang Python 3.12 64-bit dari python.org dan jalankan lagi |
| `pip` gagal dengan `TomlError ... pyproject.toml` (cara manual) | Folder `venv` dibuat dengan Python lama (3.8). Pakai `MULAI.bat` saja: skrip itu memilih Python yang cocok dan membuat `.venv` sendiri. Folder `venv` lama boleh dihapus |
| Model lokal terasa lambat | Normal di laptop lama (sekitar 4 sampai 5 detik per panggilan). Pastikan Router hemat hidup, coba `--ukuran 0.5b` atau `--threads`, atau pakai parser |
| Ollama: "tidak terjangkau" | Ollama belum berjalan, atau `OLLAMA_ORIGINS` belum mengizinkan alamat halaman (HTTP 403) |
| Tombol Bicara tidak muncul | Browser tidak mendukung Web Speech API. Pakai Chrome atau Edge |
| Definisi ruang: "Belum bisa diterapkan" | Baca daftar galat merah di tab Dunia. Setiap galat menyebut perangkat atau aturan yang salah |
| Pengaturan atau ruang buatan hilang | Disimpan di localStorage. Terhapus bila data situs dibersihkan atau memakai jendela privat. Gunakan Ekspor untuk cadangan |
| Mode LLM tidak bisa di pratinjau claude.ai | Pratinjau memblokir koneksi keluar. Host sendiri di GitHub Pages |

## 4. Untuk dosen

### Menyiapkan kelas

1. Unggah `index.html` ke GitHub Pages (bagian 1). Mahasiswa sudah bisa bermain dengan parser.
2. Pilih jalur AI untuk sesi yang membutuhkannya:
   - **Model lokal kecil** (disarankan untuk laptop terbatas): tiap mahasiswa menjalankan 4 langkah instalasi. Unduhan sekitar 1 GB per laptop, sebaiknya dilakukan di jaringan kampus sebelum sesi, atau salin folder `model/` lewat flashdisk.
   - **Kunci OpenRouter pribadi**: tiap mahasiswa membuat akun sendiri (kuota gratis berlaku per akun, jadi satu kunci bersama tidak cukup untuk kelas).
3. Bila ada laptop yang terlalu lambat, minta memakai parser. Semua misi tetap bisa diselesaikan.

### Alur sesi yang disarankan

1. **Lab, parser**: bandingkan "nyalakan lampu" (aturan eksplisit) dengan "gerah nih" (tafsiran). Buka Jejak.
2. **Aktifkan AI**: kirim pesan sama, bandingkan Jejak parser dan AI. Tunjukkan Router hemat.
3. **Misi 4 dan tab Manual**: perilaku agen berubah hanya dengan mengubah manual. Pakai Uji pencarian untuk menjelaskan TF-IDF. Tunjukkan memori ("ingat ya ...") sebagai RAG jangka panjang.
4. **Misi 5, Studio**: orkestrasi paralel dan berurutan, dan mengapa interlock memaksa dua tahap.
5. **Misi 6**: mengapa AI bisa tertipu tetapi guard di kode tidak, lalu mengapa keputusan keamanan tidak boleh diserahkan ke prompt.
6. **Proyek**: tiap kelompok merancang ruang sendiri (kelas, bengkel, klinik, toko) di tab Dunia, menyajikannya, dan saling menyerang agen ruang teman.

### Ide tugas

- Buat ruang baru dengan 3 sampai 5 perangkat, 3 kata gaul, 5 bab manual, dan 2 misi.
- Tulis interlock yang masuk akal untuk ruang itu dan buktikan guard menolaknya.
- Isi manual dengan pengetahuan yang tidak diketahui model umum (jadwal kelas, resep khusus), lalu tunjukkan agen menjawab dari rak, dan menjawab "tidak tahu" bila bab dihapus.
- Bandingkan top-k 1, 2, dan 3 pada pertanyaan yang sama.

## 5. Membuat ruang dan semesta sendiri

Semua adalah data. Dua cara: (a) tab **Dunia**, **Semesta baru dari templat** lalu ubah lewat tab **Agen** dan JSON, (b) tulis JSON sendiri dan **Impor**. Di dalam semesta, **Tambah ruang dari templat** menambah ruang. Contoh potongan definisi **ruang**:

```json
{
  "id": "bengkel",
  "nama": "Bengkel Motor",
  "deskripsi": "Bengkel kecil di pinggir jalan.",
  "tema": { "lantai": "beton", "dinding": "#e4e2ee", "aksen": "#e8502a" },
  "ambien": { "suhu": 32, "cahaya": 30 },
  "perangkat": {
    "lampu": { "tipe": "saklar", "nama": "Lampu kerja", "kata": ["lampu"], "spesialis": "Cahaya", "peran": "cahaya", "bentuk": "ring_light", "efek": { "cahaya": 380 } },
    "kipas": { "tipe": "level", "nama": "Kipas", "kata": ["kipas", "angin"], "spesialis": "Suhu", "peran": "dingin", "bentuk": "kipas", "maks": 3, "efek": { "suhu": -2.2 } },
    "dongkrak": { "tipe": "mesin", "nama": "Dongkrak", "kata": ["dongkrak"], "spesialis": "Mekanik", "bentuk": "lengan", "batasDaya": 60, "batasSudut": 45 }
  },
  "interlock": [{ "larang": "kipas", "saat": "dongkrak", "pesan": "Kipas dimatikan dulu saat dongkrak bekerja." }],
  "keluhan": [{ "kata": ["panas", "pengap"], "alasan": "udara bengkel panas", "aksi": [{ "device": "kipas", "op": "on", "speed": 2 }] }],
  "manual": [
    { "id": "suhu", "judul": "Suhu nyaman", "teks": "Suhu nyaman bengkel adalah 28 sampai 30 C." },
    { "id": "oli", "judul": "Ganti oli", "teks": "Ganti oli setiap 2000 km atau 2 bulan." }
  ],
  "misi": [{ "judul": "Buka Bengkel", "base": 100, "brief": "Nyalakan lampu kerja dan kipas.", "target": { "perangkat": { "lampu": { "on": true }, "kipas": { "on": true } } } }]
}
```

Aturan penulisan:

| Bagian | Ketentuan |
|---|---|
| `id` ruang | 2 sampai 16 huruf kecil, angka, garis bawah, diawali huruf |
| `perangkat` | Maksimal 6. id huruf kecil, bukan `suhu` atau `cahaya`. Maksimal 4 spesialis berbeda |
| `tipe` | `saklar`, `level`, `buka`, `mesin` (lihat tabel di README) |
| `kata` | Kata pengenal perangkat di kalimat pengguna (huruf kecil, angka, spasi) |
| `bentuk` | saklar: lampu_berdiri, lampu_gantung, ring_light, tanda. level: kipas, ac, speaker. buka: pintu, tirai. mesin: lengan, mesin_kopi, kamera. Lainnya: kotak berlabel |
| `peran` | `cahaya` (saklar atau level), `dingin` (saklar atau level), `udara` (buka). Peran memengaruhi tafsir "gerah", "gelap", "nyaman", dan "pengap" |
| `efek` | Pengaruh perangkat aktif pada suhu (derajat per level) dan cahaya (lux), dipakai fisika dan papan sensor |
| `batasDaya`, `batasSudut` | Batas guard untuk tipe mesin. Dipotong ke rentang aman, tidak bisa dimatikan |
| `interlock` | `larang` tidak boleh dibuka atau dinyalakan saat `saat` aktif. Dijaga kode, dan memaksa dua tahap |
| `alias` | Frasa yang diganti sebelum dibaca, misalnya `"seduh kopi": "nyalakan espresso"` |
| `keluhan` | Kata gaul dan aksi yang dijalankan |
| `kataManual` | Kata tambahan yang menandai pertanyaan ke rak manual |
| `manual` | Maksimal 12 bab `{id, judul, teks}`. Bab `suhu` dan `cahaya` dibaca angkanya |
| `misi.target` | `perangkat` (on, open, speed), `suhuMaks`, `cahayaMin`, `tolakMin`, `paralelMin`, `tahapMin`, `ambil` (id bab), `memoriMin` |

Agar ruang baru bisa dipakai guru lain: **Ekspor**, kirim berkas `.json`, lalu **Impor** di komputer lain.

Mengubah ruang bawaan di kode (bukan lewat tab Dunia): edit `RUANG` di `dunia.js`, jalankan `python build.py`, unggah ulang `index.html`.

### Definisi semesta

```json
{
  "id": "bengkel_kita",
  "nama": "Bengkel Kita",
  "cerita": "Kamu pengelola AI bengkel motor kampus vokasi.",
  "agen": { "nama": "Bimo", "persona": "mekanik muda yang ramah", "sapaan": "Halo, aku Bimo!", "siap": "Gaskeun!", "tolak": "Waduh, nggak bisa:", "gaya": "gaul", "warna": "#ff8a3d" },
  "orkestrator": { "nama": "Koordinator", "strategi": "otomatis", "spesialis": { "Cahaya": "#ffc928", "Mekanik": "#ff5a47" } },
  "router": { "rute": [
    { "id": "sop", "nama": "SOP", "kata": ["sop", "prosedur"], "aksi": "manual", "koleksi": "bengkel", "warna": "#2f5bff" },
    { "id": "curhat", "nama": "CURHAT", "kata": ["capek", "stres"], "aksi": "balas", "intent": "obrol", "balasan": "Istirahat dulu ya, minum air." },
    { "id": "larang", "nama": "LARANG", "kata": ["bypass rem"], "aksi": "tolak", "balasan": "Itu membahayakan. Aku tidak membantu." }
  ] },
  "rag": { "k": 2, "ambang": 0.8, "sinonim": { "ganti oli": "oli" }, "stop": [] },
  "guard": { "input": { "aktif": true, "pola": ["rahasia bengkel"] }, "aksi": { "aktif": true }, "interlock": { "aktif": true }, "output": { "aktif": true, "kata": ["bodoh"] }, "memori": { "aktif": true } },
  "pengetahuan": [ { "id": "sop_oli", "judul": "SOP ganti oli", "teks": "Ganti oli setiap 2000 km. Mesin harus dingin.", "koleksi": "bengkel" } ],
  "ruang": [ "lab", { "id": "bengkel", "nama": "Bengkel", "perangkat": { "lampu": { "tipe": "saklar", "nama": "Lampu", "kata": ["lampu"], "spesialis": "Cahaya", "peran": "cahaya", "efek": { "cahaya": 300 } } } } ],
  "awal": "bengkel",
  "misi": [ { "judul": "Tur Bengkel", "base": 150, "brief": "Kunjungi 2 ruang.", "target": { "ruangDikunjungi": 2 } } ],
  "kejadian": [ { "id": "mati_lampu", "nama": "Mati lampu", "pemicu": { "pesanKe": 5 }, "efek": { "matikan": ["lampu"] }, "pesan": "Listrik padam!" } ]
}
```

| Bagian | Ketentuan |
|---|---|
| `id` | 2 sampai 16 huruf kecil, angka, garis bawah, diawali huruf |
| `agen.gaya` | `santai`, `formal`, atau `gaul` |
| `orkestrator.strategi` | `otomatis`, `paralel`, atau `berurutan`. `spesialis` memetakan nama ke warna `#rrggbb` |
| `router.rute` | Maksimal 6. `aksi`: `manual` (butuh `koleksi`), `balas` atau `tolak` (butuh `balasan`). `kata` minimal 1. id tidak boleh `kontrol`, `info`, `bahaya`, `obrol` |
| `rag` | `k` 1 sampai 3, `ambang` 0 sampai 5 (skor TF-IDF terendah yang diterima), `sinonim` peta kata ke istilah di rak, `stop` kata henti |
| `guard` | Lima lapisan, tiap `aktif` true atau false. `input.pola` dan `output.kata` menambah kata. Hanya `output` yang mati secara bawaan |
| `pengetahuan` | Maksimal 40 bab bersama (300 karakter tiap bab), bertanda `koleksi` untuk rute |
| `ruang` | Maksimal 8. Isinya id ruang bawaan (`"lab"`, `"kafe"`, `"studio"`, `"perpus"`, `"dapur"`, `"kebun"`) atau definisi ruang utuh |
| `misi` (semesta) | Target salah satu dari: `ruangDikunjungi`, `misiSelesai`, `babUnik`, `rutePakai`, `kejadianSelesai`, `badgeMin`, `xpMin` |
| `kejadian` | Maksimal 8. `pemicu`: `pesanKe` (angka), `masuk` (id ruang), atau `acak` (0 sampai 1 per pesan). `efek`: `suhu`, `cahaya`, `matikan`, `nyalakan` (id perangkat). `ruang` opsional membatasi pada satu ruang |

Target `misi` di dalam **ruang** (selain yang ada di tabel ruang di atas) kini juga mendukung: `urutan` (daftar perangkat yang harus dioperasikan berurutan, boleh diselingi aksi lain), `maksPesan` (batas jumlah pesan), `intent` (pernah memicu intent tertentu), `rute` (pernah memakai rute tertentu), dan `kejadian` (pernah mengalami kejadian tertentu).

### Yang sengaja tidak bisa dikustom

- **Tipe perangkat baru**: guard di kode hanya memeriksa empat tipe karena batas keselamatannya harus bisa diverifikasi mesin. Tipe baru butuh perubahan kode di `dunia.js` dan `brain.js`.
- **Sensor baru** (misalnya kelembapan): game punya dua sensor, suhu dan cahaya.
- **Bentuk 3D baru atau tata letak bebas**: bentuk dipilih dari daftar tetap, selain itu berupa kotak berlabel. Letak perangkat otomatis.
- **Kunci OpenRouter, alamat server model, dan konfigurasi otak** tersimpan per browser (tab Otak), bukan di berkas semesta, supaya berkas yang dibagikan tidak membawa rahasia.
