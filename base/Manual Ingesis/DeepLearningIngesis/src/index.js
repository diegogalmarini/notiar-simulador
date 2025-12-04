/**
 * Script Principal - Pipeline Completo
 * Ejecuta todo el proceso: descarga -> procesamiento -> dataset
 */

import Logger from './utils/logger.js';
import IngesisScraper from './scraper.js';
import DataProcessor from './processor.js';
import DatasetBuilder from './dataset-builder.js';

const logger = new Logger('PIPELINE');

async function main() {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log('INGESIS TUTOR - PIPELINE DE CREACIÓN DE DATASET');
  console.log('='.repeat(60) + '\n');

  try {
    // FASE 1: Scraping
    logger.info('FASE 1: Descarga de contenido con Puppeteer');
    const scraper = new IngesisScraper();
    await scraper.initialize();
    await scraper.scrape();
    await scraper.cleanup();
    
    console.log('\n');

    // FASE 2: Procesamiento
    logger.info('FASE 2: Procesamiento y estructuración de datos');
    const processor = new DataProcessor();
    await processor.processAll();
    
    console.log('\n');

    // FASE 3: Construcción del dataset
    logger.info('FASE 3: Preparación del dataset para fine-tuning');
    const builder = new DatasetBuilder();
    await builder.build();

    // Resumen final
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('PIPELINE COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`Duración total: ${duration.toFixed(2)} segundos`);
    console.log(`\nArchivos generados en:`);
    console.log(`  - data/raw/          (páginas descargadas)`);
    console.log(`  - data/processed/    (datos procesados)`);
    console.log(`  - data/dataset/      (datasets para fine-tuning)`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    logger.error('Error en el pipeline', error);
    process.exit(1);
  }
}

main();
