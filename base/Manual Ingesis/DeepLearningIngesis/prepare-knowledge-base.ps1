# Script para preparar Knowledge Base para ChatGPT GPT
# Convierte el dataset a formatos compatibles

$outputDir = "data/gpt-knowledge"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Host "`n=== PREPARANDO KNOWLEDGE BASE PARA GPT ===" -ForegroundColor Cyan

# 1. Cargar dataset
$examples = Get-Content "data/dataset/all_examples.json" -Encoding UTF8 | ConvertFrom-Json
Write-Host "Ejemplos cargados: $($examples.Count)" -ForegroundColor Green

# 2. Generar archivo de texto plano (mejor para búsqueda)
Write-Host "`nGenerando knowledge-base.txt..." -ForegroundColor Yellow
$textContent = @()
$textContent += "# Manual de Usuario - Sistema Ingesis SRL"
$textContent += "# Guía completa para escribanías y notarías"
$textContent += ""
$textContent += "=" * 80
$textContent += ""

foreach ($ex in $examples) {
    $textContent += "## PREGUNTA: $($ex.instruction)"
    $textContent += ""
    $textContent += "**RESPUESTA:**"
    $textContent += ""
    $textContent += $ex.output
    $textContent += ""
    $textContent += "-" * 80
    $textContent += ""
}

$textContent | Out-File -FilePath "$outputDir/knowledge-base.txt" -Encoding UTF8
Write-Host "✓ Generado: $outputDir/knowledge-base.txt" -ForegroundColor Green
Write-Host "  Tamaño: $([math]::Round((Get-Item "$outputDir/knowledge-base.txt").Length / 1MB, 2)) MB" -ForegroundColor Cyan

# 3. Generar archivo JSON (alternativa estructurada)
Write-Host "`nGenerando knowledge-base.json..." -ForegroundColor Yellow
$jsonContent = @{
    title = "Manual Ingesis SRL"
    description = "Documentación completa del sistema de gestión para escribanías"
    version = "2025-11"
    total_entries = $examples.Count
    entries = $examples | ForEach-Object {
        @{
            question = $_.instruction
            answer = $_.output
            topic = $_.metadata.topic
            source = $_.metadata.source_url
        }
    }
}
$jsonContent | ConvertTo-Json -Depth 10 -Compress:$false | 
    Out-File -FilePath "$outputDir/knowledge-base.json" -Encoding UTF8
Write-Host "✓ Generado: $outputDir/knowledge-base.json" -ForegroundColor Green
Write-Host "  Tamaño: $([math]::Round((Get-Item "$outputDir/knowledge-base.json").Length / 1MB, 2)) MB" -ForegroundColor Cyan

# 4. Generar archivo Markdown (mejor formato para GPT)
Write-Host "`nGenerando knowledge-base.md..." -ForegroundColor Yellow
$mdContent = @()
$mdContent += "# Manual de Usuario - Sistema Ingesis SRL"
$mdContent += ""
$mdContent += "**Sistema de gestión integral para escribanías y notarías**"
$mdContent += ""
$mdContent += "---"
$mdContent += ""

# Agrupar por tópico
$byTopic = $examples | Group-Object { $_.metadata.topic }

foreach ($group in $byTopic) {
    $mdContent += ""
    $mdContent += "## $($group.Name)"
    $mdContent += ""
    
    foreach ($ex in $group.Group) {
        $mdContent += "### $($ex.instruction)"
        $mdContent += ""
        $mdContent += $ex.output
        $mdContent += ""
        $mdContent += "---"
        $mdContent += ""
    }
}

$mdContent | Out-File -FilePath "$outputDir/knowledge-base.md" -Encoding UTF8
Write-Host "✓ Generado: $outputDir/knowledge-base.md" -ForegroundColor Green
Write-Host "  Tamaño: $([math]::Round((Get-Item "$outputDir/knowledge-base.md").Length / 1MB, 2)) MB" -ForegroundColor Cyan

# 5. Dividir en archivos más pequeños (si es necesario)
$maxSizeMB = 5
$txtSize = (Get-Item "$outputDir/knowledge-base.txt").Length / 1MB

if ($txtSize -gt $maxSizeMB) {
    Write-Host "`nArchivo muy grande ($([math]::Round($txtSize, 2)) MB), dividiendo..." -ForegroundColor Yellow
    $chunkSize = [math]::Ceiling($examples.Count / [math]::Ceiling($txtSize / $maxSizeMB))
    
    for ($i = 0; $i -lt $examples.Count; $i += $chunkSize) {
        $chunk = $examples[$i..[math]::Min($i + $chunkSize - 1, $examples.Count - 1)]
        $partNum = [math]::Floor($i / $chunkSize) + 1
        
        $chunkContent = @()
        $chunkContent += "# Manual Ingesis SRL - Parte $partNum"
        $chunkContent += ""
        
        foreach ($ex in $chunk) {
            $chunkContent += "## PREGUNTA: $($ex.instruction)"
            $chunkContent += ""
            $chunkContent += "**RESPUESTA:**"
            $chunkContent += ""
            $chunkContent += $ex.output
            $chunkContent += ""
            $chunkContent += "-" * 80
            $chunkContent += ""
        }
        
        $chunkContent | Out-File -FilePath "$outputDir/knowledge-base-part$partNum.txt" -Encoding UTF8
        Write-Host "  ✓ Parte $partNum - $chunkSize ejemplos" -ForegroundColor Green
    }
}

Write-Host "`n=== ARCHIVOS LISTOS ===" -ForegroundColor Green
Write-Host "Ubicación: $outputDir" -ForegroundColor Cyan
Write-Host "`nArchivos generados:" -ForegroundColor Yellow
Get-ChildItem $outputDir | ForEach-Object {
    Write-Host "  - $($_.Name) ($([math]::Round($_.Length / 1MB, 2)) MB)" -ForegroundColor Gray
}

Write-Host "`n=== SIGUIENTE PASO ===" -ForegroundColor Magenta
Write-Host "1. Abre: https://chat.openai.com/gpts/editor" -ForegroundColor White
Write-Host "2. Selecciona tu GPT 'Tutor Ingesis SRL'" -ForegroundColor White
Write-Host "3. Ve a la pestaña 'Configurar'" -ForegroundColor White
Write-Host "4. En 'Conocimiento', haz clic en 'Cargar archivos'" -ForegroundColor White
Write-Host "5. Sube los archivos de: $outputDir" -ForegroundColor Cyan
Write-Host "6. Guarda el GPT" -ForegroundColor White
