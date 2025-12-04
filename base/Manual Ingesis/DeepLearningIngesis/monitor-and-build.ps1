Param(
  [int]$Threshold = 600,
  [int]$IntervalSeconds = 15,
  [switch]$ForceRebuild
)

$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$metaPath = Join-Path $root 'data/raw/metadata.json'
$marker = Join-Path $root 'data/.build_started'

Write-Host "`n=== MONITOR DE SCRAPING Y CONSTRUCCIÓN DE DATASET ===" -ForegroundColor Cyan
Write-Host "Umbral de páginas exitosas: $Threshold" -ForegroundColor Yellow
Write-Host "Intervalo de sondeo: $IntervalSeconds s" -ForegroundColor Yellow
if ($ForceRebuild) { Write-Host "Modo: Forzar reconstrucción (ignora marcador previo)" -ForegroundColor Magenta }

function Get-Stats {
  if (Test-Path $metaPath) {
    try {
      return Get-Content $metaPath -Raw | ConvertFrom-Json
    } catch {
      return $null
    }
  }
  return $null
}

function Show-ScrapeProgress($m) {
  $succ = $m.stats.pagesSuccessful
  $proc = $m.stats.pagesProcessed
  $queue = ($m.urlQueue | Measure-Object).Count
  $visited = ($m.pages | Measure-Object).Count
  Write-Host ("`n[{0}] Progreso | Exitosas: {1} | Procesadas: {2} | Visitadas: {3} | En cola: {4}" -f (Get-Date).ToString('HH:mm:ss'), $succ, $proc, $visited, $queue) -ForegroundColor Green
}

while ($true) {
  $m = Get-Stats
  if ($null -ne $m) {
  Show-ScrapeProgress -m $m

    $succ = [int]$m.stats.pagesSuccessful
    $done = ($succ -ge $Threshold)

    if ($done) {
      if ($ForceRebuild -and (Test-Path $marker)) {
        Remove-Item $marker -Force -ErrorAction SilentlyContinue | Out-Null
      }
      if (-not (Test-Path $marker)) {
        New-Item -ItemType Directory -Force -Path (Split-Path $marker) | Out-Null
        New-Item -ItemType File -Force -Path $marker | Out-Null
        Write-Host "\n===> Umbral alcanzado. Iniciando procesamiento y construcción de dataset..." -ForegroundColor Magenta

        # Ejecutar procesador, consolidación y generador de dataset
        Write-Host "Ejecutando: node src/processor.js" -ForegroundColor Cyan
        node src/processor.js

        Write-Host "Ejecutando: node src/tools/consolidate-processed.js" -ForegroundColor Cyan
        node src/tools/consolidate-processed.js

        Write-Host "Ejecutando: node src/dataset-builder.js (usando índice merged si existe)" -ForegroundColor Cyan
        node src/dataset-builder.js

        # Analizar dataset y anexar resumen a RESUMEN_EJECUCION.md
        Write-Host "Ejecutando: node src/tools/analyze-dataset.js" -ForegroundColor Cyan
        $analysis = node src/tools/analyze-dataset.js | Out-String
        $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
        $append = @()
        $append += ""
        $append += "## Informe automático del build ($stamp)"
        $append += ""
        $append += "Detalles clave:"
        $append += ""
        $append += '```'
        $append += $analysis.Trim()
        $append += '```'
        $append += ""
        Add-Content -Path (Join-Path $root 'RESUMEN_EJECUCION.md') -Value ($append -join [Environment]::NewLine)

        Write-Host "`n=== PROCESAMIENTO COMPLETADO ===" -ForegroundColor Green
        Write-Host "Resultados en data/processed e data/dataset" -ForegroundColor Yellow
      } else {
        Write-Host "\nProcesamiento ya iniciado anteriormente. Finalizando monitor." -ForegroundColor DarkYellow
      }
      break
    }
  } else {
    Write-Host "Esperando metadata.json..." -ForegroundColor DarkGray
  }

  Start-Sleep -Seconds $IntervalSeconds
}
