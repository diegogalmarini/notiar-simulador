/**
 * Procesador de Datos
 * Limpia y estructura el contenido descargado del manual de Ingesis
 */

import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';
import path from 'path';
import Logger from './utils/logger.js';
import FileManager from './utils/file-manager.js';
import { SCRAPER_CONFIG } from '../config/scraper-config.js';

const logger = new Logger('PROCESSOR');

class DataProcessor {
  constructor() {
    this.processedPages = [];
    this.stats = {
      pagesProcessed: 0,
      pagesSkipped: 0,
      totalTextLength: 0,
      uniqueTopics: new Set()
    };
  }

  /**
   * Limpia texto eliminando espacios extra y caracteres especiales
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')           // Múltiples espacios a uno
      .replace(/\n\s*\n/g, '\n')      // Múltiples saltos de línea
      .replace(/[^\S\n]+/g, ' ')      // Espacios horizontales extra
      .trim();
  }

  /**
   * Extrae el tema/categoría de una URL o título
   */
  extractTopic(url, title) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      // Usar la primera parte del path como tema
      if (pathParts.length > 0) {
        return pathParts[0].replace(/-/g, ' ').replace(/_/g, ' ');
      }
      
      // Si no hay path, usar el título
      if (title) {
        return title.split('-')[0].split(':')[0].trim();
      }
      
      return 'General';
    } catch (error) {
      return 'General';
    }
  }

  /**
   * Procesa el HTML para extraer texto limpio
   */
  processHTML(html) {
    const $ = cheerio.load(html);
    
    // Remover elementos no deseados
    $('script, style, nav, footer, header, .advertisement, .ads').remove();
    
    // Extraer texto del contenido principal
    const mainContent = $(SCRAPER_CONFIG.selectors.mainContent).first();
    
    if (mainContent.length > 0) {
      return this.cleanText(mainContent.text());
    }
    
    // Fallback: usar el body completo
    return this.cleanText($('body').text());
  }

  /**
   * Estructura el contenido de una página
   */
  structureContent(pageData) {
    const { url, content, html } = pageData;
    
    // Extraer información estructurada
    const structured = {
      id: pageData.id ?? undefined,
      url,
      title: this.cleanText(content.title),
      topic: this.extractTopic(url, content.title),
      sections: [],
      fullText: '',
      metadata: {
        headingCount: content.headings.length,
        paragraphCount: content.paragraphs.length,
        hasCode: content.code.length > 0,
        hasTables: content.tables.length > 0,
        linkCount: content.links.length
      }
    };

    // Procesar encabezados y crear secciones
    let currentSection = null;
    
    for (const heading of content.headings) {
      if (heading.level === 'H1' || heading.level === 'H2') {
        // Nueva sección
        if (currentSection) {
          structured.sections.push(currentSection);
        }
        currentSection = {
          heading: this.cleanText(heading.text),
          level: heading.level,
          content: []
        };
      } else if (currentSection) {
        // Subsección
        currentSection.content.push({
          type: 'subheading',
          level: heading.level,
          text: this.cleanText(heading.text)
        });
      }
    }

    // Agregar última sección
    if (currentSection) {
      structured.sections.push(currentSection);
    }

    // Agregar párrafos a las secciones o al texto general
    for (const paragraph of content.paragraphs) {
      const cleanPara = this.cleanText(paragraph);
      if (cleanPara && cleanPara.length > 20) { // Filtrar párrafos muy cortos
        if (currentSection) {
          currentSection.content.push({
            type: 'paragraph',
            text: cleanPara
          });
        }
        structured.fullText += cleanPara + '\n\n';
      }
    }

    // Agregar listas
    for (const list of content.lists) {
      const items = list.map(item => this.cleanText(item)).filter(item => item);
      if (items.length > 0) {
        if (currentSection) {
          currentSection.content.push({
            type: 'list',
            items
          });
        }
        structured.fullText += items.join('\n') + '\n\n';
      }
    }

    // Agregar código
    for (const code of content.code) {
      const cleanCode = this.cleanText(code);
      if (cleanCode) {
        if (currentSection) {
          currentSection.content.push({
            type: 'code',
            text: cleanCode
          });
        }
        structured.fullText += `\`\`\`\n${cleanCode}\n\`\`\`\n\n`;
      }
    }

    // Procesar tablas
    for (const table of content.tables) {
      if (table.length > 0) {
        if (currentSection) {
          currentSection.content.push({
            type: 'table',
            rows: table
          });
        }
        // Convertir tabla a texto
        const tableText = table.map(row => row.join(' | ')).join('\n');
        structured.fullText += tableText + '\n\n';
      }
    }

    // Procesar HTML completo como fallback
    if (!structured.fullText || structured.fullText.length < 100) {
      structured.fullText = this.processHTML(html);
    }

    structured.fullText = this.cleanText(structured.fullText);

    return structured;
  }

  /**
   * Valida si una página tiene contenido útil
   */
  isValidPage(structured) {
    // Debe tener título o contenido significativo
    const isTopico = /mostrartopico\.asp/i.test(structured.url) || /guiaweb\.asp/i.test(structured.url);
    if (!structured.title && structured.fullText.length < 60 && !isTopico) {
      return false;
    }

    // Filtrar páginas de navegación o error
    const lowercaseText = structured.fullText.toLowerCase();
    const invalidPhrases = [
      '404',
      'page not found',
      'página no encontrada',
      'error',
      'access denied'
    ];

    for (const phrase of invalidPhrases) {
      if (lowercaseText.includes(phrase)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Procesa todas las páginas descargadas
   */
  async processAll() {
    logger.info('Iniciando procesamiento de datos...');

    // Leer metadata para obtener lista de páginas
    const metadata = await FileManager.readJSON(SCRAPER_CONFIG.cacheFiles.metadata);
    const pages = metadata.pages || [];

    logger.info(`Encontradas ${pages.length} páginas para procesar`);

    for (let i = 0; i < pages.length; i++) {
      const pageInfo = pages[i];
      
      try {
        // Leer datos crudos
        const filepath = `${SCRAPER_CONFIG.outputDirs.raw}/${pageInfo.filename}`;
        const rawData = await FileManager.readJSON(filepath);

        // Procesar y estructurar
        const structured = this.structureContent(rawData);

        // Validar
        if (this.isValidPage(structured)) {
          this.processedPages.push(structured);
          this.stats.pagesProcessed++;
          this.stats.totalTextLength += structured.fullText.length;
          this.stats.uniqueTopics.add(structured.topic);

          // Guardar página procesada
          const outputFilename = `processed-${pageInfo.id}.json`;
          const outputPath = `${SCRAPER_CONFIG.outputDirs.processed}/${outputFilename}`;
          await FileManager.saveJSON(outputPath, structured);

          logger.progress(i + 1, pages.length, structured.title || structured.url);
        } else {
          this.stats.pagesSkipped++;
          logger.warn(`Página omitida (contenido inválido): ${pageInfo.url}`);
        }
      } catch (error) {
        logger.error(`Error procesando ${pageInfo.filename}`, error);
        this.stats.pagesSkipped++;
      }
    }

    // Guardar índice de páginas procesadas
    await this.saveIndex();
    
    logger.success('Procesamiento completado!');
    this.printStats();
  }

  /**
   * Guarda índice de páginas procesadas
   */
  async saveIndex() {
    const index = {
      totalPages: this.processedPages.length,
      topics: Array.from(this.stats.uniqueTopics),
      pages: this.processedPages.map((page) => ({
        id: page.id,
        url: page.url,
        title: page.title,
        topic: page.topic,
        textLength: page.fullText.length,
        sectionCount: page.sections.length
      }))
    };

    await FileManager.saveJSON(
      `${SCRAPER_CONFIG.outputDirs.processed}/index.json`,
      index
    );

    logger.success('Índice guardado');
  }

  /**
   * Imprime estadísticas
   */
  printStats() {
    console.log('\n' + '='.repeat(60));
    console.log('ESTADÍSTICAS DE PROCESAMIENTO');
    console.log('='.repeat(60));
    console.log(`Páginas procesadas: ${this.stats.pagesProcessed}`);
    console.log(`Páginas omitidas: ${this.stats.pagesSkipped}`);
    console.log(`Temas únicos: ${this.stats.uniqueTopics.size}`);
    console.log(`Longitud total de texto: ${this.stats.totalTextLength.toLocaleString()} caracteres`);
    console.log(`Promedio por página: ${Math.round(this.stats.totalTextLength / this.stats.pagesProcessed).toLocaleString()} caracteres`);
    console.log('='.repeat(60) + '\n');
  }
}

// Función principal
async function main() {
  const processor = new DataProcessor();
  
  try {
    await processor.processAll();
  } catch (error) {
    logger.error('Error fatal en el procesador', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente (compatible con Windows y POSIX)
try {
  const isDirectRun = process.argv[1]
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  if (isDirectRun) {
    main();
  }
} catch {
  // silencioso
}

export default DataProcessor;
