"""Server Ruang Agen: game dan model bahasa kecil dalam satu alamat, http://127.0.0.1:8000

Cara termudah: klik dua kali MULAI.bat (Windows) atau jalankan ./mulai.sh (Mac atau Linux).
Skrip itu menyiapkan semuanya lalu memanggil berkas ini.

Berkas ini:
1. Mengunduh model GGUF kecil sekali (Qwen2.5 Instruct, Q4_K_M) ke folder ./model.
2. Menjalankan model di CPU memakai llama-cpp-python, dengan API kompatibel OpenAI di /v1.
3. Menyajikan index.html di alamat yang sama, jadi game langsung memakai model lokal tanpa pengaturan
   (dan tanpa masalah CORS), lalu membuka browser.

Pilihan:
    --ukuran 0.5b         model paling ringan (sekitar 0,5 GB), jawaban lebih lemah
    --berkas jalur.gguf   pakai berkas GGUF sendiri
    --folder FOLDER       lokasi model (bawaan: ./model)
    --port 8000           port (bila terpakai, otomatis mencari port berikutnya)
    --threads N           batasi jumlah thread CPU
    --tanpa-model         hanya menyajikan game (otak parser), tanpa memuat model
    --buka                buka browser otomatis
Server hanya menerima koneksi dari laptop ini (127.0.0.1). Tekan Ctrl+C untuk berhenti.
"""
import argparse
import os
import socket
import sys
import threading
import webbrowser

AKAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # akar repo
MODEL = {
    "0.5b": ("Qwen/Qwen2.5-0.5B-Instruct-GGUF", "qwen2.5-0.5b-instruct-q4_k_m.gguf"),
    "1.5b": ("Qwen/Qwen2.5-1.5B-Instruct-GGUF", "qwen2.5-1.5b-instruct-q4_k_m.gguf"),
}


def cari_atau_unduh(ukuran: str, folder: str) -> str:
    repo, nama = MODEL[ukuran]
    jalur = os.path.join(folder, nama)
    if os.path.isfile(jalur):
        return jalur
    os.environ.setdefault("HF_HOME", os.path.join(AKAR, ".venv", "hf"))   # cache unduhan tetap di folder proyek
    os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        sys.exit("huggingface_hub belum terpasang. Jalankan MULAI.bat (atau mulai.sh) supaya semuanya dipasang otomatis.")
    print(f"Mengunduh model {nama} (sekali saja, sekitar {'0,5' if ukuran == '0.5b' else '1'} GB). Mohon tunggu...", flush=True)
    os.makedirs(folder, exist_ok=True)
    try:
        return hf_hub_download(repo, nama, local_dir=folder)
    except Exception as e:  # noqa: BLE001
        sys.exit(f"Gagal mengunduh model: {e}\nPeriksa internet lalu coba lagi. Game tetap bisa dimainkan dengan otak parser (buka index.html).")


def port_kosong(awal: int) -> int:
    for p in range(awal, awal + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", p)) != 0:
                return p
    sys.exit(f"Port {awal} sampai {awal + 19} terpakai semua. Tutup aplikasi lain atau pakai --port.")


def buat_app(berkas, n_ctx, threads):
    from fastapi import FastAPI
    from fastapi.responses import FileResponse
    if berkas:
        from llama_cpp.server.app import create_app
        from llama_cpp.server.settings import ModelSettings, ServerSettings
        ms = dict(model=berkas, model_alias="lokal", n_ctx=n_ctx, chat_format="chatml", verbose=False)
        if threads > 0:
            ms["n_threads"] = threads
        app = create_app(server_settings=ServerSettings(host="127.0.0.1"), model_settings=[ModelSettings(**ms)])
    else:
        app = FastAPI()
    # hanya index.html yang disajikan (bukan isi folder lain seperti .venv atau model)
    halaman = os.path.join(AKAR, "index.html")

    @app.get("/", include_in_schema=False)
    def game():
        return FileResponse(halaman, media_type="text/html")
    return app


def main() -> None:
    a = argparse.ArgumentParser(description="Server Ruang Agen (game dan model lokal)")
    a.add_argument("--ukuran", choices=sorted(MODEL), default="1.5b")
    a.add_argument("--berkas", help="jalur berkas .gguf sendiri (melewati unduhan)")
    a.add_argument("--folder", default=os.path.join(AKAR, "model"), help="folder penyimpanan model")
    a.add_argument("--port", type=int, default=8000)
    a.add_argument("--n_ctx", type=int, default=2048, help="panjang konteks (kecil = hemat memori)")
    a.add_argument("--threads", type=int, default=0, help="jumlah thread CPU (0 = otomatis)")
    a.add_argument("--tanpa-model", action="store_true", help="hanya menyajikan game dengan otak parser")
    a.add_argument("--buka", action="store_true", help="buka browser otomatis")
    arg = a.parse_args()

    try:
        import uvicorn  # noqa: F401
        if not arg.tanpa_model:
            import llama_cpp  # noqa: F401
    except ImportError:
        sys.exit("Paket belum terpasang. Jalankan MULAI.bat (Windows) atau ./mulai.sh (Mac atau Linux).")

    berkas = None
    if not arg.tanpa_model:
        print("[3/4] Menyiapkan model bahasa", flush=True)
        berkas = arg.berkas or cari_atau_unduh(arg.ukuran, arg.folder)
        if not os.path.isfile(berkas):
            sys.exit(f"Berkas model tidak ditemukan: {berkas}")
        print(f"      Model: {os.path.basename(berkas)}", flush=True)

    port = port_kosong(arg.port)
    alamat = f"http://127.0.0.1:{port}/"
    print("[4/4] Menjalankan server", flush=True)
    app = buat_app(berkas, arg.n_ctx, arg.threads)
    print("\n" + "=" * 58)
    print(f"  Ruang Agen siap: {alamat}")
    print(f"  Otak: {'model lokal ' + os.path.basename(berkas) if berkas else 'parser aturan (tanpa model)'}")
    print("  Biarkan jendela ini terbuka selama bermain. Ctrl+C untuk berhenti.")
    print("=" * 58 + "\n", flush=True)
    if arg.buka and not os.environ.get("RUANG_TANPA_BROWSER"):   # uji otomatis tidak membuka browser
        threading.Timer(1.5, lambda: webbrowser.open(alamat)).start()
    import uvicorn
    try:
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
    except KeyboardInterrupt:
        pass
    print("Server dihentikan.")


if __name__ == "__main__":
    main()
