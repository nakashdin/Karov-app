// Retry missing chapters: try verse 2, then verse 3
// Run: node scripts/fetch-radak-missing.mjs

import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, 'radak-tehillim.json');

function stripHtml(html) {
  return html
    .replace(/<sup[^>]*>.*?<\/sup>/gs, '')
    .replace(/<i[^>]*>.*?<\/i>/gs, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBold(html) {
  const m = html.match(/<b>([^<]+)<\/b>/);
  return m ? m[1].trim() : '';
}

function normalizeHe(he) {
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

async function fetchVerse(ch, v) {
  const url = `https://www.sefaria.org/api/texts/Radak_on_Psalms.${ch}.${v}?lang=he&context=0`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const raw = normalizeHe(data.he);
    if (!raw || raw.length < 10) return null;
    return { ch, theme: extractBold(raw), desc: stripHtml(raw) };
  } catch (e) {
    return null;
  }
}

async function main() {
  const results = JSON.parse(readFileSync(OUT_FILE, 'utf8'));
  const missing = Object.entries(results)
    .filter(([, v]) => v === null)
    .map(([k]) => Number(k));

  console.log(`Retrying ${missing.length} missing chapters: ${missing.join(', ')}`);

  for (const ch of missing) {
    process.stdout.write(`  ch ${ch}: `);
    for (const v of [2, 3, 4]) {
      const entry = await fetchVerse(ch, v);
      if (entry) {
        results[ch] = { ...entry, verse: v };
        console.log(`found at verse ${v} — "${entry.theme.slice(0, 30)}"`);
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    if (!results[ch]) console.log('still no data');
    await new Promise(r => setTimeout(r, 200));
  }

  writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  const found = Object.values(results).filter(Boolean).length;
  console.log(`\nTotal: ${found}/150 chapters with Radak commentary.`);
}

main().catch(console.error);
