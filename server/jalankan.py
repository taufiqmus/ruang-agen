"""Satu pintu untuk mahasiswa. Dipanggil oleh MULAI.bat atau mulai.sh, bisa juga langsung: python server/jalankan.py

Langkah otomatis:
1. Membuat lingkungan Python terpisah di folder .venv (sekali saja).
2. Memasang paket (sekali saja, sekitar 150 MB, hanya paket siap pakai sehingga tidak perlu compiler).
3. Mengunduh model kecil (sekali saja, sekitar 1 GB).
4. Menjalankan game dan model di http://127.0.0.1:8000 lalu membuka browser.

Semua pilihan server_lokal.py bisa ditambahkan, misalnya: MULAI.bat --ukuran 0.5b
"""
import os
import subprocess
import sys
import venv

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.dirname(SINI)   # akar repo: tempat .venv, model, dan index.html
VENV = os.path.join(AKAR, ".venv")
PY = os.path.join(VENV, "Scripts", "python.exe") if os.name == "nt" else os.path.join(VENV, "bin", "python")
PAKET_ADA = "import llama_cpp, huggingface_hub, uvicorn, fastapi"


def langkah(n: int, teks: str) -> None:
    print(f"\n[{n}/4] {teks}", flush=True)


def gagal(teks: str) -> int:
    print("\nGAGAL: " + teks)
    print("Game tetap bisa dimainkan tanpa model: buka index.html (otak parser aturan).")
    return 1


def main() -> int:
    args = sys.argv[1:]
    v = sys.version_info[:2]
    if not ((3, 10) <= v <= (3, 12)):
        return gagal(f"Butuh Python 3.10 sampai 3.12, sekarang {v[0]}.{v[1]}. Pasang Python 3.12 dari https://www.python.org/downloads/ lalu jalankan lagi.")

    langkah(1, "Menyiapkan lingkungan Python (.venv)")
    if os.path.isfile(PY):
        r = subprocess.run([PY, "-c", "import sys; print(sys.version_info[:2] >= (3, 10))"], capture_output=True, text=True)
        if "True" not in r.stdout:
            print("      .venv lama tidak cocok, dibuat ulang.")
            import shutil
            shutil.rmtree(VENV, ignore_errors=True)
    if not os.path.isfile(PY):
        venv.create(VENV, with_pip=True)
        print("      Dibuat.")
    else:
        print("      Sudah ada.")

    langkah(2, "Memasang paket (sekali saja)")
    if subprocess.run([PY, "-c", PAKET_ADA], capture_output=True).returncode == 0:
        print("      Sudah terpasang.")
    else:
        env = dict(os.environ, PIP_NO_CACHE_DIR="1", PIP_DISABLE_PIP_VERSION_CHECK="1")
        print("      Mengunduh sekitar 150 MB. Mohon tunggu...", flush=True)
        if subprocess.run([PY, "-m", "pip", "install", "--quiet", "--upgrade", "pip"], env=env).returncode != 0:
            return gagal("pip tidak bisa diperbarui. Periksa internet.")
        r = subprocess.run([PY, "-m", "pip", "install", "--quiet", "--only-binary=:all:", "-r", os.path.join(SINI, "requirements-lokal.txt")], env=env)
        if r.returncode != 0:
            return gagal("Paket tidak bisa dipasang. Periksa internet. Bila tetap gagal, pakai Python 3.12 64-bit.")
        print("      Terpasang.")

    return subprocess.call([PY, os.path.join(SINI, "server_lokal.py"), "--buka"] + args)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(0)
