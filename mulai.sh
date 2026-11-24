#!/usr/bin/env sh
# Ruang Agen untuk Mac dan Linux: ./mulai.sh  (pertama kali butuh internet dan beberapa menit)
cd "$(dirname "$0")" || exit 1
echo "=========================================================="
echo "  Ruang Agen: menyiapkan game (tanpa memasang apa pun)"
echo "=========================================================="
PY="${RUANG_PYTHON:-}"
if [ -z "$PY" ]; then
  for c in python3 python; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c "import sys; sys.exit(0 if sys.version_info[:2] >= (3,7) else 1)" 2>/dev/null; then PY="$c"; break; fi
  done
fi
if [ -z "$PY" ]; then
  echo "Python 3 belum ada. Pasang dari https://www.python.org/downloads/ (Mac) atau paket python3.12 (Linux), lalu jalankan lagi."
  echo "Tanpa Python pun game tetap bisa dimainkan: buka index.html (otak parser)."
  exit 1
fi
echo "Memakai Python: $PY"
exec "$PY" server/jalankan.py "$@"
