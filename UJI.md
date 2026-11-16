# Laporan pengujian Ruang Agen

Tanggal uji: 16 November 2026. Lingkungan: Windows 11, Node 24.18.1, Chrome (Playwright 1.49 dengan Chrome terpasang), Python 3.12 dengan llama-cpp-python 0.3.36 (CPU), Ollama 0.40.16 (sudah dihapus dari mesin uji), CPU i5-12400F (6 inti), GPU tidak dipakai untuk model lokal Python.

## 1. Uji otomatis tanpa jaringan

Dijalankan sebelum dan sesudah setiap perubahan. Semua lulus.

| Berkas | Jumlah cek | Cakupan |
|---|---|---|
| `test_brain.js` | 23 | Parser bahasa Indonesia, router intent, batas kecepatan lengan, interlock pintu, batas level kipas, input guard, urutan "setelah", tanpa em dash |
| `test_manual.js` | 40 | Retrieval TF-IDF, sinonim, ambang skor, angka dari teks manual, "nyaman" mengikuti manual (24-26, 28-30, 22-24), tanpa RAG, pertanyaan SOP, pembagian tugas paralel dan berurutan, interlock antar tahap |
| `test_llm.js` | 49 | OpenRouter, model lokal Python, dan Ollama dengan fetch tiruan: JSON dalam pagar kode, blok think, retry, fallback (429, jaringan, timeout, JSON rusak), skema, guard menolak usulan LLM, RAG masuk prompt, manual berisi injeksi dibuang, prompt ringkas, grammar skema, router hemat (pesan dikenal tidak memanggil model, pesan baru diteruskan, klarifikasi dan injeksi tetap di kode) |

## 2. Uji alur browser dengan jaringan ditiru

`test_browser.js`: 38 cek, semua lulus. Playwright dengan Chrome, three.js dari salinan lokal, OpenRouter, server lokal, dan Ollama ditiru lewat route.

Cakupan: halaman termuat tanpa galat JS, lima tab, tiga spesialis; misi 4 (ubah manual lewat UI, kipas level 3 ke 1, tanpa RAG level 2, reset manual, pertanyaan SOP); misi 5 (paralel lalu berurutan, tag DELEGASI); misi 6 (serangan contoh, lengan tetap aman); LLM tiruan yang tertipu ditolak guard dan badge Penipu LLM; potongan manual sampai ke prompt; Ollama tiruan dengan skema terstruktur dan prompt ringkas; model lokal dengan router hemat (pesan dikenal tanpa panggilan model, pesan baru ke model dengan grammar skema); input suara dengan stub (ucapan menjadi pesan, agen tidak memanggil `speechSynthesis`, tidak ada kontrol suara keluar); layar 390 px tanpa scroll horizontal dan semua tombol terlihat.

## 3. Uji nyata

### 3.1 OpenRouter dari Node (`live_check.js`, model `openrouter/free`)

| Suite | Hasil |
|---|---|
| Dasar, 15 pesan (jelas, gaul, ambigu, info, berbahaya, injeksi) | Perilaku benar 15 dari 15. LLM menjawab 11 dari 13 panggilan, dua pesan injeksi ditangkap input guard, satu panggilan 429 jatuh ke parser dan tetap benar |
| RAG, 7 pesan dengan manual | Perilaku benar 7 dari 7. LLM memakai angka manual (batas 24-26 menjadi kipas level 3, 28-30 menjadi level 1) |

Temuan yang diperbaiki: Gemma bawaan lama selalu 429 (diganti `openrouter/free`); `max_tokens` 400 membuat 5 dari 13 jawaban kosong (dinaikkan ke 1500); aturan prompt yang mengunci "bikin nyaman" ke kipas level 2 membuat LLM mengabaikan manual (aturan diganti); parser salah membaca "lampunya nyala nggak?" (diperbaiki).

Kualitas bahasa Indonesia: balasan natural dan singkat ("Siap, lampu dan kipas kunyalakan."), kadang bercampur kata gaul ("kucetin"). Balasan info sensor sengaja diganti agen dengan pembacaan papan sensor.

### 3.2 OpenRouter dari browser (`test_browser_live.js`)

Dari `file://` (origin null) dan `http://localhost`: semua cek lulus. Tes koneksi berhasil (tidak ada masalah CORS), alur penuh AMBIL dan DELEGASI jalan, pertanyaan SOP dijawab, injeksi ditolak dan lengan tetap mati, tanpa galat JS.

### 3.3 Model lokal kecil berbasis Python (`server_lokal.py`, CPU)

Target: laptop mahasiswa berspesifikasi rendah. Server llama-cpp-python (tanpa GPU, tanpa Docker), model Qwen2.5 Instruct Q4_K_M, keluaran dipaksa lewat grammar skema JSON. Suite 28 pesan: 15 dasar, 7 RAG, 6 pesan sulit yang parser tidak kenal.

Perbandingan konfigurasi (perilaku benar dari 28, rata-rata per panggilan model):

| Model | Prompt | Router | Benar | Panggilan model | Waktu per panggilan |
|---|---|---|---|---|---|
| 0.5B | penuh (22 pesan, tanpa suite sulit) | mati | 9 dari 22 | 20 | 2.8 detik |
| 1.5B | penuh | mati | 13 dari 28 | 26 | 4.0 detik |
| 1.5B | ringkas | mati | 18 dari 28 | 26 | 3.7 detik |
| 1.5B | ringkas | hemat | 25 dari 28 | 7 | 3.5 detik |
| **1.5B** | **ringkas** | **hemat, klarifikasi ke parser** | **27 dari 28** | **5** | **3.7 detik** |
| 0.5B | ringkas | hemat | 23 dari 28 | 5 | 3.7 detik |

- JSON valid 100 persen pada semua konfigurasi (grammar), perilaku benar bergantung model dan prompt.
- Pada 6 pesan sulit tanpa router: 1.5B benar 4 dari 6 pada versi ringkas, 0.5B 0 dari 6. Model 0.5B praktis tidak menambah nilai di atas parser, 1.5B dipilih sebagai bawaan.
- Satu-satunya salah pada konfigurasi terbaik: "hawanya bikin ngantuk" ditafsirkan sebagai pertanyaan sensor. Guard aksi tidak pernah dilewati.
- Dibatasi 2 thread (simulasi laptop lemah): 4.7 detik per panggilan model (1.5B, 6 pesan sulit).
- Memori proses server sekitar 1.8 sampai 1.9 GB pada kedua model, unduhan 0.47 GB (0.5B) dan 1.07 GB (1.5B).
- Browser nyata (`test_browser_live.js` dengan `LOKAL=1`), dari `file://` dan `http://localhost`: semua lulus. Server mengizinkan CORS. "bikin nyaman" dikerjakan parser dari manual tanpa memanggil model, dan "hawanya bikin ngantuk" diteruskan ke model lokal nyata dan dijawab.
- `server_lokal.py` diuji: menemukan berkas model yang sudah ada, menjalankan server, dan melayani permintaan.

### 3.4 Ollama sungguhan (`qwen2.5:3b`, sebelum diganti ke model lokal Python)

- `live_check.js` suite semua (22 pesan): JSON valid 20 dari 20 panggilan, perilaku benar 19 dari 22. Salah pada pesan ambigu ("yang itu dong", "nyalakan") dan hitungan level kipas dari manual default. Aksi berbahaya tetap ditolak guard.
- Browser dengan `OLLAMA_ORIGINS=*` dari `file://` dan `http://localhost`: semua lulus.
- CORS bawaan Ollama 0.40.16 (tanpa `OLLAMA_ORIGINS`): origin `http://localhost:<port>` diterima. Origin `null` (`file://`) dan `https://*.github.io` ditolak dengan HTTP 403, termasuk preflight.
- Ollama kemudian dihapus dari mesin uji (sekitar 5 GB dipulihkan di drive C).

### 3.5 Input suara

- Tombol Bicara dan alur ucapan menjadi pesan teruji dengan stub di uji browser. Agen tidak bersuara: kontrol keluaran dihapus dan uji memastikan `speechSynthesis` tidak dipanggil.
- Chrome sungguhan menyediakan `SpeechRecognition`. Pengenalan suara sungguhan dari mikrofon belum diuji.

## 4. Dihapus dari cakupan

Atas keputusan pemilik proyek: proxy kelas, papan skor kelas (Supabase), dan suara keluaran agen. Badge dan XP kini lokal. Level Trickster memakai serangan contoh lokal.

## 5. Yang belum teruji

| Hal | Alasan dan risiko |
|---|---|
| Mikrofon dan pengenalan suara `id-ID` sungguhan | Butuh suara manusia dan izin mikrofon. Pengenalan suara Chrome bergantung layanan Google |
| Laptop berspesifikasi rendah sungguhan | Uji di i5-12400F, termasuk simulasi 2 thread. Laptop lama dengan RAM 4 GB bisa jauh lebih lambat atau kehabisan memori |
| Pemasangan `llama-cpp-python` di mesin lain | Diuji di Windows x64 dengan Python 3.12 dan paket siap pakai CPU. macOS, Linux, Python lain, dan CPU tanpa AVX2 belum diuji |
| Unduhan model lewat `server_lokal.py` dari nol | Berkas yang sudah ada dipakai. Jalur unduh memakai `huggingface_hub` yang sama dengan yang dipakai saat menyiapkan uji, tetapi tidak diulang lewat skrip |
| GitHub Pages (`https`) memanggil server lokal atau Ollama (`http://localhost`) | Chrome dapat meminta izin akses jaringan lokal. Hanya diuji dari `file://` dan `http://localhost` |
| Deploy ke GitHub Pages | Hanya diuji dari berkas lokal dan server statis lokal |
| Stabilitas `openrouter/free` | Router memilih model yang berganti-ganti. Kuota harian 50 per akun |
| Model lokal selain Qwen2.5 0.5B dan 1.5B | Misalnya Gemma 3 1B atau Llama 3.2 1B belum dibandingkan |
| Browser selain Chrome, perangkat sentuh nyata | Hanya Chrome dan emulasi lebar 390 px |

## 6. Cara mengulang

Lihat bagian "Build dan uji" di [README.md](README.md). Uji nyata OpenRouter memakai kunci lewat variabel lingkungan. Jangan menyimpan kunci di berkas dan hapus kunci uji setelah selesai.
