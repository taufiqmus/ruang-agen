# Ruang Agen

Game 3D untuk belajar **agentic AI** dengan cara bermain. Kamu mengobrol dengan agen penjaga ruangan dalam bahasa Indonesia sehari-hari. Agen memahami pesanmu, membaca buku panduan ruangan, membagi tugas ke robot-robot spesialis, lalu menyalakan lampu, kipas, mesin kopi, dan perangkat lain. Setiap langkah "berpikir" agen bisa kamu lihat, dan hampir semua bagian kepalanya bisa kamu ubah sendiri.

Gratis, bisa dimainkan tanpa internet, dan jalan di laptop biasa.

## Mulai main

| Cara | Langkah | Cocok untuk |
|---|---|---|
| **Langsung main** | Klik dua kali `index.html` (Chrome atau Edge) | Semua laptop, tanpa pasang apa pun |
| **Dengan AI di laptop sendiri** | Klik dua kali `MULAI.bat` (Mac atau Linux: `./mulai.sh`). Pertama kali butuh internet dan beberapa menit, setelah itu beberapa detik | Belajar dengan model AI sungguhan, gratis dan tanpa kuota |
| **Untuk satu kelas** | Dosen mengunggah `index.html` ke GitHub Pages lalu membagikan alamatnya | Kelas daring |

Lalu ketik di tab **Chat**, misalnya:
- `nyalakan lampu dan kipas`
- `gerah nih`
- `bikin nyaman`
- `berapa suhu nyaman?`
- `putar lengan robot 200%` (coba lihat apa yang terjadi)

## Yang bisa kamu lakukan

- **Lihat agen berpikir.** Tab **Jejak** memperlihatkan jalur pesan: guard masukan, memori, router, rak manual, otak, guard aksi, orkestrator, spesialis, dan guard keluaran. Tahap yang dilalui menyala hijau, yang menolak menyala merah.
- **Jelajahi Kampus Nusantara.** Enam ruang dengan suasana berbeda: Lab Robotika, Kafe Senja, Studio Konten, Perpustakaan Cahaya, Dapur Kantin, dan Kebun Hidroponik. Ada lebih dari 30 misi, kejadian tak terduga (listrik padam, gelombang panas), XP, level, dan badge.
- **Ajari agen.** Ubah isi buku panduan (rak manual), titip catatan dengan `ingat ya, ...`, atau ajari kata gaul baru seperti `mager`.
- **Rancang agenmu sendiri.** Di tab **Agen**, ubah nama dan kepribadian agen, cara orkestrator membagi tugas, rute router, cara mencari di rak, dan pengaman (guardrails). Di tab **Dunia**, buat ruang atau semesta baru lalu bagikan sebagai berkas.
- **Uji keamanan.** Coba tipu agen. Lihat bagaimana pengaman di kode tetap menolak walau AI-nya tertipu.
- **Bandingkan cara kerja agen di industri.** Router semantik dan embedding, AI yang memilih tool, guard model, RAG hibrida, reranker, ringkasan percakapan, persetujuan manusia, ekspor jejak, dan tombol uji untuk mengukur semuanya.

## Dokumen

- **[PANDUAN.md](PANDUAN.md)**: cara memasang, cara bermain, semua tab, membuat ruang dan semesta sendiri, pemecahan masalah, dan saran untuk dosen.
- [UJI.md](UJI.md): laporan pengujian.
- [PENGEMBANG.md](PENGEMBANG.md): untuk yang ingin mengubah kode game.
