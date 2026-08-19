// Apply Radak commentary to TEHILLIM_CHAPTERS in tehillim.ts
// Run: node scripts/apply-radak-tehillim.mjs

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RADAK_FILE = join(__dirname, 'radak-tehillim.json');
const TEHILLIM_FILE = join(__dirname, '..', 'src', 'data', 'tehillim.ts');

function truncateDesc(text, maxLen = 280) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastStop = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? '),
    cut.lastIndexOf('; '),
    cut.lastIndexOf(': ')
  );
  return lastStop > 80 ? cut.slice(0, lastStop + 1) : cut + '...';
}

function escapeForTs(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function parseExistingThemes(content) {
  const themes = {};
  const re = /\{ num: (\d+),\s+theme: '([^']*)'/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    themes[Number(m[1])] = m[2];
  }
  return themes;
}

function main() {
  const radak = JSON.parse(readFileSync(RADAK_FILE, 'utf8'));
  const content = readFileSync(TEHILLIM_FILE, 'utf8');
  const existingThemes = parseExistingThemes(content);

  // Build new TEHILLIM_CHAPTERS lines
  const lines = ['export const TEHILLIM_CHAPTERS: TehillimChapterMeta[] = ['];
  for (let ch = 1; ch <= 150; ch++) {
    const data = radak[ch];
    const theme = existingThemes[ch] || `פרק ${ch}`;
    let desc;
    if (data && data.desc && data.desc.length > 15) {
      desc = truncateDesc(data.desc) + ' (על פי רד"ק)';
    } else {
      const existRe = new RegExp(`\\{ num: ${ch},[^}]*desc: '([^']*)'`);
      const em = existRe.exec(content);
      desc = em ? em[1] : `פרק ${ch}`;
    }
    lines.push(`  { num: ${ch}, theme: '${escapeForTs(theme)}', desc: '${escapeForTs(desc)}' },`);
  }
  lines.push('];');
  const newBlock = lines.join('\n');

  // Find the TEHILLIM_CHAPTERS block using text markers, not bracket counting.
  // The block starts with the export declaration and ends with the standalone `];` line.
  const START = 'export const TEHILLIM_CHAPTERS: TehillimChapterMeta[] = [';
  const startIdx = content.indexOf(START);
  if (startIdx === -1) throw new Error('TEHILLIM_CHAPTERS not found');

  // Find the `];` that closes the array: scan line-by-line after startIdx
  const lines2 = content.split('\n');
  let startLine = -1;
  let endLine = -1;
  for (let i = 0; i < lines2.length; i++) {
    if (lines2[i].startsWith('export const TEHILLIM_CHAPTERS')) startLine = i;
    if (startLine >= 0 && i > startLine && lines2[i].trim() === '];') { endLine = i; break; }
  }
  if (startLine === -1 || endLine === -1) throw new Error(`Could not find block bounds (startLine=${startLine}, endLine=${endLine})`);

  const before = lines2.slice(0, startLine).join('\n');
  const after = lines2.slice(endLine + 1).join('\n');
  const newContent = before + '\n' + newBlock + '\n' + after;

  writeFileSync(TEHILLIM_FILE, newContent, 'utf8');
  console.log(`Updated TEHILLIM_CHAPTERS (lines ${startLine + 1}–${endLine + 1}) → all 150 chapters with Radak commentary.`);
}

main();
