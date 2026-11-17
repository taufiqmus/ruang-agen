# Rencana v2: Easy Agent Visualizer

Catatan kerja (untuk pengembang). `v1` (tag `v1`, `index.html`) tetap utuh dan ujinya harus hijau di setiap commit.

## Gagasan

Mahasiswa merakit rumah pintar sendiri dalam 3D (ruang, kebun, kandang, ESP32, sensor, aktuator, kabel, daya, Wi-Fi), lalu merakit otak agennya di papan blok seret-lepas (pemicu, guard, router, orkestrator, agen, RAG, memori, tool, keluaran). Bot Telegram sungguhan. Entri terpisah: `studio.html`.

## Keputusan

- Tampilan hibrida: dunia 3D untuk fisik, panel 2,5D (SVG) di atas dunia untuk papan otak.
- ESP dan perangkat murni simulasi (keputusan pengguna). Tidak ada sketsa Arduino, daftar belanja, atau jembatan ke perangkat sungguhan. Ekspor hanya kerangka Python agen.
- Telegram langsung dari browser: hanya simple request (GET dengan query, POST urlencoded), long-poll `getUpdates` dengan `offset`, deteksi 409, daftar chat yang diizinkan, token hanya di localStorage dan disamarkan di jejak.
- Model v1 tidak dibengkokkan: v2 punya katalog, simulasi, guard aksi, dan parser sendiri berbasis data dunia. Dipakai ulang dari v1: guard masukan (`Otak.adaInjeksi`), RAG (`Manual.cari`), router semantik, `panggilModel`, `parseLonggar`, `cekGuardModel`.
- Guard aksi selalu di kode. Graf tanpa blok guard aksi = mode rentan dengan peringatan, tidak pernah diam-diam.
- Skema `dunia` dan `graf` punya `versi` dan pemeriksa (`periksaDunia`, `periksaGraf`). Tidak ada rahasia di JSON.

## Peta berkas

| Berkas | Isi |
|---|---|
| `src/studio/iot.js` | Katalog perangkat, skema dunia, pemeriksa, kelistrikan, Wi-Fi, mesin simulasi |
| `src/studio/graf.js` | Jenis blok dan port bertipe, pemeriksa graf, mesin eksekusi, jejak |
| `src/studio/alat.js` | Tool (sensor, aktuator, kalender, kalkulator, cuaca, logger, waktu, Telegram, penjadwal), parser v2, guard aksi |
| `src/studio/telegram.js` | Klien Telegram |
| `src/studio/ekspor.js` | Kerangka Python agen |
| `src/studio/misi.js` | Level dan misi |
| `src/studio/dunia3d.js` | Adegan 3D dan editor |
| `src/studio/kanvas.js` | Papan blok SVG |
| `src/studio/studio.js` | Perekat UI |
| `src/studio/studio.src.html` | Templat halaman |

## Tonggak

- [x] T1 Skema, katalog, pemeriksa, simulasi, Wi-Fi, listrik + uji
- [x] T2 Mesin graf + tool + parser v2 + guard aksi + uji
- [x] T3 Irisan main: preset rumah, ESP + DHT22 + kipas, chat, agen, balasan (headless dan browser)
- [x] T4 Editor 3D (palet, seret-lepas, kabel, Wi-Fi, hewan dan tanaman)
- [x] T5 Papan blok seret-lepas + inspektur + dashboard + log
- [x] T6 Telegram nyata (+ server tiruan untuk uji)
- [x] T7 Lapisan belajar: misi, kekacauan, lab serangan, kerangka Python, kartu konsep
- [x] T8 Uji lengkap (unit, Playwright seret-lepas, Ollama nyata, sumber daya rendah, regresi v1) + dokumen

## Status

Semua tonggak selesai (lihat `git log`). Belum: token Telegram sungguhan (butuh token pengguna), Open-Meteo nyata.

## TODO: tutorial (ditunda atas permintaan pengguna, 18 November 2026)

- Sudah ada: `materi/kurikulum.json` (6 pertemuan), mesin `src/tutorial.js`, bab Studio di `src/studio/tutorial-studio.js` (Kenalan dan Pertemuan 2 sampai 6), tur Ruang Agen (Pertemuan 1) di `src/game.js`, tombol Tutorial, centang di wizard, lanjut setelah muat ulang.
- Uji `tests/studio/test_tutorial.js`: Kenalan dan Pertemuan 2 lulus jalan penuh. Pertemuan 3 macet: setelah bab berikutnya dimulai, palet masih mode Bangun saat langkah 2 (blok Chat) dicari. Periksa `siapkan: otak` dan urutan `aturMode`.
- Belum: Pertemuan 3 sampai 6 diverifikasi jalan penuh, slide .pptx, serial video dengan skill speak (cek profil suara dulu; jangan jalankan sebelum disetujui pengguna).
