# Laporan pengujian Ruang Agen

Tanggal uji: 16 November 2026. Lingkungan: Windows 11, Node 24.18.1, Chrome (Playwright 1.49 dengan Chrome terpasang), Ollama 0.40.16, GPU RTX 3060 12 GB.

## 1. Uji otomatis tanpa jaringan

Dijalankan sebelum dan sesudah setiap perubahan. Semua lulus.

| Berkas | Jumlah cek | Cakupan |
|---|---|---|
| `test_brain.js` | 23 | Parser bahasa Indonesia, router intent, batas kecepatan lengan, interlock pintu, batas level kipas, input guard, urutan "setelah", tanpa em dash |
| `test_manual.js` | 40 | Retrieval TF-IDF (6 pertanyaan), sinonim, ambang skor, pembacaan angka dari teks manual, "nyaman" mengikuti manual (24-26, 28-30, 22-24), tanpa RAG, pertanyaan SOP, blok manual di prompt, pembagian tugas paralel dan berurutan, interlock antar tahap |
| `test_llm.js` | 35 | OpenRouter dan Ollama dengan fetch tiruan: JSON dalam pagar kode, blok think, retry, fallback (429, jaringan, timeout, JSON rusak), skema, guard menolak usulan LLM, RAG masuk prompt, manual berisi injeksi dibuang, `didelegasikan_ke` diisi kode |

## 2. Uji alur browser dengan jaringan ditiru

`test_browser.js`: 31 cek, semua lulus. Playwright dengan Chrome, three.js dari salinan lokal, OpenRouter dan Ollama ditiru lewat route.

Cakupan: halaman termuat tanpa galat JS, lima tab, tiga spesialis; misi 4 (ubah manual lewat UI, kipas berubah dari level 3 ke 1, tanpa RAG level 2, reset manual, pertanyaan SOP); misi 5 (lengan aktif, paralel lalu berurutan, tag DELEGASI); misi 6 (serangan contoh, lengan tetap aman); LLM tiruan yang tertipu ditolak guard dan badge Penipu LLM; potongan manual sampai ke prompt; Ollama tiruan dengan skema terstruktur; suara dengan stub (mic menjadi pesan, balasan dibacakan `id-ID`); layar 390 px tanpa scroll horizontal dan semua tombol terlihat.

## 3. Uji nyata

### 3.1 OpenRouter dari Node (`live_check.js`, model `openrouter/free`)

| Suite | Hasil |
|---|---|
| Dasar, 15 pesan (jelas, gaul, ambigu, info, berbahaya, injeksi) | Perilaku benar 15 dari 15. LLM menjawab 11 dari 13 panggilan. Dua pesan injeksi ditangkap input guard sebelum LLM. Satu panggilan 429 jatuh ke parser dan tetap benar |
| RAG, 7 pesan dengan manual | Perilaku benar 7 dari 7. LLM memakai angka manual: batas 24-26 menjadi kipas level 3, batas 28-30 menjadi level 1. Pertanyaan SOP dijawab dari manual |

Temuan yang diperbaiki dari uji ini:
- Gemma bawaan lama (`google/gemma-4-31b-it:free`) selalu 429 karena kolam Google dipakai bersama. Model bawaan diganti ke `openrouter/free`.
- Dengan `max_tokens` 400, 5 dari 13 jawaban kosong karena model penalaran menghabiskan token. Dinaikkan ke 1500.
- Aturan prompt yang mengunci "bikin nyaman" ke kipas level 2 membuat LLM mengabaikan manual (perilaku benar RAG turun ke 5 dari 7). Aturan diganti agar mengikuti angka manual.
- Parser salah membaca "lampunya nyala nggak?" sebagai perintah. Diperbaiki dan diberi uji.

Kualitas bahasa Indonesia: balasan natural dan singkat, sesuai gaya santai ("Siap, lampu dan kipas kunyalakan."). Beberapa balasan memakai kata campuran seperti "kucetin". Balasan untuk pertanyaan info sensor sengaja diganti agen dengan pembacaan papan sensor.

### 3.2 OpenRouter dari browser (`test_browser_live.js`)

Dua asal halaman: `file://` (origin null) dan `http://localhost`. Keduanya lulus semua cek: Tes koneksi berhasil (tidak ada masalah CORS), jejak OTAK menyebut LLM, alur penuh AMBIL dan DELEGASI dengan kipas dan lampu bekerja, pertanyaan SOP dijawab, injeksi ditolak dan lengan tetap mati, tanpa galat JS.

### 3.3 Ollama sungguhan (`qwen2.5:3b`)

- `live_check.js` suite semua (22 pesan): JSON valid 20 dari 20 panggilan LLM, perilaku benar 19 dari 22. Tiga salah: pesan ambigu "yang itu dong" (dijawab obrol), "nyalakan" (menyalakan lampu dan mematikan kipas), dan hitungan level kipas dari manual default. Aksi berbahaya tetap ditolak guard (200% ditolak, interlock ditolak).
- `test_browser_live.js` dengan Ollama, dari `file://` dan `http://localhost` dengan `OLLAMA_ORIGINS=*`: semua lulus.
- Perilaku CORS bawaan Ollama 0.40.16 (tanpa `OLLAMA_ORIGINS`): origin `http://localhost:<port>` diterima. Origin `null` (halaman `file://`) dan `https://*.github.io` ditolak dengan HTTP 403, termasuk preflight. Karena itu README mewajibkan `OLLAMA_ORIGINS` untuk GitHub Pages dan `file://`.

### 3.4 Suara

- Tombol dan kotak suara berfungsi dengan stub di uji browser.
- Chrome sungguhan: `SpeechRecognition` dan `speechSynthesis` tersedia, dan pembacaan ucapan selesai tanpa galat. Mesin uji hanya punya suara Inggris (3 suara, tidak ada `id`), sehingga game menampilkan catatan "belum punya suara Indonesia".

## 4. Dihapus dari cakupan

Atas keputusan pemilik proyek, dua fitur dihapus sehingga tidak perlu diuji: proxy kelas (Supabase Edge Function) dan papan skor kelas (Supabase, ranking). Badge dan XP kini lokal. Level Trickster memakai serangan contoh lokal.

## 5. Yang belum teruji

| Hal | Alasan dan risiko |
|---|---|
| Mikrofon dan pengenalan suara `id-ID` sungguhan | Butuh suara manusia dan izin mikrofon. Pengenalan suara Chrome bergantung layanan Google |
| Suara Indonesia sungguhan untuk pembacaan | Mesin uji tidak punya suara `id` |
| GitHub Pages (`https`) memanggil Ollama (`http://localhost`) | Chrome dapat meminta izin akses jaringan lokal. Hanya diuji dari `file://` dan `http://localhost` |
| Deploy ke GitHub Pages | Hanya diuji dari berkas lokal dan server statis lokal |
| Stabilitas `openrouter/free` | Router memilih model yang berganti-ganti, hasil bisa berbeda di hari lain. Kuota harian 50 per akun |
| Model Ollama selain `qwen2.5:3b` | Model lebih besar belum dicoba |
| Browser selain Chrome (Firefox, Safari), perangkat sentuh nyata | Hanya Chrome dan emulasi lebar 390 px |

## 6. Cara mengulang

Lihat bagian "Build dan uji" di [README.md](README.md). Uji nyata memakai kunci lewat variabel lingkungan. Jangan menyimpan kunci di berkas dan hapus kunci uji setelah selesai.
