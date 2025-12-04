/**
 * analyze-dataset.js
 * Analiza el índice procesado y el dataset generado para:
 * - Cobertura por tópico
 * - Longitudes de input/output
 * - Páginas más largas
 * - Detección simple de duplicados
 */

import fs from 'fs/promises';
import path from 'path';

const processedDir = path.resolve('data/processed');
const mergedIndexPath = path.join(processedDir, 'merged_index.json');
const defaultIndexPath = path.join(processedDir, 'index.json');
const datasetMetaPath = path.resolve('data/dataset/dataset_metadata.json');
const allExamplesPath = path.resolve('data/dataset/all_examples.json');
const openaiTrainPath = path.resolve('data/dataset/train_openai.jsonl');

function quantiles(arr, qs = [0.25, 0.5, 0.75, 0.9, 0.95]) {
  if (!arr.length) return {};
  const a = [...arr].sort((x, y) => x - y);
  const res = {};
  for (const q of qs) {
    const idx = Math.floor(q * (a.length - 1));
    res[q] = a[idx];
  }
  return res;
}

function hashText(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

async function readFirstExisting(paths) {
  for (const p of paths) {
    const raw = await fs.readFile(p, 'utf8').catch(() => null);
    if (raw) return raw;
  }
  return null;
}

async function main() {
  const [idxRawCandidate, metaRaw, examplesRaw, openaiRaw] = await Promise.all([
    readFirstExisting([mergedIndexPath, defaultIndexPath]),
    fs.readFile(datasetMetaPath, 'utf8').catch(() => null),
    fs.readFile(allExamplesPath, 'utf8').catch(() => null),
    fs.readFile(openaiTrainPath, 'utf8').catch(() => null)
  ]);

  if (!idxRawCandidate || !examplesRaw) {
    console.error('Faltan archivos requeridos: processed/(merged_)index.json o dataset/all_examples.json');
    process.exit(1);
  }

  const index = JSON.parse(idxRawCandidate);
  const meta = metaRaw ? JSON.parse(metaRaw) : null;
  const examples = JSON.parse(examplesRaw);
  const openai = openaiRaw ? JSON.parse(openaiRaw) : [];

  // Cobertura por tópico
  const topicCounts = new Map();
  for (const p of index.pages) {
    topicCounts.set(p.topic, (topicCounts.get(p.topic) || 0) + 1);
  }

  // Longitudes
  // Preferir schema Alpaca (instruction/output), fallback a OpenAI messages
  const inputLens = examples.map(e => {
    if (typeof e?.instruction === 'string') return e.instruction.length;
    return 0;
  });
  const outputLens = examples.map(e => {
    if (typeof e?.output === 'string') return e.output.length;
    return 0;
  });

  // Si todos son 0 (p. ej., se leyó un formato distinto), usar OpenAI para medir inputs
  const allZero = inputLens.every(x => x === 0);
  if (allZero && openai.length) {
    const lens = openai.map(row => (row?.messages?.find(m => m.role === 'user')?.content || '').length);
    for (let i = 0; i < Math.min(lens.length, inputLens.length); i++) inputLens[i] = lens[i];
  }

  const inputStats = {
    count: inputLens.length,
    avg: Math.round(inputLens.reduce((a, b) => a + b, 0) / Math.max(1, inputLens.length)),
    min: Math.min(...inputLens),
    max: Math.max(...inputLens),
    q: quantiles(inputLens)
  };

  const outputStats = {
    count: outputLens.length,
    avg: Math.round(outputLens.reduce((a, b) => a + b, 0) / Math.max(1, outputLens.length)),
    min: Math.min(...outputLens),
    max: Math.max(...outputLens),
    q: quantiles(outputLens)
  };

  // Páginas más largas
  const longest = [...index.pages]
    .sort((a, b) => b.textLength - a.textLength)
    .slice(0, 10);

  // Duplicados simples (hash de título + 200 chars de texto)
  const seen = new Map();
  const duplicates = [];
  for (const p of index.pages) {
    const key = hashText((p.title || '') + '|' + p.textLength + '|' + (p.topic || ''));
    if (seen.has(key)) {
      duplicates.push([seen.get(key), p]);
    } else {
      seen.set(key, p);
    }
  }

  // Reporte
  console.log('\n' + '='.repeat(60));
  console.log('ANÁLISIS DEL DATASET');
  console.log('='.repeat(60));
  if (meta && meta.total_examples) {
    console.log(`Ejemplos totales: ${meta.total_examples}`);
    console.log(`Split: train=${meta.splits.train}, val=${meta.splits.validation}, test=${meta.splits.test}`);
  } else {
    console.log(`Ejemplos (estimado): ${examples.length}`);
  }
  console.log(`Tópicos únicos: ${topicCounts.size}`);
  console.log('\nTop 10 tópicos por páginas:');
  const topTopics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [t, c] of topTopics) console.log(`  - ${t}: ${c}`);

  console.log('\nLongitud de inputs (caracteres):');
  console.log(inputStats);
  console.log('\nLongitud de outputs (caracteres):');
  console.log(outputStats);

  console.log('\nPáginas más largas:');
  for (const p of longest) console.log(`  - (${p.textLength}) ${p.title || p.url}`);

  console.log(`\nPosibles duplicados: ${duplicates.length}`);
  if (duplicates.length) {
    for (const [a, b] of duplicates.slice(0, 10)) {
      console.log(`  * ${a.title || a.url}  <->  ${b.title || b.url}`);
    }
  }
  console.log('='.repeat(60) + '\n');
}

main().catch(err => { console.error(err); process.exit(1); });
