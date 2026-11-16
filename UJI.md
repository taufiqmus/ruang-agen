# Laporan pengujian Ruang Agen

Tanggal uji: 16 sampai 17 November 2026. Lingkungan: Windows 11, Node 24.18.1, Chrome (Playwright 1.49 dengan Chrome terpasang, software rendering untuk WebGL), Python 3.12 dengan llama-cpp-python 0.3.36 (CPU), CPU i5-12400F (6 inti). Ollama pernah diuji lalu dihapus dari mesin uji.

## 1. Uji otomatis tanpa jaringan

Dijalankan sebelum dan sesudah setiap perubahan. Semua lulus.

| Berkas | Cek | Cakupan |
|---|---|---|
| `test_brain.js` | 23 | Parser bahasa Indonesia di ruang Lab, router intent, batas guard, interlock, input guard, urutan "setelah" |
| `test_manual.js` | 40 | Retrieval TF-IDF, sinonim, angka dari teks manual, "nyaman" mengikuti manual (fisika ruang), pertanyaan SOP, pembagian tugas paralel dan berurutan |
| `test_dunia.js` | 60 | Semua ruang bawaan dan templat lolos pemeriksa. Kafe (kata gaul, alias, resep dari rak, batas daya, volume), Studio (alias "go live", interlock ON AIR, urutan aman, batas gimbal), prompt lengkap dan ringkas dirakit dari ruang aktif, memori ("ingat"), catatan mengalahkan bab suhu, injeksi lewat memori ditolak, `jelaskan` dan top-k, 12 jenis galat definisi ruang, ruang buatan dipakai otak (kata gaul dan interlock baru), fisika menuju nilai stabil dan stabil untuk langkah waktu besar, misi deklaratif |
| `test_llm.js` | 49 | OpenRouter, model lokal Python, dan Ollama dengan fetch tiruan: fallback (429, jaringan, timeout, JSON rusak), skema, guard menolak usulan LLM, RAG masuk prompt, manual berisi injeksi dibuang, prompt ringkas, grammar skema, router hemat |

## 2. Uji alur browser (jaringan ditiru)

`test_browser.js`: 62 cek, semua lulus. Playwright dengan Chrome, three.js dari salinan lokal, OpenRouter, server lokal, dan Ollama ditiru lewat route. Dijalankan dengan `?grafis=ringan`.

Cakupan: halaman termuat tanpa galat JS, enam tab, spesialis tiap ruang. Lab: misi 4 (ubah manual lewat UI), misi 5, misi 6, LLM tiruan yang tertipu ditolak guard. **Dunia**: pindah ke Kafe (spesialis, misi, dan contoh berganti), misi deklaratif Kafe 1, 3, 4 (guard menolak 90% lalu 60% jalan, resep dari rak, memori), badge, catatan lewat chat bertag CATAT dan bisa ditanyakan lagi, uji pencarian menampilkan skor, catatan berpola injeksi ditolak, ajari kata gaul langsung dipakai, ruang bawaan bisa dikembalikan, definisi salah dan JSON rusak memberi pesan ramah tanpa mengganti ruang aktif, ruang baru dari templat, ruang buatan disunting lewat JSON (perangkat, interlock, misi baru) lalu dimainkan sampai selesai, ruang buatan bertahan setelah halaman dimuat ulang, Studio misi 2 dan 4 (keadaan awal dari data, dua tahap), grafis realistis dan ringan bisa dipilih tanpa galat, layar 390 px tanpa scroll horizontal.

## 3. Simulasi sumber daya komputasi rendah

`test_resource_rendah.js`: semua lulus. Chrome dengan CPU diperlambat 6x lewat CDP, `hardwareConcurrency` dilaporkan 2, `deviceMemory` 2 GB.

| Skenario | Hasil |
|---|---|
| Perangkat 2 inti, RAM 2 GB, CPU 6x lebih lambat, mode Otomatis | Grafis otomatis ringan sejak awal. Halaman siap 1,0 detik. Misi 1 selesai, pindah ke Kafe, seduh kopi, dan RAG jalan. Memori JS 15 MB. Tanpa galat JS |
| Perangkat kuat dipaksa mulai realistis, lalu CPU 6x lebih lambat | Penjaga kinerja menurunkan ke ringan, pemain diberi tahu lewat chat, permainan tetap jalan |
| `?grafis=ringan` | Pilihan manual dihormati |

Catatan: pengukuran laju frame di headless dengan software rendering tidak mewakili GPU sungguhan, jadi angka fps hanya indikatif. Simulasi CPU tidak meniru memori fisik terbatas.

Model lokal dengan 2 thread (simulasi CPU lemah), Qwen2.5 1.5B, prompt ringkas dirakit dari ruang:

| Ruang | Tanpa router hemat | Dengan router hemat |
|---|---|---|
| Kafe (7 pesan) | 5 dari 7 benar, 5,4 detik per panggilan model | 7 dari 7, tanpa panggilan model (semua dikenal parser) |
| Studio (6 pesan) | 5 dari 6 benar, 4,7 detik per panggilan model | 6 dari 6, tanpa panggilan model |

Pada pengujian sebelumnya (Lab, 28 pesan): 1,5B prompt ringkas dengan router hemat 27 dari 28 benar dengan 5 panggilan model, tanpa router hemat 18 dari 28. Model 0,5B tidak menambah nilai (0 dari 6 pada pesan sulit). Memori proses server sekitar 1,8 sampai 1,9 GB.

## 4. Uji nyata

### 4.1 OpenRouter dari Node (`live_check.js`, `openrouter/free`, di Lab)

| Suite | Hasil |
|---|---|
| Dasar, 15 pesan | Perilaku benar 15 dari 15 |
| RAG, 7 pesan dengan manual | Perilaku benar 7 dari 7. LLM memakai angka manual setelah aturan prompt "nyaman" diganti |

Dari browser (`file://` dan `http://localhost`): Tes koneksi berhasil, alur penuh jalan, injeksi ditolak.

**Diulang setelah refactor dunia** (prompt dirakit dari data ruang, `openrouter/free`, 17 November 2026):

| Ruang | Perilaku benar | Catatan |
|---|---|---|
| Lab, suite RAG (7 pesan) | 7 dari 7 | Banyak panggilan jatuh ke parser (429 atau lambat, rata-rata 17 detik), hasil akhir tetap benar karena fallback |
| Kafe (7 pesan) | 7 dari 7 | 5 dari 7 dijawab LLM |
| Studio (6 pesan) | 5 dari 6 | "go live" dijawab LLM sebagai tidak paham karena prompt belum memuat alias ruang. **Diperbaiki**: alias dan kata gaul ruang kini masuk prompt. Belum diukur ulang ke OpenRouter karena layanan gratis lambat |

### 4.2 Model lokal Python dari browser

`test_browser_live.js` dengan `LOKAL=1`, dari `file://` dan `http://localhost`: semua lulus (CORS server mengizinkan, grammar JSON, router hemat). Diulang setelah refactor dunia: lulus.

**Pelajaran dari refactor:** prompt ringkas yang dirakit dari data awalnya menurunkan akurasi model 1,5B (Lab 24 dari 28, "yang itu dong" dijawab info) hanya karena beberapa kata dan contoh berbeda dari versi tulisan tangan. Setelah kata dan contoh yang terbukti dipulihkan, Lab kembali 15 dari 15 pada pesan dasar. Model kecil sangat peka terhadap redaksi prompt, jadi setiap perubahan prompt perlu diukur ulang dengan `live_check.js`.

Hasil akhir model lokal 1,5B dengan prompt dari data (prompt ringkas, CPU, 17 November 2026):

| Ruang | Tanpa router hemat | Dengan router hemat |
|---|---|---|
| Lab, 15 pesan dasar | 15 dari 15 (1 panggilan model) | 15 dari 15 |
| Lab, 6 pesan sulit | 2 dari 6 | 4 dari 6 |
| Kafe, 7 pesan | 6 dari 7 ("tolong nyalakan blender" ditafsirkan menyalakan espresso, guard tidak berperan karena aksinya sah) | 7 dari 7 tanpa panggilan model |
| Studio, 6 pesan | 6 dari 6 (setelah alias masuk prompt) | 6 dari 6 tanpa panggilan model |

### 4.3 Perbandingan model kecil (Lab, 28 pesan)

| Model | Prompt | Router | Benar |
|---|---|---|---|
| 0,5B | penuh | mati | 9 dari 22 |
| 1,5B | penuh | mati | 13 dari 28 |
| 1,5B | ringkas | mati | 18 dari 28 |
| 1,5B | ringkas | hemat | 25 dari 28 |
| **1,5B** | **ringkas** | **hemat, klarifikasi ke parser** | **27 dari 28** |
| 0,5B | ringkas | hemat | 23 dari 28 |

JSON valid 100 persen berkat grammar.

### 4.4 Ollama (`qwen2.5:3b`, pernah diuji)

JSON valid 20 dari 20, perilaku benar 19 dari 22. Tanpa `OLLAMA_ORIGINS`, halaman `file://` dan `https://*.github.io` ditolak HTTP 403 (hanya origin `localhost` diterima).

### 4.5 Tampilan

Tangkapan layar tiga ruang (Lab, Kafe, Studio) di grafis realistis diperiksa: tekstur lantai, jendela, rak buku, lampu gantung, mesin espresso, kamera, tanda ON AIR, robot, dan papan sensor tampil benar. Dua perbaikan dari pemeriksaan visual: label spesialis diturunkan agar tidak menutupi kepala robot, dan lantai beton digelapkan. Ring light Studio yang tampak hilang ternyata hanya tertutup kartu misi dan terlihat jelas saat kartu diringkas.

## 5. Yang belum teruji

| Hal | Alasan dan risiko |
|---|---|
| Studio ke OpenRouter setelah alias masuk prompt | Perbaikan hanya diukur di model lokal. Layanan gratis terlalu lambat saat pengujian |
| Perangkat yang tidak ada di ruang ("nyalakan blender") | Model kecil bisa menebak perangkat terdekat. Aksi tetap lewat guard, tetapi tebakannya sah. Router hemat mengurangi kasus ini |
| Browser dengan GPU sungguhan (kecepatan grafis realistis) | Semua uji WebGL memakai software rendering. Angka fps bukan indikator GPU |
| Laptop berspesifikasi rendah fisik, RAM 4 GB | Hanya simulasi CPU dan sinyal perangkat |
| Mikrofon dan pengenalan suara `id-ID` | Butuh suara manusia dan izin mikrofon |
| Pemasangan `llama-cpp-python` di mesin lain | Diuji di Windows x64 dengan Python 3.12. macOS, Linux, dan Python lain belum |
| Unduhan model dari nol lewat `server_lokal.py` | Berkas yang sudah ada dipakai |
| GitHub Pages memanggil server lokal atau Ollama | Hanya diuji dari `file://` dan `http://localhost` |
| Ruang buatan dengan definisi sangat besar atau sangat aneh | Pemeriksa membatasi jumlah dan panjang, tetapi tidak ada uji fuzzing |
| Firefox, Safari, perangkat sentuh nyata | Hanya Chrome dan emulasi lebar 390 px |

## 6. Cara mengulang

Lihat bagian "Build dan uji" di [README.md](README.md). Uji nyata OpenRouter memakai kunci lewat variabel lingkungan. Jangan menyimpan kunci di berkas dan hapus kunci uji setelah selesai.
