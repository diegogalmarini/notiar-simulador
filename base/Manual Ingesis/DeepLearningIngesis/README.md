# Ingesis Tutor Dataset Builder

Proyecto para descargar, procesar y preparar datos del Manual de Ingesis (https://manualweb.ingesis.com.ar/) para fine-tuning de un modelo LLM que funcione como tutor experto del sistema.

## Estructura del Proyecto

```
DeepLearningIngesis/
├── src/
│   ├── scraper.js          # Descarga exhaustiva con Puppeteer
│   ├── processor.js        # Limpieza y estructuración de datos
│   ├── dataset-builder.js  # Preparación del dataset final
│   └── utils/
│       ├── logger.js       # Utilidades de logging
│       └── file-manager.js # Gestión de archivos
├── data/
│   ├── raw/               # Datos crudos descargados
│   ├── processed/         # Datos procesados
│   └── dataset/           # Dataset final para entrenamiento
├── config/
│   └── scraper-config.js  # Configuración del scraper
└── package.json
```

## Instalación

```bash
npm install
```

## Uso

### Pipeline completo
```bash
npm run full-pipeline
```

### Pasos individuales
```bash
# 1. Descargar contenido
npm run scrape

# 2. Procesar datos
npm run process

# 3. Preparar dataset
npm run prepare-dataset
```

## Fases del Proyecto

### Fase 1: Descarga Exhaustiva con Puppeteer
- Navegación automática del sitio
- Captura de todo el contenido
- Manejo de JavaScript dinámico
- Respeto de rate limiting

### Fase 2: Procesamiento de Datos
- Limpieza de HTML
- Extracción de texto relevante
- Estructuración de información
- Eliminación de duplicados

### Fase 3: Preparación del Dataset
- Formateo para fine-tuning
- Generación de pares pregunta-respuesta
- Validación de calidad
- División en conjuntos train/val/test
