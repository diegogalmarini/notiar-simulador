/**
 * Configuración del Scraper de Ingesis
 */

export const SCRAPER_CONFIG = {
  // URL base del manual de Ingesis
  baseUrl: 'https://manualweb.ingesis.com.ar/',
  
  // Directorios de salida
  outputDirs: {
    raw: './data/raw',
    processed: './data/processed',
    dataset: './data/dataset'
  },

  // Configuración de Puppeteer
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  },

  // Configuración de navegación
  navigation: {
    timeout: 30000,
    waitUntil: 'networkidle2'
  },

  // Rate limiting (tiempo entre peticiones en ms)
  rateLimit: {
    minDelay: 300,   // Reducido para velocidad
    maxDelay: 800    // Reducido para velocidad
  },

  // Selectores CSS para extraer contenido
  selectors: {
    mainContent: 'main, article, .content, #content, .main-content',
    navigation: 'nav a, .menu a, .sidebar a',
    title: 'h1, .title, .page-title',
    headings: 'h1, h2, h3, h4, h5, h6',
    paragraphs: 'p',
    lists: 'ul, ol',
    code: 'code, pre',
    tables: 'table',
    images: 'img'
  },

  // Patrones de URL a incluir/excluir
  urlPatterns: {
    include: [
      /manualweb\.ingesis\.com\.ar/
    ],
    exclude: [
      /\.(pdf|jpg|jpeg|png|gif|zip|rar|avi|mp4|wmv|flv)$/i, // solo binarios y multimedia
      /#$/,
      /javascript:/,
      /mailto:/
    ]
  },

  // Límites
  limits: {
    maxPages: 1000,           // Máximo de páginas a procesar (expansión masiva)
    maxDepth: 10,             // Profundidad máxima de navegación
    maxRetries: 3,            // Reintentos por página
    concurrency: 3            // Páginas simultáneas (aumentado para velocidad)
  },

  // Archivos de caché y estado
  cacheFiles: {
    visitedUrls: './data/raw/visited-urls.json',
    pageQueue: './data/raw/page-queue.json',
    metadata: './data/raw/metadata.json'
  }
};

export default SCRAPER_CONFIG;
