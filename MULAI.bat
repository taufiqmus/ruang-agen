@echo off
setlocal
cd /d "%~dp0"
title Ruang Agen
echo ==========================================================
echo   Ruang Agen: menyiapkan game dan otak AI lokal
echo   (pertama kali butuh internet dan beberapa menit)
echo ==========================================================

set "PY="
if defined RUANG_PYTHON set PY="%RUANG_PYTHON%"
if defined PY goto ada

rem 1) Python launcher "py" dengan versi yang cocok
for %%v in (3.12 3.11 3.10) do (
  if not defined PY (
    py -%%v -c "import sys" >nul 2>&1 && set "PY=py -%%v"
  )
)
if defined PY goto ada

rem 2) python atau python3 di PATH, asal versinya 3.10 sampai 3.12
for %%c in (python python3) do (
  if not defined PY (
    %%c -c "import sys; sys.exit(0 if (3,10) <= sys.version_info[:2] <= (3,12) else 1)" >nul 2>&1 && set "PY=%%c"
  )
)
if defined PY goto ada

echo.
echo Python 3.10 sampai 3.12 belum ada di laptop ini.
where winget >nul 2>&1 || goto manual
choice /m "Pasang Python 3.12 otomatis sekarang"
if errorlevel 2 goto manual
winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements
echo.
echo Python terpasang. Tutup jendela ini, lalu klik dua kali MULAI.bat sekali lagi.
pause
exit /b 0

:manual
echo.
echo Pasang Python 3.12 dari https://www.python.org/downloads/
echo (saat memasang, centang "Add python.exe to PATH"), lalu klik dua kali MULAI.bat lagi.
echo Tanpa Python pun game tetap bisa dimainkan: klik dua kali index.html (otak parser).
pause
exit /b 1

:ada
echo Memakai Python: %PY%
%PY% server\jalankan.py %*
if errorlevel 1 pause
