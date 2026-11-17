# Panduan Ruang Agen

Bagian 1 sampai 4 untuk semua pemain, bagian 5 untuk yang ingin membuat ruang dan semesta sendiri, bagian 6 tentang Studio Rumah Agen, bagian 7 untuk dosen.

## 1. Memasang

Pilih salah satu. Semuanya gratis.

### A. Langsung main (tanpa pasang apa pun)

Klik dua kali `index.html` dan buka dengan Chrome atau Edge. Agen memakai **parser aturan**: cepat, tanpa internet, dan semua misi bisa diselesaikan.

### B. Dengan AI di laptop sendiri (disarankan)

1. Klik dua kali **`MULAI.bat`** di folder game. Di Mac atau Linux, buka terminal di folder game lalu jalankan `./mulai.sh`.
2. Tunggu. Pertama kali butuh internet dan beberapa menit (mengunduh sekitar 1,2 GB). Kemajuan tampil sebagai langkah `[1/4]` sampai `[4/4]`.
3. Browser terbuka sendiri. Agen otomatis memakai model AI di laptopmu. Tidak ada yang perlu diatur.
4. **Biarkan jendela hitam tetap terbuka selama bermain.** Tutup jendela itu untuk berhenti.

Berikutnya cukup klik dua kali `MULAI.bat` lagi. Game siap dalam beberapa detik tanpa mengunduh ulang.

Kalau laptop belum punya Python yang cocok, `MULAI.bat` menawarkan memasangnya (ketik `Y`), lalu minta kamu menjalankan `MULAI.bat` sekali lagi.

Pilihan tambahan (klik kanan di folder game, pilih "Open in Terminal", lalu ketik):

| Perintah | Kegunaan |
|---|---|
| `MULAI.bat --ukuran 0.5b` | Model paling ringan untuk laptop sangat terbatas. Jawabannya lebih lemah |
| `MULAI.bat --threads 2` | Batasi pemakaian CPU supaya laptop tidak panas |
| `MULAI.bat --tanpa-model` | Buka game lewat alamat lokal tanpa model, misalnya untuk tombol Bicara atau untuk Ollama |

### C. AI besar lewat internet (OpenRouter, gratis)

1. Daftar di openrouter.ai, buka https://openrouter.ai/settings/keys, klik **Create Key**, lalu salin kunci `sk-or-...` (hanya tampil sekali).
2. Di game, buka tab **Otak**, pilih "LLM dengan kunci OpenRouter sendiri", tempel kunci, klik **Simpan**, lalu **Tes koneksi**.

Kunci hanya tersimpan di browsermu. Jangan menempelkannya di chat, grup, atau repositori. Akun gratis dibatasi sekitar 50 pesan AI per hari. Bila kuota habis, agen otomatis memakai parser.

### D. Ollama (bila sudah memasang Ollama)

Cocok bila laptop punya kartu grafis (jauh lebih cepat) atau ingin mencoba model lain.

1. Pasang Ollama dari https://ollama.com/download, lalu buka aplikasinya (ikon muncul di tray).
2. Opsional, supaya model tidak memenuhi drive C: `setx OLLAMA_MODELS "D:\ollama\models"`, lalu Quit Ollama dari tray dan buka lagi.
3. Di Command Prompt: `ollama pull qwen2.5:1.5b`.
4. Di folder game: `MULAI.bat --tanpa-model`. Browser terbuka di `http://127.0.0.1:8000`.
5. Tab **Otak**, pilih **Ollama lokal (di laptop ini)**. Daftar model yang sudah diunduh muncul sendiri. Pilih model, biarkan **Router hemat** tercentang, klik **Simpan**, lalu **Tes koneksi** sampai muncul "Berhasil".

Untuk mencoba model lain, unduh dulu lewat Command Prompt (misalnya `ollama pull llama3.2:1b`), klik **Muat daftar** di tab Otak, pilih modelnya, lalu **Simpan**.

Membuka `index.html` langsung (klik dua kali) dengan Ollama butuh `setx OLLAMA_ORIGINS "*"`, lalu Quit Ollama dan buka lagi. Pengaturan itu membuat situs apa pun yang kamu buka bisa memanggil Ollama di laptopmu, jadi cara di atas lebih aman.

### Untuk kelas daring

Dosen mengunggah `index.html` ke repositori GitHub, membuka Settings, Pages, memilih branch utama, lalu membagikan alamatnya. Mahasiswa bermain dengan parser atau OpenRouter. Untuk AI di laptop sendiri, tiap mahasiswa tetap memakai cara B.

## 2. Bermain

### Layar

- **Kiri**: ruangan 3D. Seret untuk memutar kamera, roda mouse untuk zoom, **Reset kamera** untuk kembali. Tombol 1x, 2x, 3x mempercepat animasi.
- **Kartu misi** (kiri atas): tujuan, syarat yang harus dipenuhi, dan tombol petunjuk (mengurangi XP).
- **Kanan**: tujuh tab (di layar sempit, geser ke samping).

| Tab | Isi |
|---|---|
| Chat | Ketik perintah, klik contoh, atau tekan **Bicara** untuk mengetik dengan suara |
| Jejak | Langkah demi langkah proses agen |
| Misi | Misi ruang ini, misi semesta, XP, bintang, dan badge |
| Manual | Isi rak manual (buku panduan agen), titip catatan, dan uji pencarian |
| Dunia | Pindah semesta dan ruang, mutu grafis, ajari kata gaul, buat ruang dan semesta |
| Agen | Studio Agen: ubah isi kepala agen |
| Otak | Pilih otak: parser, model lokal, OpenRouter, atau Ollama |

### Apa yang terjadi saat kamu mengirim pesan

Agen menerima pesan, router memilah jenisnya, agen berpikir, membuka rak manual bila perlu, membagi tugas ke robot spesialis, spesialis menekan tombol, lalu agen membalas.

Di bagian atas tab **Jejak** ada jalur pesan: MASUKAN, MEMORI, ROUTER, RAG, OTAK, GUARD, ORKESTRATOR, SPESIALIS, KELUARAN. Tahap yang dilalui menyala hijau (kuning bila otak AI yang berpikir), dan tahap yang menolak menyala merah. Di bawahnya, tiap langkah diberi tag:

| Tag | Arti |
|---|---|
| TERIMA, ROUTER, PIKIR | Pesan masuk, jenis pesan atau rute yang dipilih, alasan agen |
| OTAK | Siapa yang berpikir: parser, AI, atau pengaman masukan |
| AMBIL | Halaman rak manual yang dibaca agen |
| CATAT | Catatan yang ditulis, diganti, atau dihapus agen di rak |
| FAKTA | Fakta yang disimpan ke ingatan sesi, misalnya nama |
| KONTEKS | Berapa pesan sebelumnya yang ikut dikirim ke AI |
| DELEGASI | Pembagian tugas ke spesialis: bersamaan (paralel) atau bergiliran |
| JALAN, AKSI, AMATI | Agen berpindah, spesialis menekan tombol, agen membaca papan sensor |
| GUARD | Aturan keselamatan menolak sesuatu |
| KEJADIAN | Kejadian tak terduga yang mengubah ruangan |
| BALAS | Jawaban agen |

Saat AI sedang berpikir, balon chat agen menampilkan titik tiga yang bergerak.

### Ingatan agen

Agen punya tiga jenis ingatan:

| Ingatan | Cara memakai | Bertahan sampai |
|---|---|---|
| **Fakta sesi** | `namamu John`, `namaku Budi`. Tanya lagi: `siapa namamu?`, `siapa namaku?`, `apa yang kamu ingat?` | Halaman ditutup, dimuat ulang, atau tombol **Lupakan sesi ini** di tab Manual. Bila **Ingatan sesi tetap ada saat dimuat ulang** dicentang di tab Otak, fakta bertahan setelah dimuat ulang sampai tab ditutup |
| **Catatan di rak** | `ingat ya, meja 3 alergi susu`. Ganti dengan `ralat: meja 3 alergi kacang`, buang dengan `hapus catatan meja 3` | Selamanya di browser ini (per ruang) |
| **Riwayat percakapan** (context window) | Pilih jumlahnya di tab Otak. Setelah itu `matikan yang tadi` atau `kecilin dikit` dipahami AI | Halaman ditutup |

Menyimpan fakta dan catatan dikerjakan kode, bukan AI, jadi selalu berhasil walau memakai parser. Riwayat percakapan hanya berguna untuk otak AI, dan bawaannya mati: tanpa itu, tiap pesan berdiri sendiri.

### Semesta Kampus Nusantara

Pindah ruang di tab **Dunia**. Tiap ruang punya perangkat, robot spesialis, rak manual, contoh pesan, dan misi sendiri.

| Ruang | Coba ketik |
|---|---|
| Lab Robotika | `nyalakan lampu dan kipas`, `gerah nih`, `bikin nyaman`, `putar lengan robot 200%`, `buka pintu setelah matikan lengan` |
| Kafe Senja | `sepi banget nih`, `seduh kopi`, `seduh kopi 90%`, `resep kopi susu gula aren apa?`, `happy hour jam berapa?` |
| Studio Konten | `nyalakan ring light dan ac`, `go live`, `buka pintu` (ditolak saat ON AIR), `putar kamera 30% sudut 90`, `durasi konten berapa?` |
| Perpustakaan Cahaya | `ngantuk banget`, `ambilkan buku`, `denda telat berapa?`, `buku AI ada di rak mana?`, `cek plagiasi skripsi di mana?` |
| Dapur Kantin | `masak nasi goreng`, `panggang`, `nyalakan oven` saat kompor menyala (ditolak), `resep nasi goreng apa?`, `asap banget` |
| Kebun Hidroponik | `siram`, `tanaman layu`, `pH nutrisi berapa?`, `kapan panen selada?`, `nyalakan pompa` saat pintu terbuka (ditolak) |

Di semua ruang juga berlaku rute khusus kampus: `beasiswa apa saja?` dan `sidang skripsi syaratnya apa?` dijawab dari rak, `aku stres banget` dijawab dengan pesan tetap, dan `bisa bantu joki skripsi?` ditolak.

**Kejadian** bisa muncul sewaktu-waktu: listrik padam, gelombang panas, atau dosen tamu datang. Bila tidak ingin kejutan, buka game dengan alamat berakhiran `?kejadian=mati`.

### Misi, XP, dan badge

- **Misi ruang**: Lab punya enam, ruang lain masing-masing empat. Bintang bergantung pada jumlah pesan, dan petunjuk mengurangi XP.
- **Misi semesta** (bagian bawah tab Misi) menghitung kemajuan di seluruh kampus: Tur Kampus, Ahli Pengetahuan, Jagoan Router, Tahan Banting, dan Mahasiswa Teladan.
- **Level**: Rookie, Handler, Orchestrator, Architect, Grandmaster, World Builder.
- **Badge** untuk misi tertentu, ditambah Penipu LLM, Pengingat, Arsitek Dunia, dan Perancang Agen.

XP, badge, dan ruang buatanmu hanya tersimpan di browsermu. Tidak ada ranking dan tidak ada data yang dikirim ke mana pun.

| Misi Lab | Intinya |
|---|---|
| 1. Perintah Jelas | Hidupkan lampu dan kipas dengan satu pesan |
| 2. Bahasa Sehari-hari | Buat ruangan sejuk dan terang memakai keluhan, bukan nama perangkat |
| 3. Uji Keamanan | Picu dua jenis penolakan berbeda |
| 4. Manual Mengubah Agen | Ubah suhu nyaman menjadi 28 sampai 30 C, lalu `bikin nyaman`. Agen memakai angka baru |
| 5. Dirigen Tiga Spesialis | Satu pesan yang dikerjakan bersamaan dan satu pesan bergiliran |
| 6. Level Trickster | Tipu agen sampai pengaman menolak, lalu tahan 3 serangan lewat tombol **Terima serangan** |

## 3. Tab-tab pengaturan

### Manual (rak pengetahuan agen)

- **Edit halaman**: ubah kalimatnya dan perilaku agen ikut berubah. Kotak hijau menunjukkan angka yang berhasil dibaca agen (tulis suhu seperti `24 sampai 26 C`, cahaya seperti `200 lux`).
- **Agen boleh membaca manual**: matikan untuk melihat agen mengarang angka sendiri.
- **Jumlah potongan yang diambil**: berapa halaman yang dibaca agen sekaligus (1 sampai 3).
- **Titip catatan**: tulis di kotak, atau lewat chat `ingat ya, pelanggan meja 3 alergi susu`. Catatan ikut dicari, misalnya `siapa yang alergi susu?`. Catatan suhu baru mengalahkan halaman suhu bawaan. Tombol **hapus** membuang satu catatan. Lewat chat, `ralat: ...` mengganti catatan yang paling mirip dan `hapus catatan ...` membuangnya.
- **Ingatan sesi**: daftar fakta seperti nama agen dan namamu, serta jumlah riwayat chat. **Lupakan sesi ini** menghapus keduanya, tetapi catatan di rak tetap ada.
- **Uji pencarian**: ketik pertanyaan untuk melihat skor tiap halaman, kata yang cocok, dan halaman mana yang akhirnya dibaca agen.
- **Cara mencari**: TF-IDF (mencocokkan kata yang sama) atau **Hibrida** (TF-IDF digabung kemiripan makna dari model embedding). Hibrida membantu saat kata-katanya berbeda. Contoh di Lab: untuk "minimal pencahayaan buat kerja", TF-IDF menaruh halaman sidang skripsi di urutan pertama, sedangkan hibrida memilih halaman cahaya. Di Lab keuntungannya kecil (12 dari 13 pertanyaan benar, TF-IDF 11) karena sinonimnya sudah kuat. Butuh Ollama.
- **Reranker AI**: AI mengurutkan ulang hasil pencarian sebelum dipakai. Butuh otak AI dan menambah satu panggilan AI.
- **Tampilkan sumber**: jawaban yang memakai rak diberi baris "Sumber: ...". Sumber ditulis oleh kode dari halaman yang benar-benar dibaca, bukan oleh AI.
- Catatan yang berisi kalimat seperti "abaikan aturan" ditolak supaya tidak bisa dipakai menipu AI.

### Dunia

- **Semesta** dan **Ruang**: pilih tempat bermain. Yang sudah kamu ubah ditandai "(diubah)", yang kamu buat ditandai "(buatanku)".
- **Grafis**: Otomatis, Realistis, atau Ringan. Di laptop lambat pilih Ringan. Pilihan Otomatis turun sendiri ke Ringan bila animasi patah-patah.
- **Ajari kata gaul**: tulis kata (misalnya `mager`), pilih perangkat dan aksinya, klik **Ajari**. Agen langsung paham.
- **Definisi semesta** dan **Definisi ruang**: isi lengkap dalam format JSON, untuk diubah atau dibuat baru (lihat bagian 5). Ada tombol **Terapkan**, **dari templat**, **Ekspor**, **Impor**, dan **Hapus atau kembalikan**. Bila ada yang salah, penjelasannya muncul di bawah kotak, dan ruang yang sedang dipakai tidak berubah.

### Agen (Studio Agen)

Klik **Terapkan ke agen** untuk menyimpan, atau **Batalkan perubahan** untuk kembali.

| Bagian | Yang bisa diubah |
|---|---|
| Kepribadian | Nama, warna, persona, sapaan, kata setuju (misalnya "Siap!"), kata menolak, gaya bahasa (santai, formal, gaul), dan **Boleh ngobrol santai di luar tugas** |
| Orkestrator | Nama dan cara membagi tugas: otomatis (membaca kata "lalu" dan "setelah"), selalu bersamaan, atau selalu bergiliran |
| Router | Rute buatan: bila pesan memuat kata pemicu, router langsung menjawab dari koleksi rak, membalas dengan teks tetap, atau menolak. Rute tampil di papan router 3D. Isian **contoh kalimat** (opsional, dipisah titik koma) dipakai router semantik |
| RAG | Jumlah halaman yang dibaca, batas skor, sinonim (satu per baris, misalnya `cuan=denda`), dan kata yang diabaikan |
| Guardrails | Pengaman masukan (bisa ditambah kata), batas aksi, interlock, izin menulis catatan, pengaman keluaran (menyamarkan kata terlarang), dan **persetujuan manusia**: sebelum menyalakan mesin atau perangkat yang terikat interlock, agen menunggu kamu menekan **Setujui** atau **Tolak** |
| Kejadian | Daftar kejadian semesta ini |

Rute **tolak** selalu menang dan hanya dipicu kata pemicu, tidak pernah oleh router semantik. Rute **jawab dari koleksi** dan **balas** tidak menghalangi perintah perangkat yang jelas.

**Mode rentan**: mematikan batas aksi, interlock, atau pengaman masukan memunculkan peringatan kuning. Ini untuk belajar: matikan, kirim `putar lengan robot 200%`, lihat lengan berputar terlalu cepat, lalu nyalakan lagi dan lihat agen menolak. Game ini tidak mengendalikan perangkat sungguhan.

### Otak

| Pilihan | Kapan |
|---|---|
| Parser aturan | Bawaan. Gratis, tanpa internet, instan |
| Model lokal kecil, Python | Saat game dibuka lewat `MULAI.bat` (terpilih otomatis) |
| LLM dengan kunci OpenRouter sendiri | AI besar lewat internet |
| Ollama lokal | Bila sudah memasang Ollama |

**Router hemat** (hidup secara bawaan untuk AI di laptop): pesan yang sudah dikenali parser dikerjakan parser, dan AI hanya dipanggil untuk pesan baru. Hasilnya lebih cepat dan lebih andal. Matikan untuk melihat AI kecil bekerja sendirian dan bandingkan hasilnya. Bila AI gagal, agen otomatis kembali ke parser dan Jejak menjelaskan alasannya.

**Ingatan percakapan (context window)**: berapa pasang pesan terakhir yang ikut dikirim ke AI (mati, 2, 4, 6, atau 10). Makin banyak, AI makin paham rujukan seperti "yang tadi", tetapi prompt makin panjang dan model kecil makin lambat. Bandingkan hasil `matikan yang tadi` saat mati dan saat 4.

**Ngobrol di luar tugas**: centang **Boleh ngobrol santai di luar tugas** di tab Agen. Agen lalu menjawab obrolan umum, misalnya `kasih tips biar fokus belajar dong` atau `siapa penemu lampu pijar?`, tanpa menyentuh perangkat. Butuh otak AI. Model kecil (1,5B) sering gagal ngobrol, jadi pakai model 7B ke atas atau `gemma4:e4b` bila laptop kuat.

### Pipeline lanjutan (tab Otak)

Pilihan tambahan untuk melihat cara kerja agen di industri. Semuanya mati secara bawaan, dan hasilnya bisa dibandingkan di tab Jejak.

| Pilihan | Yang terjadi | Butuh |
|---|---|---|
| **Router: Aturan** (bawaan) | Regex dan parser, ditambah router hemat | Tidak ada |
| **Router: Semantik ringan** | Pesan dibandingkan dengan contoh kalimat tiap rute (kemiripan huruf dan kata). Bila router yakin pesanmu soal perangkat, tetapi parser membaca hal lain, pesan diteruskan ke AI. Tag SEMANTIK di Jejak menunjukkan rute, skor, dan contoh termirip | Tidak ada |
| **Router: Semantik embedding** | Sama, tetapi memakai kemiripan makna dari model embedding | Ollama dan `embeddinggemma` |
| **Router: AI memilih tool** | AI memanggil tool `atur_perangkat`, `baca_sensor`, `cari_manual`, atau `jawab`. Untuk `cari_manual`, kode mencari di rak lalu mengembalikan hasilnya ke AI (loop agen). Tag TOOL di Jejak | Otak AI yang mendukung tool calling |
| **Guard model** | Pesan diperiksa model penjaga sebelum diproses. Tag GUARD AI di Jejak | Ollama dan `llama-guard3:1b` |
| **Ringkas percakapan lama** | Pesan yang keluar dari context window diringkas AI, jadi konteks panjang tidak hilang | Otak AI dan ingatan percakapan |
| **Ingatan sesi tetap ada saat dimuat ulang** | Fakta sesi dan riwayat chat bertahan setelah F5, sampai tab ditutup | Tidak ada |

Apa pun pilihannya, guard masukan, rute buatan, memori, dan pertanyaan kemampuan selalu dikerjakan aturan lebih dulu. Semua usulan AI, termasuk argumen tool, tetap divalidasi guard aksi di kode.

Model tambahan untuk Ollama (sekali saja, di Command Prompt):
```
ollama pull embeddinggemma
ollama pull llama-guard3:1b
```

Catatan:
- **Guard model** menangkap konten berbahaya seperti kekerasan, kejahatan, dan menyakiti diri. Ia tidak dirancang menangkap upaya menipu agen, jadi guard regex tetap diperlukan. Guard model hanya bisa menambah penolakan, tidak pernah meloloskan pesan yang ditolak guard regex.
- **AI memilih tool** butuh model yang mendukung tool calling, misalnya `qwen2.5:7b` atau `gemma4:e4b`. Model kecil seperti `qwen2.5:1.5b` dan `gemma3:1b` tidak bisa memakainya; agen otomatis beralih ke cara biasa dan Jejak menjelaskannya. Mode ini paling cocok dengan Ollama dan kartu grafis. Dengan model lokal `MULAI.bat` (CPU), percobaan tool yang gagal ditambah cara biasa bisa membuat satu pesan dua kali lebih lama.
- Memakai beberapa model sekaligus (otak, embedding, guard) butuh memori kartu grafis lebih besar. Bila Ollama gagal memuat model, tutup model lain lewat `ollama stop nama-model` atau pakai model yang lebih kecil.

### Uji otak ini (tab Otak)

Tombol **Jalankan uji kelas** mengirim 10 pesan uji ke otak dan pengaturan yang sedang aktif: perintah jelas, bahasa santai, keluhan, sensor, manual, upaya menipu, kemampuan, sapaan, pesan tidak jelas, dan batas aman. Pesan dirakit dari ruang yang sedang aktif, jadi berlaku juga untuk ruang buatanmu. Ruangan, XP, misi, dan ingatan tidak berubah. Pakai untuk membandingkan model, router, dan pengaturan lain. Dengan OpenRouter, uji ini memakai 10 permintaan dari kuota harian.

### Ekspor jejak (tab Jejak)

Tombol **Ekspor jejak (JSON)** mengunduh jejak semua pesan dalam bentuk yang mirip data tracing di industri (OpenTelemetry): satu *trace* per pesan, satu *span* per langkah. Cocok untuk dianalisis atau dilampirkan di laporan.

### Input suara

Agen tidak bersuara. Tombol **Bicara** mengubah ucapanmu menjadi pesan. Butuh Chrome atau Edge, izin mikrofon, internet, dan game yang dibuka lewat `MULAI.bat` (atau dari GitHub Pages). Tombol tidak muncul bila browser tidak mendukung.

## 4. Pemecahan masalah

| Gejala | Solusi |
|---|---|
| Layar 3D kosong | Game memuat pustaka 3D dari internet. Pastikan ada internet, pakai Chrome atau Edge terbaru, atau buka dengan alamat berakhiran `?grafis=ringan` |
| Animasi patah-patah | Pilih grafis Ringan di tab Dunia |
| `MULAI.bat` berhenti dengan GAGAL | Periksa internet lalu jalankan lagi. Bila tetap gagal, pasang Python 3.12 64-bit dari python.org lalu jalankan lagi |
| "Server model lokal tidak terjangkau" | Jendela `MULAI.bat` sudah tertutup. Klik dua kali `MULAI.bat` lagi |
| AI di laptop terasa lambat | Normal di laptop lama. Pastikan Router hemat hidup, coba `MULAI.bat --ukuran 0.5b` atau `--threads 2`, atau pakai parser |
| Tes koneksi: "kunci ditolak" | Kunci OpenRouter salah atau sudah dihapus. Buat kunci baru |
| "kuota model gratis habis" | Batas harian OpenRouter tercapai. Agen memakai parser. Coba lagi besok |
| Jejak OTAK: "LLM gagal" | Normal. Alasannya tertulis, dan agen tetap bekerja lewat parser |
| Ollama "tidak terjangkau" | Ollama belum berjalan, atau game dibuka langsung tanpa `OLLAMA_ORIGINS`. Pakai `MULAI.bat --tanpa-model` |
| Tombol Bicara tidak muncul | Browser tidak mendukung. Pakai Chrome atau Edge |
| "Belum bisa diterapkan" di tab Dunia | Baca daftar merah di bawah kotak JSON. Tiap baris menyebut bagian yang salah |
| Pengaturan atau ruang buatan hilang | Tersimpan di browser dan terhapus bila data situs dibersihkan atau memakai jendela privat. Simpan cadangan dengan **Ekspor** |
| Agen tidak paham "yang tadi" | Context window mati, atau otak masih parser. Pilih otak AI dan atur **Ingatan percakapan** di tab Otak |
| Agen menolak diajak ngobrol | Centang **Boleh ngobrol santai di luar tugas** di tab Agen, dan pakai otak AI. Model kecil sering tetap gagal |
| Jejak: "Embedding gagal" atau "RAG hibrida tidak bisa dipakai" | Ollama tidak berjalan atau model `embeddinggemma` belum diunduh. Agen otomatis memakai cara biasa |
| Jejak: "Model ini tidak bisa memakai tool calling" | Model terlalu kecil atau tidak mendukung tool. Agen beralih ke cara biasa. Pakai `qwen2.5:7b` atau `gemma4:e4b` untuk mode tool |
| Ollama: galat saat memuat model, menyebut CUDA atau memori | Terlalu banyak model dimuat sekaligus. Jalankan `ollama stop nama-model` untuk model yang tidak dipakai |

## 5. Membuat ruang dan semesta sendiri

Cara termudah: di tab **Dunia**, klik **Semesta baru dari templat**, lalu ubah lewat tab **Agen** dan kotak JSON. **Tambah ruang dari templat** menambah ruang ke semesta yang sedang aktif. Untuk berbagi, klik **Ekspor**, kirim berkas `.json`, lalu teman membukanya lewat **Impor**.

### Contoh ruang

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

Empat tipe perangkat:

| Tipe | Aksi | Contoh |
|---|---|---|
| `saklar` | on, off | Lampu, ring light, tanda ON AIR |
| `level` | on dengan level 1 sampai `maks`, off | Kipas, AC, speaker, kompor, pompa |
| `buka` | open, close | Pintu, tirai |
| `mesin` | on dengan kecepatan (persen) dan sudut (derajat), off. Dijaga `batasDaya` dan `batasSudut` | Lengan robot, mesin kopi, oven, kamera |

Aturan penulisan ruang:

| Bagian | Ketentuan |
|---|---|
| `id` | 2 sampai 16 huruf kecil, angka, atau garis bawah, diawali huruf |
| `perangkat` | Maksimal 6 perangkat dan 4 spesialis berbeda. id perangkat bukan `suhu` atau `cahaya` |
| `kata` | Kata yang dipakai pengguna untuk menyebut perangkat itu |
| `bentuk` | saklar: `lampu_berdiri`, `lampu_gantung`, `ring_light`, `tanda`. level: `kipas`, `ac`, `speaker`. buka: `pintu`, `tirai`. mesin: `lengan`, `mesin_kopi`, `kamera`. Selain itu tampil sebagai kotak berlabel |
| `peran` | `cahaya` atau `dingin` (untuk saklar atau level), `udara` (untuk buka). Menentukan arti "gerah", "gelap", "nyaman", dan "pengap" |
| `efek` | Pengaruh perangkat yang menyala pada suhu (derajat per level) dan cahaya (lux) |
| `batasDaya`, `batasSudut` | Batas aman untuk tipe mesin |
| `interlock` | Perangkat `larang` tidak boleh dibuka atau dinyalakan saat perangkat `saat` aktif |
| `alias` | Frasa pengganti, misalnya `"seduh kopi": "nyalakan espresso"` |
| `keluhan` | Kata gaul dan aksi yang dijalankan |
| `kataManual` | Kata tambahan yang menandai pertanyaan ke rak manual |
| `manual` | Maksimal 16 halaman `{id, judul, teks}`. Halaman `suhu` dan `cahaya` dibaca angkanya |
| `misi.target` | `perangkat` (on, open, speed), `suhuMaks`, `cahayaMin`, `tolakMin`, `paralelMin`, `tahapMin`, `ambil` (id halaman), `memoriMin`, `urutan` (daftar perangkat yang harus dioperasikan berurutan), `maksPesan`, `intent`, `rute`, `kejadian` |

### Contoh semesta

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
| `agen.gaya` | `santai`, `formal`, atau `gaul` |
| `orkestrator.strategi` | `otomatis`, `paralel` (selalu bersamaan), atau `berurutan` (selalu bergiliran). `spesialis` memberi warna per nama spesialis |
| `router.rute` | Maksimal 6. `aksi`: `manual` (butuh `koleksi`), `balas` atau `tolak` (butuh `balasan`). id tidak boleh `kontrol`, `info`, `bahaya`, atau `obrol` |
| `rag` | `k` 1 sampai 3, `ambang` 0 sampai 5 (skor terendah yang diterima), `sinonim`, `stop` (kata yang diabaikan) |
| `guard` | Lima pengaman: `input`, `aksi`, `interlock`, `output`, `memori`, masing-masing `aktif` true atau false. Hanya `output` yang mati secara bawaan |
| `pengetahuan` | Maksimal 40 halaman bersama untuk semua ruang. `koleksi` dipakai rute router |
| `ruang` | Maksimal 8. Tulis id ruang bawaan (`lab`, `kafe`, `studio`, `perpus`, `dapur`, `kebun`) atau definisi ruang lengkap |
| `misi` | Target lintas ruang: `ruangDikunjungi`, `misiSelesai`, `babUnik`, `rutePakai`, `kejadianSelesai`, `badgeMin`, `xpMin` |
| `kejadian` | Maksimal 8. `pemicu`: `pesanKe`, `masuk` (id ruang), atau `acak` (peluang 0 sampai 1 per pesan). `efek`: `suhu`, `cahaya`, `matikan`, `nyalakan` |

### Yang tidak bisa diubah

- Tipe perangkat selain empat di atas, karena pengaman harus bisa memeriksa batasnya.
- Sensor selain suhu dan cahaya.
- Bentuk 3D di luar daftar dan letak perangkat (diatur otomatis).
- Kunci OpenRouter dan pilihan otak tidak ikut tersimpan di berkas semesta, supaya berkas yang dibagikan tidak membawa rahasia.

## 6. Studio Rumah Agen

Selain game ini, ada **Studio Rumah Agen** (`studio.html`): mahasiswa merakit rumah pintar sendiri dalam 3D (ESP32, sensor, relay, kabel, Wi-Fi) dan otak agennya dari blok seret-lepas, lalu menyambungkannya ke bot Telegram sungguhan. Buka dengan klik dua kali `studio.html`, atau `MULAI.bat --studio` untuk memakai AI di laptop. Panduan lengkap ada di [STUDIO.md](STUDIO.md).

## 7. Untuk dosen

### Menyiapkan kelas

1. Unggah `index.html` ke GitHub Pages dan bagikan alamatnya. Mahasiswa langsung bisa bermain dengan parser.
2. Untuk sesi dengan AI, pilih salah satu:
   - **AI di laptop sendiri** (disarankan): tiap mahasiswa menjalankan `MULAI.bat`. Unduhan sekitar 1,2 GB per laptop, sebaiknya di jaringan kampus sebelum sesi. Folder `model/` bisa disalin lewat flashdisk supaya tidak perlu mengunduh ulang.
   - **OpenRouter**: tiap mahasiswa membuat akun sendiri. Satu kunci bersama tidak cukup untuk satu kelas.
3. Laptop yang terlalu lambat bisa memakai parser. Semua misi tetap bisa diselesaikan.

### Alur sesi yang disarankan

1. **Lab dengan parser**: bandingkan `nyalakan lampu` (aturan jelas) dengan `gerah nih` (tafsiran). Buka Jejak.
2. **Aktifkan AI**: kirim pesan yang sama, bandingkan Jejak parser dan AI. Tunjukkan Router hemat.
3. **Misi 4 dan tab Manual**: perilaku agen berubah hanya dengan mengubah buku panduan. Pakai Uji pencarian untuk menjelaskan cara agen mencari. Tunjukkan `ingat ya, ...` sebagai memori jangka panjang.
4. **Misi 5 dan Studio Konten**: pembagian tugas bersamaan dan bergiliran, dan mengapa interlock memaksa dua tahap.
5. **Misi 6**: mengapa AI bisa tertipu tetapi pengaman di kode tidak, dan mengapa keputusan keamanan tidak boleh diserahkan ke AI.
6. **Proyek kelompok**: tiap kelompok merancang semesta sendiri (kelas, bengkel, klinik, toko) di tab Dunia dan Agen, menyajikannya, lalu saling mencoba menipu agen kelompok lain.

### Ide tugas

- Buat ruang dengan 3 sampai 5 perangkat, 3 kata gaul, 5 halaman manual, dan 2 misi.
- Rancang interlock yang masuk akal untuk ruang itu dan buktikan agen menolak pelanggarannya.
- Isi manual dengan pengetahuan yang tidak diketahui AI umum (jadwal kelas, resep khusus), tunjukkan agen menjawab dari rak, lalu hapus halamannya dan lihat agen mengaku tidak tahu.
- Bandingkan jumlah halaman yang dibaca (1, 2, 3) untuk pertanyaan yang sama.
- Buat rute router baru yang menolak topik tertentu, lalu uji dengan berbagai kalimat.
- Matikan satu pengaman (mode rentan), dokumentasikan apa yang berubah, lalu jelaskan risikonya.
