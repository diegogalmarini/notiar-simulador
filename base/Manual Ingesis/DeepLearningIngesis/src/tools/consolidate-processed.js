/**
 * consolidate-processed.js
 * Fusiona páginas procesadas que comparten la misma URL base (sin fragmento #)
 * y genera un merged_index.json + merged-<id>.json con contenido agregado.
 */

import fs from 'fs/promises';
import path from 'path';

const processedDir = path.resolve('data/processed');
const indexPath = path.join(processedDir, 'index.json');

function baseUrl(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    return url.toString();
  } catch {
    return u;
  }
}

function cleanText(s) {
  return (s || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergePages(pages) {
  // Merge by concatenating sections and fullText; prefer non-empty title/topic
  const merged = {
    id: undefined,
    url: baseUrl(pages[0].url),
    title: pages.map(p => p.title).find(Boolean) || '',
    topic: pages.map(p => p.topic).find(Boolean) || 'General',
    sections: [],
    fullText: '',
    metadata: {
      headingCount: 0,
      paragraphCount: 0,
      hasCode: false,
      hasTables: false,
      linkCount: 0
    }
  };

  for (const p of pages) {
    if (Array.isArray(p.sections)) merged.sections.push(...p.sections);
    if (p.fullText) merged.fullText += p.fullText + '\n\n';
    merged.metadata.headingCount += (p.metadata?.headingCount || 0);
    merged.metadata.paragraphCount += (p.metadata?.paragraphCount || 0);
    merged.metadata.hasCode = merged.metadata.hasCode || !!p.metadata?.hasCode;
    merged.metadata.hasTables = merged.metadata.hasTables || !!p.metadata?.hasTables;
    merged.metadata.linkCount += (p.metadata?.linkCount || 0);
  }

  merged.title = cleanText(merged.title);
  merged.fullText = cleanText(merged.fullText);
  return merged;
}

async function main() {
  const idxRaw = await fs.readFile(indexPath, 'utf8');
  const index = JSON.parse(idxRaw);

  // Cargar todas las páginas procesadas
  const pages = [];
  for (const p of index.pages) {
    const fp = path.join(processedDir, `processed-${p.id}.json`);
    try {
      const raw = await fs.readFile(fp, 'utf8');
      pages.push(JSON.parse(raw));
    } catch {
      // skip missing
    }
  }

  // Agrupar por URL base (sin hash)
  const groups = new Map();
  for (const p of pages) {
    const key = baseUrl(p.url);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  // Fusionar
  const mergedPages = [];
  let nextId = 0;
  for (const [key, arr] of groups.entries()) {
    const m = mergePages(arr);
    m.id = nextId++;
    const outPath = path.join(processedDir, `merged-${m.id}.json`);
    await fs.writeFile(outPath, JSON.stringify(m, null, 2), 'utf8');
    mergedPages.push({
      id: m.id,
      url: m.url,
      title: m.title,
      topic: m.topic,
      textLength: m.fullText.length,
      sectionCount: Array.isArray(m.sections) ? m.sections.length : 0
    });
  }

  const mergedIndex = {
    totalPages: mergedPages.length,
    pages: mergedPages.sort((a, b) => a.id - b.id)
  };
  await fs.writeFile(path.join(processedDir, 'merged_index.json'), JSON.stringify(mergedIndex, null, 2), 'utf8');
  console.log(`Consolidación completa: ${mergedPages.length} páginas fusionadas`);
}

main().catch(err => { console.error(err); process.exit(1); });
