/**
 * Extract all relevant manual URLs from manutree.asp by expanding sections.
 * - Follows manutree.asp?section=... recursively
 * - Collects links to mostrartopico.asp, guiaweb.asp and contenido/*.htm
 * - Writes data/raw/all-manual-urls.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'https://manualweb.ingesis.com.ar/';
const STARTS = [
  'manutree.asp',
  'manutree.asp?section=1',
  'manutree.asp?section=2',
  'manutree.asp?section=3',
  'manutree.asp?section=4',
  'manutree.asp?section=5',
  'manutree.asp?section=6',
  'manutree.asp?section=7',
  'manutree.asp?section=8',
  'manutree.asp?section=9',
  'manutree.asp?section=10',
  'manutree.asp?section=11',
  'manutree.asp?section=12'
];

// Simple delay helper
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function toAbsolute(href) {
  try {
    return new URL(href, BASE).toString();
  } catch {
    return null;
  }
}

function isSameHost(u) {
  try {
    const url = new URL(u);
    return url.hostname.endsWith('ingesis.com.ar');
  } catch {
    return false;
  }
}

function extractHrefs(html) {
  const hrefs = [];
  const regex = /href\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    hrefs.push(m[1]);
  }
  return hrefs;
}

function shouldFollowSection(u) {
  return /manutree\.asp\?section=/.test(u);
}

function isContentUrl(u) {
  return (
    /mostrartopico\.asp/i.test(u) ||
    /guiaweb\.asp/i.test(u) ||
    /contenido\//i.test(u)
  );
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; IngesisLinkExtractor/1.0)'
    }
  });
  // Best-effort decode as text; hrefs are ASCII so OK even if charset differs
  return await res.text();
}

async function main() {
  const outDir = path.resolve(__dirname, '../../data/raw');
  const outFile = path.join(outDir, 'all-manual-urls.json');

  await fs.mkdir(outDir, { recursive: true });

  const queue = [];
  const visited = new Set();
  const results = new Set();

  for (const s of STARTS) queue.push(new URL(s, BASE).toString());

  let requests = 0;
  const MAX_REQUESTS = 2000;

  while (queue.length && requests < MAX_REQUESTS) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    requests++;

    try {
      const html = await fetchText(current);
      const hrefs = extractHrefs(html);
      for (const h of hrefs) {
        let abs = toAbsolute(h);
        if (!abs || !isSameHost(abs)) continue;
        // strip fragments
        try { const u = new URL(abs); u.hash = ''; abs = u.toString(); } catch {}

        if (shouldFollowSection(abs) && !visited.has(abs)) {
          queue.push(abs);
        }
        if (isContentUrl(abs)) {
          // filter obvious binaries
          if (!/\.(pdf|jpg|jpeg|png|gif|zip|rar|avi|mp4|wmv|flv)(\?|$)/i.test(abs)) {
            results.add(abs);
          }
        }
      }
      // polite delay
      await sleep(150);
    } catch (err) {
      // ignore fetch errors and continue
    }
  }

  const urls = Array.from(results).sort();
  const payload = {
    generatedAt: new Date().toISOString(),
    total: urls.length,
    urls
  };
  await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Saved ${urls.length} URLs to ${outFile}`);
}

main().catch(err => {
  console.error('Extractor failed:', err);
  process.exit(1);
});
