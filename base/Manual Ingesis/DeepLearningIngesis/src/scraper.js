/**
 * Scraper de Ingesis con Puppeteer
 * Descarga exhaustiva del manual web de Ingesis
 */

import puppeteer from 'puppeteer';
import { URL, fileURLToPath } from 'url';
import path from 'path';
import pLimit from 'p-limit';
import Logger from './utils/logger.js';
import FileManager from './utils/file-manager.js';
import { SCRAPER_CONFIG } from '../config/scraper-config.js';

const logger = new Logger('SCRAPER');

class IngesisScraper {
  constructor() {
    this.visitedUrls = new Set();
    this.urlQueue = [];
    this.pages = [];
    this.browser = null;
    this.pageCounter = 0; // ID único para archivos raw
    this.stats = {
      pagesProcessed: 0,
      pagesSuccessful: 0,
      pagesFailed: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Espera asíncrona
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Inicializa el navegador
   */
  async initialize() {
    logger.info('Inicializando navegador Puppeteer...');
    this.browser = await puppeteer.launch(SCRAPER_CONFIG.puppeteer);
    this.stats.startTime = new Date();
    
    // Cargar estado previo si existe
    await this.loadState();
    
    // Agregar URL inicial si la cola está vacía
    if (this.urlQueue.length === 0) {
      // Si existe lista precompilada de URLs, usarla como semillas
      try {
        const urlsListPath = path.resolve('./data/raw/all-manual-urls.json');
        const exists = await FileManager.exists(urlsListPath);
        if (exists) {
          const list = await FileManager.readJSON(urlsListPath);
          const seeds = Array.isArray(list?.urls) ? list.urls : [];
          if (seeds.length > 0) {
            logger.info(`Cargando ${seeds.length} URLs precompiladas como semillas`);
            for (const url of seeds) {
              const norm = this.normalizeUrl(url);
              if (norm) this.urlQueue.push({ url: norm, depth: 0 });
            }
          }
        }
      } catch (e) {
        logger.warn('No se pudo cargar lista precompilada de URLs, usando semillas por defecto');
      }

      // Fallback: usar algunas semillas por defecto si aún sigue vacía
      if (this.urlQueue.length === 0) {
        const seedUrls = [
          'https://manualweb.ingesis.com.ar/manutree.asp',
          'https://manualweb.ingesis.com.ar/index.asp'
        ];
        for (const url of seedUrls) {
          const norm = this.normalizeUrl(url);
          if (norm) this.urlQueue.push({ url: norm, depth: 0 });
        }
      }
    }
    
    logger.success('Navegador inicializado');
  }

  /**
   * Normaliza una URL
   */
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // Remover fragmentos (#)
      urlObj.hash = '';
      // Remover trailing slash
      let normalized = urlObj.href;
      if (normalized.endsWith('/') && normalized !== SCRAPER_CONFIG.baseUrl) {
        normalized = normalized.slice(0, -1);
      }
      return normalized;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifica si una URL debe ser procesada
   */
  shouldProcessUrl(url) {
    if (!url) return false;

    const normalized = this.normalizeUrl(url);
    if (!normalized) return false;

    // Ya visitada
    if (this.visitedUrls.has(normalized)) return false;

    // Verificar patrones de exclusión
    for (const pattern of SCRAPER_CONFIG.urlPatterns.exclude) {
      if (pattern.test(normalized)) return false;
    }

    // Verificar patrones de inclusión
    let matches = false;
    for (const pattern of SCRAPER_CONFIG.urlPatterns.include) {
      if (pattern.test(normalized)) {
        matches = true;
        break;
      }
    }

    return matches;
  }

  /**
   * Extrae enlaces de una página
   */
  async extractLinks(page, currentUrl, depth) {
    try {
      const links = await page.evaluate((selectors) => {
        const linkElements = document.querySelectorAll('a[href]');
        return Array.from(linkElements).map(a => a.href);
      }, SCRAPER_CONFIG.selectors);

      const validLinks = [];
      for (const link of links) {
        if (this.shouldProcessUrl(link) && depth < SCRAPER_CONFIG.limits.maxDepth) {
          validLinks.push({
            url: this.normalizeUrl(link),
            depth: depth + 1
          });
        }
      }

      return validLinks;
    } catch (error) {
      logger.error('Error extrayendo enlaces', error);
      return [];
    }
  }

  /**
   * Extrae contenido de una página
   */
  async extractContent(page, url) {
    try {
      const content = await page.evaluate((selectors) => {
        const result = {
          title: '',
          headings: [],
          paragraphs: [],
          lists: [],
          code: [],
          tables: [],
          links: []
        };

        // Detección especial para sitios con framesets (legacy)
        const hasFrameset = document.getElementsByTagName('frameset').length > 0;
        if (hasFrameset) {
          result.frameset = true;
          result.frameSources = Array.from(document.getElementsByTagName('frame')).map(f => ({
            name: f.getAttribute('name'),
            src: f.getAttribute('src')
          }));
        }

        // Título
        const titleEl = document.querySelector(selectors.title);
        if (titleEl) result.title = titleEl.textContent.trim();

        // Encabezados
        document.querySelectorAll(selectors.headings).forEach(h => {
          result.headings.push({
            level: h.tagName,
            text: h.textContent.trim()
          });
        });

        // Párrafos
        document.querySelectorAll(selectors.paragraphs).forEach(p => {
          const text = p.textContent.trim();
          if (text) result.paragraphs.push(text);
        });

        // Listas
        document.querySelectorAll(selectors.lists).forEach(list => {
          const items = Array.from(list.querySelectorAll('li')).map(li => 
            li.textContent.trim()
          );
          result.lists.push(items);
        });

        // Código
        document.querySelectorAll(selectors.code).forEach(code => {
          const text = code.textContent.trim();
          if (text) result.code.push(text);
        });

        // Tablas
        document.querySelectorAll(selectors.tables).forEach(table => {
          const rows = Array.from(table.querySelectorAll('tr')).map(tr => {
            return Array.from(tr.querySelectorAll('th, td')).map(cell => 
              cell.textContent.trim()
            );
          });
          result.tables.push(rows);
        });

        // Enlaces internos
        document.querySelectorAll('a[href]').forEach(a => {
          result.links.push({
            text: a.textContent.trim(),
            href: a.href
          });
        });

        return result;
      }, SCRAPER_CONFIG.selectors);

      return {
        url,
        timestamp: new Date().toISOString(),
        content,
        html: await page.content()
      };
    } catch (error) {
      logger.error(`Error extrayendo contenido de ${url}`, error);
      return null;
    }
  }

  /**
   * Maneja páginas con framesets: abre frames clave y extrae su contenido
   */
  async handleFrames(page, pageData, depth) {
    if (!pageData?.content?.frameset) return pageData;

    const frameInfos = pageData.content.frameSources || [];
    for (const frameInfo of frameInfos) {
      if (!frameInfo.src) continue;
      // Construir URL absoluta
      let frameUrl = frameInfo.src;
      if (!/^https?:/i.test(frameUrl)) {
        try {
          const base = new URL(pageData.url);
          frameUrl = new URL(frameUrl, base.origin + '/').href;
        } catch {
          continue;
        }
      }
      if (!this.shouldProcessUrl(frameUrl)) continue;
      // Añadir a la cola como siguiente nivel
      this.urlQueue.push({ url: this.normalizeUrl(frameUrl), depth: depth + 1 });
    }
    return pageData;
  }

  /**
   * Procesa una página individual
   */
  async processPage(url, depth, retries = 0) {
    const page = await this.browser.newPage();
    
    try {
      logger.info(`Procesando: ${url} (profundidad: ${depth})`);

      // Navegar a la página
      await page.goto(url, {
        timeout: SCRAPER_CONFIG.navigation.timeout,
        waitUntil: SCRAPER_CONFIG.navigation.waitUntil
      });

      // Esperar a que el contenido dinámico se cargue completamente
      await this.sleep(2000);
      
      // Esperar elementos clave si existen
      try {
        await page.waitForSelector('body', { timeout: 5000 });
      } catch {
        // Si no hay body, continuar igual
      }

      // Extraer contenido
  let pageData = await this.extractContent(page, url);
  // Si es frameset, manejar frames
  pageData = await this.handleFrames(page, pageData, depth);
      
      if (pageData) {
        // Guardar página
        const id = this.pageCounter++;
        pageData.id = id; // Agregar ID al objeto
        const filename = `page-${id}.json`;
        const filepath = `${SCRAPER_CONFIG.outputDirs.raw}/${filename}`;
        await FileManager.saveJSON(filepath, pageData);
        
        this.pages.push({
          id,
          url,
          depth,
          filename,
          timestamp: new Date().toISOString()
        });

        this.stats.pagesSuccessful++;

        // Extraer nuevos enlaces
        const newLinks = await this.extractLinks(page, url, depth);
        this.urlQueue.push(...newLinks);

        logger.success(`✓ Página guardada: ${filename}`);
      }

      this.stats.pagesProcessed++;
      
      // Rate limiting
      const delay = Math.random() * 
        (SCRAPER_CONFIG.rateLimit.maxDelay - SCRAPER_CONFIG.rateLimit.minDelay) + 
        SCRAPER_CONFIG.rateLimit.minDelay;
      await this.sleep(delay);

    } catch (error) {
      logger.error(`Error procesando ${url}`, error);
      
      // Reintentar si es posible
      if (retries < SCRAPER_CONFIG.limits.maxRetries) {
        logger.warn(`Reintentando... (${retries + 1}/${SCRAPER_CONFIG.limits.maxRetries})`);
        await page.close();
        return this.processPage(url, depth, retries + 1);
      }
      
      this.stats.pagesFailed++;
    } finally {
      await page.close();
    }
  }

  /**
   * Ejecuta el scraping
   */
  async scrape() {
    logger.info('Iniciando scraping exhaustivo del manual de Ingesis...');

    // Limitar concurrencia
    const limit = pLimit(SCRAPER_CONFIG.limits.concurrency);
    
    while (this.urlQueue.length > 0 && 
           this.stats.pagesProcessed < SCRAPER_CONFIG.limits.maxPages) {
      
      const batch = this.urlQueue.splice(0, SCRAPER_CONFIG.limits.concurrency);
      const tasks = batch.map(({ url, depth }) => {
        const norm = this.normalizeUrl(url);
        if (norm && !this.visitedUrls.has(norm)) {
          this.visitedUrls.add(norm);
          return limit(() => this.processPage(norm, depth));
        }
        return Promise.resolve();
      });

      await Promise.all(tasks);

      // Guardar estado periódicamente
      if (this.stats.pagesProcessed % 10 === 0) {
        await this.saveState();
        logger.progress(
          this.stats.pagesProcessed,
          Math.min(this.urlQueue.length + this.stats.pagesProcessed, SCRAPER_CONFIG.limits.maxPages),
          `URLs en cola: ${this.urlQueue.length}`
        );
      }
    }

    this.stats.endTime = new Date();
    await this.saveState();
    logger.success('Scraping completado!');
    this.printStats();
  }

  /**
   * Guarda el estado actual
   */
  async saveState() {
    await FileManager.saveJSON(
      SCRAPER_CONFIG.cacheFiles.visitedUrls,
      Array.from(this.visitedUrls)
    );
    
    await FileManager.saveJSON(
      SCRAPER_CONFIG.cacheFiles.pageQueue,
      this.urlQueue
    );
    
    await FileManager.saveJSON(
      SCRAPER_CONFIG.cacheFiles.metadata,
      {
        stats: this.stats,
        pages: this.pages
      }
    );
  }

  /**
   * Carga el estado previo
   */
  async loadState() {
    try {
      if (await FileManager.exists(SCRAPER_CONFIG.cacheFiles.visitedUrls)) {
        const urls = await FileManager.readJSON(SCRAPER_CONFIG.cacheFiles.visitedUrls);
        this.visitedUrls = new Set(urls);
        logger.info(`Cargadas ${urls.length} URLs visitadas`);
      }

      if (await FileManager.exists(SCRAPER_CONFIG.cacheFiles.pageQueue)) {
        this.urlQueue = await FileManager.readJSON(SCRAPER_CONFIG.cacheFiles.pageQueue);
        logger.info(`Cargadas ${this.urlQueue.length} URLs en cola`);
      }

      if (await FileManager.exists(SCRAPER_CONFIG.cacheFiles.metadata)) {
        const metadata = await FileManager.readJSON(SCRAPER_CONFIG.cacheFiles.metadata);
        this.pages = metadata.pages || [];
        this.stats = { ...this.stats, ...metadata.stats };
        logger.info(`Cargadas ${this.pages.length} páginas previas`);
      }
    } catch (error) {
      logger.warn('No se pudo cargar estado previo, comenzando desde cero');
    }
  }

  /**
   * Imprime estadísticas finales
   */
  printStats() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    console.log('\n' + '='.repeat(60));
    console.log('ESTADÍSTICAS FINALES');
    console.log('='.repeat(60));
    console.log(`Páginas procesadas: ${this.stats.pagesProcessed}`);
    console.log(`Páginas exitosas: ${this.stats.pagesSuccessful}`);
    console.log(`Páginas fallidas: ${this.stats.pagesFailed}`);
    console.log(`URLs únicas visitadas: ${this.visitedUrls.size}`);
    console.log(`Duración: ${duration.toFixed(2)} segundos`);
    console.log(`Velocidad: ${(this.stats.pagesSuccessful / duration).toFixed(2)} páginas/seg`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Cierra el navegador y limpia recursos
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Navegador cerrado');
    }
  }
}

// Función principal
async function main() {
  const scraper = new IngesisScraper();
  
  try {
    await scraper.initialize();
    await scraper.scrape();
  } catch (error) {
    logger.error('Error fatal en el scraper', error);
    process.exit(1);
  } finally {
    await scraper.cleanup();
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
  // Si falla la detección, no hacemos nada (permite importarlo como módulo)
}

export default IngesisScraper;
