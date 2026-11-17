# Slide kuliah

`Belajar-Agentic-AI-Rumah-Pintar.pptx`: 17 slide untuk 6 pertemuan, dengan tangkapan layar asli dan catatan pembicara di setiap slide.

| Bagian | Slide |
|---|---|
| Pembuka | Judul, peta 6 pertemuan, persiapan (membuka aplikasi, memilih otak, tutorial) |
| Pertemuan 1 sampai 6 | Dua slide per pertemuan: konsep dan tujuan (dari `materi/kurikulum.json`), lalu praktik bernomor dengan kalimat untuk dicoba |
| Penutup | Siapa mengerjakan apa (AI, kode, manusia), tantangan akhir |

Membangun ulang (setelah kurikulum atau aplikasi berubah):
1. `node tangkap.js` mengambil tangkapan layar baru dari `studio.html` dan `index.html`.
2. `node buat_deck.js` menyusun deck. Butuh `pptxgenjs`, `sharp`, `react-icons` (terpasang di `D:\tools\slide-kerja`); jalankan dengan `NODE_PATH` mengarah ke `node_modules` di sana.
