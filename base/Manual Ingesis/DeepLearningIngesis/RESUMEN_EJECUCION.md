# Resumen de Ejecución - Dataset Ingesis Tutor

**Fecha:** 11 de Noviembre, 2025  
**Proyecto:** Deep Learning Ingesis - Dataset Builder

## 🔄 Actualización 2025-11-11 (Expansión masiva - COMPLETADA)

### Resumen de Ejecución Final

**Objetivo:** Escalar el dataset a 1,000–2,000 ejemplos de alta calidad.

**Estrategia implementada:**
- Extractor de enlaces dedicado: `src/tools/extract-all-links.js`
   - Expande `manutree.asp?section=...` y reúne enlaces de contenido
   - Resultado: 661 URLs únicas precompiladas
- Scraper configurado para procesar lista precompilada
- Pipeline automático con consolidación y análisis

**Resultados del Build Final:**
- **Scraping:** 690 páginas exitosas descargadas
- **Procesamiento:** 696 páginas procesadas (6.115.942 caracteres)
- **Consolidación:** 278 páginas únicas fusionadas (eliminó duplicados por fragmentos URL)
- **Dataset generado:** **1,191 ejemplos**
  - Train: 952 (80%)
  - Validation: 119 (10%)
  - Test: 120 (10%)

**Calidad del Dataset:**
- Promedio pregunta: 34 caracteres
- Promedio respuesta: 2,132 caracteres
- Temas únicos: 3 categorías principales
- Formatos: OpenAI JSONL, Alpaca JSON, ShareGPT JSON

**Herramientas Automatizadas:**
- `monitor-and-build.ps1`: Ejecuta pipeline completo al alcanzar umbral
- `consolidate-processed.js`: Fusiona páginas con misma URL base
- `analyze-dataset.js`: Genera métricas detalladas

**Estado:** ✅ **DATASET LISTO PARA FINE-TUNING** (objetivo alcanzado: >1,000 ejemplos)

## 🎯 Objetivo Alcanzado

Creación exitosa de un dataset completo para fine-tuning de un modelo LLM que funcione como tutor experto del sistema Ingesis SRL.

## 📊 Resultados Finales

### Scraping (Fase 1)
- **Páginas descargadas:** 21
- **Éxito:** 100% (0 fallos)
- **Duración:** 68 segundos
- **Velocidad:** 0.31 páginas/seg
- **Formato:** JSON con HTML completo + contenido estructurado

### Procesamiento (Fase 2)
- **Páginas útiles:** 13 procesadas
- **Páginas omitidas:** 8 (navegación, enlaces externos, contenido vacío)
- **Temas únicos:** 2
- **Texto total:** 36,656 caracteres
- **Promedio por página:** 2,820 caracteres

### Dataset (Fase 3)
- **Total ejemplos:** 52
- **Split train:** 41 (78.8%)
- **Split validation:** 5 (9.6%)
- **Split test:** 6 (11.5%)

### Calidad del Contenido
- **Promedio pregunta:** 29 caracteres
- **Promedio respuesta:** 2,050 caracteres
- **Formatos generados:**
  - ✅ OpenAI (chat completion) - `.jsonl`
  - ✅ Alpaca (instruction following) - `.json`
  - ✅ ShareGPT (conversational) - `.json`

## 📁 Estructura de Archivos Generados

```
data/
├── raw/                    # 21 archivos JSON con contenido original
│   ├── page-0.json
│   ├── page-1.json
│   └── ...
│   ├── visited-urls.json
│   ├── page-queue.json
│   └── metadata.json
│
├── processed/              # 13 archivos JSON estructurados
│   ├── processed-0.json
│   ├── processed-1.json
│   └── ...
│   └── index.json
│
└── dataset/                # Datasets para fine-tuning
    ├── train_openai.jsonl
    ├── validation_openai.jsonl
    ├── test_openai.jsonl
    ├── train_alpaca.json
    ├── validation_alpaca.json
    ├── test_alpaca.json
    ├── train_sharegpt.json
    ├── validation_sharegpt.json
    ├── test_sharegpt.json
    ├── all_examples.json
    └── dataset_metadata.json
```

## 🔧 Configuración Utilizada

### Scraper
- **Max páginas:** 200
- **Profundidad máxima:** 8 niveles
- **Concurrencia:** 2 páginas simultáneas
- **Rate limit:** 500-1500ms entre requests
- **Espera dinámica:** 2000ms + selector wait

### URLs Semilla
Se utilizaron 11 URLs de entrada con contenido estático:
- Uso del manual
- Actualización del sistema
- Requisitos de instalación
- Medios de pago
- Copias automáticas
- Escritorio remoto
- Versiones del software
- Foros y soporte

### Filtros Aplicados
**Excluidos:**
- Binarios (PDF, imágenes, videos)
- Páginas de navegación (manutree.asp, manualsup.asp)
- Videos embebidos
- Enlaces externos a servicios de pago
- Historial de cambios
- Búsquedas

**Incluidos:**
- mostrartopico.asp (contenido de tópicos)
- contenido/*.htm (documentación estática)
- Profundidad hasta nivel 8

## 💡 Mejoras Implementadas

### Durante Desarrollo
1. **IDs únicos:** Sistema de counter para evitar colisiones de archivos
2. **Propagación de IDs:** Desde raw → processed → dataset
3. **Detección de framesets:** Seguimiento automático de frames HTML
4. **URLs semilla:** Bypass del frameset principal
5. **Espera dinámica:** 2s + selector wait para JS dinámico
6. **Validación relajada:** Acepta páginas clave aunque sean cortas
7. **Exclusiones inteligentes:** Filtrado de ruido (nav, multimedia, externos)

### Calidad del Dataset
- Contexto del sistema en cada respuesta
- Múltiples variaciones de preguntas por página
- Respuestas estructuradas con headings, listas, código
- Límite de 6000 caracteres por respuesta (evita respuestas demasiado largas)

## 🚀 Uso del Dataset

### OpenAI Fine-tuning
```bash
openai api fine_tunes.create \
  -t data/dataset/train_openai.jsonl \
  -v data/dataset/validation_openai.jsonl \
  -m gpt-3.5-turbo
```

### Hugging Face Transformers
```python
from datasets import load_dataset

dataset = load_dataset('json', data_files={
    'train': 'data/dataset/train_alpaca.json',
    'validation': 'data/dataset/validation_alpaca.json',
    'test': 'data/dataset/test_alpaca.json'
})
```

### Axolotl (Llama 2/3)
```yaml
datasets:
  - path: data/dataset/train_alpaca.json
    type: alpaca
```

## 📈 Próximos Pasos Recomendados

1. **Expansión del dataset:**
   - Aumentar `maxPages` a 500-1000
   - Agregar más URLs semilla de secciones específicas
   - Permitir mayor profundidad (10-12 niveles)

2. **Mejora de calidad:**
   - Generar más variaciones de preguntas (10-15 por página)
   - Incluir preguntas de resolución de problemas
   - Agregar preguntas "cómo hacer X paso a paso"
   - Preguntas comparativas entre módulos

3. **Enriquecimiento:**
   - Agregar imágenes/capturas como referencias
   - Incluir ejemplos de casos de uso reales
   - Metadata adicional (dificultad, módulo, versión)

4. **Fine-tuning:**
   - Comenzar con modelo base (Llama 3 8B o GPT-3.5)
   - Evaluar en conjunto test
   - Iterar mejorando prompts y estructura

## ✅ Conclusión

El pipeline está **completamente funcional** y ha generado un dataset de **alta calidad** con:
- ✅ Contenido rico y contextual
- ✅ Múltiples formatos estándar
- ✅ División train/val/test apropiada
- ✅ Sistema robusto con manejo de errores
- ✅ Caché y recuperación de estado
- ✅ Logging detallado

**Estado:** LISTO PARA FINE-TUNING 🚀

---

**Comandos rápidos:**

```bash
# Ver resumen del dataset generado
Get-Content data/dataset/dataset_metadata.json | ConvertFrom-Json

# Ver ejemplos del dataset
Get-Content data/dataset/all_examples.json | ConvertFrom-Json | Select-Object -First 10

# Analizar calidad del dataset
node src/tools/analyze-dataset.js

# Contar ejemplos por split
(Get-Content data/dataset/train_alpaca.json | ConvertFrom-Json).Count    # 952
(Get-Content data/dataset/validation_alpaca.json | ConvertFrom-Json).Count # 119
(Get-Content data/dataset/test_alpaca.json | ConvertFrom-Json).Count     # 120

# Re-ejecutar consolidación si necesario
node src/tools/consolidate-processed.js

# Rebuild forzado con nuevo umbral
pwsh -File .\monitor-and-build.ps1 -Threshold 600 -ForceRebuild
```

---

## Informe automático del build (2025-11-11 20:37:28)

Detalles clave:

```
============================================================
ANÁLISIS DEL DATASET
============================================================
Ejemplos totales: 1191
Split: train=952, val=119, test=120
Tópicos únicos: 3

Top 10 tópicos por páginas:
  - mostrartopico.asp: 240
  - contenido: 35
  - mostrartopicofb.asp: 3

Longitud de inputs (caracteres):
{
  count: 1191,
  avg: 34,
  min: 15,
  max: 105,
  q: { '0.25': 27, '0.5': 29, '0.75': 42, '0.9': 44, '0.95': 51 }
}

Longitud de outputs (caracteres):
{
  count: 1191,
  avg: 2132,
  min: 96,
  max: 6099,
  q: { '0.25': 486, '0.5': 1405, '0.75': 3071, '0.9': 6099, '0.95': 6099 }
}

Páginas más largas:
  - (1540607) Opciones
  - (1424767) Menu_ppal_edicion.htm
  - (906654) Menu_ppal_archivo.htm
  - (895959) Menu_ppal_formato.htm
  - (109199) Area_de_edicion.htm

Posibles duplicados detectados: 19 pares (páginas de foro y páginas tipo "ord=")
============================================================
```

## Informe automático del build (2025-11-11 21:37:05)

Detalles clave:

```
============================================================
ANÁLISIS DEL DATASET
============================================================
Ejemplos totales: 1191
Split: train=952, val=119, test=120
Tópicos únicos: 3

Top 10 tópicos por páginas:
  - mostrartopico.asp: 240
  - contenido: 35
  - mostrartopicofb.asp: 3

Longitud de inputs (caracteres):
{
  count: 1191,
  avg: 34,
  min: 15,
  max: 105,
  q: { '0.25': 27, '0.5': 29, '0.75': 42, '0.9': 44, '0.95': 51 }
}

Longitud de outputs (caracteres):
{
  count: 1191,
  avg: 2132,
  min: 96,
  max: 6099,
  q: { '0.25': 486, '0.5': 1405, '0.75': 3071, '0.9': 6099, '0.95': 6099 }
}

Páginas más largas:
  - (1540607) Opciones
  - (1424767) https://manualweb.ingesis.com.ar/mostrartopico.asp?h=Menu_ppal_edicion.htm
  - (906654) https://manualweb.ingesis.com.ar/mostrartopico.asp?h=Menu_ppal_archivo.htm
  - (895959) https://manualweb.ingesis.com.ar/mostrartopico.asp?h=Menu_ppal_formato.htm
  - (109199) https://manualweb.ingesis.com.ar/mostrartopico.asp?h=Area_de_edicion.htm
  - (107693) Diálogos de selección
  - (97937) https://manualweb.ingesis.com.ar/mostrartopico.asp?h=Menu_ppal_ver.htm
  - (90159) https://manualweb.ingesis.com.ar/mostrartopico.asp?h=Menu_ppal_macros.htm
  - (85103) https://manualweb.ingesis.com.ar/mostrartopico.asp?h=Consideraciones_generales.htm
  - (55637) https://manualweb.ingesis.com.ar/mostrartopico.asp?h=Interlineador_3.htm

Posibles duplicados: 19
  * https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IBW_foro.html  <->  https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IDW_foro.html
  * https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IBW_foro.html  <->  https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IFW_foro.html
  * https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IDW_cert_catastral.htm  <->  https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IW_Impresion_Copias.htm
  * https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IBW_foro.html  <->  https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IW_foro.html
  * https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IBW_foro.html  <->  https://manualweb.ingesis.com.ar/mostrartopico.asp?h=PW_foro.html
  * https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IBW_foro.html  <->  https://manualweb.ingesis.com.ar/mostrartopico.asp?ord=113
  * https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IBW_foro.html  <->  https://manualweb.ingesis.com.ar/mostrartopico.asp?ord=127
  * https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IBW_foro.html  <->  https://manualweb.ingesis.com.ar/mostrartopico.asp?ord=33
  * https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IBW_foro.html  <->  https://manualweb.ingesis.com.ar/mostrartopico.asp?ord=38
  * https://manualweb.ingesis.com.ar/mostrartopico.asp?h=IBW_foro.html  <->  https://manualweb.ingesis.com.ar/mostrartopico.asp?ord=754
============================================================
```

