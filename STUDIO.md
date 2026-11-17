# Studio Rumah Agen

Rakit rumah pintarmu sendiri dalam 3D (ruang, kebun, kandang ayam, ESP32, sensor, relay, kabel, Wi-Fi), lalu rakit otak agennya dengan menyeret blok: pemicu, guard, router, orkestrator, agen, rak pengetahuan, memori, dan alat. Agen yang sama bisa kamu ajak bicara di chat atau lewat bot Telegram sungguhan dari HP.

## 1. Membuka studio

| Cara | Langkah | Bisa memakai |
|---|---|---|
| Paling cepat | Klik dua kali `studio.html` | Parser, OpenRouter, Telegram |
| Dengan AI di laptop | Klik dua kali `MULAI.bat`, lalu di menu penyiapan pilih otak AI, model, dan **Studio Rumah Agen**. Browser terbuka di `http://127.0.0.1:8000/studio.html` | Semua, termasuk Ollama dan model lokal |

Ollama hanya mau dipanggil dari alamat `http://127.0.0.1` atau `http://localhost`, jadi untuk Ollama buka studio lewat `MULAI.bat`.

Saat pertama kali, `MULAI.bat` membuka **menu penyiapan** di jendela hitam:
1. Menu menampilkan isi laptopmu: jumlah inti CPU, RAM, kartu grafis NVIDIA (bila ada), dan apakah Ollama sudah terpasang.
2. Pilih otak AI. Menu memberi saran sesuai laptopmu, tetapi pilihannya bebas:

   | Pilihan | Unduhan | Cocok untuk |
   |---|---|---|
   | 1. Tanpa AI (parser) | Tidak ada model | Laptop apa pun |
   | 2. Model lokal kecil 0,5B | Sekitar 0,5 GB | RAM 4 GB, jawaban sederhana |
   | 3. Model lokal sedang 1,5B | Sekitar 1 GB | RAM 8 GB ke atas, tanpa kartu grafis |
   | 4. Ollama | Sesuai model yang dipilih | Laptop dengan Ollama, paling cepat bila ada kartu grafis NVIDIA |

3. Bila memilih Ollama, menu menampilkan daftar model beserta ukuran dan syaratnya (`qwen2.5:1.5b`, `qwen2.5:3b`, `qwen2.5:7b`, `gemma4:e4b`, ditambah `embeddinggemma` dan `llama-guard3:1b`). Model yang terlalu berat untuk laptopmu ditandai. Ketik nomornya (boleh beberapa, dipisah koma), lalu menu mengunduhnya lewat `ollama pull`. Bila Ollama belum terpasang, menu menawarkan membuka halaman unduhannya.
4. Pilih aplikasi yang dibuka: **Studio Rumah Agen** atau **Ruang Agen**.

Pilihan disimpan, jadi berikutnya `MULAI.bat` langsung jalan. Untuk mengubah pilihan, jalankan `MULAI.bat --pilih`. Tanpa model lokal, hanya paket server kecil yang dipasang.

Saat pertama dibuka, studio memeriksa laptopmu (jumlah inti CPU, RAM, kartu grafis), mencari Ollama dan server model lokal, lalu menyarankan otak yang cocok. Pilihannya tetap bebas:

| Otak | Cocok untuk |
|---|---|
| Tanpa AI (parser) | Laptop apa pun, tanpa internet |
| Ollama | Laptop dengan kartu grafis. Untuk agen yang memakai alat, pilih `qwen2.5:7b` atau `gemma4:e4b` |
| Model lokal Python | Laptop tanpa Ollama, lewat `MULAI.bat` |
| OpenRouter | Model besar lewat internet, kunci gratis milikmu sendiri |

Kamu juga memilih titik awal: **Lahan kosong** (ikuti misi dari ESP pertama) atau **Rumah, kebun, dan kandang** (rumah siap pakai untuk dijelajahi). Pilihan model bisa diubah kapan saja di tab **Model**, dan wizard bisa dibuka lagi lewat tombol **Pilih model** (pilihan bawaannya mempertahankan rumah dan papanmu). Setiap kali preset menimpa rumah atau papan, chat menampilkan tombol **Kembalikan yang tadi**.

## 2. Tiga mode

| Mode | Untuk apa |
|---|---|
| **Bangun** | Merakit dunia fisik: area, perangkat, kabel, daya, Wi-Fi |
| **Otak** | Merakit papan otak agen dari blok |
| **Main** | Menjalankan simulasi dan mengobrol dengan agen |

Jam simulasi tampil di atas. Tombol **II, 1x, 10x, 60x** menjeda atau mempercepat waktu (60x berarti satu jam simulasi per menit). Siang dan malam, cuaca, tanah yang mengering, pakan yang berkurang, dan suhu kandang semuanya bergerak mengikuti jam ini.

## 3. Mode Bangun: merakit rumah

Tampilan bisa diatur:
- **Lebar palet kiri dan panel kanan:** seret garis pembatasnya. Klik dua kali garis pembatas untuk menyembunyikan atau memunculkan panelnya.
- **Label perangkat:** tombol **Label** berganti antara semua, hanya yang dipilih, dan mati.
- **Kartu petunjuk misi:** klik kartunya untuk menciutkan.
- **Malam:** dunia tetap terlihat dengan cahaya bulan, dan lampu yang menyala tampak lebih terang.

- **Menaruh:** seret item dari palet kiri ke lahan. Bisa juga klik item lalu klik lahan (cocok untuk layar sentuh).
- **Memilih:** klik perangkat untuk membuka **Inspektur**. Klik dua kali lantai sebuah area untuk mengubah nama, posisi, atau ukurannya.
- **Memindah:** seret perangkat yang sudah dipilih.
- **Kamera:** seret lahan kosong untuk memutar, klik kanan atau Shift sambil menyeret untuk menggeser, roda mouse untuk zoom.

**Katalog:**

| Kelompok | Isi |
|---|---|
| Area | Kamar, ruang tamu, dapur, gudang (berdinding), kebun, kandang ayam |
| Papan | ESP32 (pin digital dan analog), ESP8266 (hanya satu pin analog A0) |
| Sensor | DHT22 (suhu dan kelembapan), kelembapan tanah, cahaya LDR, gerak PIR, gas MQ-2, ultrasonik (tinggi air tandon), timbangan pakan, sensor pintu, sensor arus listrik |
| Aktuator | Kipas, lampu, lampu pemanas kandang, pompa air, katup isi tandon, exhaust, servo pemberi pakan, buzzer, kunci pintu |
| Modul | Relay 1 dan 4 kanal, tandon air |
| Daya | Adaptor 5 V, baterai, panel surya dengan baterai |
| Jaringan | Router Wi-Fi, repeater |

**Aturan rangkaian.** Inspektur menjelaskan setiap kesalahan:
- **Daya:** ESP butuh sumber daya. Adaptor mati saat listrik padam; baterai dan panel surya tetap menyala.
- **Pin analog:** sensor analog (tanah, cahaya, gas, arus) harus di pin analog. Bila salah pin, bacaannya `NaN`.
- **Pin input-saja:** di ESP32, pin 34 sampai 39 hanya bisa input, jadi tidak bisa menggerakkan relay.
- **Relay:** beban besar (kipas, lampu 220 V, pompa, pemanas, katup, kunci) wajib lewat relay, karena pin ESP hanya kuat 40 mA.
- **Bentrok:** satu pin atau satu kanal relay tidak boleh dipakai dua perangkat.
- **Sambung otomatis:** memilih ESP, pin, atau relay terdekat yang cocok.

**Wi-Fi.** Lingkaran biru di sekitar router menunjukkan jangkauan. Sinyal melemah oleh jarak dan sekitar 6 dB per dinding yang ditembus. ESP yang terlalu jauh menjadi offline, ditandai lampu kecil berwarna:

| Warna lampu | Arti |
|---|---|
| Hijau | Online |
| Jingga | Menyala tetapi offline |
| Merah | Tidak ada daya |

Repeater memperluas jangkauan bila ia sendiri masih terjangkau router.

## 4. Mode Otak: merakit agen

Seret blok dari palet ke papan. Tarik kabel dari titik **keluar** (kanan blok) ke titik **masuk** (kiri blok). Kabel hanya bisa tersambung bila tipenya cocok. Bila salah, studio menjelaskan alasannya. Klik kabel lalu **Hapus kabel** untuk melepasnya. Roda mouse untuk zoom, seret papan kosong untuk menggeser.

| Kelompok | Blok |
|---|---|
| Pemicu | Chat, Telegram, Jadwal (jam tertentu), Pemicu Sensor (saat nilai melewati ambang) |
| Proses | Guard Masukan (regex, bisa ditambah guard model Llama Guard), Penyamar Data Pribadi, Router (kata kunci atau semantik), Aturan JIKA-MAKA (tanpa AI) |
| Otak | Agen (persona, model khusus, router hemat, batas langkah), Orkestrator (membagi tugas ke beberapa agen) |
| Pendukung otak | Rak Pengetahuan (RAG), Memori (context window), Guard Aksi (batas aman dan persetujuan manusia) |
| Alat | Sensor, Aktuator, Kalender, Kalkulator, Cuaca (simulasi atau Open-Meteo nyata), Logger, Kirim Telegram, Jam, Penjadwal |
| Keluaran | Balas, Kirim ke Telegram, Log |

| Warna kabel | Tipe |
|---|---|
| Hitam | Pesan |
| Biru muda | Alat |
| Kuning | Pengetahuan |
| Ungu | Memori |
| Merah | Pengaman |
| Hijau tua | Tugas dari orkestrator ke agen pekerja |

Setiap blok punya kartu konsep di Inspektur. **Saran** di pojok kanan atas papan memberi tahu bila ada yang kurang, misalnya agen tanpa alat, aktuator tanpa Guard Aksi (mode rentan), atau Telegram tanpa Guard Masukan. **Papan siap pakai** di palet: Chatbot pertama, Agen rumah lengkap, dan Multi-agen (Agen Rumah, Agen Kebun, Agen Kandang).

**Alat berlingkup.** Alat Sensor dan Alat Aktuator punya lingkup wilayah: semua area, semua ruang di dalam rumah, atau satu area. Agen kebun tidak bisa menyalakan kipas kandang, sehingga tugas terbagi jelas.

**Yang dijaga kode, bukan AI:**

| Penjaga | Isi |
|---|---|
| Guard Aksi | Level di luar batas ditolak. Pemanas dilarang di atas 33 C. Pompa dilarang saat tandon hampir kosong. Kipas dan pemanas tidak boleh menyala bersamaan di area yang sama |
| Persetujuan manusia | Aksi berisiko (pemanas, kunci pintu) menunggu tombol **Setujui**. Untuk pesan dari Telegram, pengirim diberi tahu dan persetujuan kedaluwarsa setelah 75 detik (dianggap ditolak) |
| Klaim tanpa aksi | Bila AI mengaku sudah menyalakan sesuatu padahal tidak memanggil alat, jawabannya diberi catatan "tidak ada perangkat yang benar-benar diubah" |
| Batas eksekusi | Maksimal 30 langkah dan 8 panggilan AI per pesan. Pesan diproses satu per satu |
| Aturan JIKA-MAKA | Batas aman Guard Aksi juga berlaku untuk aturan buatanmu, misalnya aturan tidak bisa menyalakan pemanas di kandang yang sudah panas |

**Router hemat** (centang di blok Agen): perintah dan pertanyaan yang jelas dikerjakan parser tanpa AI, sehingga lebih cepat dan andal. Matikan untuk melihat AI bekerja sendiri.

## 5. Mode Main dan tab-tab

| Tab | Isi |
|---|---|
| Chat | Mengobrol dengan agen. Titik tiga muncul saat AI berpikir |
| Inspektur | Isi perangkat, area, blok, atau kabel yang dipilih |
| Dashboard | Kondisi tiap area, status ESP (daya, sinyal), grafik sensor 24 jam, log, kalender (bisa diunduh sebagai `.ics`), pengingat |
| Jejak | Langkah demi langkah: blok yang dilewati, alat yang dipanggil AI, guard yang menolak. Blok dan kabel di papan menyala saat dilewati. Bisa diekspor sebagai JSON |
| Misi | 12 misi berurutan dari ESP pertama sampai laporan pagi otomatis, masing-masing dengan kartu konsep dan petunjuk |
| Telegram | Bot sungguhan (bagian 6) |
| Lab | Uji kekacauan (Wi-Fi putus, listrik padam, sensor rusak, cuaca) dan lab serangan (injeksi, menyamar teknisi, data pribadi, melampaui batas, konten berbahaya), lewat chat atau lewat Telegram palsu |
| Kode | Uji agen (pesan uji dirakit dari rumahmu, dijalankan di salinan simulasi), kerangka Python agen |
| Model | Otak utama. Setiap blok Agen juga bisa memakai model khusus |

**Proyek** (tombol di atas): ganti rumah dengan preset, ekspor proyek (rumah dan papan otak) ke berkas JSON, atau impor proyek teman. Token Telegram dan kunci API tidak pernah ikut diekspor.

## 6. Bot Telegram sungguhan

1. Di Telegram, cari **@BotFather**, kirim `/newbot`, ikuti langkahnya, lalu salin tokennya (bentuknya `123456789:ABC...`).
2. Di studio, buka tab **Telegram**, tempel token, klik **Hubungkan dan dengarkan**.
3. Kirim pesan ke bot-mu dari HP. Pesan pertama dari setiap chat menunggu izinmu di tab Telegram. Klik **Izinkan**.
4. Agen menjawab di Telegram. Blok **Kirim ke Telegram** dan alat **Kirim Telegram** mengirim notifikasi ke chat pemilik (chat pertama yang diizinkan), misalnya laporan pagi dari blok Jadwal atau peringatan dari Pemicu Sensor.

Catatan:
- Halaman studio harus tetap terbuka supaya bot menjawab.
- Satu token hanya boleh dipakai di satu tempat. Bila muncul status "bentrok (409)", tutup tab atau laptop lain yang memakai token yang sama, atau klik **Hapus webhook**.
- Bila papan otak punya blok **Telegram**, pesan Telegram masuk lewat blok itu. Bila tidak ada, pesan masuk lewat jalur Chat.
- **Keamanan:**
  - Jangan bagikan token. Siapa pun yang memegangnya bisa mengendalikan bot.
  - Token hanya disimpan di browser ini dan disamarkan di Jejak dan ekspor.
  - Pesan dari orang asing tidak dipercaya, jadi pasang **Guard Masukan** di jalur Telegram.
  - Gunakan tombol **Lupakan token** setelah selesai.

## 7. Dari blok ke kode

ESP, sensor, dan perangkat di studio murni simulasi. Yang bisa dibawa keluar adalah otak agennya: tab **Kode** menulis ulang papan otakmu sebagai **kerangka Python** (guard masukan, alat, dan loop pemanggilan alat ke Ollama), supaya kamu bisa membandingkan blok dengan kodenya. Kerangka ini titik awal belajar dan belum diuji otomatis.

## 8. Pemecahan masalah

| Gejala | Solusi |
|---|---|
| Sensor "tidak terbaca" | Lihat Inspektur sensor: belum tersambung, ESP tanpa daya, ESP offline, atau salah pin |
| ESP offline | Terlalu jauh dari router atau terhalang dinding. Pindahkan router atau tambah repeater |
| Kipas tidak bisa disambung ke ESP | Wajib lewat relay. Taruh modul relay, sambungkan ke ESP, lalu sambungkan kipas ke relay |
| Kabel tidak mau tersambung | Tipe port berbeda. Baca pesan merah di atas papan |
| Agen bilang "belum punya alat" | Sambungkan Alat Sensor atau Alat Aktuator ke port **alat** pada blok Agen |
| Agen menolak menyalakan pemanas | Guard Aksi bekerja: kandang sudah panas, atau kipas menyala di area yang sama |
| Ollama tidak terjangkau | Buka studio lewat `MULAI.bat --tanpa-model --studio`, bukan dengan klik dua kali |
| AI menjawab tanpa menyalakan apa pun | Model kecil sering tidak bisa memakai alat. Pakai `qwen2.5:7b` atau `gemma4:e4b`, atau biarkan router hemat menyala |
| Telegram "bentrok (409)" | Token dipakai di tempat lain. Tutup yang lain atau klik **Hapus webhook** |
| Animasi patah-patah | Jeda simulasi atau kurangi jumlah perangkat (maksimal 48). Laptop lemah otomatis memakai grafis ringan |
