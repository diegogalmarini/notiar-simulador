/**
 * Dataset Builder
 * Prepara datos para fine-tuning de modelos LLM
 * Genera formatos compatibles con OpenAI, Llama, y otros
 */

import Logger from './utils/logger.js';
import FileManager from './utils/file-manager.js';
import { SCRAPER_CONFIG } from '../config/scraper-config.js';
import { fileURLToPath } from 'url';
import path from 'path';

const logger = new Logger('DATASET');

class DatasetBuilder {
  constructor() {
    this.examples = [];
    this.stats = {
      totalExamples: 0,
      avgInputLength: 0,
      avgOutputLength: 0
    };
  }

  /**
   * Genera preguntas potenciales basadas en el contenido
   */
  generateQuestions(page) {
    const questions = [];
    const title = page.title;
    const topic = page.topic;

    // Preguntas basadas en el título
    if (title) {
      questions.push(`¿Qué es ${title}?`);
      questions.push(`Explícame sobre ${title}`);
      questions.push(`¿Cómo funciona ${title}?`);
      questions.push(`Información sobre ${title}`);
    }

    // Preguntas basadas en secciones
    for (const section of page.sections) {
      if (section.heading) {
        questions.push(`¿Qué es ${section.heading}?`);
        questions.push(`Explica ${section.heading}`);
        questions.push(`¿Cómo usar ${section.heading}?`);
      }
    }

    // Preguntas genéricas del tema
    questions.push(`¿Cómo se usa ${topic} en Ingesis?`);
    questions.push(`Ayuda con ${topic}`);
    questions.push(`Tutorial de ${topic}`);
    questions.push(`Guía de ${topic}`);

    return questions;
  }

  /**
   * Genera respuesta contextual
   */
  generateAnswer(page, question) {
    let answer = '';

    // Incluir título como contexto
    if (page.title) {
      answer += `# ${page.title}\n\n`;
    }

    // Incluir secciones relevantes
    for (const section of page.sections) {
      if (section.heading) {
        answer += `## ${section.heading}\n\n`;
      }

      for (const item of section.content) {
        if (item.type === 'paragraph') {
          answer += `${item.text}\n\n`;
        } else if (item.type === 'list') {
          answer += item.items.map(i => `- ${i}`).join('\n') + '\n\n';
        } else if (item.type === 'code') {
          answer += `\`\`\`\n${item.text}\n\`\`\`\n\n`;
        } else if (item.type === 'table') {
          const tableText = item.rows.map(row => row.join(' | ')).join('\n');
          answer += `${tableText}\n\n`;
        }
      }
    }

    // Si no hay secciones estructuradas, usar texto completo
    if (answer.length < 100) {
      answer = page.fullText;
    }

    // Agregar contexto del sistema
    const systemContext = `Este contenido es del manual de Ingesis SRL, un sistema de gestión para escribanías y notarías. `;
    
    // Limitar longitud de respuesta (max 2048 tokens aprox)
    const maxLength = 6000;
    if (answer.length > maxLength) {
      answer = answer.substring(0, maxLength) + '...';
    }

    return systemContext + answer.trim();
  }

  /**
   * Crea ejemplos en formato de conversación
   */
  createConversationExamples(page) {
    const examples = [];
    const questions = this.generateQuestions(page);

    // Crear varios ejemplos por página
    for (const question of questions.slice(0, 5)) { // Límite de 5 preguntas por página
      const answer = this.generateAnswer(page, question);

      examples.push({
        instruction: question,
        input: '',
        output: answer,
        metadata: {
          source_url: page.url,
          topic: page.topic,
          title: page.title
        }
      });
    }

    return examples;
  }

  /**
   * Convierte al formato de OpenAI (chat completion)
   */
  toOpenAIFormat(examples) {
    return examples.map(ex => ({
      messages: [
        {
          role: 'system',
          content: 'Eres un tutor experto del sistema Ingesis SRL, un software de gestión para escribanías y notarías. Tu objetivo es ayudar a los usuarios a comprender y utilizar el sistema de manera efectiva. Proporciona respuestas claras, precisas y útiles basadas en el manual oficial.'
        },
        {
          role: 'user',
          content: ex.instruction
        },
        {
          role: 'assistant',
          content: ex.output
        }
      ]
    }));
  }

  /**
   * Convierte al formato Alpaca/Llama
   */
  toAlpacaFormat(examples) {
    return examples.map(ex => ({
      instruction: ex.instruction,
      input: ex.input,
      output: ex.output
    }));
  }

  /**
   * Convierte al formato Sharegpt (usado por muchos fine-tuning tools)
   */
  toShareGPTFormat(examples) {
    return examples.map(ex => ({
      conversations: [
        {
          from: 'human',
          value: ex.instruction
        },
        {
          from: 'gpt',
          value: ex.output
        }
      ]
    }));
  }

  /**
   * Divide el dataset en train/validation/test
   */
  splitDataset(examples, trainRatio = 0.8, valRatio = 0.1) {
    const shuffled = [...examples].sort(() => Math.random() - 0.5);
    const total = shuffled.length;
    
    const trainSize = Math.floor(total * trainRatio);
    const valSize = Math.floor(total * valRatio);

    return {
      train: shuffled.slice(0, trainSize),
      validation: shuffled.slice(trainSize, trainSize + valSize),
      test: shuffled.slice(trainSize + valSize)
    };
  }

  /**
   * Construye el dataset completo
   */
  async build() {
    logger.info('Construyendo dataset para fine-tuning...');

    // Leer índice de páginas procesadas (usar merged_index si existe)
    let indexPath = `${SCRAPER_CONFIG.outputDirs.processed}/merged_index.json`;
    const hasMerged = await FileManager.exists(indexPath);
    if (!hasMerged) {
      indexPath = `${SCRAPER_CONFIG.outputDirs.processed}/index.json`;
    }
    const index = await FileManager.readJSON(indexPath);

    logger.info(`Procesando ${index.totalPages} páginas`);

    // Procesar cada página
    for (const pageInfo of index.pages) {
      try {
        // Elegir archivo según índice usado
        const pageFile = hasMerged
          ? `${SCRAPER_CONFIG.outputDirs.processed}/merged-${pageInfo.id}.json`
          : `${SCRAPER_CONFIG.outputDirs.processed}/processed-${pageInfo.id}.json`;
        const pageData = await FileManager.readJSON(pageFile);

        // Generar ejemplos de conversación
        const pageExamples = this.createConversationExamples(pageData);
        this.examples.push(...pageExamples);

        logger.progress(pageInfo.id, index.totalPages, `${pageExamples.length} ejemplos generados`);
      } catch (error) {
        logger.error(`Error procesando página id=${pageInfo.id}`, error);
      }
    }

    this.stats.totalExamples = this.examples.length;
    
    // Calcular estadísticas
    const inputLengths = this.examples.map(ex => ex.instruction.length);
    const outputLengths = this.examples.map(ex => ex.output.length);
    this.stats.avgInputLength = Math.round(
      inputLengths.reduce((a, b) => a + b, 0) / inputLengths.length
    );
    this.stats.avgOutputLength = Math.round(
      outputLengths.reduce((a, b) => a + b, 0) / outputLengths.length
    );

    // Dividir dataset
    const splits = this.splitDataset(this.examples);

    // Guardar en múltiples formatos
    await this.saveDatasets(splits);

    logger.success('Dataset construido exitosamente!');
    this.printStats(splits);
  }

  /**
   * Guarda los datasets en diferentes formatos
   */
  async saveDatasets(splits) {
    const outputDir = SCRAPER_CONFIG.outputDirs.dataset;

    // Formato OpenAI
    logger.info('Guardando formato OpenAI...');
    await FileManager.saveJSON(
      `${outputDir}/train_openai.jsonl`,
      this.toOpenAIFormat(splits.train)
    );
    await FileManager.saveJSON(
      `${outputDir}/validation_openai.jsonl`,
      this.toOpenAIFormat(splits.validation)
    );
    await FileManager.saveJSON(
      `${outputDir}/test_openai.jsonl`,
      this.toOpenAIFormat(splits.test)
    );

    // Formato Alpaca
    logger.info('Guardando formato Alpaca...');
    await FileManager.saveJSON(
      `${outputDir}/train_alpaca.json`,
      this.toAlpacaFormat(splits.train)
    );
    await FileManager.saveJSON(
      `${outputDir}/validation_alpaca.json`,
      this.toAlpacaFormat(splits.validation)
    );
    await FileManager.saveJSON(
      `${outputDir}/test_alpaca.json`,
      this.toAlpacaFormat(splits.test)
    );

    // Formato ShareGPT
    logger.info('Guardando formato ShareGPT...');
    await FileManager.saveJSON(
      `${outputDir}/train_sharegpt.json`,
      this.toShareGPTFormat(splits.train)
    );
    await FileManager.saveJSON(
      `${outputDir}/validation_sharegpt.json`,
      this.toShareGPTFormat(splits.validation)
    );
    await FileManager.saveJSON(
      `${outputDir}/test_sharegpt.json`,
      this.toShareGPTFormat(splits.test)
    );

    // Guardar ejemplos raw
    await FileManager.saveJSON(
      `${outputDir}/all_examples.json`,
      this.examples
    );

    // Guardar metadata del dataset
    const metadata = {
      created_at: new Date().toISOString(),
      source: 'https://manualweb.ingesis.com.ar/',
      total_examples: this.stats.totalExamples,
      splits: {
        train: splits.train.length,
        validation: splits.validation.length,
        test: splits.test.length
      },
      stats: this.stats,
      formats_available: ['openai', 'alpaca', 'sharegpt']
    };

    await FileManager.saveJSON(
      `${outputDir}/dataset_metadata.json`,
      metadata
    );

    logger.success('Todos los formatos guardados');
  }

  /**
   * Imprime estadísticas del dataset
   */
  printStats(splits) {
    console.log('\n' + '='.repeat(60));
    console.log('ESTADÍSTICAS DEL DATASET');
    console.log('='.repeat(60));
    console.log(`Total de ejemplos: ${this.stats.totalExamples}`);
    console.log(`  - Train: ${splits.train.length}`);
    console.log(`  - Validation: ${splits.validation.length}`);
    console.log(`  - Test: ${splits.test.length}`);
    console.log(`\nLongitud promedio:`);
    console.log(`  - Input (pregunta): ${this.stats.avgInputLength} caracteres`);
    console.log(`  - Output (respuesta): ${this.stats.avgOutputLength} caracteres`);
    console.log(`\nFormatos generados:`);
    console.log(`  - OpenAI (chat completion)`);
    console.log(`  - Alpaca (instruction following)`);
    console.log(`  - ShareGPT (conversational)`);
    console.log('='.repeat(60) + '\n');
  }
}

// Función principal
async function main() {
  const builder = new DatasetBuilder();
  
  try {
    await builder.build();
  } catch (error) {
    logger.error('Error fatal en el constructor de dataset', error);
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

export default DatasetBuilder;
