# Catatan Pengembang Ruang Agen

Untuk yang ingin mengubah kode game. Pengguna cukup membaca [PANDUAN.md](PANDUAN.md).

## Isi folder

```
ruang-agen/
  index.html          hasil build (jangan diedit langsung)
  MULAI.bat           satu klik: game dan model AI lokal (Windows)
  mulai.sh            sama, untuk Mac dan Linux
  README.md  PANDUAN.md  UJI.md  PENGEMBANG.md
  build.py            merakit index.html dari src/
  package.json        perintah uji (npm test) dan alat uji browser
  src/                kode game
  server/             server model lokal (Python)
  tests/              semua uji, dengan tests/vendor/three.min.js untuk uji tanpa internet
```

Dibuat otomatis dan tidak masuk git: `.venv/` (Python milik MULAI.bat), `model/` (berkas model), `node_modules/` (alat uji).

| Berkas | Fungsi |
|---|---|
| `src/index.src.html`, `src/game.js` | Template halaman, alur permainan, misi ruang dan semesta, kejadian, pipeline, tab Dunia, Agen, dan Manual |
| `src/dunia.js` | Definisi ruang (data), pemeriksa definisi, fisika suhu dan cahaya, misi deklaratif |
| `src/semesta.js` | Semesta Kampus Nusantara, tiga ruang tambahan, pemeriksa semesta, misi lintas ruang |
| `src/brain.js` | Parser aturan, router (bawaan dan buatan), guardrails, memori, pembagian tugas. Membaca semesta dan ruang aktif |
| `src/manual.js` | Rak manual: retrieval TF-IDF tanpa API, angka dari teks manual, catatan memori, penjelasan skor |
| `src/prompt.js` | Prompt LLM (lengkap dan ringkas) dirakit dari semesta dan ruang aktif |
| `src/router.js` | Router semantik: contoh kalimat per rute (bawaan, dari data ruang, dan `contoh` rute semesta), kemiripan ringan (kata dan trigram huruf) atau vektor embedding, kelompok keputusan |
| `src/brain-llm.js` | `panggilModel` (satu pintu untuk Ollama, server lokal, dan OpenRouter: JSON schema, tool calling, atau teks bebas), validasi skema, retry, router hemat dan semantik, loop tool, embedding dan cache, guard model, RAG hibrida, reranker, ringkasan bergulir, fallback ke parser |
| `src/adegan.js` | Adegan 3D (Three.js r128): material realistis, bayangan, pantulan, mode ringan, totem router dan label agen dari data |
| `server/jalankan.py` | Dipanggil MULAI.bat: menyiapkan `.venv`, memasang paket siap pakai, lalu menjalankan server |
| `server/server_lokal.py` | Server game dan model kecil di satu alamat (llama-cpp-python, CPU). Hanya menyajikan `index.html` dan API `/v1` |

Edit berkas di `src/`, lalu jalankan `python build.py`. Ruang dan semesta bawaan ada di `src/dunia.js` dan `src/semesta.js`.

## Studio Rumah Agen (v2)

Entri terpisah `studio.html`, dirakit `build.py` dari `src/studio/studio.src.html` ditambah modul v1 yang dipakai ulang (manual, dunia, semesta, brain, router, brain-llm) dan modul studio:

| Berkas | Isi |
|---|---|
| `src/studio/iot.js` | Katalog perangkat, skema dunia dan `periksaDunia`, rangkaian (pin, relay, daya), Wi-Fi (RSSI dari jarak dan dinding, repeater), simulasi per menit (suhu, cahaya, tanah, pakan, gas, tandon, baterai, tanaman, ayam), preset |
| `src/studio/alat.js` | Manifest tool (gaya MCP), pelaksana tool, guard aksi, parser bahasa sehari-hari, prompt agen, pelaksana blok Agen (loop tool calling, router hemat, guard klaim tanpa aksi) |
| `src/studio/graf.js` | Jenis blok dan port bertipe, `periksaGraf`, `cekKabel`, deteksi siklus, saran, mesin eksekusi (batas langkah dan anggaran AI), rak bawaan, graf preset |
| `src/studio/telegram.js` | Klien Bot API langsung dari browser (simple request, long polling, 409, daftar izin, penyamaran token) |
| `src/studio/ekspor.js` | Sketsa Arduino per ESP, kerangka Python, daftar belanja |
| `src/studio/misi.js` | 12 misi dan kasus uji agen yang dirakit dari dunia |
| `src/studio/dunia3d.js` | Adegan Three.js, kamera orbit, raycast, kabel, cincin Wi-Fi, LED ESP, hewan dan tanaman |
| `src/studio/kanvas.js` | Papan SVG: seret blok, tarik kabel bertipe, geser dan zoom |
| `src/studio/studio.js` | Perekat UI, loop simulasi, pemicu jadwal dan sensor, semua tab, wizard |

Prinsip v1 tetap berlaku: AI hanya memilih tool; argumen tool divalidasi, guard aksi dan persetujuan di kode; graf tanpa Guard Aksi berjalan sebagai mode rentan dengan peringatan. Skema dunia dan graf punya `versi` dan pemeriksa, dan tidak pernah memuat rahasia. Rencana dan status kerja ada di `RENCANA_V2.md`.

Parameter alamat studio: `?awal=<preset dunia>`, `?graf=<preset graf>`, `?jam=<jam mulai>`, `?cepat=<0|1|10|60>`, `?mode=<bangun|otak|main>`, `?grafis=<ringan|realistis>`, `?tanpaWizard=1`, `?tgbase=<alamat API Telegram tiruan untuk uji>`.

## Prinsip

```
pesan -> guard masukan (kode) -> memori / router buatan (kode) -> RAG: potongan dicari di kode
      -> otak (parser atau LLM) mengusulkan JSON -> validasi skema (kode) -> guard aksi dan interlock (kode)
      -> orkestrator membagi tugas (kode) -> spesialis bertindak -> guard keluaran (kode) -> balasan
      (gagal di mana pun: parser mengambil alih, dan jejaknya tercatat)
```

1. LLM hanya **mengusulkan**. Guard masukan, guard aksi, interlock, router buatan, dan penulisan memori selalu di kode, tidak pernah di prompt.
2. Setiap kegagalan LLM jatuh ke parser dan tercatat di Jejak. Game selalu bisa dimainkan tanpa internet dan tanpa biaya.
3. Semua ruang dan semesta adalah data yang diperiksa pemeriksa (`periksa`, `periksaSemesta`). Batas guard dipotong ke rentang aman, teks dibersihkan, definisi salah tidak pernah menggantikan yang aktif. Guard bisa dimatikan sebagai "mode rentan" untuk belajar, dengan peringatan dan catatan di Jejak.
4. Hanya layanan gratis. Mobile tetap nyaman (tata letak menumpuk di lebar 860px ke bawah).
5. Tidak ada em dash di mana pun. `build.py` memeriksanya.

Kontrak JSON keluaran otak (sama untuk parser dan LLM):
`{intent, sub, rute, diambil[], didelegasikan_ke, memori, catatanGuard[], pikiran, aksi[], ditolak[], baca, fokus, balasan, jejak[], otak}`

`memori` bernilai `null` atau `{jenis}`: `catat` (teks baru ke rak), `ganti` (id, teks), `hapus` (id), `fakta` (kunci `namaAgen` atau `namaPengguna`, nilai), `baca`. Brain hanya mengusulkan; game yang menulis rak dan fakta (`Otak.aturFakta`). Fakta sesi dan riwayat percakapan tidak disimpan di localStorage.

Pipeline lanjutan (semua di `cfg` browser, bukan di semesta, supaya berkas yang dibagikan tidak membawa pengaturan satu laptop): `router` (`aturan`, `semantik`, `embedding`, `tool`), `embedModel`, `guardModel`, `ragMode` (`tfidf` atau `hibrida`), `rerank`, `kutip`, `ringkasRiwayat`, `ingatBertahan`. Urutan di `pikirAsync`:

1. Guard model (hanya bila guard regex tidak menangkap apa pun; hanya menambah penolakan).
2. RAG hibrida: vektor kueri dan bab dihitung, lalu `Manual.cari` menggabungkan peringkat TF-IDF dan kosinus lewat reciprocal rank fusion. `ambang` tetap hanya untuk TF-IDF; bab dengan kosinus di atas `minKos` (0,45) ikut lolos.
3. Router semantik: kelompok `parser` (perangkat, sensor, manual, memori), `llm` (obrolan), atau `kode` (kemampuan, rute buatan non-tolak; butuh skor tinggi dan selisih 0,05 dari rute kedua). Untuk kelompok parser, hasil parser diterima hanya bila sejalan dengan rute pilihan router; bila tidak, AI yang memutuskan.
4. Lapisan aturan: guard masukan, rute buatan, memori, kemampuan, kuota.
5. Mode tool (maksimal 3 langkah; `cari_manual` mengembalikan potongan ke model), router semantik, atau router hemat.
6. Reranker (kandidat dibatasi ke id yang ada), lalu panggilan JSON biasa.

Setiap lapisan yang butuh Ollama jatuh ke cara biasa bila gagal dan mencatat alasannya di Jejak. Prompt bawaan dikunci oleh `tests/fixtures/prompt_bawaan.json`: dengan semua pilihan mati, prompt harus identik byte per byte.

Field semesta baru: `router.rute[].contoh` (maksimal 8 kalimat, 80 karakter) dan `guard.persetujuan.aktif` (bawaan `false`).

Context window: game mengirim `opsi.riwayat` (pasangan `{u, a}`) ke `OtakLLM.pikirAsync`. Riwayat berpola injeksi dibuang, lalu sisanya masuk prompt sebagai blok DATA. `opsi.saatLLM` dipanggil tepat sebelum inferensi (animasi titik tiga). Router hemat meneruskan klarifikasi ke LLM bila ada riwayat, dan meneruskan pertanyaan obrolan bila `agen.ngobrol` hidup (`Otak.cocokObrolan`).

## Model lokal

`MULAI.bat` mencari Python 3.10 sampai 3.12 (`py` launcher, lalu `python`), menawarkan pemasangan Python 3.12 lewat winget bila tidak ada, lalu menjalankan `server/jalankan.py`. Skrip itu membuat `.venv`, memasang paket dengan `--only-binary=:all:` (tidak butuh compiler), mengunduh model Qwen2.5 Instruct Q4_K_M ke `model/`, dan menjalankan `server/server_lokal.py`. Game dan API berada di satu alamat, jadi tidak ada CORS, dan game mendeteksi `/v1/models` lalu beralih ke model lokal selama pengguna belum memilih otak sendiri.

Strategi untuk model kecil: prompt ringkas yang dirakit dari ruang aktif, keluaran dipaksa lewat grammar JSON schema berisi daftar perangkat ruang, dan router hemat (parser mengerjakan pesan yang dikenalnya, model hanya untuk pesan baru). Model kecil sangat peka terhadap redaksi prompt: setiap perubahan `src/prompt.js` perlu diukur ulang dengan `tests/live_check.js`.

Variabel lingkungan untuk uji: `RUANG_PYTHON` (paksa Python tertentu di MULAI.bat), `RUANG_TANPA_BROWSER=1` (jangan buka browser). Parameter alamat: `?grafis=ringan|realistis`, `?kejadian=mati`.

## Build dan uji

```bash
python build.py          # menghasilkan index.html dari src/
npm install              # sekali: alat uji browser (playwright-core, memakai Chrome atau Edge yang sudah terpasang)
npm test                 # uji tanpa jaringan: parser, RAG, dunia, semesta, otak LLM tiruan
npm run test:browser     # uji alur browser, semesta, dan simulasi perangkat lemah
npm run test:studio      # uji studio tanpa jaringan: dunia IoT, papan otak, tool, Telegram tiruan, ekspor, misi
npm run test:studio:browser   # uji browser studio (seret-lepas, kabel, Telegram dan Ollama tiruan, HP) dan perangkat lemah
```

Uji satu per satu ada di `tests/` (misalnya `node tests/test_semesta.js`). Chrome dicari otomatis, atau tentukan lewat `CHROME=<jalur>`.

Uji nyata (butuh layanan sungguhan):

```bash
node tests/test_mulai_live.js                                  # setelah MULAI.bat berjalan: browser baru langsung memakai model lokal
OPENROUTER_API_KEY=sk-or-... node tests/live_check.js         # 15 pesan dasar ke OpenRouter (kunci lewat variabel lingkungan)
SUITE=ruang RUANG=kafe LOKAL=http://127.0.0.1:8000/v1 RINGKAS=1 RUTE=hemat node tests/live_check.js lokal   # ke model MULAI.bat
OLLAMA=1 SUITE=semua node tests/live_check.js qwen2.5:1.5b    # ke Ollama
OLLAMA=1 node tests/test_browser_live.js                       # Ollama dari browser
```

Jangan menyimpan kunci di berkas. Hasil dan batas pengujian ada di [UJI.md](UJI.md).
