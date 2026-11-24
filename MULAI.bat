@echo off
setlocal
cd /d "%~dp0"
title Ruang Agen
echo ==========================================================
echo   Ruang Agen: menyiapkan game (tanpa memasang apa pun)
echo ==========================================================

rem Python 3.7 ke atas (versi apa pun, tanpa paket tambahan). py = Python launcher Windows.
set "PY="
for %%c in ("py -3" python python3) do (
  if not defined PY (
    %%~c -c "import sys; sys.exit(0 if sys.version_info[:2] >= (3, 7) else 1)" >nul 2>&1 && set "PY=%%~c"
  )
)
if defined PY (
  %PY% server\jalankan.py %*
  if errorlevel 1 pause
  exit /b
)

rem Tanpa Python: server cadangan dengan PowerShell. Model Ollama dipilih dari dalam game (tab Otak).
echo Python tidak ditemukan, memakai PowerShell. Pilih model Ollama dari dalam game (tab Otak).
set "STUDIO="
echo %* | find /i "--studio" >nul && set "STUDIO=-Studio"
powershell -NoProfile -ExecutionPolicy Bypass -File "server\mini.ps1" %STUDIO%
if errorlevel 1 pause
