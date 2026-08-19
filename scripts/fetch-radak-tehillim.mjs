// One-time script: fetch Radak's commentary on all 150 Psalms from Sefaria
// and write the results to scripts/radak-tehillim.json for review before applying.
// Run: node scripts/fetch-radak-tehillim.mjs

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, 'radak-tehillim.json');

function stripHtml(html) {
  return html
    .replace(/<sup[^>]*>.*?<\/sup>/gs, '')  // footnote superscripts
    .replace(/<i[^>]*>.*?<\/i>/gs, '')       // footnote text
    .replace(/<[^>]+>/g, '')                  // all remaining tags
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBold(html) {
  const m = html.match(/<b>([^<]+)<\/b>/);
  return m ? m[1].trim() : '';
}

function normalizeHe(he) {
  // he can be: string | string[] | string[][]
  if (!he) return '';
  if (typeof he === 'string') return he;
  if (Array.isArray(he)) {
    const first = he[0];
    if (!first) return '';
    if (typeof first === 'string') return first;
    if (Array.isArray(first)) return first[0] || '';
  }
  return '';
}

async function fetchRadak(ch) {
  const url = `https://www.sefaria.org/api/texts/Radak_on_Psalms.${ch}.1?lang=he&context=0`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const raw = normalizeHe(data.he);
    if (!raw) return null;
    return {
      ch,
      theme: extractBold(raw),
      desc: stripHtml(raw),
    };
  } catch (e) {
    console.error(`  Error fetching ch ${ch}:`, e.message);
    return null;
  }
}

async function main() {
  // Resume from existing file if interrupted
  const existing = existsSync(OUT_FILE)
    ? JSON.parse(readFileSync(OUT_FILE, 'utf8'))
    : {};

  const results = { ...existing };
  const todo = [];
  for (let ch = 1; ch <= 150; ch++) {
    if (!results[ch]) todo.push(ch);
  }

  console.log(`Fetching ${todo.length} chapters from Sefaria (Radak on Psalms)...`);

  for (let i = 0; i < todo.length; i++) {
    const ch = todo[i];
    process.stdout.write(`  [${i + 1}/${todo.length}] ch ${ch}... `);
    const entry = await fetchRadak(ch);
    if (entry) {
      results[ch] = entry;
      console.log(`OK — "${entry.theme.slice(0, 30)}"`);
    } else {
      results[ch] = null;
      console.log('no data');
    }

    // Save progress every 10 chapters
    if ((i + 1) % 10 === 0) {
      writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
    }

    // Polite delay: 200ms between requests
    if (i < todo.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nDone. Results saved to ${OUT_FILE}`);

  // Summary
  const found = Object.values(results).filter(Boolean).length;
  console.log(`Found Radak commentary for ${found}/150 chapters.`);
}

main().catch(console.error);
