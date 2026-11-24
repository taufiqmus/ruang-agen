"""Satu pintu untuk mahasiswa. Dipanggil oleh MULAI.bat atau mulai.sh, bisa juga langsung: python server/jalankan.py

Hanya memakai pustaka standar Python (tanpa venv, tanpa pip, tanpa unduhan paket). Tugasnya:
1. Pertama kali: MENU PENYIAPAN. Mendeteksi laptop (CPU, RAM, kartu grafis NVIDIA, Ollama), lalu mahasiswa memilih
   otak AI (parser, Ollama, atau OpenRouter), model Ollama yang diunduh, dan aplikasi yang dibuka.
   Pilihan disimpan di .ruangagen-pilihan.json. Berikutnya langsung jalan.
2. Menyajikan index.html dan studio.html di http://127.0.0.1:8000 (alamat lokal supaya Ollama mengizinkannya),
   lalu membuka browser. Alamat /_info memberi RAM dan VRAM laptop untuk panel model di dalam game.

Pilihan:
    --pilih       ulangi seluruh menu
    --model       hanya menu model Ollama (tambah model nanti, bila laptop masih kuat)
    --studio      buka Easy Agent Visualizer, bukan game
    --port N      port awal (bila terpakai, mencari port berikutnya)
    --kueri TEKS  parameter alamat halaman (dipakai menu)
"""
import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.dirname(SINI)   # akar repo: tempat index.html dan studio.html
BERKAS_PILIHAN = os.path.join(AKAR, ".ruangagen-pilihan.json")
OLLAMA_URL = "http://127.0.0.1:11434"

# (nama, ukuran unduhan GB, RAM minimum GB, VRAM GB untuk nyaman, tambahan?, keterangan). Sama dengan KATALOG di src/ollama-kelola.js.
OLLAMA_MODEL = [
    ("qwen2.5:1.5b", 1.0, 4, 0, False, "ringan, jalan di CPU, cukup untuk praktikum"),
    ("qwen2.5:3b", 1.9, 8, 4, False, "sedang, lebih paham kalimat bebas"),
    ("qwen2.5:7b", 4.7, 16, 6, False, "bisa memakai alat (tool calling), nyaman dengan kartu grafis"),
    ("gemma4:e4b", 6.6, 16, 8, False, "bisa memakai alat, paling andal di uji Studio, butuh laptop kuat"),
    ("embeddinggemma", 0.6, 4, 0, True, "tambahan: router embedding dan RAG hibrida"),
    ("llama-guard3:1b", 1.6, 4, 0, True, "tambahan: guard model untuk konten berbahaya"),
]


def gagal(teks: str) -> int:
    print("\nGAGAL: " + teks)
    print("Game tetap bisa dimainkan tanpa server: buka index.html atau studio.html (otak parser aturan).")
    return 1


# ---------- deteksi laptop ----------
def ram_gb() -> float:
    try:
        if os.name == "nt":
            import ctypes

            class MS(ctypes.Structure):
                _fields_ = [("l", ctypes.c_ulong), ("m", ctypes.c_ulong), ("t", ctypes.c_ulonglong), ("a", ctypes.c_ulonglong),
                            ("tp", ctypes.c_ulonglong), ("ap", ctypes.c_ulonglong), ("tv", ctypes.c_ulonglong), ("av", ctypes.c_ulonglong), ("e", ctypes.c_ulonglong)]
            s = MS()
            s.l = ctypes.sizeof(MS)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(s))
            return s.t / 1024 ** 3
        if sys.platform == "darwin":
            return int(subprocess.run(["sysctl", "-n", "hw.memsize"], capture_output=True, text=True).stdout) / 1024 ** 3
        with open("/proc/meminfo") as f:
            return int(f.readline().split()[1]) / 1024 ** 2
    except Exception:
        return 0.0


def gpu() -> tuple:
    """(nama, VRAM GB) kartu grafis NVIDIA, atau ("", 0)."""
    exe = shutil.which("nvidia-smi")
    if not exe:
        return ("", 0.0)
    try:
        r = subprocess.run([exe, "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=10)
        nama, mb = r.stdout.strip().splitlines()[0].rsplit(",", 1)
        return (nama.strip(), int(mb) / 1024)
    except Exception:
        return ("", 0.0)


def info_laptop() -> dict:
    nama, vram = gpu()
    return {"cpu": os.cpu_count() or 0, "ram": round(ram_gb()), "gpu": nama, "vram": round(vram, 1)}


def kecocokan(m: tuple, ram: float, vram: float) -> str:
    """cocok, pas (jalan tetapi lambat), atau berat. Sama dengan kecocokan() di src/ollama-kelola.js."""
    if not ram:
        return "?"
    if ram < m[2]:
        return "berat"
    if m[3] and vram < m[3]:
        return "pas"
    return "cocok"


def saran_model(ram: float, vram: float) -> str:
    utama = [m for m in OLLAMA_MODEL if not m[4]]
    ok = [m for m in utama if kecocokan(m, ram, vram) == "cocok"]
    return (ok[-1] if ok else utama[0])[0]


# ---------- Ollama ----------
def cari_ollama() -> str:
    exe = shutil.which("ollama")
    if exe:
        return exe
    for c in [os.path.expandvars(r"%LOCALAPPDATA%\Programs\Ollama\ollama.exe"), "/usr/local/bin/ollama", "/opt/homebrew/bin/ollama",
              "/Applications/Ollama.app/Contents/Resources/ollama"]:
        if os.path.isfile(c):
            return c
    return ""


def model_terpasang() -> list:
    """Nama model yang sudah diunduh, atau None bila Ollama tidak berjalan."""
    try:
        with urllib.request.urlopen(OLLAMA_URL + "/api/tags", timeout=3) as r:
            return [m["name"] for m in json.load(r).get("models", [])]
    except Exception:
        return None


def pastikan_berjalan(exe: str) -> bool:
    if model_terpasang() is not None:
        return True
    try:
        kw = {"creationflags": 0x08000000} if os.name == "nt" else {}   # tanpa jendela konsol
        subprocess.Popen([exe, "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **kw)
    except Exception:
        return False
    for _ in range(20):
        time.sleep(0.5)
        if model_terpasang() is not None:
            return True
    return False


def ada_model(ada: list, nama: str) -> bool:
    return any(a == nama or a == nama + ":latest" for a in ada)


def pasang_ollama() -> str:
    """Menawarkan pemasangan Ollama. Mengembalikan jalur ollama, atau "" bila belum terpasang."""
    print("\nOllama belum terpasang. Ollama menjalankan model AI di laptopmu (sekali pasang, sekitar 1 GB).")
    if os.name == "nt" and shutil.which("winget"):
        if input("Pasang Ollama otomatis sekarang lewat winget? (y/n) [y]: ").strip().lower() in ("", "y", "ya"):
            subprocess.call(["winget", "install", "-e", "--id", "Ollama.Ollama", "--accept-package-agreements", "--accept-source-agreements"])
            exe = cari_ollama()
            if exe:
                return exe
            print("Pemasangan belum terdeteksi selesai.")
    print("Unduh dari https://ollama.com/download , pasang, lalu jalankan MULAI.bat --model lagi.")
    try:
        if input("Buka halaman unduhan Ollama sekarang? (y/n) [y]: ").strip().lower() in ("", "y", "ya"):
            webbrowser.open("https://ollama.com/download")
    except Exception:
        pass
    return ""


def menu_model(exe: str, ram: float, vram: float) -> str:
    """Memilih dan mengunduh model Ollama. Mengembalikan nama model utama untuk game."""
    if not pastikan_berjalan(exe):
        print("Ollama tidak mau berjalan. Buka aplikasi Ollama dari menu Start, lalu jalankan MULAI.bat --model lagi.")
        return ""
    ada = model_terpasang() or []
    saran = saran_model(ram, vram)
    print("\nModel Ollama (ukuran unduhan; penilaian hanya perkiraan):")
    for i, (nama, gb, _, _, tambahan, ket) in enumerate(OLLAMA_MODEL, 1):
        tanda = "sudah ada" if ada_model(ada, nama) else f"{gb:.1f} GB"
        nilai = {"cocok": "cocok", "pas": "lambat", "berat": "TERLALU BERAT", "?": ""}[kecocokan(OLLAMA_MODEL[i - 1], ram, vram)]
        print(f"  {i}. {nama:<16} {tanda:<10} {nilai:<14} {'(SARAN) ' if nama == saran else ''}{ket}")
    print("  Model lain: ketik namanya (contoh llama3.2:1b). Daftar lengkap ada di ollama.com/library")
    j = input(f"Nomor atau nama model, pisahkan koma, 0 untuk lewati [{saran}]: ").strip()
    if j == "0":
        pilih = []
    elif not j:
        pilih = [saran]
    else:
        pilih = []
        for x in [t.strip() for t in j.split(",") if t.strip()]:
            if x.isdigit():
                if 1 <= int(x) <= len(OLLAMA_MODEL):
                    pilih.append(OLLAMA_MODEL[int(x) - 1][0])
            else:
                pilih.append(x)
    for m in pilih:
        if ada_model(ada, m):
            continue
        print(f"\nMengunduh {m} lewat Ollama (sekali saja)...", flush=True)
        if subprocess.call([exe, "pull", m]) != 0:
            print(f"   {m} gagal diunduh. Periksa internet, ulangi dengan: MULAI.bat --model")
    # hanya model yang benar-benar terpasang yang boleh jadi model utama (unduhan bisa gagal)
    ada = model_terpasang() or []
    tambahan = {m[0] for m in OLLAMA_MODEL if m[4]}
    utama = [m for m in pilih if m not in tambahan and ada_model(ada, m)] or [a for a in ada if a not in tambahan and a.split(":")[0] not in tambahan]
    return utama[0] if utama else ""


def tanya(teks: str, pilihan: list, bawaan: str) -> str:
    while True:
        j = input(f"{teks} [{bawaan}]: ").strip() or bawaan
        if j in pilihan:
            return j
        print("   Ketik salah satu: " + ", ".join(pilihan))


# ---------- menu penyiapan ----------
def baca_pilihan() -> dict:
    try:
        with open(BERKAS_PILIHAN, encoding="utf-8") as f:
            p = json.load(f)
        # berkas dari versi lama (otak "lokal") tidak dikenali lagi: anggap belum ada supaya menu muncul
        return p if isinstance(p, dict) and p.get("otak") in ("parser", "ollama", "kunci") else None
    except Exception:
        return None


def simpan_pilihan(p: dict) -> None:
    with open(BERKAS_PILIHAN, "w", encoding="utf-8") as f:
        json.dump(p, f, indent=1)


def menu(hanya_model: bool = False) -> dict:
    h = info_laptop()
    ram, vram = h["ram"], h["vram"]
    exe = cari_ollama()
    print("\n==========================================================")
    print("  MENU PENYIAPAN (sekali saja)")
    print("  Ulang semua: MULAI.bat --pilih     Tambah model Ollama: MULAI.bat --model")
    print("==========================================================")
    print(f"  Laptopmu : CPU {h['cpu']} inti, RAM {ram:.0f} GB, kartu grafis: {h['gpu'] + ' (' + format(vram, '.0f') + ' GB)' if h['gpu'] else 'tidak ada NVIDIA (memakai CPU)'}")
    print(f"  Ollama   : {'terpasang' if exe else 'belum terpasang'}")
    hasil = baca_pilihan() or {}
    if hanya_model:
        hasil["otak"] = "ollama"
    else:
        print("\nPilih otak AI (bisa diganti kapan saja di dalam game):")
        print("  1. Tanpa AI (parser aturan). Laptop apa pun, tanpa unduhan.")
        print("  2. Ollama: model AI jalan di laptopmu, gratis dan tanpa internet setelah diunduh. Kamu memilih modelnya.")
        print("  3. OpenRouter: model besar lewat internet, butuh kunci gratis dari openrouter.ai (diisi di dalam game).")
        saran = "2" if exe else "1"
        print(f"  Saran untuk laptopmu: {saran}")
        hasil = {"otak": {"1": "parser", "2": "ollama", "3": "kunci"}[tanya("Pilihanmu", ["1", "2", "3"], saran)]}
    if hasil["otak"] == "ollama":
        if not exe:
            exe = pasang_ollama()
        m = menu_model(exe, ram, vram) if exe else ""
        if m:
            hasil["model"] = m
        else:
            print("Belum ada model Ollama yang bisa dipakai, jadi sementara otak tanpa AI. Tambah model kapan saja: MULAI.bat --model, atau dari tab Otak di dalam game.")
            hasil = {"otak": "parser"}
    if not hanya_model or "aplikasi" not in hasil:
        print("\nAplikasi yang dibuka:")
        print("  1. Easy Agent Visualizer (rakit rumah pintar dan otak agen sendiri)")
        print("  2. Ruang Agen (game agen di kampus)")
        hasil["aplikasi"] = "studio" if tanya("Pilihanmu", ["1", "2"], "1") == "1" else "game"
    simpan_pilihan(hasil)
    print("\nPilihan disimpan. Berikutnya cukup klik dua kali MULAI.bat.", flush=True)
    return hasil


def kueri_dari(p: dict) -> str:
    if p.get("otak") in ("ollama", "parser", "kunci"):
        return "otak=" + p["otak"] + ("&model=" + p["model"] if p.get("model") else "")
    return ""


# ---------- server berkas ----------
HALAMAN = {"/": "index.html", "/index.html": "index.html", "/studio.html": "studio.html"}


class Penangan(BaseHTTPRequestHandler):
    """Hanya index.html, studio.html, dan /_info yang disajikan (bukan isi folder lain)."""

    def log_message(self, *a):
        pass

    def kirim(self, kode: int, tipe: str, isi: bytes) -> None:
        self.send_response(kode)
        self.send_header("Content-Type", tipe)
        self.send_header("Content-Length", str(len(isi)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(isi)

    def do_GET(self):
        jalur = self.path.split("?")[0]
        if jalur == "/_info":
            return self.kirim(200, "application/json", json.dumps(self.server.info).encode())
        nama = HALAMAN.get(jalur)
        if not nama:
            return self.kirim(404, "text/plain; charset=utf-8", b"Tidak ada.")
        try:
            with open(os.path.join(AKAR, nama), "rb") as f:
                self.kirim(200, "text/html; charset=utf-8", f.read())
        except OSError:
            self.kirim(404, "text/plain; charset=utf-8", b"Berkas halaman tidak ditemukan. Jalankan python build.py.")


def port_kosong(awal: int) -> int:
    for p in range(awal, awal + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", p)) != 0:
                return p
    sys.exit(f"Port {awal} sampai {awal + 19} terpakai semua. Tutup aplikasi lain atau pakai --port.")


def sajikan(port: int, studio: bool, kueri: str, buka: bool) -> None:
    srv = ThreadingHTTPServer(("127.0.0.1", port), Penangan)
    srv.info = info_laptop()
    alamat = f"http://127.0.0.1:{port}/" + ("studio.html" if studio else "") + ("?" + kueri if kueri else "")
    print("\n" + "=" * 58)
    print(f"  Siap: {alamat}")
    print(f"  Game: http://127.0.0.1:{port}/    Studio: http://127.0.0.1:{port}/studio.html")
    print("  Biarkan jendela ini terbuka selama bermain. Ctrl+C untuk berhenti.")
    print("=" * 58 + "\n", flush=True)
    if buka and not os.environ.get("RUANG_TANPA_BROWSER"):   # uji otomatis tidak membuka browser
        threading.Timer(1.0, lambda: webbrowser.open(alamat)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    print("Server dihentikan.")


def main() -> int:
    args = sys.argv[1:]
    paksa, hanya_model = "--pilih" in args, "--model" in args
    studio = "--studio" in args
    port = 8000
    kueri = ""
    if "--port" in args:
        port = int(args[args.index("--port") + 1])
    if "--kueri" in args:
        kueri = args[args.index("--kueri") + 1]

    # menu hanya bila dijalankan dari terminal (klik dua kali MULAI.bat), bukan oleh uji otomatis
    bebas = [a for a in args if a in ("--pilih", "--model")]
    if (not args or bebas) and sys.stdin.isatty() and not os.environ.get("RUANG_TANPA_MENU"):
        p = None if (paksa or hanya_model) else baca_pilihan()
        if p:
            print(f"Memakai pilihan tersimpan: otak {p.get('otak')}{' ' + p.get('model', '') if p.get('model') else ''}, aplikasi {p.get('aplikasi')}.")
            print("Ubah dengan: MULAI.bat --pilih (semua) atau MULAI.bat --model (tambah model Ollama)")
        else:
            p = menu(hanya_model)
        studio = p.get("aplikasi") == "studio"
        kueri = kueri_dari(p)

    sajikan(port_kosong(port), studio, kueri, True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(0)
