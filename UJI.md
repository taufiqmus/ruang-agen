# Laporan pengujian Ruang Agen

Tanggal uji: 16 sampai 17 November 2026 (diperbarui setelah semesta). Lingkungan: Windows 11, Node 24.18.1, Chrome (Playwright 1.49 dengan Chrome terpasang, software rendering untuk WebGL), Python 3.12 dengan llama-cpp-python 0.3.36 (CPU), CPU i5-12400F (6 inti), GPU RTX 3060 12 GB. Ollama 0.40.16 terpasang di `D:\ollama` (model di `D:\ollama\models`).

## 1. Uji otomatis tanpa jaringan

Dijalankan sebelum dan sesudah setiap perubahan. Semua lulus.

| Berkas | Cek | Cakupan |
|---|---|---|
| `test_brain.js` | 23 | Parser bahasa Indonesia di ruang Lab, router intent, batas guard, interlock, input guard, urutan "setelah" |
| `test_manual.js` | 40 | Retrieval TF-IDF, sinonim, angka dari teks manual, "nyaman" mengikuti manual (fisika ruang), pertanyaan SOP, pembagian tugas paralel dan berurutan |
| `test_dunia.js` | 63 | Semua ruang bawaan dan templat lolos pemeriksa. Kafe (kata gaul, alias, resep dari rak, batas daya, volume), Studio (alias "go live", interlock ON AIR, urutan aman, batas gimbal), prompt lengkap dan ringkas dirakit dari ruang aktif, memori ("ingat"), catatan mengalahkan bab suhu, injeksi lewat memori ditolak, `jelaskan` dan top-k, 12 jenis galat definisi ruang, ruang buatan dipakai otak (kata gaul dan interlock baru), fisika menuju nilai stabil dan stabil untuk langkah waktu besar, misi deklaratif |
| `test_semesta.js` | 76 | Semesta: enam ruang sah (ruang baru: robot pustakawan dan interlock pintu, interlock timbal balik kompor dan oven, pompa dan pintu), Kampus Nusantara (6 ruang, 24 bab bersama, 4 rute, 3 kejadian, 5 misi), lebih dari 70 bab pengetahuan. **Router buatan**: rute manual dengan koleksi, balas aturan tetap, tolak (selalu menang walau ada perintah), perintah jelas tidak dibajak, RAG mati dijelaskan, `adaRute` memutus di kode, 4 jenis galat rute. **Agen**: kata setuju, kata menolak, sapaan, nama, persona masuk kedua prompt, prompt bawaan tidak berubah. **Orkestrator**: berurutan, paralel, interlock tetap memisahkan tahap, nama. **RAG**: k, ambang, sinonim, koleksi, kata henti. **Guardrails**: pola masukan sendiri, masukan mati, batas aksi mati (jejak memperingatkan), interlock mati, keluaran menyamarkan kata, memori mati, semua hidup secara bawaan. Kejadian: efek ke fisika dan ke rencana "nyaman". Misi: target urutan, intent, rute, kejadian, maksPesan, misi lintas ruang. 14 jenis galat semesta, batas ukuran, pembersihan teks |
| `test_llm.js` | 49 | OpenRouter, model lokal Python, dan Ollama dengan fetch tiruan: fallback (429, jaringan, timeout, JSON rusak), skema, guard menolak usulan LLM, RAG masuk prompt, manual berisi injeksi dibuang, prompt ringkas, grammar skema, router hemat |
| `test_ingatan.js` | 51 | Fakta sesi (nama agen dan pengguna), ralat dan hapus catatan, pertanyaan ingatan dan kemampuan, context window (riwayat masuk prompt, riwayat berpola injeksi dibuang, router hemat meneruskan "yang tadi"), callback titik tiga, mode ngobrol (prompt, router hemat, aksi yang diselipkan tidak jalan) |
| `test_pipeline.js` | 56 | **Prompt bawaan identik byte per byte** dengan snapshot saat semua pilihan mati. Router semantik (rute tolak tidak ikut, kelompok keputusan, pendapat kedua), router embedding (awalan tugas, cache, gagal jatuh ke router ringan), mode tool (format Ollama dan OpenAI, loop `cari_manual`, argumen divalidasi guard, argumen diratakan, model tanpa dukungan tool, tool karangan), guard model (unsafe, safe, tidak terjangkau, tidak dipanggil bila regex sudah menolak), RAG hibrida (RRF, bab tanpa kata sama, gagal jatuh ke TF-IDF), reranker (id asing dibuang), ringkasan (injeksi dibuang), uji kelas di enam ruang, aksi berisiko, field semesta baru |

## 2. Uji alur browser (jaringan ditiru)

`test_browser.js`: 82 cek, semua lulus (dengan `?kejadian=mati` agar kejadian acak tidak mengganggu). Playwright dengan Chrome, three.js dari salinan lokal, OpenRouter, server lokal, dan Ollama ditiru lewat route. Dijalankan dengan `?grafis=ringan`.

Cakupan: halaman termuat tanpa galat JS, enam tab, spesialis tiap ruang. Lab: misi 4 (ubah manual lewat UI), misi 5, misi 6, LLM tiruan yang tertipu ditolak guard. **Dunia**: pindah ke Kafe (spesialis, misi, dan contoh berganti), misi deklaratif Kafe 1, 3, 4 (guard menolak 90% lalu 60% jalan, resep dari rak, memori), badge, catatan lewat chat bertag CATAT dan bisa ditanyakan lagi, uji pencarian menampilkan skor, catatan berpola injeksi ditolak, ajari kata gaul langsung dipakai, ruang bawaan bisa dikembalikan, definisi salah dan JSON rusak memberi pesan ramah tanpa mengganti ruang aktif, ruang baru dari templat, ruang buatan disunting lewat JSON (perangkat, interlock, misi baru) lalu dimainkan sampai selesai, ruang buatan bertahan setelah halaman dimuat ulang, Studio misi 2 dan 4 (keadaan awal dari data, dua tahap), grafis realistis dan ringan bisa dipilih tanpa galat, layar 390 px tanpa scroll horizontal. Tambahan: daftar model Ollama, titik tiga saat inferensi, context window, fakta sesi, ralat dan hapus catatan, mode ngobrol, router semantik dari tab Otak, sumber dikutip, **persetujuan manusia** (ditolak lalu disetujui), ekspor jejak JSON, uji kelas tidak mengubah keadaan permainan, ingatan sesi bertahan setelah muat ulang.

`test_browser_semesta.js`: 58 cek, semua lulus. Cakupan: semesta Kampus dimuat dengan 6 ruang; rute KAMPUS, CURHAT, dan DILARANG di browser; **pipeline hidup** (MEMORI, RAG, GUARD merah saat aksi ditolak, MASUKAN merah saat injeksi, ORKESTRATOR dan SPESIALIS, KELUARAN); misi semesta (Tur Kampus, Jagoan Router) selesai lintas ruang dengan XP dan badge; kejadian "masuk", "pesanKe", dan padam; **Studio Agen**: ubah nama, persona, kata setuju dan menolak, sapaan, gaya, strategi orkestrator, nama orkestrator, rute buatan dari form, sinonim, pola masukan, guard keluaran lalu Terapkan, hasilnya langsung dipakai agen, bertahan setelah muat ulang; **mode rentan** (peringatan tampil, guard aksi mati meloloskan lengan 200%, dinyalakan lagi menolak); semesta baru dari templat, JSON semesta disunting (kejadian, misi, pengetahuan baru), JSON salah memberi galat ramah tanpa mengganti semesta aktif, ekspor lalu impor berkas, hapus semesta, migrasi data lama (ruang buatan, XP, bintang, dan mode otak proxy); tiga ruang baru (dapur, kebun, perpustakaan) di grafis realistis dan interlock dapur.

### Satu klik untuk mahasiswa (`MULAI.bat`)

Diuji nyata di laptop ini dari folder tanpa `.venv` dan tanpa model (17 November 2026), dengan Python 3.8 di PATH (sengaja diabaikan skrip) dan Python 3.11 lewat `py`:
- Skrip memilih `py -3.11`, membuat `.venv`, memasang paket siap pakai (147 MB), mengunduh model 0,5B dari nol (469 MB), lalu server siap dalam **70 detik**.
- `test_mulai_live.js` lulus: browser baru tanpa pengaturan apa pun mendeteksi model di alamat yang sama dan langsung memakainya. Pesan dikenal dikerjakan parser (router hemat), pesan baru dijawab model lokal sungguhan, tanpa masalah CORS, tanpa galat JS.
- Jalan kedua saat port 8000 masih terpakai: siap dalam **6 detik** di port 8001, tanpa memasang atau mengunduh ulang.
- Belum diuji: laptop tanpa Python sama sekali (jalur pemasangan lewat winget), Windows tanpa winget, Mac dan Linux (`mulai.sh`).

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

Ruang baru, model lokal 1,5B dengan 2 thread, prompt ringkas (17 November 2026):

| Ruang | Tanpa router hemat | Dengan router hemat |
|---|---|---|
| Perpustakaan (6 pesan) | 4 dari 6 (jawaban katalog dan denda dijawab sebagai info sensor) | 6 dari 6 tanpa panggilan model |
| Dapur (6 pesan) | 3 dari 6 (kompor level 7 lolos, resep dan harga salah) | 6 dari 6 tanpa panggilan model |
| Kebun (6 pesan) | 3 dari 6 | 5 dari 6 (selisih 1 karena bab "panen" yang terambil tidak memuat angka yang dicari tes) |
| Lab (28 pesan) | 17 dari 28 | 26 dari 28, 5 panggilan model |

Pelajaran: untuk model 1,5B, **router hemat bukan opsional di ruang dengan banyak perangkat dan pengetahuan**. Rute router buatan dan RAG berbasis kode memberi hasil yang andal tanpa model, sementara model kecil sendirian sering salah menafsirkan kata gaul dan pertanyaan pengetahuan.

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

### 4.4 Ollama

Diuji ulang setelah refactor semesta (17 November 2026): Ollama 0.40.16 versi portable di folder sementara drive D (dihapus setelah uji), model `qwen2.5:1.5b`, GPU RTX 3060. Waktu per panggilan model 0,35 sampai 0,8 detik.

| Ruang | Tanpa router hemat | Dengan router hemat |
|---|---|---|
| Lab (28 pesan) | 15 dari 28 | 25 dari 28 (5 panggilan model) |
| Kafe (7) | 6 dari 7 | 7 dari 7 |
| Studio (6) | 6 dari 6 | 6 dari 6 |
| Perpustakaan (6) | 5 dari 6 | 6 dari 6 |
| Dapur (6) | 4 dari 6 | 6 dari 6 |
| Kebun (6) | 3 dari 6 | 6 dari 6 |

Dari browser (`test_browser_live.js` dengan `OLLAMA=1`, router hemat hidup):
- Tanpa `OLLAMA_ORIGINS`: halaman `http://localhost` lulus semua (Tes koneksi, pesan dikenal ke parser, pesan baru ke Ollama sungguhan). Halaman `file://` ditolak Ollama (preflight 403), dan game jatuh ke parser dengan pesan yang menyebut `OLLAMA_ORIGINS`, tanpa galat JS. Origin `http://127.0.0.1:8000` dan `http://localhost:8000` (alamat `MULAI.bat`) diterima tanpa pengaturan.
- Dengan `OLLAMA_ORIGINS=*`: kedua asal halaman lulus semua.

Sebelumnya `qwen2.5:3b` (22 pesan): JSON valid 20 dari 20, perilaku benar 19 dari 22.

### 4.5 Pipeline lanjutan dengan Ollama (17 November 2026, RTX 3060)

16 pesan per kombinasi di Lab: 10 kasus uji kelas ditambah 6 pesan sulit (ngantuk, "kecilin kipasnya dikit", "ruangan bau", pengetahuan umum, parafrase kemampuan, pertanyaan manual berbahasa santai). Prompt ringkas.

| Model | Router aturan (hemat) | Semantik ringan | Embedding (`embeddinggemma`) | AI memilih tool |
|---|---|---|---|---|
| `qwen2.5:1.5b` | 11/16 | 13/16 | 14/16 | 13/16 (tidak bisa tool, beralih ke mode JSON) |
| `qwen2.5:7b` | 12/16 | 14/16 | **16/16** | 12/16 |
| `gemma4:e4b` | 11/16 | 14/16 | **16/16** | **16/16** |

- **Router semantik** baru berguna setelah dijadikan pendapat kedua: hasil parser diterima hanya bila sejalan dengan rute pilihan router. Versi pertama (selalu mempercayai parser untuk rute perangkat, sensor, dan manual) hasilnya sama persis dengan router aturan.
- **Klasifikasi rute** pada 29 kalimat baru: tingkat kelompok tepat 22/29 (ringan) dan 25/29 (embedding). Tanpa awalan `task: classification | query:`, embedding hanya 21/29.
- **Mode tool**: `qwen2.5:1.5b` menulis teks `{lampu, on}` alih-alih memanggil tool, `qwen2.5:7b` kadang meratakan argumen (keduanya kini ditangani), `gemma3:1b` ditolak Ollama ("does not support tools") dan game beralih ke mode JSON. `gemma4:e4b` sempat gagal dimuat (galat CUDA) saat beberapa model lain menempati VRAM, lalu normal setelah model lain dihentikan.
- **Uji kelas dari UI** (`gemma4:e4b`): router embedding 9/10, mode tool 10/10, tanpa galat JS.
- **Guard model** `llama-guard3:1b`, sekitar 45 ms per pesan: 5 pesan aman lolos semua, konten berbahaya 4 dari 5 tertangkap (ujaran kebencian lolos), upaya menipu agen 1 dari 2 tertangkap dengan kategori yang keliru. Guard model bukan pengganti guard regex.
- **RAG hibrida**, 13 pertanyaan parafrase langsung ke rak Lab: TF-IDF 11/13, hibrida 12/13 (kosinus minimal 0,45). Keuntungannya kecil karena sinonim TF-IDF di Lab sudah kuat.
- **Reranker** (`qwen2.5:7b`, `gemma4:e4b`) mengurutkan kandidat dengan masuk akal. **Ringkasan** `qwen2.5:7b` menyimpan nama, preferensi, dan perangkat yang diubah.
- Regresi: kontrol perangkat `qwen2.5:1.5b` dengan router hemat tetap 25/28, sama dengan sebelum semua pilihan baru.

### 4.6 Tampilan

Tangkapan layar tiga ruang (Lab, Kafe, Studio) di grafis realistis diperiksa: tekstur lantai, jendela, rak buku, lampu gantung, mesin espresso, kamera, tanda ON AIR, robot, dan papan sensor tampil benar. Dua perbaikan dari pemeriksaan visual: label spesialis diturunkan agar tidak menutupi kepala robot, dan lantai beton digelapkan. Ring light Studio yang tampak hilang ternyata hanya tertutup kartu misi dan terlihat jelas saat kartu diringkas.

## 5. Yang belum teruji

| Hal | Alasan dan risiko |
|---|---|
| Semesta buatan dengan model AI (bukan parser) | Semua uji semesta memakai parser, atau model lokal untuk ruang bawaan. Persona yang diubah masuk prompt, tetapi dampaknya pada model sungguhan belum diukur |
| Rute buatan dan guard keluaran terhadap usulan model | Diuji dengan LLM tiruan dan parser. Model sungguhan tidak diuji untuk kombinasi ini |
| Studio ke OpenRouter setelah alias masuk prompt | Perbaikan hanya diukur di model lokal. Layanan gratis terlalu lambat saat pengujian |
| Perangkat yang tidak ada di ruang ("nyalakan blender") | Model kecil bisa menebak perangkat terdekat. Aksi tetap lewat guard, tetapi tebakannya sah. Router hemat mengurangi kasus ini |
| Browser dengan GPU sungguhan (kecepatan grafis realistis) | Semua uji WebGL memakai software rendering. Angka fps bukan indikator GPU |
| Laptop berspesifikasi rendah fisik, RAM 4 GB | Hanya simulasi CPU dan sinyal perangkat |
| Mikrofon dan pengenalan suara `id-ID` | Butuh suara manusia dan izin mikrofon |
| Pemasangan `llama-cpp-python` di mesin lain | Diuji di Windows x64 dengan Python 3.12. macOS, Linux, dan Python lain belum |
| GitHub Pages memanggil server lokal atau Ollama | Hanya diuji dari `file://` dan `http://localhost` |
| Ruang buatan dengan definisi sangat besar atau sangat aneh | Pemeriksa membatasi jumlah dan panjang, tetapi tidak ada uji fuzzing |
| Firefox, Safari, perangkat sentuh nyata | Hanya Chrome dan emulasi lebar 390 px |
| Pipeline lanjutan dengan OpenRouter dan server lokal Python | Mode tool, reranker, dan ringkasan hanya diuji nyata dengan Ollama. Format OpenAI hanya diuji dengan jawaban tiruan; server llama-cpp-python mungkin tidak mendukung tool calling |
| Router semantik di ruang selain Lab | Uji nyata dan kalibrasi ambang hanya di Lab |
| Guard model untuk bahasa Indonesia secara luas | Hanya 12 contoh. Llama Guard tidak dirancang khusus untuk bahasa Indonesia |

## 6. Cara mengulang

Semua uji ada di folder `tests/`. Uji tanpa jaringan: `npm test`. Uji browser: `npm install` sekali, lalu `npm run test:browser`.

Lihat bagian "Build dan uji" di [PENGEMBANG.md](PENGEMBANG.md). Uji nyata OpenRouter memakai kunci lewat variabel lingkungan. Jangan menyimpan kunci di berkas dan hapus kunci uji setelah selesai.
