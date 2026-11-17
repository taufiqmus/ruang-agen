# Rencana v2: Studio Rumah Agen

Catatan kerja (untuk pengembang). `v1` (tag `v1`, `index.html`) tetap utuh dan ujinya harus hijau di setiap commit.

## Gagasan

Mahasiswa merakit rumah pintar sendiri dalam 3D (ruang, kebun, kandang, ESP32, sensor, aktuator, kabel, daya, Wi-Fi), lalu merakit otak agennya di papan blok seret-lepas (pemicu, guard, router, orkestrator, agen, RAG, memori, tool, keluaran). Bot Telegram sungguhan. Entri terpisah: `studio.html`.

## Keputusan

- Tampilan hibrida: dunia 3D untuk fisik, panel 2,5D (SVG) di atas dunia untuk papan otak.
- ESP disimulasikan, plus ekspor sketsa Arduino dan kerangka Python (belum dikompilasi bila `arduino-cli` tidak ada).
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
| `src/studio/ekspor.js` | Sketsa Arduino, kerangka Python, daftar belanja |
| `src/studio/misi.js` | Level dan misi |
| `src/studio/dunia3d.js` | Adegan 3D dan editor |
| `src/studio/kanvas.js` | Papan blok SVG |
| `src/studio/studio.js` | Perekat UI |
| `src/studio/studio.src.html` | Templat halaman |

## Tonggak

- [x] T1 Skema, katalog, pemeriksa, simulasi, Wi-Fi, listrik + uji
- [ ] T2 Mesin graf + tool + parser v2 + guard aksi + uji
- [ ] T3 Irisan main: preset rumah, ESP + DHT22 + kipas, chat, agen, balasan (headless dan browser)
- [ ] T4 Editor 3D (palet, seret-lepas, kabel, Wi-Fi, hewan dan tanaman)
- [ ] T5 Papan blok seret-lepas + inspektur + dashboard + log
- [ ] T6 Telegram nyata (+ server tiruan untuk uji)
- [ ] T7 Lapisan belajar: misi, kekacauan, lab serangan, ekspor kode, daftar belanja, kartu konsep
- [ ] T8 Uji lengkap (unit, Playwright seret-lepas, Ollama nyata, sumber daya rendah, regresi v1) + dokumen
