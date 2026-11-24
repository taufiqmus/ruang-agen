# Cadangan bila Python tidak ada: server berkas kecil dengan PowerShell (ada di setiap Windows).
# Menyajikan index.html dan studio.html di http://127.0.0.1:PORT. Model Ollama dipilih dan diunduh dari dalam game (tab Otak).
param([int]$Port = 8000, [switch]$Studio)
$akar = Split-Path -Parent $PSScriptRoot
$l = $null
foreach ($p in $Port..($Port + 19)) {
  $c = New-Object System.Net.HttpListener
  $c.Prefixes.Add("http://127.0.0.1:$p/")
  try { $c.Start(); $l = $c; $Port = $p; break } catch { $c.Close() }
}
if (-not $l) { Write-Host "Port $Port sampai $($Port + 19) terpakai semua."; exit 1 }
$ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
$info = '{"cpu":' + [Environment]::ProcessorCount + ',"ram":' + $ram + ',"gpu":"","vram":0}'
$alamat = "http://127.0.0.1:$Port/" + $(if ($Studio) { "studio.html" } else { "" })
Write-Host "=========================================================="
Write-Host "  Siap: $alamat"
Write-Host "  Biarkan jendela ini terbuka selama bermain. Ctrl+C untuk berhenti."
Write-Host "=========================================================="
if (-not $env:RUANG_TANPA_BROWSER) { Start-Process $alamat }
$halaman = @{ "/" = "index.html"; "/index.html" = "index.html"; "/studio.html" = "studio.html" }
while ($l.IsListening) {
  $ctx = $l.GetContext()
  $r = $ctx.Response
  $jalur = $ctx.Request.Url.AbsolutePath
  if ($jalur -eq "/_info") { $b = [Text.Encoding]::UTF8.GetBytes($info); $r.ContentType = "application/json" }
  elseif ($halaman.ContainsKey($jalur) -and (Test-Path (Join-Path $akar $halaman[$jalur]))) { $b = [IO.File]::ReadAllBytes((Join-Path $akar $halaman[$jalur])); $r.ContentType = "text/html; charset=utf-8" }
  else { $r.StatusCode = 404; $b = [Text.Encoding]::UTF8.GetBytes("Tidak ada.") }
  $r.AddHeader("Cache-Control", "no-store")
  $r.ContentLength64 = $b.Length
  $r.OutputStream.Write($b, 0, $b.Length)
  $r.Close()
}
