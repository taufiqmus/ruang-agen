"""Satu pintu untuk mahasiswa. Dipanggil oleh MULAI.bat atau mulai.sh, bisa juga langsung: python server/jalankan.py

Pertama kali (klik dua kali MULAI.bat) muncul MENU PENYIAPAN:
- mendeteksi laptop (CPU, RAM, kartu grafis NVIDIA, Ollama),
- menyarankan otak AI yang cocok, lalu mahasiswa memilih sendiri: tanpa AI, model lokal Python (0,5B atau 1,5B),
  atau Ollama dengan model yang dipilih (diunduh otomatis),
- memilih aplikasi yang dibuka: Studio Rumah Agen atau game Ruang Agen.
Pilihan disimpan di .ruangagen-pilihan.json. Berikutnya langsung jalan. Ubah lagi dengan: MULAI.bat --pilih

Langkah otomatis setelah itu:
1. Membuat lingkungan Python terpisah di folder .venv (sekali saja).
2. Memasang paket (sekali saja). Tanpa model lokal hanya paket server kecil; dengan model lokal sekitar 150 MB.
3. Model lokal: mengunduh model sekali. Ollama: model diunduh lewat "ollama pull".
4. Menjalankan server di http://127.0.0.1:8000 lalu membuka browser.

Semua pilihan server_lokal.py tetap bisa dipakai langsung, misalnya: MULAI.bat --ukuran 0.5b (menu dilewati).
"""
import json
import os
import shutil
import subprocess
import sys
import venv

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.dirname(SINI)   # akar repo: tempat .venv, model, index.html, dan studio.html
VENV = os.path.join(AKAR, ".venv")
PY = os.path.join(VENV, "Scripts", "python.exe") if os.name == "nt" else os.path.join(VENV, "bin", "python")
BERKAS_PILIHAN = os.path.join(AKAR, ".ruangagen-pilihan.json")
PAKET_LOKAL = "import llama_cpp, huggingface_hub, uvicorn, fastapi"
PAKET_DASAR = "import uvicorn, fastapi"

# Model Ollama yang ditawarkan: (nama, ukuran GB, butuh VRAM GB atau 0 untuk CPU, keterangan)
OLLAMA_MODEL = [
    ("qwen2.5:1.5b", 1.0, 0, "ringan, jalan di CPU, jarang bisa memakai alat"),
    ("qwen2.5:3b", 1.9, 4, "sedang"),
    ("qwen2.5:7b", 4.7, 6, "bisa memakai alat (tool calling), disarankan bila ada kartu grafis"),
    ("gemma4:e4b", 6.6, 8, "bisa memakai alat, paling andal di uji studio"),
    ("embeddinggemma", 0.6, 0, "tambahan: router embedding dan RAG hibrida"),
    ("llama-guard3:1b", 1.6, 0, "tambahan: guard model untuk konten berbahaya"),
]


def langkah(n: int, teks: str) -> None:
    print(f"\n[{n}/4] {teks}", flush=True)


def gagal(teks: str) -> int:
    print("\nGAGAL: " + teks)
    print("Game tetap bisa dimainkan tanpa model: buka index.html atau studio.html (otak parser aturan).")
    return 1


# ---------- deteksi laptop ----------
def ram_gb() -> float:
    try:
        if os.name == "nt":
            import ctypes

            class MS(ctypes.Structure):
                _fields_ = [("l", ctypes.c_ulong), ("m", ctypes.c_ulong), ("t", ctypes.c_ulonglong), ("a", ctypes.c_ulonglong),
                            ("tp", ctypes.c_ulonglong), ("ap", ctypes.c_ulonglong), ("tv", ctypes.c_ulonglong), ("av", ctypes.c_ulonglong), ("e", ctypes.c_ulonglong)]
            s = MS(); s.l = ctypes.sizeof(MS)
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


def cari_ollama() -> str:
    exe = shutil.which("ollama")
    if exe:
        return exe
    for c in [os.path.expandvars(r"%LOCALAPPDATA%\Programs\Ollama\ollama.exe"), r"D:\ollama\ollama.exe", "/usr/local/bin/ollama"]:
        if os.path.isfile(c):
            return c
    return ""


def model_ollama(exe: str) -> list:
    try:
        r = subprocess.run([exe, "list"], capture_output=True, text=True, timeout=20)
        return [baris.split()[0] for baris in r.stdout.splitlines()[1:] if baris.strip()]
    except Exception:
        return []


def tanya(teks: str, pilihan: list, bawaan: str) -> str:
    while True:
        j = input(f"{teks} [{bawaan}]: ").strip() or bawaan
        if j in pilihan:
            return j
        print("   Ketik salah satu: " + ", ".join(pilihan))


# ---------- menu penyiapan ----------
def menu() -> dict:
    cpu, ram = os.cpu_count() or 0, ram_gb()
    g_nama, g_vram = gpu()
    ol = cari_ollama()
    ada = model_ollama(ol) if ol else []
    print("\n==========================================================")
    print("  MENU PENYIAPAN (sekali saja, ubah lagi dengan: MULAI.bat --pilih)")
    print("==========================================================")
    print(f"  Laptopmu : CPU {cpu} inti, RAM {ram:.0f} GB, kartu grafis: {g_nama + f' ({g_vram:.0f} GB)' if g_nama else 'tidak ada NVIDIA (memakai CPU)'}")
    print(f"  Ollama   : {'terpasang, ' + str(len(ada)) + ' model' if ol else 'belum terpasang'}")
    saran = "4" if ol and g_vram >= 6 else "3" if ram >= 8 else "2" if ram >= 4 else "1"
    print("\nPilih otak AI:")
    print("  1. Tanpa AI (parser aturan). Laptop apa pun, tanpa unduhan model.")
    print("  2. Model lokal kecil 0,5B (unduh sekitar 0,5 GB). Untuk RAM 4 GB, jawaban sederhana.")
    print("  3. Model lokal sedang 1,5B (unduh sekitar 1 GB). Untuk RAM 8 GB ke atas, tanpa kartu grafis.")
    print("  4. Ollama (butuh Ollama terpasang). Model besar dan cepat bila ada kartu grafis NVIDIA.")
    print(f"  Saran untuk laptopmu: {saran}")
    otak = tanya("Pilihanmu", ["1", "2", "3", "4"], saran)
    hasil = {"otak": {"1": "parser", "2": "lokal", "3": "lokal", "4": "ollama"}[otak]}
    if otak in ("2", "3"):
        hasil["ukuran"] = "0.5b" if otak == "2" else "1.5b"
    if otak == "4":
        if not ol:
            print("\nOllama belum terpasang. Unduh dari https://ollama.com/download , pasang, lalu jalankan MULAI.bat --pilih lagi.")
            try:
                import webbrowser
                if tanya("Buka halaman unduhan Ollama sekarang? (y/n)", ["y", "n"], "y") == "y":
                    webbrowser.open("https://ollama.com/download")
            except Exception:
                pass
            print("Sementara itu dipakai otak tanpa AI.")
            hasil = {"otak": "parser"}
        else:
            print("\nModel Ollama (ukuran unduhan, syarat):")
            cocok = []
            for i, (nama, gb, vram, ket) in enumerate(OLLAMA_MODEL, 1):
                tanda = "sudah ada" if any(a == nama or a == nama + ":latest" for a in ada) else f"{gb:.1f} GB"
                syarat = "CPU" if not vram else f"kartu grafis {vram} GB"
                layak = not vram or g_vram >= vram
                print(f"  {i}. {nama:<16} {tanda:<10} {syarat:<18} {ket}{'' if layak else '  (terlalu berat untuk laptop ini)'}")
                if layak and i <= 4:
                    cocok.append(i)
            utama = max(cocok) if cocok else 1
            j = input(f"Nomor model yang dipasang, pisahkan koma [{utama}]: ").strip() or str(utama)
            pilih = [OLLAMA_MODEL[int(x) - 1][0] for x in j.replace(" ", "").split(",") if x.isdigit() and 1 <= int(x) <= len(OLLAMA_MODEL)]
            if not pilih:
                pilih = [OLLAMA_MODEL[utama - 1][0]]
            for m in pilih:
                if not any(a == m or a == m + ":latest" for a in ada):
                    print(f"\nMengunduh {m} lewat Ollama (sekali saja)...", flush=True)
                    if subprocess.call([ol, "pull", m]) != 0:
                        print(f"   {m} gagal diunduh. Periksa internet, bisa diulang dengan: ollama pull {m}")
            hasil["model"] = next((m for m in pilih if m not in ("embeddinggemma", "llama-guard3:1b")), "qwen2.5:1.5b")
    print("\nAplikasi yang dibuka:")
    print("  1. Studio Rumah Agen (rakit rumah pintar dan otak agen sendiri)")
    print("  2. Ruang Agen (game agen di kampus)")
    hasil["aplikasi"] = "studio" if tanya("Pilihanmu", ["1", "2"], "1") == "1" else "game"
    with open(BERKAS_PILIHAN, "w", encoding="utf-8") as f:
        json.dump(hasil, f, indent=1)
    print(f"\nPilihan disimpan. Berikutnya cukup klik dua kali MULAI.bat. Ubah lagi dengan: MULAI.bat --pilih", flush=True)
    return hasil


def argumen_dari(p: dict) -> list:
    a = []
    if p.get("otak") == "lokal":
        a += ["--ukuran", p.get("ukuran", "1.5b")]
    else:
        a += ["--tanpa-model"]
    if p.get("aplikasi") == "studio":
        a += ["--studio"]
    if p.get("otak") in ("ollama", "parser"):
        a += ["--kueri", "otak=" + p["otak"] + ("&model=" + p["model"] if p.get("model") else "")]
    return a


def main() -> int:
    args = sys.argv[1:]
    paksa = "--pilih" in args
    args = [x for x in args if x != "--pilih"]
    v = sys.version_info[:2]
    if not ((3, 10) <= v <= (3, 12)):
        return gagal(f"Butuh Python 3.10 sampai 3.12, sekarang {v[0]}.{v[1]}. Pasang Python 3.12 dari https://www.python.org/downloads/ lalu jalankan lagi.")

    # menu hanya bila dijalankan dari terminal tanpa argumen (klik dua kali MULAI.bat), bukan oleh uji otomatis
    if not args and sys.stdin.isatty() and not os.environ.get("RUANG_TANPA_MENU"):
        p = None
        if not paksa and os.path.isfile(BERKAS_PILIHAN):
            try:
                with open(BERKAS_PILIHAN, encoding="utf-8") as f:
                    p = json.load(f)
                print(f"Memakai pilihan tersimpan: otak {p.get('otak')}{' ' + p.get('model', '') if p.get('model') else ''}, aplikasi {p.get('aplikasi')}. Ubah dengan: MULAI.bat --pilih")
            except Exception:
                p = None
        args = argumen_dari(p or menu())

    tanpa_model = "--tanpa-model" in args
    langkah(1, "Menyiapkan lingkungan Python (.venv)")
    if os.path.isfile(PY):
        r = subprocess.run([PY, "-c", "import sys; print(sys.version_info[:2] >= (3, 10))"], capture_output=True, text=True)
        if "True" not in r.stdout:
            print("      .venv lama tidak cocok, dibuat ulang.")
            shutil.rmtree(VENV, ignore_errors=True)
    if not os.path.isfile(PY):
        venv.create(VENV, with_pip=True)
        print("      Dibuat.")
    else:
        print("      Sudah ada.")

    langkah(2, "Memasang paket (sekali saja)")
    cek = PAKET_DASAR if tanpa_model else PAKET_LOKAL
    if subprocess.run([PY, "-c", cek], capture_output=True).returncode == 0:
        print("      Sudah terpasang.")
    else:
        env = dict(os.environ, PIP_NO_CACHE_DIR="1", PIP_DISABLE_PIP_VERSION_CHECK="1")
        berkas = "requirements-dasar.txt" if tanpa_model else "requirements-lokal.txt"
        print("      Mengunduh " + ("paket server kecil" if tanpa_model else "sekitar 150 MB") + ". Mohon tunggu...", flush=True)
        if subprocess.run([PY, "-m", "pip", "install", "--quiet", "--upgrade", "pip"], env=env).returncode != 0:
            return gagal("pip tidak bisa diperbarui. Periksa internet.")
        r = subprocess.run([PY, "-m", "pip", "install", "--quiet", "--only-binary=:all:", "-r", os.path.join(SINI, berkas)], env=env)
        if r.returncode != 0:
            return gagal("Paket tidak bisa dipasang. Periksa internet. Bila tetap gagal, pakai Python 3.12 64-bit.")
        print("      Terpasang.")

    return subprocess.call([PY, os.path.join(SINI, "server_lokal.py"), "--buka"] + args)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(0)
