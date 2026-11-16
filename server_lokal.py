"""Server model bahasa lokal untuk Ruang Agen (Python, CPU, tanpa GPU).

Memakai llama-cpp-python. Mengunduh model GGUF kecil sekali (Qwen2.5 Instruct, kuantisasi Q4_K_M),
lalu menjalankan server kompatibel OpenAI di http://127.0.0.1:8000/v1.
Di game: tab Otak, pilih "Model lokal kecil, Python", lalu Simpan dan Tes koneksi.

Pasang (sekali):
    python -m venv venv
    venv\\Scripts\\activate            (Linux/Mac: source venv/bin/activate)
    pip install --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu "llama-cpp-python[server]" huggingface_hub

Jalankan:
    python server_lokal.py                  # model 1.5B (disarankan), unduhan sekitar 1 GB
    python server_lokal.py --ukuran 0.5b    # paling ringan (unduhan sekitar 0.5 GB), jawaban lebih lemah
    python server_lokal.py --berkas D:\\model\\berkas.gguf   # pakai berkas GGUF sendiri

Server hanya menerima koneksi dari laptop ini (127.0.0.1). Tekan Ctrl+C untuk berhenti.
"""
import argparse
import os
import subprocess
import sys

MODEL = {
    "0.5b": ("Qwen/Qwen2.5-0.5B-Instruct-GGUF", "qwen2.5-0.5b-instruct-q4_k_m.gguf"),
    "1.5b": ("Qwen/Qwen2.5-1.5B-Instruct-GGUF", "qwen2.5-1.5b-instruct-q4_k_m.gguf"),
}


def cari_atau_unduh(ukuran: str, folder: str) -> str:
    repo, nama = MODEL[ukuran]
    jalur = os.path.join(folder, nama)
    if os.path.isfile(jalur):
        return jalur
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        sys.exit("huggingface_hub belum terpasang. Jalankan: pip install huggingface_hub")
    print(f"Mengunduh {nama} dari {repo} ke {folder} (hanya sekali)...")
    os.makedirs(folder, exist_ok=True)
    return hf_hub_download(repo, nama, local_dir=folder)


def main() -> None:
    a = argparse.ArgumentParser(description="Server model lokal untuk Ruang Agen")
    a.add_argument("--ukuran", choices=sorted(MODEL), default="1.5b")
    a.add_argument("--berkas", help="jalur berkas .gguf sendiri (melewati unduhan)")
    a.add_argument("--folder", default="model", help="folder penyimpanan model (default: ./model)")
    a.add_argument("--port", type=int, default=8000)
    a.add_argument("--n_ctx", type=int, default=2048, help="panjang konteks (kecil = hemat memori)")
    a.add_argument("--threads", type=int, default=0, help="jumlah thread CPU (0 = otomatis)")
    arg = a.parse_args()

    try:
        import llama_cpp  # noqa: F401
    except ImportError:
        sys.exit("llama-cpp-python belum terpasang. Lihat petunjuk pasang di bagian atas berkas ini.")

    berkas = arg.berkas or cari_atau_unduh(arg.ukuran, arg.folder)
    if not os.path.isfile(berkas):
        sys.exit(f"Berkas model tidak ditemukan: {berkas}")

    cmd = [sys.executable, "-m", "llama_cpp.server", "--model", berkas, "--host", "127.0.0.1", "--port", str(arg.port),
           "--n_ctx", str(arg.n_ctx), "--chat_format", "chatml", "--verbose", "False"]
    if arg.threads > 0:
        cmd += ["--n_threads", str(arg.threads)]
    print(f"Model: {berkas}")
    print(f"Server: http://127.0.0.1:{arg.port}/v1  (Ctrl+C untuk berhenti)")
    try:
        subprocess.run(cmd, check=False)
    except KeyboardInterrupt:
        print("\nServer dihentikan.")


if __name__ == "__main__":
    main()
