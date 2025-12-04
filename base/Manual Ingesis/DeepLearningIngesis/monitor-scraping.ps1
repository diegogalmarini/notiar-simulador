#!/usr/bin/env pwsh
# Monitor de progreso del scraping en tiempo real

$previousCount = 0
$startTime = Get-Date

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     MONITOR DE SCRAPING MASIVO - INGESIS TUTOR        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

while ($true) {
    Clear-Host
    $currentTime = Get-Date
    $elapsed = ($currentTime - $startTime).TotalSeconds
    
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     MONITOR DE SCRAPING MASIVO - INGESIS TUTOR        ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
    
    Write-Host "⏱️  Tiempo transcurrido: " -NoNewline -ForegroundColor Yellow
    Write-Host "$([math]::Floor($elapsed / 60))m $([math]::Floor($elapsed % 60))s`n" -ForegroundColor White
    
    # Contar archivos raw
    $rawFiles = @(Get-ChildItem "data/raw/page-*.json" -ErrorAction SilentlyContinue).Count
    
    # Calcular velocidad
    if ($elapsed -gt 0) {
        $velocity = [math]::Round($rawFiles / $elapsed, 2)
    } else {
        $velocity = 0
    }
    
    # Calcular páginas nuevas
    $newPages = $rawFiles - $previousCount
    $previousCount = $rawFiles
    
    Write-Host "📄 Páginas descargadas: " -NoNewline -ForegroundColor Green
    Write-Host "$rawFiles" -ForegroundColor White -NoNewline
    if ($newPages -gt 0) {
        Write-Host " (+$newPages)" -ForegroundColor Yellow
    } else {
        Write-Host ""
    }
    
    Write-Host "⚡ Velocidad: " -NoNewline -ForegroundColor Cyan
    Write-Host "$velocity páginas/seg`n" -ForegroundColor White
    
    # Leer metadata si existe
    if (Test-Path "data/raw/metadata.json") {
        try {
            $meta = Get-Content "data/raw/metadata.json" | ConvertFrom-Json
            
            Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor DarkCyan
            Write-Host "ESTADÍSTICAS DETALLADAS" -ForegroundColor White
            Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor DarkCyan
            
            Write-Host "✅ Exitosas: " -NoNewline -ForegroundColor Green
            Write-Host "$($meta.stats.pagesSuccessful)" -ForegroundColor White
            
            Write-Host "❌ Fallidas: " -NoNewline -ForegroundColor Red
            Write-Host "$($meta.stats.pagesFailed)" -ForegroundColor White
            
            Write-Host "🔗 URLs visitadas: " -NoNewline -ForegroundColor Cyan
            Write-Host "$($meta.pages.Count)`n" -ForegroundColor White
            
            # Últimas 5 páginas
            if ($meta.pages.Count -gt 0) {
                Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor DarkCyan
                Write-Host "ÚLTIMAS PÁGINAS PROCESADAS" -ForegroundColor White
                Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor DarkCyan
                
                $lastPages = $meta.pages | Select-Object -Last 5
                foreach ($page in $lastPages) {
                    $url = $page.url
                    if ($url.Length -gt 50) {
                        $url = $url.Substring(0, 47) + "..."
                    }
                    Write-Host "  • $url" -ForegroundColor Gray
                }
            }
        } catch {
            Write-Host "⚠️  Error leyendo metadata" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host "Actualizando en 5 segundos... (Ctrl+C para salir)" -ForegroundColor DarkGray
    Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor DarkCyan
    
    Start-Sleep -Seconds 5
}
