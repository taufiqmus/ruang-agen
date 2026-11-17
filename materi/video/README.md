# Serial video per pertemuan

Status: **naskah siap, audio dan video belum dibuat.** Audio memakai suara dosen (skill `speak`, profil `me`) dan baru dibuat setelah dosen menyetujui.

- `pertemuan-1.json` sampai `pertemuan-6.json`: format `speak batch` (`id`, `say`), ditambah `layar` (gambar yang tampil saat kalimat itu dibacakan).
- Narasi tiap episode sekitar 1 menit. Dengan jeda untuk demo layar, panjang tiap episode sekitar 2 sampai 3 menit.
- Ubah naskah di `buat_naskah.py`, lalu jalankan `python buat_naskah.py` untuk menulis ulang berkas JSON.

Rencana pembuatan (setelah disetujui):
1. Episode 1 sebagai percontohan: `speak batch pertemuan-1.json -d keluaran/p1` (hentikan model Ollama dulu dengan `ollama stop` karena VoxCPM butuh sekitar 10 GB VRAM).
2. Rekam layar tiap adegan dengan Playwright (contoh di `../slide/tangkap.js`), panjang adegan mengikuti durasi audio.
3. Gabungkan dengan ffmpeg. Hasil video disimpan di drive D, tidak masuk git.
4. Dosen mendengarkan percontohan dulu, baru episode 2 sampai 6 dibuat.
