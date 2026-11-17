/* Semesta (universe): kumpulan ruang beserta SELURUH perilaku agennya, semuanya data yang bisa diubah.
   Satu semesta memuat: cerita, kepribadian agen, orkestrator, router (rute buatan sendiri), RAG (pengetahuan bersama,
   jumlah potongan, ambang, sinonim), guardrails (lapisan masukan, aksi, interlock, keluaran), kejadian acak, dan misi lintas ruang.
   Ruang-ruangnya didefinisikan di dunia.js dan berkas ini. Pemeriksa di bawah menjaga semuanya tetap aman dan terbaca. */
(function (root) {
  'use strict';
  const D = root.Dunia || (typeof require === 'function' ? require('./dunia.js') : null);
  const { teks, bil, warna, OK_ID, OK_KATA, punya } = D;

  /* ---------- tiga ruang tambahan ---------- */
  D.RUANG.perpus = {
    id: 'perpus', nama: 'Perpustakaan Cahaya', deskripsi: 'Perpustakaan kampus dengan robot pustakawan. Surganya RAG: hampir semua jawaban ada di katalog.',
    tema: { lantai: 'kayu', dinding: '#efe8dc', aksen: '#5a6bd8' },
    ambien: { suhu: 29, cahaya: 40 },
    perangkat: {
      lampu: { tipe: 'saklar', nama: 'Lampu baca', kata: ['lampu', 'lampu baca'], spesialis: 'Cahaya', peran: 'cahaya', bentuk: 'lampu_gantung', efek: { cahaya: 300 } },
      ac: { tipe: 'level', nama: 'AC', kata: ['ac', 'pendingin'], spesialis: 'Suhu', peran: 'dingin', bentuk: 'ac', maks: 3, efek: { suhu: -2.4 } },
      pintu: { tipe: 'buka', nama: 'Pintu perpustakaan', kata: ['pintu'], spesialis: 'Petugas', peran: 'udara', bentuk: 'pintu', efek: { suhu: -1, cahaya: 70 } },
      tirai: { tipe: 'buka', nama: 'Tirai jendela', kata: ['tirai', 'gorden'], spesialis: 'Petugas', bentuk: 'tirai', efek: { cahaya: 90 } },
      robot: { tipe: 'mesin', nama: 'Robot pustakawan', kata: ['robot', 'pustakawan'], spesialis: 'Pustakawan', bentuk: 'lengan', batasDaya: 40, batasSudut: 100, satuan: 'kecepatan' }
    },
    interlock: [{ larang: 'robot', saat: 'pintu', pesan: 'Robot pustakawan tidak boleh bergerak saat pintu terbuka, ada pengunjung yang lewat.', saran: 'Tutup pintu dulu.' }],
    alias: { 'ambilkan buku': 'nyalakan robot', 'ambil buku': 'nyalakan robot' },
    keluhan: [
      { kata: ['ngantuk', 'mengantuk'], alasan: 'perlu terang dan sejuk supaya melek', aksi: [{ device: 'lampu', op: 'on' }, { device: 'ac', op: 'on', speed: 1 }] },
      { kata: ['kurang jelas', 'buram'], alasan: 'bacaan butuh cahaya', aksi: [{ device: 'lampu', op: 'on' }, { device: 'tirai', op: 'open' }] }
    ],
    kataManual: ['buku', 'pinjam', 'denda', 'katalog', 'novel', 'skripsi', 'jurnal', 'rak', 'koleksi', 'perpanjang'],
    manual: [
      { id: 'suhu', judul: 'Suhu ruang baca', teks: 'Suhu nyaman ruang baca adalah 24 sampai 26 C supaya pembaca tidak mengantuk.', koleksi: 'perpus' },
      { id: 'cahaya', judul: 'Cahaya ruang baca', teks: 'Cahaya ruang baca minimal 300 lux. Jika kurang dari itu, nyalakan lampu baca dan buka tirai.', koleksi: 'perpus' },
      { id: 'pinjam', judul: 'Aturan peminjaman', teks: 'Mahasiswa boleh meminjam 5 buku selama 14 hari. Perpanjangan bisa 1 kali selama buku tidak dipesan orang lain.', koleksi: 'perpus' },
      { id: 'denda', judul: 'Denda keterlambatan', teks: 'Denda keterlambatan Rp1.000 per buku per hari. Buku hilang diganti dengan buku yang sama atau denda 2 kali harga buku.', koleksi: 'perpus' },
      { id: 'jam', judul: 'Jam layanan', teks: 'Perpustakaan buka Senin sampai Jumat pukul 08.00 sampai 20.00 dan Sabtu pukul 09.00 sampai 14.00. Minggu dan tanggal merah tutup.', koleksi: 'perpus' },
      { id: 'katalog_ai', judul: 'Katalog buku AI', teks: 'Rak C3 berisi buku AI: Hands-On Machine Learning (Geron), Deep Learning with Python (Chollet), dan Prompt Engineering untuk Pemula. Semuanya boleh dipinjam.', koleksi: 'perpus' },
      { id: 'katalog_fiksi', judul: 'Katalog fiksi', teks: 'Rak F1 berisi novel Laskar Pelangi, Bumi Manusia, dan Negeri 5 Menara. Novel Bumi Manusia selalu ramai dipesan, antre dua minggu.', koleksi: 'perpus' },
      { id: 'skripsi', judul: 'Cek skripsi dan plagiasi', teks: 'Cek kemiripan skripsi gratis di meja layanan lantai 2. Batas kemiripan yang diterima prodi adalah 25 persen. Bawa berkas PDF di flashdisk.', koleksi: 'perpus' },
      { id: 'jurnal', judul: 'Akses jurnal', teks: 'Jurnal berlangganan diakses lewat VPN kampus dengan akun mahasiswa. Dari luar kampus wajib VPN, kalau tidak, artikel hanya tampil abstraknya.', koleksi: 'perpus' },
      { id: 'diskusi', judul: 'Ruang diskusi', teks: 'Ruang diskusi di lantai 2 bisa dipesan maksimal 2 jam untuk 3 sampai 8 orang. Pesan lewat meja layanan satu hari sebelumnya.', koleksi: 'perpus' },
      { id: 'etika', judul: 'Tata tertib', teks: 'Dilarang makan, minum, dan menelepon di ruang baca. Ponsel dalam mode senyap. Tas besar dititipkan di loker.', koleksi: 'perpus' },
      { id: 'robot_p', judul: 'Robot pustakawan', teks: 'Robot pustakawan mengambil buku dari rak tinggi. Kecepatan maksimal 40 persen dan sudut 100 derajat, dan hanya bergerak saat pintu tertutup.', koleksi: 'perpus' }
    ],
    contoh: ['nyalakan lampu dan buka tirai', 'ngantuk banget', 'ambilkan buku', 'denda telat berapa?', 'buku AI ada di rak mana?', 'cek plagiasi skripsi di mana?', 'buka pintu lalu nyalakan robot'],
    misi: [
      { judul: 'Buka Perpustakaan', base: 100, badge: 'pustakawan_p', brief: 'Jam buka tiba. Nyalakan lampu baca, buka tirai, dan buka pintu perpustakaan.', hints: ['Tiga perangkat bisa satu pesan: "nyalakan lampu dan buka tirai dan pintu".'], target: { perangkat: { lampu: { on: true }, tirai: { open: true }, pintu: { open: true } } } },
      { judul: 'Ruang Baca Ideal', base: 150, brief: 'Pembaca mengeluh gerah dan kurang terang. Buat suhu 26 C atau kurang dan cahaya 300 lux atau lebih, tanpa menyebut nama perangkat.', hints: ['Coba "bikin nyaman". Agen membaca batas suhu dari rak manual.'], target: { suhuMaks: 26, cahayaMin: 300 } },
      { judul: 'Pencari Buku', base: 200, brief: 'Seorang mahasiswa mencari buku AI. Tanyakan lokasinya ke agen (jawab dari katalog) dengan paling banyak 3 pesan.', hints: ['Tanya: "buku AI ada di rak mana?"', 'Kata kunci "katalog" membantu pencarian.'], target: { ambil: 'katalog_ai', maksPesan: 3 } },
      { judul: 'Robot Aman', base: 250, brief: 'Suruh robot pustakawan mengambil buku. Pastikan pintu tertutup dulu, dan buktikan guard menolak kecepatan berlebih.', hints: ['Coba "ambilkan buku" saat pintu terbuka: interlock menolak.', 'Lalu "nyalakan robot 90%": ditolak batas 40%.'], target: { perangkat: { robot: { on: true } }, tolakMin: 2 } }
    ]
  };

  D.RUANG.dapur = {
    id: 'dapur', nama: 'Dapur Kantin', deskripsi: 'Dapur kantin kampus pukul 11 siang. Panas, ramai, dan listriknya terbatas.',
    tema: { lantai: 'ubin', dinding: '#f5efe2', aksen: '#d9632b' },
    ambien: { suhu: 31, cahaya: 60 },
    perangkat: {
      lampu: { tipe: 'saklar', nama: 'Lampu dapur', kata: ['lampu'], spesialis: 'Cahaya', peran: 'cahaya', bentuk: 'lampu_gantung', efek: { cahaya: 280 } },
      exhaust: { tipe: 'level', nama: 'Exhaust', kata: ['exhaust', 'penyedot', 'kipas'], spesialis: 'Udara', peran: 'dingin', bentuk: 'kipas', maks: 3, efek: { suhu: -1.8 } },
      pintu: { tipe: 'buka', nama: 'Pintu pantry', kata: ['pintu', 'pantry'], spesialis: 'Udara', peran: 'udara', bentuk: 'pintu', efek: { suhu: -1.2, cahaya: 50 } },
      kompor: { tipe: 'level', nama: 'Kompor', kata: ['kompor', 'api'], spesialis: 'Koki', bentuk: 'kotak', maks: 5, efek: { suhu: 1.6 } },
      oven: { tipe: 'mesin', nama: 'Oven', kata: ['oven'], spesialis: 'Koki', bentuk: 'mesin_kopi', batasDaya: 80, satuan: 'daya' }
    },
    interlock: [
      { larang: 'oven', saat: 'kompor', pesan: 'Listrik dapur tidak kuat: oven tidak boleh menyala saat kompor menyala.', saran: 'Matikan kompor dulu.' },
      { larang: 'kompor', saat: 'oven', pesan: 'Listrik dapur tidak kuat: kompor tidak boleh menyala saat oven menyala.', saran: 'Matikan oven dulu.' }
    ],
    alias: { 'masak nasi goreng': 'nyalakan kompor', 'panggang': 'nyalakan oven' },
    keluhan: [{ kata: ['gosong', 'asap'], alasan: 'api terlalu besar dan udara perlu dibuang', aksi: [{ device: 'kompor', op: 'off' }, { device: 'exhaust', op: 'on', speed: 3 }] }],
    kataManual: ['resep', 'menu', 'harga', 'bahan', 'alergi', 'higienis', 'porsi'],
    manual: [
      { id: 'suhu', judul: 'Suhu dapur', teks: 'Suhu dapur yang masih aman bagi koki adalah 28 sampai 32 C. Di atas itu koki mudah pusing, nyalakan exhaust.', koleksi: 'kantin' },
      { id: 'cahaya', judul: 'Cahaya dapur', teks: 'Cahaya area memasak minimal 250 lux supaya pisau dan api terlihat jelas.', koleksi: 'kantin' },
      { id: 'nasgor', judul: 'Resep nasi goreng kampus', teks: 'Nasi goreng kampus: 1 piring nasi dingin, 2 siung bawang putih, 1 telur, kecap manis 1 sendok, api sedang di kompor level 3. Masak 4 menit.', koleksi: 'kantin' },
      { id: 'kompor_p', judul: 'Level kompor', teks: 'Kompor punya level 1 sampai 5. Level 1 sampai 2 untuk merebus, level 3 untuk menumis, level 4 sampai 5 untuk menggoreng cepat.', koleksi: 'kantin' },
      { id: 'oven_p', judul: 'Daya oven', teks: 'Oven maksimal daya 80 persen. Kue brownies dipanggang di daya 60 persen selama 35 menit.', koleksi: 'kantin' },
      { id: 'listrik', judul: 'Batas listrik', teks: 'Daya listrik kantin hanya cukup untuk satu alat berat: kompor atau oven, tidak boleh bersamaan, kalau tidak MCB turun.', koleksi: 'kantin' },
      { id: 'higienis', judul: 'Higienitas', teks: 'Koki wajib mencuci tangan, memakai penutup rambut, dan memisahkan talenan daging dari talenan sayur. Bahan basi dibuang paling lambat jam 15.00.', koleksi: 'kantin' },
      { id: 'menu', judul: 'Menu dan harga', teks: 'Menu hari ini: nasi goreng Rp12.000, mie ayam Rp10.000, brownies Rp8.000, es teh Rp3.000. Harga mahasiswa berlaku untuk semua menu.', koleksi: 'kantin' },
      { id: 'alergi', judul: 'Alergen', teks: 'Brownies mengandung kacang dan susu. Mie ayam mengandung gluten. Beri tahu pembeli yang bertanya soal alergi.', koleksi: 'kantin' },
      { id: 'jam_k', judul: 'Jam kantin', teks: 'Kantin buka pukul 07.00 sampai 16.00. Jam paling ramai pukul 11.30 sampai 13.00, siapkan 2 kali porsi.', koleksi: 'kantin' }
    ],
    contoh: ['nyalakan lampu dan exhaust', 'masak nasi goreng', 'panggang', 'panas banget nih', 'resep nasi goreng apa?', 'kenapa kompor dan oven tidak boleh bareng?', 'asap banget'],
    misi: [
      { judul: 'Dapur Siap', base: 100, badge: 'koki', brief: 'Pagi hari. Nyalakan lampu dan exhaust, lalu buka pintu pantry untuk sirkulasi.', hints: ['"nyalakan lampu dan exhaust dan buka pintu".'], target: { perangkat: { lampu: { on: true }, exhaust: { on: true }, pintu: { open: true } } } },
      { judul: 'Resep Rahasia', base: 150, brief: 'Tanya resep nasi goreng ke agen (jawab dari rak), lalu masak dengan kompor level 3 sesuai resep.', hints: ['Tanya: "resep nasi goreng apa?"', 'Lalu: "nyalakan kompor level 3".'], target: { ambil: 'nasgor', perangkat: { kompor: { on: true, speed: 3 } } } },
      { judul: 'Listrik Tidak Kuat', base: 200, brief: 'Pancing interlock listrik: nyalakan kompor, lalu coba nyalakan oven.', hints: ['"nyalakan kompor" lalu "nyalakan oven".'], target: { perangkat: { kompor: { on: true } }, tolakMin: 1 } },
      { judul: 'Jam Sibuk', base: 250, brief: 'Jam makan siang. Panggang brownies dulu, baru masak nasi goreng, secara berurutan dalam satu pesan.', hints: ['Kata "lalu" memecah tahap. Interlock memaksa oven mati dulu: "panggang lalu matikan oven lalu masak nasi goreng".'], target: { urutan: ['oven', 'kompor'] } }
    ]
  };

  D.RUANG.kebun = {
    id: 'kebun', nama: 'Kebun Hidroponik', deskripsi: 'Rumah kaca hidroponik fakultas pertanian. Tanaman selada menunggu cahaya, air, dan udara yang tepat.',
    tema: { lantai: 'beton', dinding: '#e6f0e4', aksen: '#2f9e62' },
    ambien: { suhu: 33, cahaya: 80 },
    perangkat: {
      tumbuh: { tipe: 'saklar', nama: 'Lampu tumbuh', kata: ['lampu', 'lampu tumbuh', 'grow light'], spesialis: 'Cahaya', peran: 'cahaya', bentuk: 'ring_light', efek: { cahaya: 360 } },
      kipas: { tipe: 'level', nama: 'Kipas', kata: ['kipas', 'angin'], spesialis: 'Udara', peran: 'dingin', bentuk: 'kipas', maks: 3, efek: { suhu: -2.3 } },
      pintu: { tipe: 'buka', nama: 'Pintu rumah kaca', kata: ['pintu'], spesialis: 'Udara', peran: 'udara', bentuk: 'pintu', efek: { suhu: -1.5, cahaya: 60 } },
      pompa: { tipe: 'level', nama: 'Pompa nutrisi', kata: ['pompa', 'air', 'nutrisi'], spesialis: 'Air', bentuk: 'kotak', maks: 3 },
      naungan: { tipe: 'buka', nama: 'Naungan', kata: ['naungan', 'paranet', 'peneduh'], spesialis: 'Air', bentuk: 'tirai', efek: { suhu: -1, cahaya: -70 } }
    },
    interlock: [{ larang: 'pompa', saat: 'pintu', pesan: 'Pompa nutrisi tidak boleh menyala saat pintu terbuka, nutrisi menguap dan serangga masuk.', saran: 'Tutup pintu rumah kaca dulu.' }],
    alias: { 'siram': 'nyalakan pompa', 'kasih nutrisi': 'nyalakan pompa' },
    keluhan: [{ kata: ['layu', 'lemas'], alasan: 'tanaman butuh air dan cahaya', aksi: [{ device: 'pompa', op: 'on', speed: 2 }, { device: 'tumbuh', op: 'on' }] }],
    kataManual: ['selada', 'bayam', 'panen', 'ph', 'nutrisi', 'hama', 'bibit', 'tanam'],
    manual: [
      { id: 'suhu', judul: 'Suhu rumah kaca', teks: 'Suhu ideal selada hidroponik adalah 22 sampai 27 C. Di atas 30 C selada cepat berbunga dan rasanya pahit.', koleksi: 'kebun' },
      { id: 'cahaya', judul: 'Cahaya tanaman', teks: 'Selada butuh cahaya minimal 300 lux selama 12 jam sehari. Nyalakan lampu tumbuh bila mendung.', koleksi: 'kebun' },
      { id: 'selada', judul: 'Budidaya selada', teks: 'Selada dipanen 30 sampai 35 hari setelah semai. Jarak antar lubang netpot 15 cm. Pilih bibit selada keriting untuk pasar kampus.', koleksi: 'kebun' },
      { id: 'ph', judul: 'pH larutan nutrisi', teks: 'pH larutan nutrisi selada dijaga 5,8 sampai 6,5. Di luar rentang itu akar sulit menyerap nutrisi. Cek pH setiap pagi.', koleksi: 'kebun' },
      { id: 'pompa_p', judul: 'Jadwal pompa', teks: 'Pompa nutrisi menyala level 2 selama 15 menit tiap jam di siang hari. Level 3 hanya saat cuaca panas.', koleksi: 'kebun' },
      { id: 'hama', judul: 'Hama dan penyakit', teks: 'Hama utama adalah kutu daun dan ulat. Gunakan insektisida nabati dari bawang putih dan tutup pintu rumah kaca setelah masuk supaya serangga tidak ikut.', koleksi: 'kebun' },
      { id: 'panen', judul: 'Cara panen', teks: 'Panen pagi hari sebelum jam 09.00 agar daun segar. Potong di atas akar, cuci dengan air mengalir, simpan di kulkas 4 C.', koleksi: 'kebun' },
      { id: 'jual', judul: 'Penjualan', teks: 'Selada dijual ke kantin kampus Rp15.000 per kilogram. Pesanan minimal 2 kilogram, diantar hari Selasa dan Jumat.', koleksi: 'kebun' }
    ],
    contoh: ['nyalakan lampu tumbuh dan kipas', 'siram', 'tanaman layu', 'pH nutrisi berapa?', 'kapan panen selada?', 'gerah nih', 'nyalakan pompa saat pintu terbuka'],
    misi: [
      { judul: 'Rumah Kaca Hidup', base: 100, badge: 'petani', brief: 'Nyalakan lampu tumbuh dan kipas dengan satu pesan.', hints: ['Dua spesialis bekerja paralel.'], target: { perangkat: { tumbuh: { on: true }, kipas: { on: true } }, paralelMin: 2 } },
      { judul: 'Suhu Selada', base: 150, brief: 'Turunkan suhu rumah kaca sampai 27 C atau kurang tanpa menyebut nama perangkat.', hints: ['"bikin nyaman" membaca batas dari rak.'], target: { suhuMaks: 27 } },
      { judul: 'Nutrisi Tepat', base: 200, brief: 'Tanya pH ideal ke agen, lalu nyalakan pompa nutrisi level 2 sesuai jadwal.', hints: ['"pH nutrisi berapa?" lalu "nyalakan pompa level 2".'], target: { ambil: 'ph', perangkat: { pompa: { on: true, speed: 2 } } } },
      { judul: 'Rumah Kaca Aman', base: 250, brief: 'Buka pintu, lalu coba nyalakan pompa. Guard harus menolak, lalu tutup pintu dan nyalakan pompa.', hints: ['Interlock: pompa tidak boleh menyala saat pintu terbuka.'], target: { perangkat: { pompa: { on: true }, pintu: { open: false } }, tolakMin: 1 } }
    ]
  };

  /* ---------- semesta bawaan: Kampus Nusantara ---------- */
  const SPES_WARNA = { Cahaya: '#ffc928', Suhu: '#1fb67f', Keamanan: '#ff5a47', Vibes: '#8a4bff', Barista: '#8a4bff', Siaran: '#8a4bff', Petugas: '#ff5a47', Pustakawan: '#8a4bff', Udara: '#1fb67f', Koki: '#ff5a47', Air: '#2f5bff' };
  const KAMPUS = {
    id: 'kampus', nama: 'Kampus Nusantara',
    cerita: 'Kamu adalah pengelola AI di Kampus Nusantara. Enam ruang menunggu: lab, kafe, studio, perpustakaan, kantin, dan kebun. Tiap ruang punya agen penjaga yang pintar tetapi harus dijaga aturannya. Selesaikan misi, jawab pertanyaan lewat rak pengetahuan, dan hadapi kejadian tak terduga.',
    agen: { nama: 'Agen', persona: 'penjaga ruangan yang ramah dan sigap', sapaan: '', siap: 'Siap!', tolak: 'Aku tolak:', gaya: 'santai', warna: '#2f5bff' },
    orkestrator: { nama: 'Orkestrator', strategi: 'otomatis', spesialis: SPES_WARNA },
    router: {
      rute: [
        { id: 'kampus', nama: 'KAMPUS', kata: ['kampus', 'semester', 'dosen wali', 'krs', 'ukt', 'beasiswa', 'wisuda'], aksi: 'manual', koleksi: 'kampus', warna: '#2f5bff' },
        { id: 'akademik', nama: 'AKADEMIK', kata: ['skripsi', 'plagiasi', 'ipk', 'transkrip', 'sidang'], aksi: 'manual', koleksi: 'akademik', warna: '#8a4bff' },
        { id: 'curhat', nama: 'CURHAT', kata: ['curhat', 'galau', 'stres', 'burnout', 'capek banget'], aksi: 'balas', intent: 'obrol', balasan: 'Aku dengerin. Tarik napas dulu ya. Kalau terasa berat, bicaralah dengan dosen wali atau layanan konseling kampus. Jawaban ini dari aturan tetap di router, bukan dari AI.', warna: '#1fb67f' },
        { id: 'dilarang', nama: 'DILARANG', kata: ['nyontek', 'contek', 'joki', 'bocoran soal', 'beli skripsi'], aksi: 'tolak', balasan: 'Itu melanggar integritas akademik, jadi aku tidak membantu. Mau kubantu belajar atau cari referensi saja?', warna: '#ff5a47' }
      ]
    },
    rag: { k: 2, ambang: 0.8, sinonim: { ukt: 'biaya', spp: 'biaya', ngutang: 'denda', telat: 'denda', tugas: 'skripsi' }, stop: [] },
    guard: { input: { aktif: true, pola: [] }, aksi: { aktif: true }, interlock: { aktif: true }, output: { aktif: false, kata: [] }, memori: { aktif: true } },
    pengetahuan: [
      { id: 'kampus_wifi', judul: 'Wifi kampus', teks: 'Wifi kampus bernama Nusantara-Mhs. Login memakai NIM dan kata sandi portal. Kecepatan dibatasi 20 Mbps per mahasiswa, dan dibuka penuh pukul 22.00 sampai 05.00.', koleksi: 'kampus' },
      { id: 'kampus_ukt', judul: 'Biaya kuliah (UKT)', teks: 'UKT dibayar paling lambat minggu kedua semester lewat virtual account. Keringanan UKT diajukan ke bagian kemahasiswaan dengan slip gaji orang tua.', koleksi: 'kampus' },
      { id: 'kampus_beasiswa', judul: 'Beasiswa', teks: 'Beasiswa prestasi diberikan untuk IPK minimal 3,5. Pendaftaran dibuka tiap Februari dan Agustus lewat portal kemahasiswaan.', koleksi: 'kampus' },
      { id: 'kampus_krs', judul: 'Pengisian KRS', teks: 'KRS diisi pada pekan pertama semester. Maksimal 24 SKS untuk IPK di atas 3,0 dan 20 SKS untuk IPK di bawahnya. Konsultasi dulu dengan dosen wali.', koleksi: 'kampus' },
      { id: 'kampus_wisuda', judul: 'Wisuda', teks: 'Wisuda dilaksanakan dua kali setahun, Maret dan September. Syaratnya lulus sidang, bebas pustaka, dan lunas UKT.', koleksi: 'kampus' },
      { id: 'kampus_parkir', judul: 'Parkir', teks: 'Parkir motor mahasiswa di gedung C, gratis dengan stiker kampus. Mobil parkir di lapangan timur, Rp3.000 sekali masuk.', koleksi: 'kampus' },
      { id: 'kampus_klinik', judul: 'Klinik kampus', teks: 'Klinik kampus buka pukul 08.00 sampai 15.00 di gedung A lantai 1. Mahasiswa mendapat pemeriksaan umum gratis dengan kartu mahasiswa.', koleksi: 'kampus' },
      { id: 'kampus_konseling', judul: 'Layanan konseling', teks: 'Layanan konseling gratis dan rahasia di gedung kemahasiswaan, Senin sampai Kamis pukul 09.00 sampai 14.00. Bisa daftar lewat WhatsApp kemahasiswaan.', koleksi: 'kampus' },
      { id: 'kampus_ormawa', judul: 'Organisasi mahasiswa', teks: 'Kampus punya 24 organisasi mahasiswa: BEM, UKM musik, robotika, fotografi, dan pecinta alam. Pendaftaran anggota baru tiap awal semester di lapangan tengah.', koleksi: 'kampus' },
      { id: 'kampus_magang', judul: 'Magang dan KKN', teks: 'Magang industri berlangsung 4 bulan pada semester 6 dan bernilai 4 SKS. KKN dilaksanakan 1 bulan di desa binaan pada semester 7, lokasinya diundi.', koleksi: 'kampus' },
      { id: 'kampus_cuti', judul: 'Cuti akademik', teks: 'Cuti akademik diajukan paling lambat 2 minggu sebelum semester berjalan, maksimal 2 semester selama studi, dan tidak dihitung sebagai masa studi.', koleksi: 'kampus' },
      { id: 'kampus_kalender', judul: 'Kalender akademik', teks: 'Semester ganjil dimulai September dan berakhir Januari. Semester genap dimulai Februari dan berakhir Juni. UTS pekan ke-8 dan UAS pekan ke-16.', koleksi: 'kampus' },
      { id: 'kampus_labkom', judul: 'Laboratorium komputer', teks: 'Lab komputer di gedung B lantai 3 buka pukul 08.00 sampai 18.00 dan menyediakan 60 komputer. Mahasiswa boleh memakai di luar jam praktikum dengan izin laboran.', koleksi: 'kampus' },
      { id: 'kampus_asrama', judul: 'Asrama', teks: 'Asrama putra dan putri menyediakan 400 kamar untuk mahasiswa tahun pertama. Biaya Rp600.000 per bulan sudah termasuk listrik dan wifi. Pendaftaran bulan Juli.', koleksi: 'kampus' },
      { id: 'kampus_bus', judul: 'Bus kampus', teks: 'Bus kampus beroperasi pukul 06.30 sampai 18.30 dengan rute stasiun, asrama, dan gedung kuliah, tiap 20 menit. Gratis dengan kartu mahasiswa.', koleksi: 'kampus' },
      { id: 'kampus_hki', judul: 'Hak cipta karya', teks: 'Karya mahasiswa seperti aplikasi dan video bisa didaftarkan hak cipta lewat lembaga inovasi. Pendaftaran gratis untuk satu karya per semester.', koleksi: 'kampus' },
      { id: 'kampus_pkm', judul: 'Hibah PKM', teks: 'Program Kreativitas Mahasiswa menyediakan dana sampai Rp10 juta per tim, tiga sampai lima anggota. Proposal dikumpulkan bulan Maret lewat portal kemahasiswaan.', koleksi: 'kampus' },
      { id: 'kampus_dosenwali', judul: 'Dosen wali', teks: 'Setiap mahasiswa punya dosen wali yang menyetujui KRS dan menjadi tempat berkonsultasi soal studi. Temui dosen wali minimal sekali per semester.', koleksi: 'kampus' },
      { id: 'akad_kehadiran', judul: 'Kehadiran kuliah', teks: 'Kehadiran minimal 75 persen untuk boleh mengikuti UAS. Izin sakit wajib disertai surat dokter yang diserahkan paling lambat 3 hari setelah sakit.', koleksi: 'akademik' },
      { id: 'akad_remedial', judul: 'Perbaikan nilai', teks: 'Nilai D dan E dapat diperbaiki lewat semester pendek dengan biaya Rp100.000 per SKS, atau mengulang kuliah di semester reguler.', koleksi: 'akademik' },
      { id: 'akad_skripsi', judul: 'Alur skripsi', teks: 'Alur skripsi: pengajuan judul, seminar proposal, penelitian, seminar hasil, lalu sidang. Satu dosen pembimbing utama dan satu pendamping.', koleksi: 'akademik' },
      { id: 'akad_plagiasi', judul: 'Batas plagiasi', teks: 'Batas kemiripan skripsi maksimal 25 persen. Pengecekan dilakukan di perpustakaan lantai 2 sebelum seminar hasil.', koleksi: 'akademik' },
      { id: 'akad_ipk', judul: 'Perhitungan IPK', teks: 'IPK dihitung dari jumlah nilai mutu dikali SKS dibagi total SKS. Nilai A bernilai 4, B 3, C 2, D 1. Mata kuliah mengulang memakai nilai terbaru.', koleksi: 'akademik' },
      { id: 'akad_sidang', judul: 'Syarat sidang', teks: 'Syarat sidang skripsi: IPK minimal 2,5, tidak ada nilai E, minimal 140 SKS, dan skor bahasa Inggris minimal 400.', koleksi: 'akademik' }
    ],
    ruang: ['lab', 'kafe', 'studio', 'perpus', 'dapur', 'kebun'],
    awal: 'lab',
    misi: [
      { judul: 'Tur Kampus', base: 150, badge: 'penjelajah', brief: 'Kenali kampusmu. Kunjungi paling sedikit 3 ruang berbeda lewat tab Dunia.', hints: ['Pilih ruang di tab Dunia, dan tiap ruang punya agen yang berbeda.'], target: { ruangDikunjungi: 3 } },
      { judul: 'Ahli Pengetahuan', base: 200, brief: 'Rak pengetahuan menyimpan banyak hal. Buka 8 bab berbeda dari rak lewat pertanyaan, di ruang mana pun.', hints: ['Tanyakan jadwal, resep, denda, pH, beasiswa. Tiap bab yang terambil dihitung sekali.'], target: { babUnik: 8 } },
      { judul: 'Jagoan Router', base: 200, brief: 'Router punya rute buatan. Picu dua rute berbeda, misalnya pertanyaan kampus dan keluhan curhat.', hints: ['"beasiswa apa saja?" memakai rute KAMPUS. "aku stres" memakai rute CURHAT. "joki skripsi" memakai rute DILARANG.'], target: { rutePakai: 2 } },
      { judul: 'Tahan Banting', base: 250, brief: 'Hadapi satu kejadian tak terduga (listrik padam atau gelombang panas) dan bertahan.', hints: ['Kejadian muncul setelah beberapa pesan atau saat masuk ruang tertentu. Lihat tab Agen untuk daftarnya.'], target: { kejadianSelesai: 1 } },
      { judul: 'Mahasiswa Teladan', base: 400, badge: 'teladan', brief: 'Selesaikan paling sedikit 4 misi ruang di seluruh kampus.', hints: ['Setiap ruang punya 4 sampai 6 misi. Kemajuan tercatat di tab Misi.'], target: { misiSelesai: 4 } }
    ],
    kejadian: [
      { id: 'padam', nama: 'Listrik padam', pemicu: { pesanKe: 6 }, efek: { matikan: ['lampu', 'tumbuh', 'ringlight', 'ac', 'kipas', 'exhaust', 'speaker'] }, pesan: 'Listrik padam sesaat! Lampu dan pendingin mati. Nyalakan lagi yang perlu.' },
      { id: 'panas', nama: 'Gelombang panas', pemicu: { acak: 0.12 }, efek: { suhu: 4 }, pesan: 'Gelombang panas! Suhu luar naik 4 derajat. Agen perlu bekerja lebih keras.' },
      { id: 'dosen_tamu', nama: 'Dosen tamu datang', pemicu: { masuk: 'perpus' }, efek: { cahaya: 0 }, pesan: 'Dosen tamu mampir ke perpustakaan. Pastikan ruangan nyaman dan agen menjawab dengan benar.' }
    ]
  };
  D.SEMESTA = { kampus: KAMPUS };

  const TEMPLAT_SEMESTA = {
    id: 'semestaku', nama: 'Semesta Baruku', cerita: 'Tulis ceritamu di sini: siapa agenmu, di mana, dan apa yang harus dijaga.',
    agen: { nama: 'Bimo', persona: 'asisten ramah yang suka bercanda', sapaan: 'Halo, aku Bimo! Mau diatur apa hari ini?', siap: 'Gaskeun!', tolak: 'Waduh, nggak bisa:', gaya: 'gaul', warna: '#ff8a3d' },
    orkestrator: { nama: 'Koordinator', strategi: 'otomatis', spesialis: {} },
    router: { rute: [{ id: 'infokos', nama: 'INFO KOS', kata: ['aturan kos', 'bayar kos', 'tamu'], aksi: 'manual', koleksi: 'kos', warna: '#1fb67f', contoh: ['kapan harus bayar kos', 'boleh bawa teman menginap'] }] },
    rag: { k: 2, ambang: 0.8, sinonim: {}, stop: [] },
    guard: { input: { aktif: true, pola: ['rahasia'] }, aksi: { aktif: true }, interlock: { aktif: true }, output: { aktif: false, kata: [] }, memori: { aktif: true }, persetujuan: { aktif: false } },
    pengetahuan: [{ id: 'kos_aturan', judul: 'Aturan kos', teks: 'Tamu boleh berkunjung sampai pukul 21.00. Bayar kos paling lambat tanggal 5 tiap bulan.', koleksi: 'kos' }],
    ruang: [D.TEMPLAT],
    awal: 'kos',
    misi: [{ judul: 'Kenalan dengan Kamar', base: 100, brief: 'Kunjungi ruangmu sendiri dan selesaikan satu misi.', hints: [], target: { misiSelesai: 1 } }],
    kejadian: []
  };
  D.TEMPLAT_SEMESTA = TEMPLAT_SEMESTA;

  /* ---------- pemeriksa semesta ---------- */
  const GAYA = ['santai', 'formal', 'gaul'];
  const STRATEGI = ['otomatis', 'paralel', 'berurutan'];
  const AKSI_RUTE = ['manual', 'balas', 'tolak'];
  const kataList = (a, n) => (Array.isArray(a) ? a : []).map(k => String(k).toLowerCase().trim()).filter(k => OK_KATA.test(k)).slice(0, n || 10);

  function periksaSemesta(def) {
    const G = [];
    if (!def || typeof def !== 'object' || Array.isArray(def)) return { ok: false, galat: ['Definisi semesta harus berupa objek JSON.'], semesta: null };
    const U = { id: String(def.id || ''), nama: teks(def.nama, 30), cerita: teks(def.cerita, 600) };
    if (!OK_ID.test(U.id)) G.push('"id" semesta: 2 sampai 16 huruf kecil, angka, atau garis bawah, diawali huruf.');
    if (!U.nama) G.push('"nama" semesta wajib diisi.');

    const a = def.agen || {};
    U.agen = { nama: teks(a.nama, 16) || 'Agen', persona: teks(a.persona, 80), sapaan: teks(a.sapaan, 120), siap: teks(a.siap, 20) || 'Siap!', tolak: teks(a.tolak, 24) || 'Aku tolak:', gaya: GAYA.includes(a.gaya) ? a.gaya : 'santai', warna: warna(a.warna, '#2f5bff'), ngobrol: a.ngobrol === true };
    if (a.gaya && !GAYA.includes(a.gaya)) G.push(`Agen: "gaya" harus salah satu dari ${GAYA.join(', ')}.`);

    const o = def.orkestrator || {};
    U.orkestrator = { nama: teks(o.nama, 16) || 'Orkestrator', strategi: STRATEGI.includes(o.strategi) ? o.strategi : 'otomatis', spesialis: {} };
    if (o.strategi && !STRATEGI.includes(o.strategi)) G.push(`Orkestrator: "strategi" harus salah satu dari ${STRATEGI.join(', ')}.`);
    for (const n of Object.keys(o.spesialis && typeof o.spesialis === 'object' ? o.spesialis : {}).slice(0, 8)) {
      const w = o.spesialis[n]; U.orkestrator.spesialis[teks(n, 12).replace(/[^A-Za-z0-9 ]/g, '')] = typeof w === 'string' ? warna(w, '#888888') : warna(w && w.warna, '#888888');
    }

    U.router = { rute: [] };
    const rr = def.router && Array.isArray(def.router.rute) ? def.router.rute : [];
    if (rr.length > 6) G.push('Router: maksimal 6 rute buatan.');
    rr.slice(0, 6).forEach((r, i) => {
      const di = `Rute ke-${i + 1}`;
      if (!r || !OK_ID.test(String(r.id))) { G.push(`${di}: "id" huruf kecil, angka, garis bawah (2 sampai 16).`); return; }
      if (['kontrol', 'info', 'bahaya', 'obrol'].includes(r.id)) { G.push(`${di}: id "${r.id}" sudah dipakai rute bawaan.`); return; }
      if (!AKSI_RUTE.includes(r.aksi)) { G.push(`${di}: "aksi" harus salah satu dari ${AKSI_RUTE.join(', ')}.`); return; }
      const kata = kataList(r.kata);
      if (!kata.length) { G.push(`${di}: "kata" butuh minimal 1 kata pemicu.`); return; }
      const x = { id: r.id, nama: teks(r.nama, 12).toUpperCase() || r.id.toUpperCase(), kata, aksi: r.aksi, warna: warna(r.warna, '#2f5bff'), koleksi: teks(r.koleksi, 16).toLowerCase().replace(/[^a-z0-9_]/g, ''), balasan: teks(r.balasan, 240), intent: r.intent === 'info' ? 'info' : 'obrol',
        contoh: (Array.isArray(r.contoh) ? r.contoh : []).slice(0, 8).map(c => teks(c, 80).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()).filter(c => c.length >= 3) };
      if (x.aksi !== 'manual' && !x.balasan) G.push(`${di}: aksi "${x.aksi}" butuh "balasan".`);
      U.router.rute.push(x);
    });

    const g = def.rag || {};
    U.rag = { k: Math.round(bil(g.k, 1, 3, 2)), ambang: bil(g.ambang, 0, 5, 0.8), sinonim: {}, stop: kataList(g.stop, 20) };
    for (const k of Object.keys(g.sinonim && typeof g.sinonim === 'object' ? g.sinonim : {}).slice(0, 30)) {
      const a1 = String(k).toLowerCase().trim(), b1 = String(g.sinonim[k]).toLowerCase().trim();
      if (OK_KATA.test(a1) && OK_KATA.test(b1)) U.rag.sinonim[a1] = b1; else G.push(`Sinonim "${teks(k, 16)}": huruf kecil, angka, spasi.`);
    }

    const gd = def.guard || {}, ya = x => x !== false;
    U.guard = {
      input: { aktif: ya(gd.input && gd.input.aktif), pola: kataList(gd.input && gd.input.pola, 20) },
      aksi: { aktif: ya(gd.aksi && gd.aksi.aktif) }, interlock: { aktif: ya(gd.interlock && gd.interlock.aktif) },
      output: { aktif: !!(gd.output && gd.output.aktif), kata: kataList(gd.output && gd.output.kata, 20) },
      memori: { aktif: ya(gd.memori && gd.memori.aktif) },
      persetujuan: { aktif: !!(gd.persetujuan && gd.persetujuan.aktif) }   // human in the loop untuk aksi berisiko, mati secara bawaan
    };

    U.pengetahuan = (Array.isArray(def.pengetahuan) ? def.pengetahuan.slice(0, 40) : []).map((m, i) => ({ id: OK_ID.test(String(m && m.id)) ? String(m.id) : 'pk' + (i + 1), judul: teks(m && m.judul, 60) || 'Tanpa judul', teks: teks(m && m.teks, 300), koleksi: teks(m && m.koleksi, 16).toLowerCase().replace(/[^a-z0-9_]/g, '') })).filter(m => m.teks);
    const idPk = new Set(); U.pengetahuan = U.pengetahuan.filter(m => !idPk.has(m.id) && idPk.add(m.id));

    U.ruang = [];
    const rs = Array.isArray(def.ruang) ? def.ruang.slice(0, 8) : [];
    if (!rs.length) G.push('Semesta butuh minimal 1 ruang di "ruang".');
    rs.forEach((r, i) => {
      const rd = typeof r === 'string' ? D.RUANG[r] : r;
      if (!rd) { G.push(`Ruang ke-${i + 1}: "${teks(r, 20)}" bukan ruang bawaan.`); return; }
      const h = D.periksa(rd);
      if (!h.ok) h.galat.forEach(x => G.push(`Ruang "${teks(rd.id, 16)}": ${x}`));
      else if (U.ruang.some(x => x.id === h.ruang.id)) G.push(`Ruang "${h.ruang.id}" ditulis dua kali.`);
      else U.ruang.push(h.ruang);
    });
    U.awal = U.ruang.some(r => r.id === def.awal) ? def.awal : (U.ruang[0] && U.ruang[0].id) || '';
    if (def.awal && U.awal !== def.awal) G.push(`"awal" menyebut ruang "${teks(def.awal, 16)}" yang tidak ada.`);

    const KUNCI = ['ruangDikunjungi', 'misiSelesai', 'babUnik', 'rutePakai', 'kejadianSelesai', 'badgeMin', 'xpMin'];
    U.misi = [];
    (Array.isArray(def.misi) ? def.misi.slice(0, 8) : []).forEach((m, i) => {
      const di = `Misi semesta ke-${i + 1}`, tg = (m && m.target) || {}, T = {};
      if (!m || !teks(m.judul, 40)) { G.push(`${di}: "judul" wajib diisi.`); return; }
      for (const k of KUNCI) if (tg[k] != null) T[k] = Math.round(bil(tg[k], 1, 5000, 1));
      if (!Object.keys(T).length) { G.push(`${di}: "target" butuh salah satu kunci: ${KUNCI.join(', ')}.`); return; }
      U.misi.push({ judul: teks(m.judul, 40), brief: teks(m.brief, 260), base: Math.round(bil(m.base, 10, 800, 150)), hints: (Array.isArray(m.hints) ? m.hints.slice(0, 3) : []).map(h => teks(h, 160)).filter(Boolean), badge: teks(m.badge, 16), target: T });
    });

    U.kejadian = [];
    (Array.isArray(def.kejadian) ? def.kejadian.slice(0, 8) : []).forEach((k, i) => {
      const di = `Kejadian ke-${i + 1}`, pm = (k && k.pemicu) || {};
      if (!k || !OK_ID.test(String(k.id)) || !teks(k.nama, 30)) { G.push(`${di}: "id" dan "nama" wajib diisi.`); return; }
      const P = {};
      if (pm.pesanKe != null) P.pesanKe = Math.round(bil(pm.pesanKe, 1, 100, 5));
      if (pm.acak != null) P.acak = bil(pm.acak, 0, 1, 0.1);
      if (pm.masuk != null) P.masuk = teks(pm.masuk, 16);
      if (!Object.keys(P).length) { G.push(`${di}: "pemicu" butuh pesanKe, acak, atau masuk.`); return; }
      const e = k.efek || {};
      U.kejadian.push({ id: k.id, nama: teks(k.nama, 30), pemicu: P, ruang: teks(k.ruang, 16), efek: { suhu: bil(e.suhu, -10, 10, 0), cahaya: bil(e.cahaya, -300, 300, 0), matikan: kataList(e.matikan, 12).map(x => x.replace(/ /g, '_')), nyalakan: kataList(e.nyalakan, 12).map(x => x.replace(/ /g, '_')) }, pesan: teks(k.pesan, 200) });
    });

    return { ok: G.length === 0, galat: G, semesta: U };
  }

  /* Misi lintas ruang. h = catatan global dari game. */
  function nilaiMisiSemesta(misi, h) {
    const T = misi.target, o = [];
    if (T.ruangDikunjungi) o.push([`Ruang dikunjungi ${h.ruangDikunjungi} (target ${T.ruangDikunjungi})`, h.ruangDikunjungi >= T.ruangDikunjungi]);
    if (T.misiSelesai) o.push([`Misi ruang selesai ${h.misiSelesai} (target ${T.misiSelesai})`, h.misiSelesai >= T.misiSelesai]);
    if (T.babUnik) o.push([`Bab pengetahuan dibuka ${h.babUnik} (target ${T.babUnik})`, h.babUnik >= T.babUnik]);
    if (T.rutePakai) o.push([`Rute buatan dipakai ${h.rutePakai} (target ${T.rutePakai})`, h.rutePakai >= T.rutePakai]);
    if (T.kejadianSelesai) o.push([`Kejadian dialami ${h.kejadianSelesai} (target ${T.kejadianSelesai})`, h.kejadianSelesai >= T.kejadianSelesai]);
    if (T.badgeMin) o.push([`Badge ${h.badge} (target ${T.badgeMin})`, h.badge >= T.badgeMin]);
    if (T.xpMin) o.push([`XP ${h.xp} (target ${T.xpMin})`, h.xp >= T.xpMin]);
    return o;
  }

  Object.assign(D, { periksaSemesta, nilaiMisiSemesta, GAYA, STRATEGI, AKSI_RUTE });
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
