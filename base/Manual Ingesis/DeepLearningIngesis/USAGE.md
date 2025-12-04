# Guía de Uso - Ingesis Tutor Dataset Builder

## Requisitos Previos

- Node.js 18 o superior
- npm o yarn
- Conexión a internet estable

## Instalación

```bash
cd "r:\Trabajos\WebApp Escribanías y Notarías\Manual Ingesis\DeepLearningIngesis"
npm install
```

## Uso Básico

### Pipeline Completo (Recomendado)

Ejecuta todo el proceso de una vez:

```bash
npm run full-pipeline
```

Este comando ejecutará:
1. Descarga exhaustiva del manual de Ingesis
2. Procesamiento y limpieza de datos
3. Generación del dataset en múltiples formatos

### Pasos Individuales

Si prefieres ejecutar cada fase por separado:

```bash
# 1. Solo descargar contenido
npm run scrape

# 2. Solo procesar datos descargados
npm run process

# 3. Solo preparar dataset
npm run prepare-dataset
```

## Estructura de Datos Generados

### data/raw/
Páginas web descargadas en formato JSON crudo:
- `page-0.json`, `page-1.json`, etc. - Contenido de cada página
- `visited-urls.json` - URLs ya visitadas (caché)
- `page-queue.json` - Cola de URLs pendientes
- `metadata.json` - Metadatos del scraping

### data/processed/
Datos limpios y estructurados:
- `processed-0.json`, `processed-1.json`, etc. - Páginas procesadas
- `index.json` - Índice de todas las páginas con metadatos

### data/dataset/
Datasets finales para fine-tuning:

#### Formato OpenAI (Chat Completion)
```json
{
  "messages": [
    {"role": "system", "content": "Eres un tutor experto..."},
    {"role": "user", "content": "¿Cómo funciona...?"},
    {"role": "assistant", "content": "El sistema permite..."}
  ]
}
```

Archivos: `train_openai.jsonl`, `validation_openai.jsonl`, `test_openai.jsonl`

#### Formato Alpaca (Instruction Following)
```json
{
  "instruction": "¿Cómo funciona...?",
  "input": "",
  "output": "El sistema permite..."
}
```

Archivos: `train_alpaca.json`, `validation_alpaca.json`, `test_alpaca.json`

#### Formato ShareGPT (Conversational)
```json
{
  "conversations": [
    {"from": "human", "value": "¿Cómo funciona...?"},
    {"from": "gpt", "value": "El sistema permite..."}
  ]
}
```

Archivos: `train_sharegpt.json`, `validation_sharegpt.json`, `test_sharegpt.json`

## Configuración

Edita `config/scraper-config.js` para ajustar:

- **URL base**: Cambiar el sitio a scrapear
- **Rate limiting**: Velocidad de descarga
- **Límites**: Máximo de páginas, profundidad, concurrencia
- **Selectores CSS**: Adaptar a diferentes estructuras HTML
- **Patrones de URL**: Incluir/excluir URLs específicas

## Ejemplos de Configuración

### Aumentar velocidad de scraping
```javascript
rateLimit: {
  minDelay: 500,  // De 1000 a 500
  maxDelay: 1500  // De 3000 a 1500
}
```

### Limitar páginas descargadas
```javascript
limits: {
  maxPages: 100,  // Solo 100 páginas
  maxDepth: 5,    // Profundidad máxima de 5 niveles
}
```

### Aumentar concurrencia
```javascript
limits: {
  concurrency: 5  // 5 páginas simultáneas
}
```

## Uso con Diferentes Modelos

### OpenAI GPT (Fine-tuning API)
```bash
# Usar archivos *_openai.jsonl
openai api fine_tunes.create \
  -t data/dataset/train_openai.jsonl \
  -v data/dataset/validation_openai.jsonl \
  -m gpt-3.5-turbo
```

### Llama 2/3 con Axolotl
```yaml
# config.yml
datasets:
  - path: data/dataset/train_alpaca.json
    type: alpaca
```

### Hugging Face Transformers
```python
from datasets import load_dataset

dataset = load_dataset('json', data_files={
    'train': 'data/dataset/train_sharegpt.json',
    'validation': 'data/dataset/validation_sharegpt.json',
    'test': 'data/dataset/test_sharegpt.json'
})
```

## Solución de Problemas

### Error: "ECONNREFUSED"
- El sitio web puede estar bloqueando solicitudes
- Aumentar delays en `rateLimit`
- Verificar conexión a internet

### Error: "Navigation timeout"
- Aumentar `navigation.timeout` en configuración
- Verificar que el sitio esté accesible

### Puppeteer no descarga Chromium
```bash
# Instalar manualmente
npm install puppeteer --force
```

### Páginas vacías o sin contenido
- Ajustar selectores CSS en `selectors`
- Verificar que el sitio no requiera autenticación
- Revisar si usa JavaScript pesado (aumentar `waitUntil`)

## Optimizaciones

### Para sitios grandes (>1000 páginas)
1. Ejecutar scraping en lotes
2. Usar `limits.maxPages` para dividir trabajo
3. Guardar estado frecuentemente (el script ya lo hace)

### Para mejorar calidad del dataset
1. Filtrar páginas por longitud mínima
2. Agregar más patrones de preguntas en `generateQuestions()`
3. Mejorar la estructura de respuestas en `generateAnswer()`

## Monitoreo

Durante la ejecución, verás:
- ℹ️ Información general
- ✅ Operaciones exitosas
- ⚠️ Advertencias
- ❌ Errores
- 📊 Progreso

## Reiniciar desde Cero

Para limpiar todo y empezar de nuevo:

```bash
Remove-Item -Recurse -Force data/raw/*
Remove-Item -Recurse -Force data/processed/*
Remove-Item -Recurse -Force data/dataset/*
```

## Próximos Pasos

Una vez generado el dataset:

1. **Validar calidad**: Revisar ejemplos en `data/dataset/all_examples.json`
2. **Fine-tuning**: Usar el formato apropiado para tu modelo
3. **Evaluación**: Usar el conjunto test para medir rendimiento
4. **Iteración**: Ajustar configuración según resultados

## Soporte

Para problemas o mejoras, revisar:
- Logs generados por el sistema
- `data/raw/metadata.json` para estadísticas de scraping
- `data/dataset/dataset_metadata.json` para info del dataset
